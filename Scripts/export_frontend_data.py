"""
export_frontend_data.py  (scripts/)
-----------------------------------
Reads the analysis outputs (tables + prediction files + cleaned data) and writes
ONE compact JSON the React dashboard consumes:

    frontend/public/data/dashboard.json

Run from the project root, after the pipeline has produced outputs:
    python scripts/export_frontend_data.py
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

_p = Path(__file__).resolve().parent
while not (_p / "paths.py").exists() and _p != _p.parent:
    _p = _p.parent
sys.path.insert(0, str(_p))
import paths  # noqa: E402

OUT = paths.OUTPUTS
D = paths.PROCESSED_FILE.parent


def read_csv(path, **kw):
    return pd.read_csv(path, **kw) if Path(path).exists() else None


def records(df):
    return json.loads(df.to_json(orient="records")) if df is not None else []


def downsample(df, step):
    return df.iloc[::step].copy()


data = {}

# ---- meta + price series ----
px = pd.read_csv(paths.PROCESSED_FILE, parse_dates=["date"]).sort_values("date")
px["log_ret"] = np.log(px["close"]).diff()
data["meta"] = {
    "start": px["date"].min().strftime("%Y-%m-%d"),
    "end": px["date"].max().strftime("%Y-%m-%d"),
    "n_days": int(len(px)),
    "sources": px["source"].value_counts().to_dict(),
}

# weekly price + drawdown (keeps JSON small)
wk = downsample(px, 7)
dd = px["close"] / px["close"].cummax() - 1.0
data["price"] = [{"date": d.strftime("%Y-%m-%d"), "close": round(c, 2)}
                 for d, c in zip(wk["date"], wk["close"])]
data["drawdown"] = [{"date": d.strftime("%Y-%m-%d"), "dd": round(float(v) * 100, 2)}
                    for d, v in zip(downsample(dd, 7).index.map(lambda i: px["date"].iloc[i]),
                                    downsample(dd, 7))]
data["worst_drawdown"] = round(float(dd.min()) * 100, 1)

# ---- returns summary / distribution ----
rs = read_csv(OUT / "02_eda/tables/returns_summary.csv", index_col=0)
if rs is not None:
    data["returns_summary"] = {k: round(float(v), 4) for k, v in rs.iloc[:, 0].items()}
data["distribution_fit"] = records(read_csv(OUT / "03_statistical_analysis/tables/stationarity.csv"))
dfit = read_csv(OUT / "02_eda/tables/distribution_fit.csv")
data["dist_table"] = records(dfit)

# ---- GARCH ----
data["garch"] = records(read_csv(OUT / "04_volatility_garch/tables/garch_comparison.csv"))

# ---- model comparison (classical + LSTM) ----
mm = read_csv(OUT / "06_classical_ml/tables/model_metrics.csv")
deep = read_csv(OUT / "07_deep_learning/tables/deep_metrics.csv")
deep_name = deep["model"].iloc[0] if deep is not None else "Neural net"
models = []
if mm is not None:
    for _, r in mm.iterrows():
        if r["model"] in ("LogReg", "RandomForest", "XGBoost"):
            models.append({"model": r["model"], "accuracy": round(float(r["accuracy"]), 4),
                           "auc": round(float(r["AUC"]), 4), "kind": "classical"})
if deep is not None:
    r = deep.iloc[0]
    models.append({"model": deep_name, "accuracy": round(float(r["accuracy"]), 4),
                   "auc": round(float(r["AUC"]), 4), "kind": "deep"})
data["models"] = models
data["deep_name"] = deep_name
if models:
    best = max(models, key=lambda m: m["accuracy"])
    data["verdict"] = {"best_model": best["model"], "best_accuracy": best["accuracy"]}

# ---- backtest: recompute equity curves from predictions (same logic as nb 08) ----
clf = read_csv(D / "predictions_classical.csv", parse_dates=["date"])
dl = read_csv(D / "predictions_dl.csv", parse_dates=["date"])
feat = read_csv(D / "btc_features.csv", parse_dates=["date"])
if clf is not None and feat is not None:
    bt = clf.merge(feat[["date", "target_return"]], on="date", how="left")
    if dl is not None:
        bt = bt.merge(dl[["date", "pred_deep"]], on="date", how="left")
    COST = 0.001
    r = bt["target_return"].values
    defs = {"Buy & Hold": np.ones(len(bt)),
            "RandomForest": bt["pred_RandomForest"].values,
            "XGBoost": bt["pred_XGBoost"].values}
    if "pred_deep" in bt.columns:
        defs[deep_name] = bt["pred_deep"].values
    curves = {}
    metrics = []
    for name, pos in defs.items():
        pos = np.asarray(pos, float)
        turn = np.abs(np.diff(np.concatenate([[0], pos])))
        strat = pos * r - COST * turn
        eq = np.exp(np.cumsum(strat))
        curves[name] = eq
        ddc = (eq / np.maximum.accumulate(eq) - 1).min()
        metrics.append({"strategy": name, "total_return": round(float(eq[-1] - 1), 4),
                        "sharpe": round(float(strat.mean() / strat.std() * np.sqrt(365)), 3) if strat.std() > 0 else 0,
                        "max_drawdown": round(float(ddc), 4), "trades": int((turn > 0).sum())})
    dates = bt["date"].dt.strftime("%Y-%m-%d").tolist()
    data["equity"] = [dict(date=dates[i], **{k: round(float(curves[k][i]), 4) for k in curves})
                      for i in range(0, len(dates), 3)]   # every 3rd day
    data["backtest_metrics"] = metrics
    bh = next(m for m in metrics if m["strategy"] == "Buy & Hold")
    beat = [m["strategy"] for m in metrics
            if m["strategy"] != "Buy & Hold" and m["total_return"] > bh["total_return"]]
    data["beat_buyhold"] = beat

# ---- final report ----
rep = OUT / "09_model_comparison/final_report.md"
data["report"] = rep.read_text() if rep.exists() else ""

# ---- write ----
dest = paths.ROOT / "frontend" / "public" / "data"
dest.mkdir(parents=True, exist_ok=True)
(dest / "dashboard.json").write_text(json.dumps(data, indent=2))
print("Wrote", dest / "dashboard.json")
print(f"  price points: {len(data['price'])}, equity points: {len(data.get('equity', []))}, "
      f"models: {len(data['models'])}")