# NetGuard ML

NetGuard ML is a planned binary network-flow classification prototype for the
IBM SkillsBuild Cyber Security Bootcamp 2026, conducted by BharatCares.

The goal is to classify labeled CIC-IDS2017 flow records as:

- `BENIGN` (`0`)
- `ATTACK` (`1`; any dataset attack label)

## Implementation status

The notebook's Phase 2/3 workflow has completed a run on
`Wednesday-workingHours.pcap_ISCX.csv` (692,703 source rows; 50,000-row
bounded sample; stratified 80/20 row-level split). On the 10,000-row held-out
test set, Logistic Regression achieved 0.9777 accuracy, 0.9698 ATTACK F1, and
0.02535 false-positive rate. Random Forest achieved 0.9983 accuracy, 0.9977
ATTACK F1, and 0.000945 false-positive rate, and was selected by the documented
criteria. It produced 6 false positives and 11 false negatives. See
`outputs/reports/` for the actual metrics, classification reports, dataset/split
metadata, and `outputs/figures/` for saved plots. This is a benchmark result,
not evidence of production performance or generalization to modern live traffic;
related flows may cross the random split.

## Project files

- `PROJECT_SPEC.md` — scope, data source, candidate features, evaluation plan,
  loading strategy, risks, and reproducibility.
- `RianRenju_NetGuardML.ipynb` — exploration, preprocessing, and model evaluation
  workflow.
- `RianRenju_ProjectReport.docx` — project report scaffold.
- `requirements.txt` — notebook dependencies, including joblib persistence.
- `data/raw/` — location for manually obtained original dataset files.
- `data/sample/` — location for explicitly sampled/derived data, not committed
  raw data.
- `artifacts/` — selected fitted preprocessing-plus-model pipeline.
- `outputs/figures/` — exploration and held-out evaluation figures.
- `outputs/reports/` — actual metrics, classification reports, and run metadata.

See [PROJECT_SPEC.md](PROJECT_SPEC.md) for scope, methodology, and limitations.

## Dataset

Use the CIC-IDS2017 resource published by the Canadian Institute for
Cybersecurity (UNB): <https://www.unb.ca/cic/datasets/ids-2017.html>.
Obtain the data from the official resource and place selected CSV files under
`data/raw/`. The dataset is large; do not load the full collection into memory
at once. See the specification for the planned chunked inspection and sampling
workflow.

## Reproducibility

The recorded run uses a fixed random seed for sampling/splitting and records the
selected source subset, row counts, label mapping, feature list, split method,
model parameters, and package versions in the evaluation report. The notebook
uses estimator class weights rather than resampling and selects by ATTACK F1,
then recall, then lower false-positive rate. Raw dataset files are local inputs
and must not be committed.

## Out of scope

Multiclass classification, live packet capture, dashboards, cloud deployment,
and paid APIs are not part of this prototype.

## Documentation references

- CIC-IDS2017 official dataset page: <https://www.unb.ca/cic/datasets/ids-2017.html>
- pandas CSV I/O and chunking: <https://pandas.pydata.org/docs/user_guide/io.html#io-chunking>
- scikit-learn classification metrics: <https://scikit-learn.org/stable/modules/model_evaluation.html>
