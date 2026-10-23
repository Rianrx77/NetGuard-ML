import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileCheck2,
  FileText,
  Github,
  LayoutDashboard,
  Linkedin,
  Menu,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import brandLogo from '../../netguard_ml_light.svg'
import { analyzeCsv, featureImportanceUrl, getEvaluation, getHealth, validateCsv } from './api'
import type {
  AnalysisResponse,
  EvaluationResponse,
  HealthResponse,
  Prediction,
  ValidationResponse,
} from './types'
import './App.css'

type Page = 'overview' | 'analysis' | 'findings' | 'evaluation' | 'about'

const navigation: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analysis', label: 'Traffic analysis', icon: Activity },
  { id: 'findings', label: 'Findings', icon: ShieldAlert },
  { id: 'evaluation', label: 'Model evaluation', icon: FileCheck2 },
  { id: 'about', label: 'About & methodology', icon: BookOpen },
]

const pageMeta: Record<Page, { title: string; description: string }> = {
  overview: {
    title: 'Overview',
    description: 'A measured view of the fitted model and the current workspace.',
  },
  analysis: {
    title: 'Traffic analysis',
    description: 'Validate and classify a compatible network-flow CSV offline.',
  },
  findings: {
    title: 'Findings',
    description: 'Review records the model marked as potential attacks.',
  },
  evaluation: {
    title: 'Model evaluation',
    description: 'Held-out benchmark results from the recorded CIC-IDS2017 run.',
  },
  about: {
    title: 'About & methodology',
    description: 'What this prototype does, how it was evaluated, and where it stops.',
  },
}

const MAX_FILE_BYTES = 50 * 1024 * 1024

function formatNumber(value: number | undefined) {
  return value === undefined ? '—' : new Intl.NumberFormat().format(value)
}

function formatPercent(value: number | undefined, digits = 2) {
  return value === undefined ? '—' : `${(value * 100).toFixed(digits)}%`
}

function formatFileSize(value: number) {
  return value < 1024 * 1024
    ? `${(value / 1024).toFixed(0)} KB`
    : `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function App() {
  const [page, setPage] = useState<Page>('overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null)
  const [healthError, setHealthError] = useState('')
  const [evaluationError, setEvaluationError] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)

  useEffect(() => {
    getHealth().then(setHealth).catch((error: Error) => setHealthError(error.message))
    getEvaluation()
      .then(setEvaluation)
      .catch((error: Error) => setEvaluationError(error.message))
  }, [])

  const selectPage = (nextPage: Page) => {
    setPage(nextPage)
    setMobileNavOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`} aria-label="Main navigation">
        <div className="brand-lockup">
          <img className="brand-logo" src={brandLogo} alt="NetGuard ML Neural Shield" />
          <div>
            <div className="brand-name">NetGuard<span>ML</span></div>
            <div className="brand-caption">FLOW INTELLIGENCE</div>
          </div>
          <button className="icon-button sidebar-close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">
            <X size={19} />
          </button>
        </div>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="primary-nav">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              className={`nav-item ${page === id ? 'nav-item-active' : ''}`}
              key={id}
              onClick={() => selectPage(id)}
              aria-current={page === id ? 'page' : undefined}
            >
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
              {id === 'findings' && analysis && analysis.predicted_potential_attacks > 0 && (
                <span className="nav-count">{analysis.predicted_potential_attacks}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-status">
          <span className={`status-dot ${health?.model_available ? 'status-dot-live' : 'status-dot-muted'}`} />
          <span>{health?.model_available ? 'Model available' : health ? 'Model unavailable' : 'Checking model'}</span>
          {health?.model_available && <span className="status-state">LOCAL</span>}
        </div>
        <div className="sidebar-project">
          <div className="project-label">PROJECT</div>
          <div className="project-name">CIC-IDS2017 · Binary</div>
          <div className="project-version">EDUCATIONAL PROTOTYPE</div>
        </div>
      </aside>

      {mobileNavOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <div className="breadcrumb"><span>NetGuard ML</span><span className="breadcrumb-separator">/</span><strong>{pageMeta[page].title}</strong></div>
          <div className="topbar-status">
            <span className={`status-dot ${health?.model_available ? 'status-dot-live' : 'status-dot-muted'}`} />
            <span>{health?.model_available ? 'Pipeline ready' : health ? 'Pipeline unavailable' : 'Connecting'}</span>
          </div>
        </header>

        <main id="main-content" className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">NETGUARD ML <span>/</span> {page.toUpperCase()}</div>
              <h1>{pageMeta[page].title}</h1>
              <p className="page-description">{pageMeta[page].description}</p>
            </div>
            {page !== 'analysis' && (
              <button className="button button-primary heading-action" onClick={() => selectPage('analysis')}>
                <Activity size={16} /> New analysis
              </button>
            )}
          </div>

          {(healthError || evaluationError) && page === 'overview' && (
            <div className="notice notice-error" role="alert">
              <AlertCircle size={17} />
              <div>
                <strong>Some live project information is unavailable.</strong>
                <p>{healthError || evaluationError}</p>
              </div>
            </div>
          )}

          {page === 'overview' && <Overview health={health} evaluation={evaluation} analysis={analysis} onAnalyze={() => selectPage('analysis')} />}
          {page === 'analysis' && <TrafficAnalysis onAnalysis={setAnalysis} analysis={analysis} />}
          {page === 'findings' && <Findings analysis={analysis} onAnalyze={() => selectPage('analysis')} />}
          {page === 'evaluation' && <ModelEvaluation evaluation={evaluation} error={evaluationError} />}
          {page === 'about' && <About evaluation={evaluation} />}

          <footer className="workspace-footer">
            <span>Offline flow classification · Not live monitoring</span>
            <span>NetGuard ML <span className="footer-separator">·</span> CIC-IDS2017 prototype</span>
          </footer>
        </main>
      </div>
    </div>
  )
}

function MetricCard({ label, value, note, icon: Icon }: {
  label: string
  value: string
  note: string
  icon: typeof ShieldCheck
}) {
  return (
    <article className="metric-card">
      <div className="metric-card-top"><span>{label}</span><Icon size={17} strokeWidth={1.8} aria-hidden="true" /></div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">{note}</div>
    </article>
  )
}

function Overview({ health, evaluation, analysis, onAnalyze }: {
  health: HealthResponse | null
  evaluation: EvaluationResponse | null
  analysis: AnalysisResponse | null
  onAnalyze: () => void
}) {
  const selectedMetrics = evaluation?.models[evaluation.selected_model]?.metrics
  return (
    <div className="page-content">
      <section className="overview-intro">
        <div className="intro-copy">
          <div className="intro-kicker"><span className="status-dot status-dot-live" /> OFFLINE ANALYSIS WORKSPACE</div>
          <h2>Understand flow-level<br />signals with context.</h2>
          <p>Classify network-flow records with the locally fitted NetGuard pipeline. Review actual predictions and benchmark results without implying live protection.</p>
          <button className="button button-primary" onClick={onAnalyze}>Start a traffic analysis <ArrowRight size={16} /></button>
        </div>
        <div className="intro-aside">
          <div className="aside-line"><span>MODEL</span><strong>{health?.model_available ? 'Available' : health ? 'Unavailable' : 'Checking…'}</strong></div>
          <div className="aside-line"><span>SELECTED CLASSIFIER</span><strong>{evaluation?.selected_model ?? 'Evaluation unavailable'}</strong></div>
          <div className="aside-line"><span>INPUT MODE</span><strong>Offline CSV records</strong></div>
          {evaluation && <div className="aside-context">Evaluation subset<br /><strong>{evaluation.source_dataset.file_name}</strong></div>}
          {health && !health.model_available && <div className="aside-warning">{health.message}</div>}
        </div>
      </section>

      <section aria-labelledby="workspace-snapshot">
        <div className="section-heading">
          <div><h2 id="workspace-snapshot">Workspace snapshot</h2><p>Values are sourced from the active session or saved held-out evaluation.</p></div>
          {analysis && <span className="section-tag">CURRENT ANALYSIS</span>}
        </div>
        <div className="metric-grid">
          <MetricCard label="Records analyzed" value={analysis ? formatNumber(analysis.records_total) : '—'} note={analysis ? analysis.filename : 'No analysis in this session'} icon={FileText} />
          <MetricCard label="Predicted benign" value={analysis ? formatNumber(analysis.predicted_benign) : '—'} note={analysis ? 'Current uploaded CSV' : 'Awaiting an uploaded CSV'} icon={ShieldCheck} />
          <MetricCard label="Potential attacks" value={analysis ? formatNumber(analysis.predicted_potential_attacks) : '—'} note={analysis ? 'Model predictions, not verified threats' : 'No current predictions'} icon={ShieldAlert} />
          <MetricCard label="Held-out ATTACK F1" value={selectedMetrics ? formatPercent(selectedMetrics.f1_score) : '—'} note={evaluation ? `${evaluation.selected_model} · ${formatNumber(evaluation.split.test_rows)} test rows` : 'Saved evaluation unavailable'} icon={Activity} />
        </div>
      </section>

      <section className="overview-lower">
        <div className="panel model-panel">
          <div className="panel-heading"><div><h2>Selected model</h2><p>Persisted preprocessing and classifier</p></div><span className={`state-chip ${health?.model_available ? 'state-chip-good' : 'state-chip-neutral'}`}>{health?.model_available ? 'READY' : 'UNAVAILABLE'}</span></div>
          <div className="model-name-row"><div className="model-symbol"><Shield size={19} /></div><div><strong>{evaluation?.selected_model ?? 'No evaluation loaded'}</strong><span>Binary classifier · BENIGN / POTENTIAL ATTACK</span></div></div>
          <div className="panel-divider" />
          <div className="model-foot"><span>Selection rule</span><span>{evaluation?.selection_criteria ?? 'Actual selection information unavailable'}</span></div>
        </div>
        <div className="panel boundary-panel">
          <div className="panel-heading"><div><h2>Scope boundary</h2><p>Interpret results within their limits</p></div><CircleHelp size={18} /></div>
          <p className="boundary-copy">This prototype classifies offline flow records. It does not capture packets, block traffic, or prove malicious activity.</p>
          <div className="boundary-note"><AlertCircle size={15} /><span>CIC-IDS2017 results do not establish performance on modern live networks.</span></div>
        </div>
      </section>
    </div>
  )
}

function TrafficAnalysis({ onAnalysis, analysis }: {
  onAnalysis: (value: AnalysisResponse | null) => void
  analysis: AnalysisResponse | null
}) {
  const [file, setFile] = useState<File | null>(null)
  const [validation, setValidation] = useState<ValidationResponse | null>(null)
  const [busy, setBusy] = useState<'validate' | 'analyze' | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  const chooseFile = (nextFile?: File) => {
    setError('')
    setValidation(null)
    onAnalysis(null)
    if (!nextFile) return
    if (!nextFile.name.toLowerCase().endsWith('.csv')) {
      setFile(null)
      setError('Choose a file with the .csv extension.')
      return
    }
    if (nextFile.size > MAX_FILE_BYTES) {
      setFile(null)
      setError('This file exceeds the 50 MB upload limit.')
      return
    }
    setFile(nextFile)
  }

  const inspectFile = async () => {
    if (!file) return
    setBusy('validate')
    setError('')
    try {
      const result = await validateCsv(file)
      setValidation(result)
    } catch (cause) {
      setValidation(null)
      setError(cause instanceof Error ? cause.message : 'CSV validation failed.')
    } finally {
      setBusy(null)
    }
  }

  const runAnalysis = async () => {
    if (!file || !validation?.valid) return
    setBusy('analyze')
    setError('')
    try {
      onAnalysis(await analyzeCsv(file))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Analysis failed.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="page-content analysis-layout">
      <section className="panel upload-panel">
        <div className="panel-heading">
          <div><div className="eyebrow">01 / INPUT</div><h2>Select flow records</h2><p>Provide a compatible CSV export. The upload is processed in memory and is not saved by the API.</p></div>
          <span className="limit-label">50 MB MAX <span>·</span> 50,000 RECORDS</span>
        </div>
        <label
          className={`dropzone ${dragging ? 'dropzone-active' : ''} ${file ? 'dropzone-selected' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]) }}
        >
          <input
            className="visually-hidden"
            type="file"
            accept=".csv,text/csv"
            aria-label="Select a network-flow CSV file"
            onChange={(event) => chooseFile(event.target.files?.[0])}
          />
          <div className="dropzone-icon"><Upload size={20} /></div>
          <div className="dropzone-title">{file ? file.name : 'Drop a CSV file here or browse'}</div>
          <div className="dropzone-description">{file ? `${formatFileSize(file.size)} · CSV selected` : 'CSV only · up to 50 MB and 50,000 records'}</div>
          <span className="button button-secondary">{file ? 'Choose another file' : 'Browse files'}</span>
        </label>
        <div className="schema-guidance">
          <div className="guidance-icon"><FileText size={16} /></div>
          <div><strong>Expected schema</strong><p>Include all {validation?.required_feature_count ?? 'trained'} model feature columns. Ground-truth labels are optional; extra columns are reported and ignored.</p></div>
        </div>
        {error && <div className="notice notice-error" role="alert"><AlertCircle size={17} /><span>{error}</span></div>}
        <div className="upload-actions">
          <button className="button button-secondary" onClick={inspectFile} disabled={!file || busy !== null}>
            {busy === 'validate' ? <span className="spinner" aria-hidden="true" /> : <CheckCircle2 size={16} />}
            {busy === 'validate' ? 'Validating CSV…' : 'Validate file'}
          </button>
          <button className="button button-primary" onClick={runAnalysis} disabled={!file || !validation?.valid || busy !== null}>
            {busy === 'analyze' ? <span className="spinner spinner-light" aria-hidden="true" /> : <Activity size={16} />}
            {busy === 'analyze' ? 'Analyzing records…' : 'Run analysis'}
          </button>
        </div>
      </section>

      {validation && (
        <section className="panel preview-panel" aria-live="polite">
          <div className="panel-heading">
            <div><div className="eyebrow">02 / VALIDATION</div><h2>Dataset preview</h2><p>{validation.filename}</p></div>
            <span className={`state-chip ${validation.valid ? 'state-chip-good' : 'state-chip-neutral'}`}><Check size={13} /> SCHEMA VALID</span>
          </div>
          <div className="preview-stats">
            <div><span>RECORDS</span><strong>{formatNumber(validation.record_count)}</strong></div>
            <div><span>INPUT COLUMNS</span><strong>{formatNumber(validation.total_columns)}</strong></div>
            <div><span>REQUIRED FEATURES</span><strong>{formatNumber(validation.required_feature_count)}</strong></div>
            <div><span>GROUND TRUTH</span><strong>{validation.has_target_label ? 'Included' : 'Not required'}</strong></div>
          </div>
          <p className="validation-message"><CheckCircle2 size={15} />{validation.message}</p>
          {validation.header_names_normalized && <p className="inline-note">Column headers were normalized to match the trained feature schema.</p>}
          {validation.ignored_columns.length > 0 && <p className="inline-note">Additional columns will be ignored: {validation.ignored_columns.join(', ')}</p>}
          <div className="column-list" aria-label="Normalized CSV columns">
            {validation.columns.map((column) => <code key={column}>{column}</code>)}
            {validation.total_columns > validation.columns.length && <span>+{validation.total_columns - validation.columns.length} more</span>}
          </div>
        </section>
      )}

      {analysis && (
        <section className="results-section" aria-live="polite">
          <div className="results-heading">
            <div><div className="eyebrow">03 / RESULTS</div><h2>Analysis results</h2><p>{analysis.filename} · actual predictions from the fitted model</p></div>
            <button className="button button-secondary" onClick={() => downloadPredictions(analysis)}><ArrowDownToLine size={16} /> Export predictions</button>
          </div>
          <AnalysisSummary analysis={analysis} />
          {analysis.ignored_columns.length > 0 && <div className="notice notice-neutral"><CircleHelp size={16} /><span>Ignored input columns: {analysis.ignored_columns.join(', ')}</span></div>}
          <PredictionTable predictions={analysis.predictions} />
          <ul className="caveat-list">{analysis.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </section>
      )}
    </div>
  )
}

function AnalysisSummary({ analysis }: { analysis: AnalysisResponse }) {
  return (
    <div className="result-summary">
      <div><span>TOTAL RECORDS</span><strong>{formatNumber(analysis.records_total)}</strong></div>
      <div><span>PREDICTED BENIGN</span><strong>{formatNumber(analysis.predicted_benign)}</strong></div>
      <div className="result-attack"><span>POTENTIAL ATTACKS</span><strong>{formatNumber(analysis.predicted_potential_attacks)}</strong></div>
    </div>
  )
}

function PredictionTable({ predictions, attackOnly = false, filterByEstimate = false }: {
  predictions: Prediction[]
  attackOnly?: boolean
  filterByEstimate?: boolean
}) {
  const [query, setQuery] = useState('')
  const [minimumEstimate, setMinimumEstimate] = useState('any')
  const [page, setPage] = useState(0)
  const pageSize = 25
  const supportsEstimate = predictions.some(
    (prediction) => prediction.estimated_attack_probability !== undefined,
  )
  const filtered = useMemo(() => predictions.filter((prediction) => {
    if (attackOnly && prediction.predicted_label !== 'POTENTIAL ATTACK') return false
    if (minimumEstimate !== 'any' && prediction.estimated_attack_probability !== undefined) {
      if (prediction.estimated_attack_probability < Number(minimumEstimate)) return false
    }
    return `${prediction.record_number} ${prediction.predicted_label}`.toLowerCase().includes(query.toLowerCase())
  }), [predictions, attackOnly, query, minimumEstimate])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const activePage = Math.min(page, pageCount - 1)
  const rows = filtered.slice(activePage * pageSize, (activePage + 1) * pageSize)

  if (predictions.length === 0) return <div className="empty-state"><FileText size={22} /><strong>No prediction records</strong><span>Run an analysis to populate this table.</span></div>
  if (attackOnly && filtered.length === 0) return <div className="empty-state empty-state-success"><ShieldCheck size={23} /><strong>No potential attacks in this analysis</strong><span>This is a model output, not proof that the traffic is benign.</span></div>

  return (
    <div className="table-panel">
      <div className="table-toolbar">
        <div className="table-title">{attackOnly ? 'Potential attack records' : 'Per-record predictions'} <span>{formatNumber(filtered.length)}</span></div>
        <div className="table-controls">
          {filterByEstimate && supportsEstimate && (
            <label className="filter-field">
              <span>Minimum estimated ATTACK probability</span>
              <select value={minimumEstimate} onChange={(event) => { setMinimumEstimate(event.target.value); setPage(0) }}>
                <option value="any">Any estimate</option>
                <option value="0.5">50% or higher</option>
                <option value="0.75">75% or higher</option>
                <option value="0.9">90% or higher</option>
              </select>
            </label>
          )}
          {filterByEstimate && !supportsEstimate && <span className="filter-unavailable">Probability estimates unavailable</span>}
          <label className="search-field"><Search size={15} /><span className="visually-hidden">Search predictions</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} placeholder="Search records" /></label>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead><tr><th scope="col">Record</th><th scope="col">Prediction</th><th scope="col">Estimated ATTACK probability</th></tr></thead>
          <tbody>
            {rows.map((prediction) => (
              <tr key={prediction.record_number}>
                <td className="record-number">#{formatNumber(prediction.record_number)}</td>
                <td><span className={`prediction-label ${prediction.predicted_label === 'POTENTIAL ATTACK' ? 'prediction-attack' : 'prediction-benign'}`}><span className="prediction-dot" />{prediction.predicted_label}</span></td>
                <td>{prediction.estimated_attack_probability === undefined ? 'Not supported' : formatPercent(prediction.estimated_attack_probability, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-pagination">
        <span>Showing {filtered.length ? activePage * pageSize + 1 : 0}–{Math.min((activePage + 1) * pageSize, filtered.length)} of {formatNumber(filtered.length)}</span>
        <div><button className="icon-button" disabled={activePage === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} aria-label="Previous page"><ChevronLeft size={17} /></button><span>Page {activePage + 1} of {pageCount}</span><button className="icon-button" disabled={activePage + 1 >= pageCount} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} aria-label="Next page"><ChevronRight size={17} /></button></div>
      </div>
    </div>
  )
}

function Findings({ analysis, onAnalyze }: { analysis: AnalysisResponse | null; onAnalyze: () => void }) {
  if (!analysis) {
    return <div className="panel empty-panel"><div className="empty-state"><ShieldAlert size={24} /><strong>No analysis in this session</strong><span>Run a CSV analysis to review predicted potential attacks.</span><button className="button button-primary" onClick={onAnalyze}>Go to traffic analysis <ArrowRight size={15} /></button></div></div>
  }
  const attacks = analysis.predictions.filter((prediction) => prediction.predicted_label === 'POTENTIAL ATTACK')
  return (
    <div className="page-content">
      <div className="finding-context"><div className="finding-context-icon"><AlertCircle size={17} /></div><p><strong>Model predictions are not verified threats.</strong> NetGuard ML does not identify an attack category or assign a security severity. Review the original flow records and investigate using appropriate controls.</p></div>
      <div className="result-summary">
        <div><span>SOURCE FILE</span><strong className="summary-filename">{analysis.filename}</strong></div>
        <div><span>RECORDS REVIEWED</span><strong>{formatNumber(analysis.records_total)}</strong></div>
        <div className="result-attack"><span>POTENTIAL ATTACK PREDICTIONS</span><strong>{formatNumber(attacks.length)}</strong></div>
      </div>
      <PredictionTable predictions={attacks} attackOnly filterByEstimate />
      {analysis.probability_is_estimate && <p className="table-caption">Estimated ATTACK probability is a model estimate and is not calibrated certainty or a severity score.</p>}
    </div>
  )
}

function ModelEvaluation({ evaluation, error }: { evaluation: EvaluationResponse | null; error: string }) {
  if (error) return <div className="notice notice-error" role="alert"><AlertCircle size={17} /><span>{error}</span></div>
  if (!evaluation) return <div className="loading-panel"><span className="spinner" />Loading saved evaluation results…</div>
  const modelNames = Object.keys(evaluation.models)
  return (
    <div className="page-content">
      <div className="evaluation-banner">
        <div><span className="eyebrow">SAVED HELD-OUT TEST</span><h2>{evaluation.selected_model} selected</h2><p>{evaluation.source_dataset.file_name} · {formatNumber(evaluation.split.test_rows)} test records · stratified random row split</p></div>
        <div className="state-chip state-chip-good">ACTUAL METRICS</div>
      </div>
      <div className="notice notice-warning"><AlertCircle size={17} /><span>Related flows may occur in both partitions, so this random split can overestimate generalization. These results do not establish performance on modern live networks.</span></div>

      <section className="panel evaluation-panel">
        <div className="panel-heading"><div><h2>Model comparison</h2><p>Metrics calculated from the same held-out test records.</p></div></div>
        <div className="table-scroll">
          <table className="evaluation-table">
            <thead><tr><th scope="col">Classifier</th><th scope="col">Accuracy</th><th scope="col">ATTACK precision</th><th scope="col">ATTACK recall</th><th scope="col">ATTACK F1</th><th scope="col">Macro F1</th><th scope="col">False-positive rate</th></tr></thead>
            <tbody>{modelNames.map((name) => {
              const metrics = evaluation.models[name].metrics
              return <tr key={name}><th scope="row">{name}{name === evaluation.selected_model && <span className="selected-inline">SELECTED</span>}</th><td>{formatPercent(metrics.accuracy)}</td><td>{formatPercent(metrics.precision)}</td><td>{formatPercent(metrics.recall)}</td><td className="strong-value">{formatPercent(metrics.f1_score)}</td><td>{formatPercent(metrics.macro_f1_score)}</td><td>{formatPercent(metrics.false_positive_rate, 3)}</td></tr>
            })}</tbody>
          </table>
        </div>
      </section>

      <section className="confusion-section">
        <div className="section-heading"><div><h2>Confusion matrices</h2><p>Actual counts on the saved held-out test split.</p></div></div>
        <div className="confusion-grid">{modelNames.map((name) => <ConfusionMatrix key={name} name={name} metrics={evaluation.models[name].metrics} selected={name === evaluation.selected_model} />)}</div>
      </section>

      {evaluation.feature_importance_available && (
        <section className="panel feature-panel">
          <div className="panel-heading"><div><h2>Random Forest feature importance</h2><p>Saved model-specific importance plot from the training run.</p></div></div>
          <img src={featureImportanceUrl} alt="Random Forest feature importance chart from the saved training run" />
          <p className="table-caption">Feature importance describes this fitted model; it is not causal evidence or an explanation of an individual prediction.</p>
        </section>
      )}

      <section className="panel methodology-panel">
        <div className="panel-heading"><div><h2>Evaluation context</h2><p>What these benchmark numbers represent.</p></div></div>
        <dl className="context-list">
          <div><dt>Source subset</dt><dd>{evaluation.source_dataset.file_name} · {formatNumber(evaluation.source_dataset.source_rows_scanned)} rows scanned</dd></div>
          <div><dt>Training sample</dt><dd>{formatNumber(evaluation.source_dataset.sample_rows)} rows, class-proportional sample</dd></div>
          <div><dt>Split strategy</dt><dd>{evaluation.split.strategy} · {formatPercent(evaluation.split.test_fraction)} held out</dd></div>
          <div><dt>Model selection</dt><dd>{evaluation.selection_criteria}</dd></div>
        </dl>
      </section>
    </div>
  )
}

function ConfusionMatrix({ name, metrics, selected }: {
  name: string
  metrics: EvaluationResponse['models'][string]['metrics']
  selected: boolean
}) {
  return (
    <article className="panel confusion-panel">
      <div className="panel-heading"><div><h3>{name}</h3><p>{selected ? 'Selected model' : 'Compared model'}</p></div></div>
      <div className="matrix-grid" role="table" aria-label={`${name} confusion matrix, actual rows and predicted columns`}>
        <div className="matrix-cell matrix-corner" role="columnheader">ACTUAL ↓<br />PREDICTED →</div>
        <div className="matrix-cell matrix-heading" role="columnheader">BENIGN</div>
        <div className="matrix-cell matrix-heading" role="columnheader">ATTACK</div>
        <div className="matrix-cell matrix-heading" role="rowheader">BENIGN</div>
        <div className="matrix-cell matrix-correct" role="cell"><strong>{formatNumber(metrics.true_negative)}</strong><span>True negative</span></div>
        <div className="matrix-cell matrix-error" role="cell"><strong>{formatNumber(metrics.false_positive)}</strong><span>False positive</span></div>
        <div className="matrix-cell matrix-heading" role="rowheader">ATTACK</div>
        <div className="matrix-cell matrix-error" role="cell"><strong>{formatNumber(metrics.false_negative)}</strong><span>False negative</span></div>
        <div className="matrix-cell matrix-correct-attack" role="cell"><strong>{formatNumber(metrics.true_positive)}</strong><span>True positive</span></div>
      </div>
    </article>
  )
}

function About({ evaluation }: { evaluation: EvaluationResponse | null }) {
  return (
    <div className="page-content about-layout">
      <section className="panel about-lead">
        <div className="about-icon"><Shield size={21} /></div>
        <div><div className="eyebrow">SYSTEM OVERVIEW</div><h2>Classification for offline flow records.</h2><p>NetGuard ML is an educational network intrusion classification prototype. It labels each compatible record as BENIGN or POTENTIAL ATTACK using a saved scikit-learn pipeline.</p></div>
      </section>
      <div className="about-grid">
        <section className="panel about-section"><div className="about-section-icon"><FileText size={17} /></div><h3>Dataset</h3><p>The recorded evaluation uses a bounded sample from CIC-IDS2017, published by the Canadian Institute for Cybersecurity. The trained target maps BENIGN to 0 and observed non-empty non-BENIGN labels to 1.</p><a href="https://www.unb.ca/cic/datasets/ids-2017.html" target="_blank" rel="noreferrer">Official dataset page <ArrowRight size={14} /></a></section>
        <section className="panel about-section"><div className="about-section-icon"><Activity size={17} /></div><h3>Model and preprocessing</h3><p>The selected artifact contains the fitted feature preprocessing and Random Forest classifier. The API validates the uploaded feature schema and invokes this pipeline directly; preprocessing is not reimplemented in the browser.</p><p className="muted-copy">{evaluation ? `${evaluation.source_dataset.sample_rows.toLocaleString()} sampled rows · ${evaluation.split.strategy}` : 'Saved evaluation context is unavailable.'}</p></section>
        <section className="panel about-section"><div className="about-section-icon"><ShieldAlert size={17} /></div><h3>Interpretation</h3><p>POTENTIAL ATTACK is a model prediction, not a verified incident, attack family, severity rating, or calibrated confidence. Estimated probability values are model estimates.</p></section>
        <section className="panel about-section"><div className="about-section-icon"><CircleHelp size={17} /></div><h3>Known limitations</h3><p>The random row split may place related flows in train and test. Results on this historical benchmark do not establish performance on modern live networks.</p><p className="muted-copy">No live packet capture · no blocking · no database or analysis history</p></section>
      </div>
      <div className="notice notice-neutral"><CheckCircle2 size={17} /><span>Uploads are limited to 50 MB and 50,000 records. Files are validated and analyzed in memory; the backend does not save uploaded CSV content.</span></div>
      <section className="panel project-credits" aria-labelledby="project-credits-heading">
        <div className="project-credits-heading">
          <div className="eyebrow">ACKNOWLEDGEMENTS</div>
          <h2 id="project-credits-heading">Project credits</h2>
        </div>
        <div className="project-credits-author">
          <div className="project-credits-avatar" aria-hidden="true"><UserRound size={18} /></div>
          <div className="project-credits-details">
            <strong>Rian Renju</strong>
            <div className="project-credits-links">
              <a className="project-credit-link" href="https://github.com/Rianrx77/" target="_blank" rel="noreferrer" aria-label="Rian Renju on GitHub (opens in a new tab)">
                <Github size={14} aria-hidden="true" /> GitHub
              </a>
              <a className="project-credit-link" href="https://www.linkedin.com/in/rian-renju" target="_blank" rel="noreferrer" aria-label="Rian Renju on LinkedIn (opens in a new tab)">
                <Linkedin size={14} aria-hidden="true" /> LinkedIn
              </a>
            </div>
          </div>
        </div>
        <p className="project-credits-attribution">NetGuard ML is an educational cybersecurity project developed as part of the IBM SkillsBuild Cyber Security Bootcamp 2026, conducted by BharatCares.</p>
      </section>
    </div>
  )
}

function downloadPredictions(analysis: AnalysisResponse) {
  const columns = ['record_number', 'predicted_label']
  if (analysis.predictions.some((prediction) => prediction.estimated_attack_probability !== undefined)) {
    columns.push('estimated_attack_probability')
  }
  const quote = (value: string | number | undefined) => {
    const text = String(value ?? '')
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  const rows = analysis.predictions.map((prediction) => columns.map((column) => {
    if (column === 'record_number') return quote(prediction.record_number)
    if (column === 'predicted_label') return quote(prediction.predicted_label)
    return quote(prediction.estimated_attack_probability)
  }).join(','))
  const blob = new Blob([[columns.join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = 'netguard_predictions.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

export default App
