"""
run_all.py  (project root)
--------------------------
Executes the analysis notebooks in dependency order, saves each executed
notebook in place, and renders a clean HTML report of each into
outputs/reports/. Notebooks that don't exist yet are skipped, so this works
while the project is still being built.

Usage (from the project root):
    python run_all.py                 # run the whole pipeline
    python run_all.py --list          # show the ordered stages
    python run_all.py --only 02 03    # run just stages 02 and 03
    python run_all.py --from 05       # run stage 05 onward
    python run_all.py --timeout 1800  # per-notebook timeout in seconds

Data-fetching scripts (scripts/fetch_recent.py, scripts/fetch_onchain.py) are
deliberately NOT part of this runner — you run those on demand to refresh data,
not every time you re-run the analysis.
"""

import argparse
import time

import nbformat
from nbconvert import HTMLExporter
from nbconvert.preprocessors import ExecutePreprocessor

import paths

# The pipeline, in dependency order: (stage id, notebook filename).
NOTEBOOKS = [
    ("01_data_cleaning",        "01_data_cleaning.ipynb"),
    ("02_eda",                  "02_eda.ipynb"),
    ("03_statistical_analysis", "03_statistical_analysis.ipynb"),
    ("04_volatility_garch",     "04_volatility_garch.ipynb"),
    ("05_feature_engineering",  "05_feature_engineering.ipynb"),
    ("06_classical_ml",         "06_classical_ml.ipynb"),
    ("07_deep_learning",        "07_deep_learning.ipynb"),
    ("08_backtesting",          "08_backtesting.ipynb"),
    ("09_model_comparison",     "09_model_comparison.ipynb"),
]


def run_one(stage: str, fname: str, timeout: int):
    """Execute one notebook; return (status, seconds, note)."""
    nb_path = paths.NOTEBOOKS / fname
    if not nb_path.exists():
        return ("skipped", 0.0, "not created yet")

    nb = nbformat.read(nb_path, as_version=4)
    ep = ExecutePreprocessor(timeout=timeout, kernel_name="python3")
    t0 = time.time()
    try:
        # cwd = project root, so `import paths` and relative paths resolve.
        ep.preprocess(nb, {"metadata": {"path": str(paths.ROOT)}})
    except Exception as e:
        nbformat.write(nb, nb_path)  # save partial run for debugging
        msg = str(e).splitlines()[-1][:140] if str(e) else "execution error"
        return ("FAILED", time.time() - t0, msg)

    nbformat.write(nb, nb_path)  # save executed notebook (outputs visible in place)

    html, _ = HTMLExporter().from_notebook_node(nb)
    (paths.reports_dir() / f"{stage}.html").write_text(html, encoding="utf-8")
    return ("ok", time.time() - t0, "")


def select(plan, only, from_stage):
    if only:
        keys = set(only)
        return [(s, f) for (s, f) in plan
                if s in keys or s.split("_")[0] in keys]
    if from_stage:
        idx = next((i for i, (s, _) in enumerate(plan)
                    if s == from_stage or s.split("_")[0] == from_stage), 0)
        return plan[idx:]
    return plan


def main():
    ap = argparse.ArgumentParser(description="Run the BTC analysis notebook pipeline.")
    ap.add_argument("--only", nargs="*", help="stage ids/numbers to run (e.g. 02 03)")
    ap.add_argument("--from", dest="from_stage", help="run from this stage onward (e.g. 05)")
    ap.add_argument("--timeout", type=int, default=1200, help="per-notebook timeout (s)")
    ap.add_argument("--list", action="store_true", help="list stages and exit")
    args = ap.parse_args()

    if args.list:
        print("Pipeline stages (in order):")
        for sid, f in NOTEBOOKS:
            exists = "  ✓" if (paths.NOTEBOOKS / f).exists() else "  · (todo)"
            print(f"  {sid:26} {f:34}{exists}")
        return

    plan = select(NOTEBOOKS, args.only, args.from_stage)

    print(f"Running {len(plan)} stage(s)...\n")
    results = []
    for sid, f in plan:
        print(f"-> {sid}", flush=True)
        status, secs, note = run_one(sid, f, args.timeout)
        results.append((sid, status, secs, note))
        tag = {"ok": "done", "FAILED": "FAILED", "skipped": "skipped"}[status]
        print(f"   {tag} ({secs:.1f}s){'  ' + note if note else ''}\n")

    print("=" * 60)
    print("PIPELINE SUMMARY")
    print("=" * 60)
    for sid, status, secs, note in results:
        print(f"  {sid:26} {status:8} {secs:6.1f}s  {note}")
    reports = paths.reports_dir()
    print(f"\nHTML reports -> {reports}")
    print(f"Figures/tables -> {paths.OUTPUTS}/<stage>/")


if __name__ == "__main__":
    main()