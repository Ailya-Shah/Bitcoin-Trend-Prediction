"""
scripts/fetch_onchain.py
------------------------
Fetches free Bitcoin on-chain metrics from Blockchain.com's public charts API
(no key required) and saves them aligned to daily dates in the same style as the
price data, so notebook 05 can merge them as features.

Run from the project root:
    python scripts/fetch_onchain.py

Output: data/processed/btc_onchain.csv  with columns:
    date, active_addresses, n_transactions, hash_rate, miners_revenue, mempool_size
"""

import sys
from pathlib import Path

import pandas as pd
import requests

# make `import paths` work from scripts/
_p = Path(__file__).resolve().parent
while not (_p / "paths.py").exists() and _p != _p.parent:
    _p = _p.parent
sys.path.insert(0, str(_p))
import paths

BASE = "https://api.blockchain.info/charts"

# chart endpoint -> friendly column name
CHARTS = {
    "n-unique-addresses": "active_addresses",
    "n-transactions": "n_transactions",
    "hash-rate": "hash_rate",
    "miners-revenue": "miners_revenue",
    "mempool-size": "mempool_size",
}


def fetch_chart(slug: str) -> pd.Series:
    """Fetch one Blockchain.com chart as a daily date->value Series."""
    url = f"{BASE}/{slug}"
    params = {"timespan": "all", "format": "json", "sampled": "false"}
    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    values = resp.json()["values"]  # list of {"x": unix_ts, "y": value}
    s = pd.Series({pd.to_datetime(v["x"], unit="s").normalize(): v["y"] for v in values})
    s.index.name = "date"
    return s


def main():
    cols = {}
    for slug, name in CHARTS.items():
        print(f"Fetching {name} ...")
        try:
            cols[name] = fetch_chart(slug)
        except Exception as e:
            print(f"  skipped {name}: {e}")

    if not cols:
        print("No on-chain data fetched (network issue?). Try again later.")
        return

    onchain = pd.DataFrame(cols).sort_index()
    # daily granularity; forward-fill the occasional missing day
    onchain = onchain.resample("D").mean().ffill()
    out = paths.PROCESSED / "btc_onchain.csv"
    onchain.to_csv(out)
    print(f"\nSaved {len(onchain)} rows, {onchain.shape[1]} metrics -> {out}")
    print(onchain.tail(3))


if __name__ == "__main__":
    main()