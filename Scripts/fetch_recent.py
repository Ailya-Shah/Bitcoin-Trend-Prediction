"""
fetch_recent.py
---------------
Fetches the newest *completed* daily BTC candles from Binance and appends them
to the cleaned processed file, in the exact same 8-column schema:

    date, open, high, low, close, volume_btc, volume_usd, source

Binance public market-data endpoints need NO API key.

Run from the project root (BITCOIN-TREND-PROJECT/):
    python fetch_recent.py

It reads data/processed/btc_usd_daily_2014_2026.csv, finds the last date,
downloads everything newer (skipping today's still-forming candle), and
writes the updated file back in place.
"""

import os
import time

import pandas as pd
import requests

PROCESSED = os.path.join("data", "processed", "btc_usd_daily_2014_2026.csv")

SYMBOL = "BTCUSDT"
INTERVAL = "1d"

# Primary endpoint. If Binance is geo-blocked in your region, swap this for the
# public data-only mirror, which is usually reachable: "https://data-api.binance.vision"
BASE_URL = "https://api.binance.com"


def fetch_klines(start_ms: int, base_url: str = BASE_URL) -> list:
    """Page through Binance klines from start_ms up to now. Returns raw rows."""
    out = []
    url = f"{base_url}/api/v3/klines"
    while True:
        params = {"symbol": SYMBOL, "interval": INTERVAL, "startTime": start_ms, "limit": 1000}
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        batch = resp.json()
        if not batch:
            break
        out.extend(batch)
        if len(batch) < 1000:
            break
        start_ms = batch[-1][0] + 1  # continue just past the last candle
        time.sleep(0.3)              # be polite to the API
    return out


def klines_to_df(raw: list) -> pd.DataFrame:
    """Map Binance's 12-field kline rows into our canonical 8-column schema.

    Binance kline indices:
      [0] open time (ms)  [1] open  [2] high  [3] low  [4] close
      [5] volume (BTC)    [7] quote asset volume (USD)
    """
    if not raw:
        return pd.DataFrame(columns=["date", "open", "high", "low", "close",
                                     "volume_btc", "volume_usd", "source"])
    df = pd.DataFrame(raw, columns=[
        "open_time", "open", "high", "low", "close", "volume_btc",
        "close_time", "volume_usd", "n_trades", "taker_base", "taker_quote", "ignore",
    ])
    df["date"] = pd.to_datetime(df["open_time"], unit="ms").dt.normalize()
    for c in ["open", "high", "low", "close", "volume_btc", "volume_usd"]:
        df[c] = df[c].astype(float)
    df["source"] = "binance"
    return df[["date", "open", "high", "low", "close", "volume_btc", "volume_usd", "source"]]


def update_processed(path: str = PROCESSED):
    existing = pd.read_csv(path, parse_dates=["date"])
    last_date = existing["date"].max()
    print(f"Existing data ends: {last_date.date()}  ({len(existing)} rows)")

    start = last_date + pd.Timedelta(days=1)
    start_ms = int(start.timestamp() * 1000)

    print(f"Fetching from {start.date()} ...")
    raw = fetch_klines(start_ms)
    fresh = klines_to_df(raw)

    # Drop today's still-forming candle — keep only completed UTC days.
    today_utc = pd.Timestamp.utcnow().tz_localize(None).normalize()
    fresh = fresh[fresh["date"] < today_utc]

    if fresh.empty:
        print("Already up to date — nothing new to add.")
        return existing

    # Round to match the existing file's formatting
    for c in ["open", "high", "low", "close"]:
        fresh[c] = fresh[c].round(2)
    fresh["volume_btc"] = fresh["volume_btc"].round(4)
    fresh["volume_usd"] = fresh["volume_usd"].round(2)

    combined = pd.concat([existing, fresh], ignore_index=True)
    combined = combined.drop_duplicates(subset="date", keep="last")
    combined = combined.sort_values("date").reset_index(drop=True)

    combined.to_csv(path, index=False)
    print(f"Added {len(fresh)} new day(s). File now ends {combined['date'].max().date()} "
          f"({len(combined)} rows).")
    print(fresh.tail().to_string(index=False))
    return combined


if __name__ == "__main__":
    update_processed()