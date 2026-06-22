# Bitcoin Trend Prediction

An end-to-end, reproducible pipeline for analysing and forecasting Bitcoin price behaviour — from an automated data layer through full statistical analysis, classical ML, and a deep-learning benchmark, ending in a cost-aware backtest and an interactive dashboard.

The guiding principle is **honesty over hype**: cryptocurrency direction is close to unpredictable at short horizons, so the project is built to measure that honestly (leakage-aware splits, realistic baselines, calibrated evaluation) rather than to manufacture a misleading accuracy number.

## What makes it notable

- **Fully automated data layer.** Live daily candles pulled from the Binance public API (no key, no manual download) and merged with a decade of cleaned history — a continuous, gap-free 2014–2026 daily series.
- **On-chain data.** Bitcoin-specific signals (active addresses, hash rate, exchange flows) that price-only equity projects structurally cannot use.
- **Deep-learning benchmark.** An LSTM/GRU evaluated *head-to-head* against XGBoost on identical chronological splits — and reported honestly, even when the simpler model wins.
- **Full statistical rigor.** Distribution fitting, stationarity testing, ARMA, and the GARCH volatility family.
- **Reproducible.** One command runs every notebook in order and organises all outputs.

## Project structure

```
bitcoin-trend-prediction/
├── data/
│   ├── raw/                  # original downloads, never modified
│   └── processed/            # cleaned, merged canonical dataset
├── notebooks/                # the analysis pipeline (run in order)
│   ├── 01_data_cleaning.ipynb
│   ├── 02_eda.ipynb
│   ├── 03_statistical_analysis.ipynb
│   ├── 04_volatility_garch.ipynb
│   ├── 05_feature_engineering.ipynb
│   ├── 06_classical_ml.ipynb
│   ├── 07_deep_learning.ipynb
│   ├── 08_backtesting.ipynb
│   └── 09_model_comparison.ipynb
├── scripts/                  # data-acquisition utilities (run on demand)
│   ├── fetch_recent.py       # refresh price data from Binance
│   └── fetch_onchain.py      # fetch on-chain metrics
├── models/                   # saved model artifacts
├── outputs/                  # all generated results (see below)
│   ├── <stage>/figures/      # each notebook's charts
│   ├── <stage>/tables/       # each notebook's result CSVs
│   └── reports/              # rendered HTML of each executed notebook
├── paths.py                  # central path resolver — import, don't hardcode
├── run_all.py                # master runner for the notebook pipeline
├── requirements.txt
└── README.md
```

## Setup

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

The deep-learning dependency is commented out in `requirements.txt` — install it when you reach notebook 07.

## Running the pipeline

```bash
python run_all.py            # run every notebook in dependency order
python run_all.py --list     # show the ordered stages and what's built
python run_all.py --only 02  # run just the EDA notebook
python run_all.py --from 05  # run from feature engineering onward
```

Each notebook is executed, saved with its outputs in place, and rendered to a browsable HTML report in `outputs/reports/`. Figures and result tables land in `outputs/<stage>/`.

### Refreshing the data

The fetch scripts are intentionally separate from the runner — run them when you want fresh data, not on every analysis pass:

```bash
python scripts/fetch_recent.py     # append the newest daily candles
python scripts/fetch_onchain.py    # update on-chain metrics
```

## Pipeline stages

| # | Notebook | What it does | Status |
|---|----------|--------------|--------|
| 01 | `data_cleaning` | Merge two sources, fix a swapped-volume bug, validate | done |
| 02 | `eda` | Price/returns exploration, fat tails, volatility clustering | done |
| 03 | `statistical_analysis` | Distribution fitting, stationarity, ARMA, formal tests | planned |
| 04 | `volatility_garch` | GARCH / GJR-GARCH / EGARCH volatility models | planned |
| 05 | `feature_engineering` | Technical + on-chain features | planned |
| 06 | `classical_ml` | Logistic / Random Forest / XGBoost baselines | planned |
| 07 | `deep_learning` | LSTM/GRU benchmark vs the classical models | planned |
| 08 | `backtesting` | Cost-aware, walk-forward strategy evaluation | planned |
| 09 | `model_comparison` | Diebold-Mariano, McNemar, calibration, final report | planned |

## Data sources

- **Price:** Binance public API (BTCUSDT daily klines) + a cleaned 2014–2017 history from CryptoDataDownload.
- **On-chain:** free public sources (e.g. Blockchain.com charts, CoinMetrics community data).

## Methodology & honesty notes

- Short-horizon crypto direction is near-random; reported accuracy is expected to be modest (low-to-mid 50s%), and that is the honest result, not a failure.
- All train/test splits are **chronological** — no shuffling of time-series data, which would leak the future into training.
- Backtests include realistic transaction costs and use walk-forward evaluation.
