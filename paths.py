"""
paths.py  (project root)
------------------------
Single source of truth for every path in the project. Import this instead of
hardcoding paths, so scripts and notebooks resolve correctly no matter where
they're run from.

In a notebook (which lives in notebooks/), add this small bootstrap as the
FIRST cell so `import paths` works:

    import sys
    from pathlib import Path
    p = Path.cwd()
    while not (p / "paths.py").exists() and p != p.parent:
        p = p.parent
    sys.path.insert(0, str(p))
    import paths

Then use, e.g.:
    df = pd.read_csv(paths.PROCESSED_FILE)
    plt.savefig(paths.figures_dir("02_eda") / "price_log.png")
"""

from pathlib import Path

# paths.py sits at the project root, so its own folder IS the root.
ROOT = Path(__file__).resolve().parent

DATA = ROOT / "data"
RAW = DATA / "raw"
PROCESSED = DATA / "processed"
NOTEBOOKS = ROOT / "notebooks"
SCRIPTS = ROOT / "scripts"
MODELS = ROOT / "models"
OUTPUTS = ROOT / "outputs"

# The canonical cleaned dataset every analysis notebook reads.
PROCESSED_FILE = PROCESSED / "btc_usd_daily_2014_2026.csv"


def stage_dir(stage: str) -> Path:
    """outputs/<stage>/ — each notebook owns one folder. Created if missing."""
    d = OUTPUTS / stage
    d.mkdir(parents=True, exist_ok=True)
    return d


def figures_dir(stage: str) -> Path:
    """outputs/<stage>/figures/ — where a notebook saves its PNG charts."""
    d = stage_dir(stage) / "figures"
    d.mkdir(parents=True, exist_ok=True)
    return d


def tables_dir(stage: str) -> Path:
    """outputs/<stage>/tables/ — where a notebook saves result CSVs."""
    d = stage_dir(stage) / "tables"
    d.mkdir(parents=True, exist_ok=True)
    return d


def reports_dir() -> Path:
    """outputs/reports/ — rendered HTML of each executed notebook (run_all.py)."""
    d = OUTPUTS / "reports"
    d.mkdir(parents=True, exist_ok=True)
    return d


# Make sure the top-level folders exist on import.
for _d in (MODELS, OUTPUTS):
    _d.mkdir(parents=True, exist_ok=True)