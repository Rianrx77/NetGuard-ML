# NetGuard ML

NetGuard ML is a planned binary network-flow classification prototype for the
IBM SkillsBuild Cyber Security Bootcamp 2026, conducted by BharatCares.

The goal is to classify labeled CIC-IDS2017 flow records as:

- `BENIGN` (`0`)
- `ATTACK` (`1`; any dataset attack label)

## Implementation status

The notebook contains Phase 2 data exploration/preprocessing and Phase 3 binary
model training/evaluation workflows for Logistic Regression and Random Forest.
Eight CIC-IDS2017 CSV files are present under `data/raw/`. The notebook is
configured to use `Wednesday-workingHours.pcap_ISCX.csv` as its explicit subset.
The notebook cells have not yet completed execution, so no actual model scores,
fitted model artifact, or evaluation figures are claimed.

## Project files

- `PROJECT_SPEC.md` — scope, data source, candidate features, evaluation plan,
  loading strategy, risks, and reproducibility.
- `RianRenju_NetGuardML.ipynb` — exploration, preprocessing, and model evaluation
  workflow.
- `RianRenju_ProjectReport.docx` — Phase 1 report scaffold.
- `requirements.txt` — notebook dependencies, including joblib persistence.
- `data/raw/` — location for manually obtained original dataset files.
- `data/sample/` — location for explicitly sampled/derived data, not committed
  raw data.
- `artifacts/` — selected fitted pipeline, written only after a successful run.
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

Use a documented Python environment, a fixed random seed for sampling/splitting,
and record the selected source subset, row counts, label mapping, feature list,
split method, model parameters, and package versions in the generated evaluation
report. The notebook uses estimator class weights rather than resampling and
selects by attack F1, then recall, then lower false-positive rate. Never commit
secrets or large raw dataset files.

## Out of scope

Multiclass classification, live packet capture, dashboards, cloud deployment,
and paid APIs are not part of this prototype.

## Documentation references

- CIC-IDS2017 official dataset page: <https://www.unb.ca/cic/datasets/ids-2017.html>
- pandas CSV I/O and chunking: <https://pandas.pydata.org/docs/user_guide/io.html#io-chunking>
- scikit-learn classification metrics: <https://scikit-learn.org/stable/modules/model_evaluation.html>
