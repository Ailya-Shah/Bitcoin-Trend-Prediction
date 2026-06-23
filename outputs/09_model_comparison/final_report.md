# Bitcoin Trend Prediction — Final Report

## Headline
On out-of-sample data (2024-09-25 to 2026-06-15), next-day
direction is **near-random**, exactly as the statistical analysis predicted. The
best classifier reached 51.7% accuracy (RandomForest),
versus a ~50% coin flip. No model achieved an AUC meaningfully above 0.5.

## Does the difference between models matter?
- McNemar and Diebold-Mariano tests (tables in outputs/09) show the models are
  largely **not statistically distinguishable** from each other on this data.
- The deep LSTM did **not** beat the simple classical models — fancier
  architecture bought no edge on a near-random target, at far higher complexity.

## Does it make money?
- After 0.1% transaction costs, most model strategies **underperform buy-and-hold**;
  high-churn long/short variants lose the most to costs.
- One strategy (RandomForest long/flat) beat buy-and-hold on this single window,
  but with one test period and a sub-50% win rate, that is **suggestive, not proven** —
  it needs multi-window walk-forward validation before being believed.

## Honest conclusion
This project demonstrates *correct methodology* rather than a magic predictor:
leakage-aware chronological splits, baselines that the models must beat, a fair
deep-learning benchmark, calibrated probabilities, formal model-comparison tests,
and a cost-aware backtest. The honest result — markets are hard, simple beats
complex, and accuracy is not profit — is the contribution.

## Most promising next lever
Not a bigger network. The on-chain features (notebook 05, via fetch_onchain.py)
are the data dimension most likely to add a real, defensible edge.
