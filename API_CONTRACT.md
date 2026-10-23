# NetGuard ML local API contract

The FastAPI service exposes the existing fitted scikit-learn pipeline to the
local React application. The model artifact and evaluation report remain the
source of truth; the service does not retrain models or persist uploaded CSVs.

## Local service

- Base URL: `http://127.0.0.1:8000`
- OpenAPI documentation: `http://127.0.0.1:8000/docs`
- CORS allows the local Vite development origins by default.
- Configure `NETGUARD_MODEL_ARTIFACT`, `NETGUARD_EVALUATION_JSON`, and
  `NETGUARD_CORS_ORIGINS` as environment variables to override defaults.
- Uploaded CSV limits: 50 MiB and 50,000 records.

## `GET /api/health`

Returns actual service and model-artifact availability.

```json
{
  "service_available": true,
  "model_available": true,
  "message": "The fitted model is ready for offline CSV analysis."
}
```

## `GET /api/model/evaluation`

Returns a sanitized projection of `outputs/reports/evaluation_results.json`:
evaluation timestamp, selected model and selection criteria, source subset and
sample counts, test split context, actual held-out metrics and confusion counts
for each model, limitations, warnings, and whether the saved feature-importance
figure is available. Absolute local file paths and classifier parameters are not
returned.

## `GET /api/model/feature-importance`

Returns the existing Random Forest feature-importance PNG, or `404` when the
actual figure is unavailable. The visualization is not a causal explanation.

## `POST /api/validate`

Content type: `multipart/form-data`, with a `file` field containing one `.csv`.

Validates file size, CSV parsing, record limit, normalized header uniqueness,
the trained feature schema, numeric feature values, and infinities. A target
label is optional. Extra columns are listed and ignored; missing required
features produce `422`. A valid response contains the normalized columns,
record count, required feature count, optional label presence, and validation
status. No uploaded row values or local paths are returned.

## `POST /api/analyze`

Content type: `multipart/form-data`, with a `file` field containing one `.csv`.

Repeats server-side validation and runs inference through the saved pipeline.
Response includes input filename, record and class-prediction counts, ignored
column names, explicit offline-use warnings, and per-record:

```json
{
  "record_number": 1,
  "predicted_label": "POTENTIAL ATTACK",
  "estimated_attack_probability": 0.92
}
```

The probability is a model estimate, not proof, confidence calibration, or a
severity score. `estimated_attack_probability` is omitted if the loaded
classifier does not support `predict_proba`. The frontend exports these actual
returned prediction rows as CSV; the server does not store uploads or results.

## Error responses

Errors use FastAPI's JSON `detail` response. Common status codes are `413` for
the byte/record limit, `415` for a non-CSV file, `422` for unreadable,
malformed, or schema-incompatible CSV data, `404` for absent evaluation
visualization/results, and `503` when the configured model artifact is
unavailable to validation or analysis. Messages avoid local filesystem paths
and stack traces. Uploaded CSV fields are parsed strictly as data and never
executed.
