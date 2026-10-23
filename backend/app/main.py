from __future__ import annotations

import io
import json
import logging
import os
import pickle
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sklearn.pipeline import Pipeline

logger = logging.getLogger("netguard.api")
PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = Path(
    os.environ.get(
        "NETGUARD_MODEL_ARTIFACT",
        str(PROJECT_ROOT / "artifacts" / "netguard_selected_pipeline.joblib"),
    )
).expanduser()
EVALUATION_PATH = Path(
    os.environ.get(
        "NETGUARD_EVALUATION_JSON",
        str(PROJECT_ROOT / "outputs" / "reports" / "evaluation_results.json"),
    )
).expanduser()
FEATURE_IMPORTANCE_PATH = (
    PROJECT_ROOT / "outputs" / "figures" / "random_forest_feature_importance.png"
)
MAX_UPLOAD_BYTES = 50 * 1024 * 1024
MAX_RECORDS = 50_000
MAX_PREVIEW_COLUMNS = 200

app = FastAPI(
    title="NetGuard ML API",
    version="1.0.0",
    description="Offline network-flow CSV validation and binary classification.",
)
allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "NETGUARD_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def normalize_column_name(column: Any) -> str:
    name = str(column).replace("\ufeff", "").strip().lower()
    name = re.sub(r"[^a-z0-9]+", "_", name).strip("_")
    if not name:
        raise HTTPException(
            status_code=422,
            detail="A CSV column name could not be normalized safely.",
        )
    return name


def normalize_frame_columns(frame: pd.DataFrame) -> pd.DataFrame:
    normalized_columns = [normalize_column_name(column) for column in frame.columns]
    if len(set(normalized_columns)) != len(normalized_columns):
        raise HTTPException(
            status_code=422,
            detail="The CSV contains duplicate column names after normalization.",
        )
    result = frame.copy()
    result.columns = normalized_columns
    return result


@lru_cache(maxsize=1)
def load_model() -> Pipeline:
    if not MODEL_PATH.is_file():
        raise FileNotFoundError("The configured model artifact is unavailable.")
    try:
        model = joblib.load(MODEL_PATH)
    except (
        OSError,
        EOFError,
        ValueError,
        ImportError,
        AttributeError,
        pickle.UnpicklingError,
    ) as error:
        logger.exception("Could not load the configured model artifact.")
        raise RuntimeError("The configured model artifact could not be loaded.") from error
    if not isinstance(model, Pipeline):
        raise RuntimeError("The configured model artifact is not a scikit-learn Pipeline.")
    if not hasattr(model, "feature_names_in_") or "preprocessing" not in model.named_steps:
        raise RuntimeError("The configured model is missing its fitted input schema or preprocessing.")
    if not hasattr(model.named_steps["preprocessing"], "transformers_"):
        raise RuntimeError("The configured model preprocessing step has not been fitted.")
    return model


def input_schema(model: Pipeline) -> tuple[list[str], list[str], list[str]]:
    feature_columns = list(model.feature_names_in_)
    numeric_columns: list[str] = []
    categorical_columns: list[str] = []
    for transformer_name, _, columns in model.named_steps["preprocessing"].transformers_:
        if transformer_name == "numeric":
            numeric_columns = list(columns)
        elif transformer_name == "categorical":
            categorical_columns = list(columns)
    if set(numeric_columns + categorical_columns) != set(feature_columns):
        raise RuntimeError("The model's fitted input schema does not match its preprocessing schema.")
    return feature_columns, numeric_columns, categorical_columns


def require_model() -> Pipeline:
    try:
        return load_model()
    except (FileNotFoundError, RuntimeError) as error:
        raise HTTPException(
            status_code=503,
            detail="The model is unavailable. Check the configured artifact and API server logs.",
        ) from error


async def read_csv_upload(upload: UploadFile) -> tuple[pd.DataFrame, str, list[str]]:
    filename = Path(upload.filename or "").name
    if not filename or Path(filename).suffix.lower() != ".csv":
        raise HTTPException(status_code=415, detail="Choose a CSV file with a .csv extension.")
    content = await upload.read(MAX_UPLOAD_BYTES + 1)
    if not content:
        raise HTTPException(status_code=422, detail="The uploaded CSV is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="The CSV exceeds the 50 MB upload limit.",
        )
    try:
        frame = pd.read_csv(io.BytesIO(content), low_memory=False, nrows=MAX_RECORDS + 1)
    except pd.errors.EmptyDataError as error:
        raise HTTPException(status_code=422, detail="The uploaded CSV has no header or records.") from error
    except (pd.errors.ParserError, UnicodeDecodeError, ValueError) as error:
        raise HTTPException(
            status_code=422,
            detail="The CSV could not be parsed. Check its encoding, quoting, and column structure.",
        ) from error
    except OSError as error:
        raise HTTPException(status_code=422, detail="The uploaded CSV could not be read.") from error
    if frame.shape[1] == 0:
        raise HTTPException(status_code=422, detail="The CSV contains no columns.")
    if len(frame) > MAX_RECORDS:
        raise HTTPException(
            status_code=413,
            detail="The CSV exceeds the 50,000-record analysis limit.",
        )
    if frame.empty:
        raise HTTPException(status_code=422, detail="The CSV contains a header but no records.")
    normalized_frame = normalize_frame_columns(frame)
    return normalized_frame, filename, list(frame.columns.astype(str))


def prepare_uploaded_features(
    frame: pd.DataFrame,
    feature_columns: list[str],
    numeric_columns: list[str],
    categorical_columns: list[str],
) -> tuple[pd.DataFrame, list[str], list[str]]:
    missing_columns = [column for column in feature_columns if column not in frame.columns]
    if missing_columns:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "The CSV is missing required model feature columns.",
                "missing_columns": missing_columns,
            },
        )
    extra_columns = [column for column in frame.columns if column not in feature_columns]
    aligned = frame.loc[:, feature_columns].copy()
    for column in numeric_columns:
        original = aligned[column]
        stripped = original.astype("string").str.strip()
        blank_values = stripped.eq("").fillna(False)
        parsed = pd.to_numeric(original, errors="coerce")
        invalid_values = original.notna() & ~blank_values & parsed.isna()
        if invalid_values.any():
            rows = (np.flatnonzero(invalid_values.to_numpy()) + 2).tolist()[:5]
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "A numeric feature contains non-numeric values.",
                    "column": column,
                    "csv_rows": rows,
                    "action": "Provide numeric values or leave missing entries blank.",
                },
            )
        infinite_values = parsed.isin([np.inf, -np.inf])
        if infinite_values.any():
            rows = (np.flatnonzero(infinite_values.to_numpy()) + 2).tolist()[:5]
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "A numeric feature contains an infinite value.",
                    "column": column,
                    "csv_rows": rows,
                    "action": "Replace infinity with a finite number or a blank value.",
                },
            )
        aligned[column] = parsed.mask(blank_values, np.nan)
    for column in categorical_columns:
        values = aligned[column].astype("object")
        blank_values = values.astype("string").str.strip().eq("").fillna(False)
        aligned[column] = values.mask(blank_values, np.nan)
    return aligned, missing_columns, extra_columns


@app.get("/api/health")
def health() -> dict[str, Any]:
    try:
        load_model()
    except FileNotFoundError:
        return {
            "service_available": True,
            "model_available": False,
            "message": "The model artifact is not available. Configure the artifact path and restart the API.",
        }
    except RuntimeError:
        return {
            "service_available": True,
            "model_available": False,
            "message": "The model artifact could not be loaded. Check the API server logs.",
        }
    return {
        "service_available": True,
        "model_available": True,
        "message": "The fitted model is ready for offline CSV analysis.",
    }


@app.get("/api/model/evaluation")
def model_evaluation() -> dict[str, Any]:
    if not EVALUATION_PATH.is_file():
        raise HTTPException(status_code=404, detail="Saved model evaluation results are unavailable.")
    try:
        with EVALUATION_PATH.open("r", encoding="utf-8") as evaluation_file:
            saved = json.load(evaluation_file)
    except (OSError, json.JSONDecodeError, UnicodeDecodeError) as error:
        logger.exception("Could not read the saved model evaluation report.")
        raise HTTPException(
            status_code=500,
            detail="Saved model evaluation results could not be read. Check the API server logs.",
        ) from error
    models: dict[str, Any] = {}
    for model_name, model_data in saved.get("models", {}).items():
        metrics = model_data.get("metrics_on_held_out_test", {})
        models[model_name] = {
            "metrics": {
                key: metrics[key]
                for key in (
                    "accuracy",
                    "precision",
                    "recall",
                    "f1_score",
                    "macro_f1_score",
                    "false_positive_rate",
                    "true_negative",
                    "false_positive",
                    "false_negative",
                    "true_positive",
                )
                if key in metrics
            }
        }
    source = saved.get("source_dataset", {})
    split = saved.get("split", {})
    return {
        "created_at_utc": saved.get("created_at_utc"),
        "selected_model": saved.get("selected_model"),
        "selection_criteria": saved.get("selection_criteria"),
        "source_dataset": {
            "file_name": source.get("file_name"),
            "source_rows_scanned": source.get("source_rows_scanned"),
            "sample_rows": source.get("sample_rows"),
            "sample_class_counts": source.get("sample_class_counts"),
        },
        "split": {
            "strategy": split.get("strategy"),
            "test_fraction": split.get("test_fraction"),
            "test_rows": split.get("test_rows"),
            "test_class_counts": split.get("test_class_counts"),
            "limitation": split.get("limitation"),
        },
        "models": models,
        "warnings": saved.get("warnings", []),
        "feature_importance_available": FEATURE_IMPORTANCE_PATH.is_file(),
    }


@app.get("/api/model/feature-importance")
def feature_importance() -> FileResponse:
    if not FEATURE_IMPORTANCE_PATH.is_file():
        raise HTTPException(status_code=404, detail="The saved feature-importance figure is unavailable.")
    return FileResponse(FEATURE_IMPORTANCE_PATH, media_type="image/png")


@app.post("/api/validate")
async def validate_csv(file: UploadFile = File(...)) -> dict[str, Any]:
    model = require_model()
    frame, filename, original_columns = await read_csv_upload(file)
    feature_columns, numeric_columns, categorical_columns = input_schema(model)
    _, missing_columns, extra_columns = prepare_uploaded_features(
        frame,
        feature_columns,
        numeric_columns,
        categorical_columns,
    )
    return {
        "filename": filename,
        "record_count": len(frame),
        "columns": frame.columns.tolist()[:MAX_PREVIEW_COLUMNS],
        "total_columns": len(frame.columns),
        "required_feature_count": len(feature_columns),
        "missing_columns": missing_columns,
        "ignored_columns": extra_columns,
        "has_target_label": any(
            column in frame.columns for column in ("label", "class", "target", "attack_label")
        ),
        "valid": True,
        "message": "CSV schema and feature values are compatible with the fitted model.",
        "header_names_normalized": original_columns != frame.columns.tolist(),
    }


@app.post("/api/analyze")
async def analyze_csv(file: UploadFile = File(...)) -> dict[str, Any]:
    model = require_model()
    frame, filename, _ = await read_csv_upload(file)
    feature_columns, numeric_columns, categorical_columns = input_schema(model)
    features, _, ignored_columns = prepare_uploaded_features(
        frame,
        feature_columns,
        numeric_columns,
        categorical_columns,
    )
    try:
        predicted_classes = np.asarray(model.predict(features))
        probabilities: np.ndarray | None = None
        if hasattr(model, "predict_proba"):
            model_classes = list(model.classes_)
            if 1 not in model_classes:
                raise RuntimeError("The loaded classifier does not expose the ATTACK class.")
            probabilities = np.asarray(model.predict_proba(features))[:, model_classes.index(1)]
    except (ValueError, TypeError) as error:
        logger.exception("Model inference failed for a validated upload.")
        raise HTTPException(
            status_code=422,
            detail="The fitted model could not process the validated feature values.",
        ) from error
    if not set(np.unique(predicted_classes)).issubset({0, 1}):
        raise HTTPException(status_code=500, detail="The model returned an unsupported prediction class.")
    if probabilities is not None and (
        not np.isfinite(probabilities).all()
        or (probabilities < 0).any()
        or (probabilities > 1).any()
    ):
        raise HTTPException(status_code=500, detail="The model returned invalid probability estimates.")
    rows = []
    for index, predicted_class in enumerate(predicted_classes):
        row: dict[str, Any] = {
            "record_number": index + 1,
            "predicted_label": "POTENTIAL ATTACK" if int(predicted_class) == 1 else "BENIGN",
        }
        if probabilities is not None:
            row["estimated_attack_probability"] = round(float(probabilities[index]), 6)
        rows.append(row)
    attack_count = int(np.count_nonzero(predicted_classes == 1))
    return {
        "filename": filename,
        "records_total": len(rows),
        "predicted_benign": len(rows) - attack_count,
        "predicted_potential_attacks": attack_count,
        "probability_is_estimate": probabilities is not None,
        "ignored_columns": ignored_columns,
        "warnings": [
            "Predictions are model estimates, not verified ground truth or calibrated risk guarantees.",
            "This workflow classifies offline network-flow records; it does not capture packets or block traffic.",
        ],
        "predictions": rows,
    }
