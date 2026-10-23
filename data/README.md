# Data directory

- `raw/` is for locally obtained CIC-IDS2017 source CSV files. The original
  dataset files are excluded from Git; do not commit them.
- `sample/netguard_inference_demo.csv` is a small, unlabeled demonstration
  input derived from the selected project subset. Its predictions are not
  independent validation.
- `sample/netguard_labeled_attack_demo.csv` contains 35 genuine records
  selected from `raw/Wednesday-workingHours.pcap_ISCX.csv`: 20 BENIGN and
  three each labeled DOS GOLDENEYE, DOS HULK, DOS SLOWHTTPTEST, DOS SLOWLORIS,
  and HEARTBLEED. The original CIC-IDS2017 labels are retained in the
  additional `label` column; the 78 other columns match the trained model's
  input features. Selection used a fixed random seed and excluded rows with
  infinite or non-numeric feature values; missing values, if any, remain for
  the saved preprocessing pipeline to handle. The UI/API treats `label` as an
  extra column and ignores it for prediction. This is a labeled demonstration
  sample, not independent validation, and may overlap records in the training
  subset.

The project does not download the dataset automatically. See
[`../PROJECT_SPEC.md`](../PROJECT_SPEC.md) for the source and data-handling
plan.
