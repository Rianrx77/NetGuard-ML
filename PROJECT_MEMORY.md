# NetGuard ML — Project Memory

Last updated: 2026-10-23

## Purpose and scope

Educational CIC-IDS2017 network-flow classifier for the IBM SkillsBuild Cyber
Security Bootcamp 2026 (BharatCares). The core workflow is a notebook-based
binary classifier: `BENIGN` = 0 and non-empty non-BENIGN labels = `ATTACK` = 1.
An optional local web UI/API wraps the saved model for offline CSV inference.
Multiclass classification, live packet capture/blocking, cloud deployment, and
production claims remain out of scope.

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
  `origin/master`. Phase 4 workflow commit `e1c12af` and the Phase 5 interface,
  author credits, and documentation commit `c3c52d5` are pushed.
- **Working tree after `c3c52d5`:** the regenerated notebook output, evaluation
  JSON timestamp, and classification-report trailing newline were deliberately
  excluded from the commit. Unused Vite starter assets under
  `frontend/public/` and `frontend/src/assets/` also remain untracked. The root
  `.gitignore` was reviewed and committed; it excludes the scaffold DOCX.
  CIC-IDS2017 raw CSVs remain ignored by `data/raw/.gitignore`.
- **Phase 5 scope approved:** React + TypeScript + Vite frontend with a minimal
  FastAPI backend, documented API contract, no database/history, and no
  real-time capture or mock analysis data. Upload limits are 50 MB and 50,000
  records.
- **Phase 5 verified locally:** backend dependencies installed in the isolated
  `backend/.venv`; frontend dependencies installed with npm. `npm run build`
  and `npm run lint` pass. Live API checks against the saved pipeline passed
  for health, evaluation, feature-importance image, valid demo CSV validation
  and inference (10 records), invalid schema/nonnumeric-value rejection
  (`422`), and missing-model behavior (`503`). The demo predicted 10 BENIGN
  records; this is a smoke test, not independent validation.
- **Phase 5 browser checks:** all five views rendered and navigated; uploading
  the demo CSV produced a 10-row prediction table. At a 375 CSS-pixel viewport,
  page width matched scroll width (no horizontal overflow observed). The CSV
  export generated the expected header and 10 data rows. The integrated browser
  did not expose a native download event, so saved-file behavior itself was not
  verified.
- **Phase 5 test approach:** Starlette's `TestClient` could not import because
  the isolated requirements do not include its optional `httpx2` dependency;
  equivalent route checks ran against actual local Uvicorn servers using HTTP
  requests. No test-only runtime dependency was added.
- **Branding update:** frontend masthead uses the supplied Neural Shield SVG
  from the project root. Typography is Plus Jakarta Sans for UI text and IBM
  Plex Mono for monospace details, loaded from Google Fonts. Existing light
  color palette remains unchanged. Frontend build/lint pass; browser confirms
  the logo renders and the Plus Jakarta Sans family is available. IBM Plex Mono
  is assigned to the shared monospace token used for record identifiers.
- **About page credits:** a compact Project credits panel follows the existing
  About & Methodology content. It identifies Rian Renju, links to the supplied
  GitHub and LinkedIn profiles, and includes the provided bootcamp attribution.
  No credentials or additional biography are displayed. README now includes
  the same factual project context and author profile links.
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
- `API_CONTRACT.md` — documented local FastAPI routes, payloads, upload limits,
  and error responses.
- `backend/app/main.py` — FastAPI health, saved-evaluation, feature-importance,
  CSV validation, and fitted-model inference routes.
- `backend/requirements.txt` — isolated FastAPI/Uvicorn and model inference
  runtime dependencies. `backend/.gitignore` excludes its virtual environment.
- `frontend/` — React + TypeScript + Vite source, API client/types, five
  application views, responsive styling, `.env.example`, and npm lockfile;
  build and lint verified. Masthead imports the root `netguard_ml_light.svg`;
  fonts are linked from Google Fonts in `frontend/index.html`. The About view's
  `Project credits` panel is implemented in `src/App.tsx` and styled in
  `src/App.css`.
- `data/README.md` — local dataset and demonstration-file placement guidance.
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
9. Approved Phase 5 backend source loads the same fitted pipeline lazily and
   reads the actual evaluation JSON and feature-importance PNG. `API_CONTRACT.md`
   documents `/api/health`, `/api/model/evaluation`,
   `/api/model/feature-importance`, `/api/validate`, and `/api/analyze`.
   Uploads are limited to 50 MiB and 50,000 records; files are read in memory
   and not persisted. Required columns are validated, and malformed CSVs,
   header collisions, non-numeric numeric features, and infinities are
   rejected. Additional columns are reported as ignored. There is no database
   or history. Routes were exercised against the actual local Uvicorn service;
   the saved model loaded and returned predictions. Missing-model behavior
   returned `503`.
10. The Phase 5 frontend source contains Overview, Traffic Analysis, Findings,
    Model Evaluation, and About/Methodology views. It requests live health and
    saved evaluation data and uses the API for file validation and actual
    inference; prediction tables support search, pagination, CSV export, and a
    minimum estimated-probability filter on Findings. Selecting a replacement
    input clears prior session results. npm build/lint pass; browser navigation,
    demo inference display, mobile-width layout, and generated CSV contents
    were checked. Native browser download completion remains unverified.

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
- Before Phase 5, repository inspection found no frontend or backend. Vite
  scaffolded a React + TypeScript project, then its app source was replaced
  with the approved views and Arctic Intelligence styling. `data/README.md`
  documents local dataset and sample placement.
- Backend dependencies installed successfully in `backend/.venv`; core imports
  succeeded with FastAPI 0.161.1, pandas 3.1.0, and scikit-learn 1.9.1.
- Frontend `npm install`, `npm run build` (TypeScript + Vite), and
  `npm run lint` completed successfully. Build emitted the production bundle;
  lint returned no diagnostics.
- After the branding update, `npm run build`, `npm run lint`, and
  `git diff --check` passed. Browser rendering showed the imported SVG logo;
  Plus Jakarta Sans was available in the page's font set. The separate IBM Plex
  Mono face is configured but was not forced to render during this visual check.
- For the About page credits update, `npm run build`, `npm run lint`, and
  `git diff --check` passed. Browser checks at 1280px, 768px, and 390px showed
  no document horizontal overflow; the credits panel used a horizontal
  arrangement on desktop/tablet and a single-column arrangement on mobile.
  Existing system overview, dataset, model/preprocessing, interpretation, and
  limitations headings remained present. The two profile anchors displayed the
  configured URLs, descriptive accessible labels, and `_blank` targets.
  Keyboard Tab navigation reached the links with a visible focus outline.
  External destination availability was not independently checked.
- Live HTTP checks passed for API health/model availability, saved evaluation,
  feature-importance PNG, validation of the 10-row demo CSV, and inference of
  all 10 rows. The response contained 10 BENIGN predictions; these are example
  demo predictions, not new evaluation results.
- Live API validation returned `422` for missing required columns and for a
  nonnumeric numeric feature. With a deliberately missing model artifact, the
  health route reported model unavailable and validation returned `503`.
- Browser check rendered all five views and exercised upload, validation,
  inference, and result-table rendering. At a 375-pixel viewport the document
  scroll width equaled its client width. Export generated a CSV blob with the
  expected three-column header and 10 rows; the browser harness did not report
  a native download event, so saved-file completion remains unverified.
- A first API test attempt using `TestClient` could not start because Starlette
  required optional `httpx2`; route checks were then completed against actual
  Uvicorn servers, without adding a test-only runtime dependency.
- Local Uvicorn and Vite servers were started for verification; no deployment
  was performed.

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
- Complete or formally accept the remaining browser-native CSV download check;
  generated CSV blob contents were inspected but no native download event was
  exposed by the integrated browser.
- Reconcile stale statements in `PROJECT_SPEC.md` and update
  `RianRenju_ProjectReport.docx` with the actual Phase 2/3 results, visuals,
  methodology, and limitations.
- Run the notebook top-to-bottom in a working notebook kernel to verify Phase 4
  in its native stateful workflow; the existing direct cell check did not
  verify notebook editor/kernel integration.
- Remove or replace unused Vite starter assets and starter documentation after
  checking they are not referenced. Select an appropriate project license
  before adding a `LICENSE`; none has been chosen.
- The root `.gitignore` is still staged as an addition outside the Phase 4
  commit; review it intentionally before any future commit. Do not accidentally
  stage raw CIC CSVs or virtual environments.
- The Phase 4 workflow and demonstration files are committed and pushed. The
  project memory update is tracked separately from that workflow commit.
- Phase 5 architecture and limits were approved on 2026-10-23. Local setup,
  frontend build/lint, live API routes, model-unavailable behavior, and
  responsive navigation have been verified. Implementation and documentation
  were committed as `c3c52d5` and pushed to `origin/master`. Post-commit
  notebook/report output changes and unused starter assets remain local and
  were not pushed.

**Next recommended task:** update the report DOCX with actual Phase 2/3 results
and limitations, reconcile the remaining stale project-spec text, and run the
notebook top-to-bottom in its native kernel. Keep demonstration predictions
separate from model performance evidence.
