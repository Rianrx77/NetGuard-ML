# NetGuard ML

NetGuard ML is an educational binary network-flow classification prototype for the
IBM SkillsBuild Cyber Security Bootcamp 2026, conducted by BharatCares.

The goal is to classify labeled CIC-IDS2017 flow records as:

- `BENIGN` (`0`)
- `ATTACK` (`1`; any dataset attack label)

## Implementation status

The notebook's Phase 2/3 training workflow completed a run on
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

Phase 4 loads the saved preprocessing-plus-model pipeline and classifies
compatible local CSV files without requiring ground-truth labels. Set
`NETGUARD_MODEL_ARTIFACT` to override the model path and
`NETGUARD_PREDICTION_CSV` to configure the input path, or edit either path in
the notebook. The input must include all trained feature columns; additional
columns are reported and ignored. Missing numeric values use the saved
imputer, while malformed numeric values and infinities are rejected. Per-record
labels and model-estimated ATTACK probabilities are written to
`outputs/reports/netguard_predictions.csv`. If no input path is configured, a
small demonstration CSV is created from the selected CIC-IDS2017 sample under
`data/sample/`; its predictions are not independent validation. Probability
values are estimates, not certainty.

This is offline flow-record classification only. It does not capture packets,
monitor live traffic, or block network connections.

## Project credits

NetGuard ML is an educational cybersecurity project developed as part of the
IBM SkillsBuild Cyber Security Bootcamp 2026, conducted by BharatCares.

**Author:** Rian Renju

[GitHub](https://github.com/Rianrx77/) · [LinkedIn](https://www.linkedin.com/in/rian-renju)

## Web interface

The optional local web interface is a separate frontend and API; the notebook
remains the training/evaluation workflow and the saved fitted pipeline remains
the source of prediction behavior. The frontend builds and lints successfully,
and the API has been exercised locally against the saved model. Browser checks
covered all five views, upload validation, inference, and generated CSV export
content. The 10-row demo upload produced 10 BENIGN predictions in that smoke
test; these are demonstration outputs, not independent validation or
model-performance results.

The app has Overview, Traffic Analysis, Findings, Model Evaluation, and
About/Methodology views. It displays the saved evaluation report and model
availability when served by the API, and runs uploads through the existing
fitted model. Uploads are limited to 50 MiB and 50,000 rows; CSVs are validated
against the saved model schema, read in memory, and not stored. The service does
not create an analysis history or perform live capture/blocking.
The interface uses the supplied Neural Shield SVG, Plus Jakarta Sans for UI
text, and IBM Plex Mono for monospace details; its existing light color palette
is retained.

### Run locally

In Terminal 1, from the project root, create an isolated backend Python
environment, install the model runtime and API dependencies, then start the API:

```powershell
python -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload
```

In Terminal 2, install and start the frontend:

```powershell
Set-Location frontend
npm install
npm run dev
```

Open the Vite URL printed by the dev server (normally
`http://localhost:5173`). The API defaults to `http://127.0.0.1:8000`.
To check the frontend separately, run these commands from `frontend\`:

```powershell
npm run lint
npm run build
```

Set `VITE_API_BASE_URL` in `frontend/.env.local` to change the frontend API
origin.
The backend can override model/evaluation paths with
`NETGUARD_MODEL_ARTIFACT` and `NETGUARD_EVALUATION_JSON`; configure permitted
browser origins with `NETGUARD_CORS_ORIGINS`. API payloads and limits are
documented in [API_CONTRACT.md](API_CONTRACT.md). These are local development
commands, not deployment instructions.

## Project files

- `PROJECT_SPEC.md` — scope, data source, candidate features, evaluation plan,
  loading strategy, risks, and reproducibility.
- `API_CONTRACT.md` — optional local frontend/backend API contract.
- `RianRenju_NetGuardML.ipynb` — exploration, preprocessing, model evaluation,
  and reusable offline prediction workflow.
- `frontend/` — optional React + TypeScript + Vite web UI; local build and lint
  verified.
- `backend/` — optional FastAPI integration for the saved model; local API
  routes verified against the saved artifact.
- `RianRenju_ProjectReport.docx` — project report scaffold.
- `requirements.txt` — notebook dependencies, including joblib persistence.
- `data/raw/` — location for manually obtained original dataset files.
- `data/sample/` — unlabeled inference and labeled attack demonstration
  samples derived from CIC-IDS2017; neither is independent validation.
- `artifacts/` — selected fitted preprocessing-plus-model pipeline.
- `outputs/figures/` — exploration and held-out evaluation figures.
- `outputs/reports/` — actual metrics, classification reports, run metadata,
  and per-record demonstration predictions.

See [PROJECT_SPEC.md](PROJECT_SPEC.md) for scope, methodology, and limitations.

## Dataset

Use the CIC-IDS2017 resource published by the Canadian Institute for
Cybersecurity (UNB): <https://www.unb.ca/cic/datasets/ids-2017.html>.
Place selected CSV files under `data/raw/`. The current recorded run streams
`Wednesday-workingHours.pcap_ISCX.csv` in chunks and caps a seeded
class-proportional sample at 50,000 rows; no remote download occurs. Raw CSVs
are excluded from version control.

## Reproducibility

The recorded run uses a fixed random seed for sampling/splitting and records the
selected source subset, row counts, label mapping, feature list, split method,
model parameters, and package versions in the evaluation report. The notebook
uses estimator class weights rather than resampling and selects by ATTACK F1,
then recall, then lower false-positive rate. Raw dataset files are local inputs
and must not be committed.

## Out of scope

Multiclass classification, live packet capture, traffic blocking, cloud
deployment, analysis history, and paid APIs are not part of this prototype.

## Documentation references

- CIC-IDS2017 official dataset page: <https://www.unb.ca/cic/datasets/ids-2017.html>
- pandas CSV I/O and chunking: <https://pandas.pydata.org/docs/user_guide/io.html#io-chunking>
- scikit-learn classification metrics: <https://scikit-learn.org/stable/modules/model_evaluation.html>
