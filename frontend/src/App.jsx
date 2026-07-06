import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell,
} from "recharts";
import { Bitcoin, Activity, TrendingDown, CalendarDays, ShieldAlert, Zap } from "lucide-react";

/* ============================================================================
   Bitcoin Trend Prediction — Binance-themed dashboard
   Drop-in for frontend/src/App.jsx (Vite + Recharts). No Tailwind needed.
   It fetches /data/dashboard.json (built by scripts/export_frontend_data.py).
   If that isn't reachable (e.g. this preview), it renders honest sample data.
   ========================================================================== */

const T = {
  bg: "#0B0E11", panel: "#181A20", card: "#1E2329", cardHi: "#20262E",
  border: "#2B3139", grid: "#232A32",
  text: "#EAECEF", dim: "#848E9C", faint: "#5E6673",
  gold: "#FCD535", goldDeep: "#F0B90B",
  up: "#0ECB81", down: "#F6465D",
  blue: "#4C82FB", violet: "#9B7DFF",
};

/* ---------- formatting ---------- */
const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
const pctPts = (x, d = 1) => `${x >= 0 ? "" : ""}${x.toFixed(d)}%`;
const signedPct = (x, d = 1) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(d)}%`;
const usd = (n) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `$${n.toFixed(0)}`;
const num = (n) => n.toLocaleString("en-US");

/* ---------- seeded sample data (only used when live JSON is absent) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function samplePrice() {
  const anchors = [
    ["2014-09-15", 460], ["2015-01-15", 210], ["2015-08-01", 285], ["2016-06-01", 580],
    ["2017-01-01", 970], ["2017-12-17", 19200], ["2018-12-15", 3250], ["2019-06-26", 12900],
    ["2020-03-13", 4900], ["2020-12-31", 29000], ["2021-04-14", 63500], ["2021-07-20", 29800],
    ["2021-11-10", 67500], ["2022-06-18", 18000], ["2022-11-21", 15600], ["2023-10-01", 27000],
    ["2024-03-14", 73000], ["2024-08-05", 49000], ["2025-01-20", 102000], ["2025-06-01", 68000],
    ["2026-06-30", 66000],
  ].map(([d, p]) => [new Date(d).getTime(), p]);
  const rnd = mulberry32(7);
  const out = [];
  const start = anchors[0][0], end = anchors[anchors.length - 1][0];
  const week = 7 * 864e5;
  for (let t = start; t <= end; t += week) {
    let i = 0; while (i < anchors.length - 1 && anchors[i + 1][0] < t) i++;
    const [t0, p0] = anchors[i], [t1, p1] = anchors[Math.min(i + 1, anchors.length - 1)];
    const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
    const logP = Math.log(p0) + f * (Math.log(p1) - Math.log(p0));
    const noise = (rnd() - 0.5) * 0.11;
    out.push({ date: new Date(t).toISOString().slice(0, 10), close: Math.exp(logP + noise) });
  }
  return out;
}
function walk(seed, n, endMul, vol) {
  const rnd = mulberry32(seed); let v = 1; const arr = [];
  for (let i = 0; i < n; i++) {
    const drift = Math.pow(endMul, 1 / n) - 1;
    v *= 1 + drift + (rnd() - 0.5) * vol;
    arr.push(v);
  }
  return arr;
}
function sampleEquity() {
  const n = 130, day0 = new Date("2024-08-06").getTime();
  const bh = walk(1, n, 1.62, 0.05), xgb = walk(2, n, 1.10, 0.035),
    vs = walk(3, n, 1.21, 0.026), rf = walk(4, n, 0.94, 0.04), mlp = walk(5, n, 0.88, 0.045);
  return Array.from({ length: n }, (_, i) => ({
    date: new Date(day0 + i * 4 * 864e5).toISOString().slice(0, 10),
    "Buy & Hold": +bh[i].toFixed(4), "XGBoost long/flat": +xgb[i].toFixed(4),
    "XGBoost vol-scaled": +vs[i].toFixed(4), "RandomForest long/flat": +rf[i].toFixed(4),
    "Neural net (MLP) long/flat": +mlp[i].toFixed(4),
  }));
}
const SAMPLE = {
  meta: { start: "2014-09-17", end: "2026-06-30", n_days: 4219,
    sources: { binance: 3068, "early-history": 1151 } },
  worst_drawdown: -83.4,
  verdict: { best_model: "XGBoost", best_accuracy: 0.507 },
  deep_name: "Neural net (MLP)",
  models: [
    { model: "XGBoost", accuracy: 0.507, auc: 0.510, kind: "classical" },
    { model: "LogReg", accuracy: 0.485, auc: 0.515, kind: "classical" },
    { model: "RandomForest", accuracy: 0.485, auc: 0.505, kind: "classical" },
    { model: "Neural net (MLP)", accuracy: 0.449, auc: 0.464, kind: "deep" },
  ],
  backtest_metrics: [
    { strategy: "Buy & Hold", total_return: 0.62, sharpe: 0.70, max_drawdown: -0.76, trades: 1 },
    { strategy: "XGBoost long/flat", total_return: 0.10, sharpe: 0.31, max_drawdown: -0.55, trades: 128 },
    { strategy: "XGBoost vol-scaled", total_return: 0.21, sharpe: 0.52, max_drawdown: -0.38, trades: 240 },
    { strategy: "RandomForest long/flat", total_return: -0.06, sharpe: -0.12, max_drawdown: -0.58, trades: 96 },
    { strategy: "Neural net (MLP) long/flat", total_return: -0.12, sharpe: -0.20, max_drawdown: -0.61, trades: 150 },
  ],
  beat_buyhold: [],
  get price() { return samplePrice(); },
  get equity() { return sampleEquity(); },
};

/* ---------- data hook ---------- */
function useDashboard() {
  const [data, setData] = useState(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    let ok = true;
    fetch("/data/dashboard.json")
      .then((r) => { if (!r.ok) throw new Error("no live json"); return r.json(); })
      .then((j) => { if (ok) { setData(j); setLive(true); } })
      .catch(() => { if (ok) { setData(SAMPLE); setLive(false); } });
    return () => { ok = false; };
  }, []);
  return { data, live };
}

/* ---------- shared bits ---------- */
const upDown = (v) => (v >= 0 ? T.up : T.down);
const EQ_COLORS = {
  "Buy & Hold": T.dim, "XGBoost long/flat": T.gold, "XGBoost vol-scaled": T.up,
  "RandomForest long/flat": T.blue, "Neural net (MLP) long/flat": T.violet,
};

function ChartTip({ active, payload, label, render }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: "#12151A", border: `1px solid ${T.border}`, borderRadius: 8,
      padding: "10px 12px", boxShadow: "0 8px 28px rgba(0,0,0,.55)", minWidth: 150,
    }}>
      <div style={{ color: T.dim, fontSize: 11, marginBottom: 6, letterSpacing: .3 }}>{label}</div>
      {render(payload)}
    </div>
  );
}
const tipRow = (c, name, val) => (
  <div key={name} style={{ display: "flex", justifyContent: "space-between", gap: 18, fontSize: 12.5, padding: "1px 0" }}>
    <span style={{ color: T.dim }}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: c, marginRight: 7 }} />{name}</span>
    <span style={{ color: T.text, fontVariantNumeric: "tabular-nums", fontFamily: "var(--mono)" }}>{val}</span>
  </div>
);

function Panel({ title, sub, right, children, style }) {
  return (
    <section className="bx-panel" style={style}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.text, letterSpacing: .2 }}>{title}</h2>
          {sub && <p style={{ margin: "4px 0 0", fontSize: 12, color: T.dim }}>{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

/* ============================== app ============================== */
export default function App() {
  const { data, live } = useDashboard();

  if (!data) return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.dim, display: "grid", placeItems: "center", fontFamily: "var(--sans)" }}>
      <Style /> loading market data…
    </div>
  );

  const models = data.models || [];
  const best = data.verdict || {};
  const bestAuc = models.length ? Math.max(...models.map((m) => m.auc || 0)) : 0.5;
  const bt = data.backtest_metrics || [];
  const beat = data.beat_buyhold || [];
  const equityKeys = data.equity && data.equity.length
    ? Object.keys(data.equity[0]).filter((k) => k !== "date") : [];

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: "var(--sans)" }}>
      <Style />

      {/* top bar + ticker */}
      <header style={{ borderBottom: `1px solid ${T.border}`, background: "#0d1116", position: "sticky", top: 0, zIndex: 20 }}>
        <div className="bx-wrap" style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 22px" }}>
          <div style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 8, background: T.gold }}>
            <Bitcoin size={19} color="#181A20" strokeWidth={2.4} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: .2 }}>
            BTC<span style={{ color: T.gold }}>·</span>Trend
            <span style={{ color: T.dim, fontWeight: 500, marginLeft: 8, fontSize: 13 }}>Prediction Research</span>
          </div>
          <span className="bx-badge" style={{ marginLeft: "auto" }}>
            <i style={{ width: 6, height: 6, borderRadius: "50%", background: live ? T.up : T.gold, boxShadow: `0 0 8px ${live ? T.up : T.gold}` }} />
            {live ? "live data" : "sample data"}
          </span>
        </div>
        <TickerStrip data={data} bestAuc={bestAuc} />
      </header>

      <main className="bx-wrap" style={{ padding: "22px" }}>

        {/* honest verdict — the signature strip */}
        <div className="bx-verdict">
          <div style={{ display: "grid", placeItems: "center", width: 38, height: 38, borderRadius: 9, background: "rgba(252,213,53,.12)", border: `1px solid rgba(252,213,53,.35)` }}>
            <ShieldAlert size={20} color={T.gold} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>
              Honest verdict — simple beats complex, and accuracy isn't profit.
            </div>
            <div style={{ fontSize: 12.5, color: T.dim, marginTop: 3 }}>
              Best model <b style={{ color: T.text }}>{best.best_model}</b> reached{" "}
              <b style={{ color: T.gold, fontFamily: "var(--mono)" }}>{best.best_accuracy ? pct(best.best_accuracy) : "—"}</b>{" "}
              next-day directional accuracy — a hair above a 50% coin flip. No model cleared an AUC meaningfully over 0.5.
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.gold, fontFamily: "var(--mono)", lineHeight: 1 }}>
              {best.best_accuracy ? pct(best.best_accuracy) : "—"}
            </div>
            <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>vs 50.0% baseline</div>
          </div>
        </div>

        {/* stat cards */}
        <div className="bx-stats">
          <Stat icon={<Zap size={15} />} label="Best next-day accuracy"
            value={best.best_accuracy ? pct(best.best_accuracy) : "—"}
            tone={best.best_accuracy > 0.5 ? T.up : T.down}
            note={`${best.best_model || "—"} · +${best.best_accuracy ? ((best.best_accuracy - 0.5) * 100).toFixed(1) : "0"}pp edge`} />
          <Stat icon={<Activity size={15} />} label="Best AUC" value={bestAuc.toFixed(3)}
            tone={bestAuc > 0.5 ? T.up : T.down} note="0.5 = no discrimination" />
          <Stat icon={<TrendingDown size={15} />} label="Worst drawdown"
            value={data.worst_drawdown != null ? `${data.worst_drawdown.toFixed(1)}%` : "—"}
            tone={T.down} note="peak-to-trough, full history" />
          <Stat icon={<CalendarDays size={15} />} label="Data span"
            value={data.meta ? num(data.meta.n_days) : "—"} tone={T.text}
            note={data.meta ? `${data.meta.start} → ${data.meta.end}` : ""} />
        </div>

        {/* price */}
        <Panel title="BTC / USD" sub="Daily close, log scale — every era readable"
          right={<span className="bx-chip" style={{ color: T.gold, borderColor: "rgba(252,213,53,.3)" }}>log axis</span>}>
          <PriceChart price={data.price || []} />
        </Panel>

        {/* models + equity */}
        <div className="bx-two">
          <Panel title="Models vs the coin flip" sub="Directional accuracy and AUC on the held-out test set">
            <ModelChart models={models} />
          </Panel>
          <Panel title="Backtest equity" sub="Growth of $1 on the test window, after 0.1% costs"
            right={<span className="bx-chip" style={{ color: beat.length ? T.up : T.dim }}>
              {beat.length ? `${beat.length} beat B&H` : "none beat B&H"}
            </span>}>
            <EquityChart equity={data.equity || []} keys={equityKeys} />
          </Panel>
        </div>

        {/* metrics table */}
        <Panel title="Strategy scoreboard" sub="Every signal turned into trades and charged real costs — measured against buy-and-hold.">
          <MetricsTable rows={bt} />
        </Panel>

        <footer style={{ color: T.faint, fontSize: 12, textAlign: "center", padding: "26px 0 8px" }}>
          Built by Ailya Shah · leakage-aware splits · honest baselines · cost-aware backtest
        </footer>
      </main>
    </div>
  );
}

/* ---------- ticker strip ---------- */
function TickerStrip({ data, bestAuc }) {
  const items = [];
  if (data.meta) items.push(["DAYS", num(data.meta.n_days), T.text]);
  if (data.verdict) items.push(["BEST ACC", pct(data.verdict.best_accuracy), data.verdict.best_accuracy > 0.5 ? T.up : T.down]);
  items.push(["BEST AUC", bestAuc.toFixed(3), bestAuc > 0.5 ? T.up : T.down]);
  if (data.worst_drawdown != null) items.push(["MAX DD", `${data.worst_drawdown.toFixed(1)}%`, T.down]);
  (data.models || []).forEach((m) =>
    items.push([m.model.toUpperCase(), pct(m.accuracy), m.accuracy >= 0.5 ? T.up : T.down]));
  (data.meta?.sources ? Object.entries(data.meta.sources) : []).forEach(([k, v]) =>
    items.push([k.toUpperCase(), num(v), T.dim]));
  const loop = [...items, ...items];
  return (
    <div className="bx-ticker">
      <div className="bx-ticker-track">
        {loop.map(([k, v, c], i) => (
          <span key={i} className="bx-ticker-item">
            <span style={{ color: T.faint }}>{k}</span>
            <span style={{ color: c, fontFamily: "var(--mono)", fontWeight: 600 }}>{v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, note, tone }) {
  return (
    <div className="bx-stat">
      <div style={{ display: "flex", alignItems: "center", gap: 7, color: T.dim, fontSize: 11.5, letterSpacing: .3, textTransform: "uppercase" }}>
        <span style={{ color: T.faint }}>{icon}</span>{label}
      </div>
      <div style={{ fontSize: 27, fontWeight: 700, color: tone, fontFamily: "var(--mono)", marginTop: 9, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: T.faint, marginTop: 8 }}>{note}</div>
    </div>
  );
}

/* ---------- charts ---------- */
function PriceChart({ price }) {
  const data = useMemo(() => price.map((d) => ({ ...d })), [price]);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 6, right: 10, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={T.gold} stopOpacity={0.35} />
            <stop offset="100%" stopColor={T.gold} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={T.grid} strokeDasharray="0" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: T.faint, fontSize: 11 }} tickLine={false} axisLine={{ stroke: T.border }}
          minTickGap={60} tickFormatter={(d) => d.slice(0, 4)} />
        <YAxis scale="log" domain={[100, "auto"]} tick={{ fill: T.faint, fontSize: 11 }} tickLine={false}
          axisLine={false} width={48} tickFormatter={usd} />
        <Tooltip content={<ChartTip render={(p) => tipRow(T.gold, "close", `$${num(Math.round(p[0].value))}`)} />} />
        <Area type="monotone" dataKey="close" stroke={T.gold} strokeWidth={1.6} fill="url(#gold)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ModelChart({ models }) {
  const data = models.map((m) => ({ name: m.model, accuracy: m.accuracy, auc: m.auc }));
  const lo = Math.min(0.44, ...data.map((d) => Math.min(d.accuracy, d.auc))) - 0.01;
  const hi = Math.max(0.53, ...data.map((d) => Math.max(d.accuracy, d.auc))) + 0.01;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid stroke={T.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: T.dim, fontSize: 11 }} tickLine={false} axisLine={{ stroke: T.border }} interval={0} />
        <YAxis domain={[lo, hi]} tick={{ fill: T.faint, fontSize: 11 }} tickLine={false} axisLine={false}
          width={44} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,.03)" }}
          content={<ChartTip render={(p) => (<>
            {tipRow(upDown(p[0].value - 0.5), "accuracy", pct(p[0].value))}
            {p[1] && tipRow(T.goldDeep, "AUC", p[1].value.toFixed(3))}
          </>)} />} />
        <ReferenceLine y={0.5} stroke={T.gold} strokeDasharray="5 4" strokeOpacity={0.8}
          label={{ value: "coin flip 50%", fill: T.gold, fontSize: 10, position: "insideTopRight" }} />
        <Bar dataKey="accuracy" radius={[3, 3, 0, 0]} maxBarSize={34}>
          {data.map((d, i) => <Cell key={i} fill={d.accuracy >= 0.5 ? T.up : T.down} />)}
        </Bar>
        <Bar dataKey="auc" radius={[3, 3, 0, 0]} maxBarSize={34} fill="#3a4553" fillOpacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EquityChart({ equity, keys }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={equity} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={T.grid} vertical={false} />
        <XAxis dataKey="date" tick={{ fill: T.faint, fontSize: 11 }} tickLine={false} axisLine={{ stroke: T.border }}
          minTickGap={50} tickFormatter={(d) => d.slice(2, 7)} />
        <YAxis tick={{ fill: T.faint, fontSize: 11 }} tickLine={false} axisLine={false} width={40}
          tickFormatter={(v) => `${v.toFixed(1)}×`} />
        <ReferenceLine y={1} stroke={T.border} />
        <Tooltip content={<ChartTip render={(p) =>
          p.sort((a, b) => b.value - a.value).map((s) =>
            tipRow(EQ_COLORS[s.name] || T.dim, s.name.replace(" long/flat", ""), `${s.value.toFixed(2)}×`))} />} />
        {keys.map((k) => (
          <Line key={k} type="monotone" dataKey={k} dot={false}
            stroke={EQ_COLORS[k] || T.dim} strokeWidth={k === "Buy & Hold" ? 1.4 : 1.8}
            strokeDasharray={k === "Buy & Hold" ? "5 4" : "0"} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function MetricsTable({ rows }) {
  const cols = [
    ["strategy", "Strategy", "left"],
    ["total_return", "Total return", "right"],
    ["sharpe", "Sharpe", "right"],
    ["max_drawdown", "Max drawdown", "right"],
    ["trades", "Trades", "right"],
  ];
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="bx-table">
        <thead>
          <tr>{cols.map(([k, lbl, al]) => <th key={k} style={{ textAlign: al }}>{lbl}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const bh = r.strategy === "Buy & Hold";
            return (
              <tr key={r.strategy} style={bh ? { background: "rgba(252,213,53,.05)" } : undefined}>
                <td>
                  <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 2, marginRight: 9,
                    background: EQ_COLORS[r.strategy] || T.dim }} />
                  {r.strategy.replace(" long/flat", "")}
                  {bh && <span className="bx-chip" style={{ marginLeft: 8, color: T.gold, borderColor: "rgba(252,213,53,.3)" }}>benchmark</span>}
                </td>
                <td className="mono" style={{ textAlign: "right", color: upDown(r.total_return), fontWeight: 600 }}>{signedPct(r.total_return)}</td>
                <td className="mono" style={{ textAlign: "right", color: upDown(r.sharpe) }}>{r.sharpe?.toFixed(2)}</td>
                <td className="mono" style={{ textAlign: "right", color: T.down }}>{signedPct(r.max_drawdown)}</td>
                <td className="mono" style={{ textAlign: "right", color: T.dim }}>{num(r.trades)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- styles ---------- */
function Style() {
  return (
    <style>{`
      :root{
        --sans:"IBM Plex Sans","Inter",system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
        --mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
      }
      *{box-sizing:border-box;}
      body{margin:0;background:${T.bg};}
      .bx-wrap{max-width:1180px;margin:0 auto;width:100%;}
      .mono{font-family:var(--mono);font-variant-numeric:tabular-nums;}

      .bx-badge{display:inline-flex;align-items:center;gap:7px;font-size:11.5px;color:${T.dim};
        border:1px solid ${T.border};background:${T.card};padding:5px 10px;border-radius:20px;}
      .bx-chip{font-size:10.5px;letter-spacing:.4px;text-transform:uppercase;color:${T.dim};
        border:1px solid ${T.border};padding:3px 8px;border-radius:5px;background:rgba(255,255,255,.02);}

      .bx-ticker{border-top:1px solid ${T.border};overflow:hidden;background:#0b0e12;}
      .bx-ticker-track{display:inline-flex;gap:34px;white-space:nowrap;padding:8px 22px;
        animation:bx-scroll 46s linear infinite;}
      .bx-ticker:hover .bx-ticker-track{animation-play-state:paused;}
      .bx-ticker-item{display:inline-flex;gap:8px;font-size:12px;align-items:center;}
      @keyframes bx-scroll{from{transform:translateX(0);}to{transform:translateX(-50%);}}

      .bx-verdict{display:flex;align-items:center;gap:16px;flex-wrap:wrap;
        background:linear-gradient(90deg,rgba(252,213,53,.06),rgba(252,213,53,.01));
        border:1px solid rgba(252,213,53,.22);border-left:3px solid ${T.gold};
        border-radius:12px;padding:16px 18px;margin-bottom:20px;}

      .bx-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;}
      .bx-stat{background:${T.card};border:1px solid ${T.border};border-radius:12px;padding:16px 18px;
        transition:border-color .18s,transform .18s;}
      .bx-stat:hover{border-color:${T.faint};transform:translateY(-2px);}

      .bx-panel{background:${T.panel};border:1px solid ${T.border};border-radius:14px;padding:18px 18px 12px;margin-bottom:20px;}
      .bx-two{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
      @media(max-width:880px){.bx-two{grid-template-columns:1fr;}}

      .bx-table{width:100%;border-collapse:collapse;font-size:13px;}
      .bx-table th{color:${T.dim};font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.4px;
        padding:0 14px 11px;border-bottom:1px solid ${T.border};white-space:nowrap;}
      .bx-table td{padding:13px 14px;border-bottom:1px solid ${T.grid};color:${T.text};white-space:nowrap;}
      .bx-table tbody tr:hover{background:rgba(255,255,255,.02);}
      .bx-table tbody tr:last-child td{border-bottom:none;}

      ::-webkit-scrollbar{height:8px;width:8px;}
      ::-webkit-scrollbar-thumb{background:${T.border};border-radius:8px;}
      ::-webkit-scrollbar-track{background:transparent;}
      @media(prefers-reduced-motion:reduce){.bx-ticker-track{animation:none;}}
    `}</style>
  );
}