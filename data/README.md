# Data directory

- `raw/` is for locally obtained CIC-IDS2017 source CSV files. The original
  dataset files are excluded from Git; do not commit them.
- `sample/netguard_inference_demo.csv` is a small, unlabeled demonstration
  input derived from the selected project subset. Its predictions are not
  independent validation.

The project does not download the dataset automatically. See
[`../PROJECT_SPEC.md`](../PROJECT_SPEC.md) for the source and data-handling
plan.
