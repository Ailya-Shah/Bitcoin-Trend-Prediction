# Bitcoin Trend Prediction — Final Report

## Headline
On out-of-sample data (2024-12-15 to 2026-06-15), next-day direction is
**near-random**, as the statistics predicted. Best classifier: 50.7%
(XGBoost) versus a ~50% coin flip. No model reached an AUC meaningfully above 0.5.

## Do the model differences matter?
- McNemar and Diebold-Mariano tests show the models are largely **not statistically
  distinguishable** from each other on this data.
- The neural network (Neural net (MLP)) did **not** beat the simple classical models — more
  complexity bought no edge on a near-random target.

## Does it make money?
- After 0.1% costs, most model strategies **underperform buy-and-hold**; high-churn
  long/short variants lose the most.
- Any single-window outperformance is **suggestive, not proven** — it needs multi-window
  walk-forward validation before being believed.

## Honest conclusion
The contribution is *correct methodology*, not a magic predictor: leakage-aware chronological
splits, baselines the models must beat, a fair neural benchmark, calibrated probabilities,
formal model-comparison tests, and a cost-aware backtest. Markets are hard, simple beats
complex, and accuracy is not profit.

## Most promising next lever
Not a bigger network — the on-chain features (notebook 05, via fetch_onchain.py) are the
data dimension most likely to add a real, defensible edge.
