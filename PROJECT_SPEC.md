# NetGuard ML — Project Specification

## Project

NetGuard ML is a machine-learning-based network intrusion detection prototype
for the IBM SkillsBuild Cyber Security Bootcamp 2026, conducted by BharatCares.
This specification describes the foundation phase only. It does not represent a
trained model, completed data analysis, or validated detection system.

## Problem and objective

Given labeled CIC-IDS2017 network-flow records, develop and evaluate a binary
classifier that distinguishes benign flows from attack flows. The prototype is
for a controlled educational evaluation, not operational network defense.

## Scope

In scope:

- Inspect CIC-IDS2017 flow CSV schemas and labels.
- Prepare a resource-conscious, reproducible data-loading and sampling process.
- Map labels to the two required classes.
- Build and compare Logistic Regression and Random Forest binary classifiers in
  the Jupyter notebook.
- Report evaluation metrics and limitations without overstating performance.

Out of scope:

- Multiclass attack-family prediction.
- Live packet capture or real-time alerting.
- Web dashboards, cloud deployment, and paid APIs.
- Claims of production readiness or protection against current threats.

## Dataset and target

Primary source: the official Canadian Institute for Cybersecurity CIC-IDS2017
page, <https://www.unb.ca/cic/datasets/ids-2017.html>. The page describes flow
CSV files generated using CICFlowMeter and reports daily files in the
approximately 7.8–13 GB range. The published capture covers five days, with
Monday described as normal activity and attacks present on later days. Exact
file contents, labels, schemas, and availability must be checked against the
downloaded files; none have been inspected in this foundation phase.

Binary mapping:

| Output class | Encoded target | Source labels |
|---|---:|---|
| `BENIGN` | 0 | The dataset's benign label |
| `ATTACK` | 1 | All non-benign attack labels |

Normalize label whitespace/encoding only after inspecting the actual CSV values.
Do not silently map unknown or missing labels; count and report them.

## Candidate features

Subject to verification against the downloaded CSV schema:

- Flow duration.
- Forward/backward packet counts and byte totals.
- Packet length summaries and directional flow statistics.
- Flow, packet, and byte rates.
- TCP flag counts and other available protocol/transport statistics.
- Protocol as a categorical value if present and valid.

Exclude the target, direct record identifiers (such as Flow ID), source and
destination IP addresses, and raw timestamps from the initial model feature
set. Review ports, duplicate records, and all fields for label leakage before
modeling. Keep the exact final feature list in the notebook and report.

## Dataset loading and preparation plan

1. Obtain only the required CSV files from the official dataset resource and
   place them under `data/raw/`; do not bundle or commit the large source files.
2. Inventory filenames and sizes; inspect headers and a small number of rows
   before selecting files or assuming a schema.
3. Read CSVs incrementally with `pandas.read_csv(..., chunksize=...)`, starting
   with a modest chunk such as 100,000 rows and adjusting to available memory.
   Inspect each chunk for column consistency, malformed values, label spelling,
   missing values, infinities, and class counts.
4. Use chunk-level statistics and a deterministic, documented sampling strategy
   for the initial educational modeling dataset; do not concatenate all days
   into one in-memory DataFrame. Preserve the source-file identity for
   split/leakage analysis. Write any selected sample under `data/sample/` and
   keep raw files unchanged.
5. Normalize column names and labels explicitly; validate the expected target
   values and feature types. Record discarded/unknown labels and data-quality
   decisions rather than silently suppressing them.
6. Before fitting any preprocessing steps, split records into train, validation,
   and test partitions. Fit imputation, encoding, or scaling only on training
   data, using a pipeline where appropriate.

Chunked ingestion bounds per-read memory but does not itself guarantee
representative sampling or prevent leakage. Sampling and split design must be
validated after the real files are inspected.

## Evaluation plan

Use the same documented, fixed stratified random 80/20 row-level split for
Logistic Regression and Random Forest. This is a baseline, not a leakage-proof
estimate: related flows may occur in both partitions, so random splitting can
overestimate generalization. Consider file/day-aware holdouts and duplicate/group
leakage in later evaluation.

Address class imbalance with estimator class weights (`balanced` for Logistic
Regression and `balanced_subsample` for Random Forest), rather than resampling.
Fit the approved preprocessing independently inside each model pipeline on
training rows only. Do not tune or select features using the held-out test set.

Report:

- Confusion matrix.
- Accuracy, attack-class precision, recall and F1, macro F1, false-positive rate,
  and confusion counts.
- A classification report with explicit zero-division handling.
- Precision-recall AUC and ROC AUC where probability/score outputs and both
  classes make the metric meaningful.
- Per-class counts and the threshold used for reported predictions.

Select the final fitted pipeline by attack-class F1, then attack recall, then
lower false-positive rate; prefer Logistic Regression only on an exact tie.
Record the chosen model, parameters, dataset subset, sample method, split
strategy, test results, and limitations in `outputs/reports/`. Save the
preprocessing-plus-classifier pipeline with joblib in `artifacts/`.

No metric values or model comparisons are available in Phase 1.

## Limitations

- CIC-IDS2017 is a specific, dated, controlled benchmark and does not represent
  all current production traffic or attack behavior.
- Class prevalence and recorded attack scenarios can bias evaluation.
- Flow-level records may contain correlated or duplicated observations;
  random row splits can overstate generalization.
- A chunked sample may omit rare behaviors or distort class proportions.
- Flow statistics and labels may contain data-quality issues or features that
  indirectly reveal the label.
- A high offline score would not establish operational effectiveness, safety,
  or real-time capability.
- The prototype does not inspect payloads, capture packets, or provide a
  deployment/response mechanism.

## Reproducibility strategy

Record the Python and dependency versions, source URLs, selected filenames and
SHA-256 checksums, chunk size, seed, sampling procedure, label mapping,
feature list, cleaning decisions, split logic, and model parameters. Keep raw
data unmodified and outside version control. Save generated figures/reports
under `outputs/`; save model artifacts only in a later implementation phase.

## Planned structure

```text
.
├── RianRenju_NetGuardML.ipynb
├── RianRenju_ProjectReport.docx
├── README.md
├── PROJECT_SPEC.md
├── requirements.txt
├── artifacts/
├── data/
│   ├── raw/
│   └── sample/
└── outputs/
    ├── figures/
    └── reports/
```

## Official documentation consulted

- CIC-IDS2017 dataset: <https://www.unb.ca/cic/datasets/ids-2017.html>
- pandas CSV I/O and chunking: <https://pandas.pydata.org/docs/user_guide/io.html#io-chunking>
- scikit-learn classification evaluation: <https://scikit-learn.org/stable/modules/model_evaluation.html>
