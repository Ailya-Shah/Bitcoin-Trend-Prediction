# Bitcoin Trend Prediction — Dashboard

Interactive front-end for the analysis pipeline. Vite + React + Recharts.
Reads `public/data/dashboard.json`, produced by the analysis.

## Run locally
```bash
cd frontend
npm install
npm run dev          # opens http://localhost:5173
```

## Refresh the data
From the project root, after running the notebooks:
```bash
python scripts/export_frontend_data.py    # writes frontend/public/data/dashboard.json
```

## Deploy to Vercel
```bash
npm install -g vercel
cd frontend
vercel               # accept defaults; Vercel auto-detects Vite
```
Or connect the GitHub repo at vercel.com and set the **root directory** to `frontend`.
Build command `npm run build`, output dir `dist` (both auto-detected).

## Sections
Overview (the honest verdict) · The data · Returns & risk · Models · Backtest · Method & honesty.
