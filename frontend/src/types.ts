export type HealthResponse = {
  service_available: boolean
  model_available: boolean
  message: string
}

export type ModelMetrics = {
  accuracy: number
  precision: number
  recall: number
  f1_score: number
  macro_f1_score: number
  false_positive_rate: number
  true_negative: number
  false_positive: number
  false_negative: number
  true_positive: number
}

export type EvaluationResponse = {
  created_at_utc: string
  selected_model: string
  selection_criteria: string
  source_dataset: {
    file_name: string
    source_rows_scanned: number
    sample_rows: number
    sample_class_counts: Record<string, number>
  }
  split: {
    strategy: string
    test_fraction: number
    test_rows: number
    test_class_counts: Record<string, number>
    limitation: string
  }
  models: Record<string, { metrics: ModelMetrics }>
  warnings: string[]
  feature_importance_available: boolean
}

export type ValidationResponse = {
  filename: string
  record_count: number
  columns: string[]
  total_columns: number
  required_feature_count: number
  missing_columns: string[]
  ignored_columns: string[]
  has_target_label: boolean
  valid: boolean
  message: string
  header_names_normalized: boolean
}

export type Prediction = {
  record_number: number
  predicted_label: 'BENIGN' | 'POTENTIAL ATTACK'
  estimated_attack_probability?: number
}

export type AnalysisResponse = {
  filename: string
  records_total: number
  predicted_benign: number
  predicted_potential_attacks: number
  probability_is_estimate: boolean
  ignored_columns: string[]
  warnings: string[]
  predictions: Prediction[]
}
