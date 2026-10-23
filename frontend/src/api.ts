import type {
  AnalysisResponse,
  EvaluationResponse,
  HealthResponse,
  ValidationResponse,
} from './types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, init)
  } catch {
    throw new Error('Cannot reach the NetGuard API. Start the backend and try again.')
  }
  if (!response.ok) {
    let message = `Request failed (${response.status}).`
    try {
      const body = (await response.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') message = body.detail
      else if (body.detail && typeof body.detail === 'object' && 'message' in body.detail) {
        message = String(body.detail.message)
      }
    } catch {
      message = `Request failed (${response.status}). Check that the backend is running.`
    }
    throw new Error(message)
  }
  return (await response.json()) as T
}

function upload(file: File): FormData {
  const form = new FormData()
  form.append('file', file)
  return form
}

export const getHealth = () => request<HealthResponse>('/api/health')
export const getEvaluation = () => request<EvaluationResponse>('/api/model/evaluation')
export const validateCsv = (file: File) =>
  request<ValidationResponse>('/api/validate', { method: 'POST', body: upload(file) })
export const analyzeCsv = (file: File) =>
  request<AnalysisResponse>('/api/analyze', { method: 'POST', body: upload(file) })
export const featureImportanceUrl = `${API_BASE}/api/model/feature-importance`
