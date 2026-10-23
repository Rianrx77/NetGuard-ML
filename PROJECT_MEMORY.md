# NetGuard ML — Project Memory

Last updated: 2026-10-23

## Purpose and scope

Educational CIC-IDS2017 network-flow classifier for the IBM SkillsBuild Cyber
Security Bootcamp 2026 (BharatCares). Binary target only: `BENIGN` = 0 and
non-empty non-BENIGN labels = `ATTACK` = 1. Multiclass, live packet capture,
dashboards, cloud deployment, and production claims are out of scope.

## Current status

- **Implemented and run:** Phase 2 chunked exploration, bounded sampling,
  preprocessing, stratified row-level split; Phase 3 Logistic Regression and
  Random Forest training/evaluation, figures, reports, and selected joblib
  pipeline. Phase 4 adds reusable offline CSV prediction from the saved model.
- **Phase 4 verification:** the added prediction cell was compiled and run
  directly in `.venv-1` against the saved artifact and real CIC-IDS2017 rows.
  Ten predictions and ATTACK probability estimates were saved. The notebook
  editor's cell runner could not run because its selected execution model was
  unavailable; this phase was not executed through the notebook kernel.
- **Verified run subset:** `data/raw/Wednesday-workingHours.pcap_ISCX.csv`.
  Other CSVs are present locally but were not included in this run.
- **GitHub:** public repository `Rianrx77/NetGuard-ML`; `master` tracks
  `origin/master`. Phase 4 workflow commit `e1c12af` was pushed successfully.
- **Working tree:** the root `.gitignore` remains a pre-staged addition and was
  not included in the Phase 4 commit. Raw CSVs are ignored by the tracked
  `data/raw/.gitignore`.
- **Submission readiness:** foundation, notebook workflow, and one model run
  exist, but the project is not final-submission-ready. The DOCX is still a
  Phase 1 scaffold; it does not contain the completed Phase 2/3 results.

## Repository map

- `PROJECT_SPEC.md` — project specification and intended evaluation methodology.
- `README.md` — overview and summary of the completed Wednesday-subset run.
- `RianRenju_NetGuardML.ipynb` — configurable exploration, preprocessing,
  model training, evaluation, charting, and persistence workflow.
- `RianRenju_ProjectReport.docx` — existing Phase 1 report scaffold; update is
  still required before final submission.
- `requirements.txt` — Jupyter, pandas, NumPy, Matplotlib, scikit-learn, joblib.
- `data/raw/` — eight local CIC-IDS2017 CSVs; intentionally not committed.
  `data/raw/.gitignore` excludes `*.csv`.
- `data/sample/netguard_inference_demo.csv` — 10 unlabeled demonstration
  feature rows derived from the selected CIC-IDS2017 source; not independent
  validation.
- `artifacts/netguard_selected_pipeline.joblib` — fitted preprocessing +
  selected Random Forest pipeline.
- `outputs/figures/` — label distribution, data-quality plot, two confusion
  matrices, model comparison, and Random Forest feature-importance plot.
- `outputs/reports/` — actual metrics CSV, classification reports, and
  `evaluation_results.json` run metadata, plus
  `netguard_predictions.csv` from the Phase 4 demo.
- `.git/info/exclude` — local-only exclusions for `data/raw/*.csv`, `.venv/`,
  and `.venv-1/`; these exclusions are machine-local, not committed.

## Data flow and implementation

1. The notebook's configuration cell selects
   `data/raw/Wednesday-workingHours.pcap_ISCX.csv` by default. `CIC_IDS2017_CSV`
   can override the path. It reads chunks of 100,000 rows and caps the
   class-proportional sample at 50,000 rows using seeded per-class
   random-priority reservoirs (seed 42).
2. Column names are normalized to lowercase snake case; normalization
   collisions and ambiguous/missing target columns fail explicitly. The target
   is located among `label`, `class`, `target`, or `attack_label`. Labels are
   stripped and uppercased; blank labels are counted and removed. `BENIGN` maps
   to 0; all other observed non-empty labels map to 1.
3. The notebook reports schema, dtypes, labels, missing and infinite counts.
   Numeric infinities become missing. Rows with no target or no usable feature
   are removed. Duplicates are counted in the retained sample but not removed,
   because there is no justification to treat identical flow rows as invalid.
4. Target, IP/address identifiers, Flow ID, raw timestamps/date fields, and
   label-/outcome-/attack-like columns are excluded from model features.
   Destination port is retained. Remaining numeric values use training-fitted
   median imputation and standardization. Categorical values use constant
   imputation and one-hot encoding capped at 100 categories; unknown inference
   categories are ignored.
5. The notebook uses a fixed-seed, stratified 80/20 random row split. Each model
   is a scikit-learn pipeline containing a clone of the preprocessing
   `ColumnTransformer` and a classifier; pipelines fit on `X_train` only and
   evaluate once on the same `X_test`.
6. `prepare_features_for_inference` normalizes incoming headers, aligns the
   configured feature columns, handles numeric infinities, and returns features
   to transform with the fitted preprocessing workflow. The persisted
   `artifacts/netguard_selected_pipeline.joblib` includes preprocessing and the
   selected classifier.
7. Evaluation writes actual metrics/reports and run metadata under
   `outputs/reports/`; figures are saved under `outputs/figures/`.
8. Phase 4 loads the trusted local joblib pipeline, takes the required ordered
   feature names and numeric/categorical input columns from the fitted
   pipeline, and reads `NETGUARD_PREDICTION_CSV` (default
   `data/sample/netguard_inference_demo.csv`). An unset default input is
   generated once from up to 10 rows in the notebook's selected sample without
   labels. Missing required features, malformed/unreadable CSVs, non-numeric
   values in numeric columns, and infinite numeric values produce explicit
   errors. Truly missing numeric values are imputed by the saved pipeline.
   Extra columns (including a target, if supplied) are explicitly listed and
   ignored. Output is written to
   `outputs/reports/netguard_predictions.csv` with record number, predicted
   `BENIGN`/`POTENTIAL ATTACK`, and (when available) estimated ATTACK
   probability. Predictions are estimates, not verified labels. This processes
   offline records only; it does not capture packets or block traffic.

## Models and measured results

Class imbalance is handled with estimator weights, not resampling:

- Logistic Regression: `class_weight="balanced"`, `max_iter=1000`,
  `random_state=42`.
- Random Forest: 100 trees, `class_weight="balanced_subsample"`,
  `random_state=42`, `n_jobs=-1`.

Metric positive class is ATTACK. Zero-division handling is set to 0 in
classification reports and metric functions. The selection rule is highest
ATTACK F1, then highest ATTACK recall, then lowest false-positive rate; an exact
tie favors Logistic Regression.

Recorded evaluation (`outputs/reports/evaluation_results.json`):

- Source file size: 225,166,395 bytes; 692,703 rows scanned and eligible.
- Sample: 50,000 rows; 31,762 BENIGN and 18,238 ATTACK.
- Split: 40,000 train / 10,000 test. Test counts: 6,352 BENIGN and 3,648 ATTACK.
- Logistic Regression: accuracy 0.9777; ATTACK precision 0.9570, recall 0.9830,
  F1 0.9698; macro F1 0.9761; false-positive rate 0.02535; TN/FP/FN/TP =
  6,191/161/62/3,586.
- Random Forest (selected): accuracy 0.9983; ATTACK precision 0.99835, recall
  0.99698, F1 0.99767; macro F1 0.99817; false-positive rate 0.000945;
  TN/FP/FN/TP = 6,346/6/11/3,637.
- Environment recorded for this run: Python 3.14.3, pandas 3.1.0,
  scikit-learn 1.9.1, joblib 1.6.0.

These are results on a sampled Wednesday CIC-IDS2017 subset, not a guarantee of
generalization or production performance. A random row split can put related
flows in both partitions and overestimate generalization. Results do not
establish performance on modern live networks. No precision-recall AUC or ROC
AUC values are currently recorded. The JSON records filename/size but not a
SHA-256 checksum.

## Decisions and rationale

- Select one day/subset for a bounded first run rather than concatenating all
  daily CSVs into memory.
- Keep the raw dataset local and exclude it from version control due to size and
  reproducibility/licensing considerations.
- Retain duplicates unless source evidence justifies removal.
- Use class weights rather than synthetic/duplicated resampling.
- Keep one fixed split for comparing the two specified classifiers; report the
  potential correlated-flow leakage instead of calling the random split
  leakage-proof.
- Persist the preprocessing with the classifier to maintain the same
  feature-transform contract at inference.

## Dependencies and validation performed

Direct dependencies in `requirements.txt`: `jupyter`, `matplotlib`, `numpy`,
`pandas`, `scikit-learn`, `joblib`. The notebook was configured with a Python
3.14.3 `.venv-1` kernel. Recorded runtime package versions are above.

Validation actually performed:

- Notebook editor reported seven code cells with `success=true`, including
  data loading, plotting, preprocessing/splitting, both models, figures, and
  artifact/report persistence.
- The resulting metrics CSV, classification report, JSON, six figures, and
  2,837,275-byte joblib pipeline were present and inspected.
- Repository history and status were inspected; raw CSVs did not appear in
  commits. GitHub confirmed `master` is tracking `origin/master` after
  successfully pushing `e1c12af`.
- Phase 4 cell syntax and execution were checked in `.venv-1` using the saved
  joblib artifact and 10 real CIC-IDS2017 feature rows. The saved prediction
  CSV contained 10 rows with valid labels and probabilities in [0, 1]; this
  demonstration predicted 10 BENIGN and 0 POTENTIAL ATTACK with estimated
  ATTACK probabilities of 0.0. This is an illustrative input/output check, not
  an accuracy measurement or independent validation.
- Focused checks passed for optional label/extra fields (reported as ignored),
  missing numeric values (left to the fitted imputer), missing required
  features (rejected), non-numeric numeric-feature content (rejected), and a
  missing model artifact (explicit `FileNotFoundError`). CSV field content was
  treated as data; no fields were executed.
- The notebook execution tool failed before running the cell because
  `agent-host-copilotcli:auto` was unavailable. Direct cell execution was used
  instead; it does not verify the notebook editor/kernel integration.

## Incomplete work, risks, and next task

- Update `RianRenju_ProjectReport.docx` with real run methodology, metrics,
  visuals, limitations, and conclusions.
- Reconcile stale statements in `PROJECT_SPEC.md` (for example, its opening
  says the document is foundation-only, some dataset claims remain unverified,
  and the planned structure does not list all generated deliverables).
- Decide whether to add a file/day-aware evaluation before making generalization
  claims; do not interpret the random split as independent-flow testing.
- Consider recording a dataset checksum and metrics such as PR-AUC/ROC-AUC if
  required by the approved report scope.
- Run the notebook from top to bottom in a working notebook kernel to verify
  the Phase 4 cell in its native stateful workflow. The current demonstration
  predictions are not independent validation and must not be included as new
  model performance results.
- The root `.gitignore` is still staged as an addition outside the Phase 4
  commit; review it intentionally before any future commit. Do not accidentally
  stage raw CIC CSVs or virtual environments.
- The Phase 4 workflow and demonstration files are committed and pushed. The
  project memory update is tracked separately from that workflow commit.

**Next recommended task:** update the Word report from the already-generated
evaluation files, clearly describing the Wednesday subset, random-split
limitation, and Phase 4's illustrative offline prediction workflow. Completion
means the DOCX contains the actual recorded metrics and appropriate limitations
without presenting demonstration predictions as validation.
