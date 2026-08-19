import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CloudUpload,
  Cpu,
  Database,
  FileSpreadsheet,
  Gauge,
  Info,
  ListChecks,
  Settings2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Field, Toggle } from '../components/FormField'
import Stepper from '../components/Stepper'
import Toast from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'
import {
  buildModelParameters,
  CRITERIA,
  DEFAULT_FORM,
  INITIALIZATIONS,
  KERNELS,
  SEARCH_METHODS,
} from '../modelDefaults'
import { backend, uploadCsvToPresignedUrl } from '../services/api'
import { inspectCsvFile } from '../utils/csv'
import { formatBytes } from '../utils/format'

const STEPS = [
  { title: 'Dataset setup', subtitle: 'Upload CSV and map coordinates.' },
  { title: 'Variable assignment', subtitle: 'Choose dependent and explanatory variables.' },
  { title: 'Model configuration', subtitle: 'Kernel, bandwidth search and advanced options.' },
  { title: 'Review & submit', subtitle: 'Check the full analysis configuration.' },
]

function Select({ value, onChange, children, disabled = false }) {
  return (
    <div className="select-wrap">
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>{children}</select>
      <ChevronDown size={16} />
    </div>
  )
}

function NumberInput({ value, onChange, ...props }) {
  return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} {...props} />
}

export default function NewJobPage() {
  const navigate = useNavigate()
  const { profile, refresh } = useAuth()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [advanced, setAdvanced] = useState(false)
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [toast, setToast] = useState(null)

  const excluded = useMemo(
    () => new Set([form.idCol, form.coordX, form.coordY, form.yCol].filter(Boolean)),
    [form.idCol, form.coordX, form.coordY, form.yCol],
  )

  const eligibleX = useMemo(() => form.fields.filter((field) => !excluded.has(field)), [form.fields, excluded])

  function patch(values) {
    setForm((current) => ({ ...current, ...values }))
  }

  function cleanSelections(nextPatch) {
    setForm((current) => {
      const next = { ...current, ...nextPatch }
      const reserved = new Set([next.idCol, next.coordX, next.coordY, next.yCol].filter(Boolean))
      next.xCols = next.xCols.filter((x) => !reserved.has(x))
      return next
    })
  }

  async function chooseFile(file) {
    if (!file) return
    try {
      const inspected = await inspectCsvFile(file)
      setForm((current) => ({
        ...current,
        file,
        fields: inspected.fields,
        previewRows: inspected.previewRows,
        idCol: inspected.fields.includes('ID') ? 'ID' : '',
        coordX: inspected.fields.includes('x_coord') ? 'x_coord' : '',
        coordY: inspected.fields.includes('y_coord') ? 'y_coord' : '',
        yCol: inspected.fields.includes('Y') ? 'Y' : '',
        xCols: inspected.fields.filter((x) => /^X\d+$/i.test(x)).slice(0, 12),
      }))
      setToast({ type: 'success', title: 'CSV ready', message: `${inspected.fields.length} columns detected.` })
    } catch (error) {
      setToast({ type: 'error', message: error.message })
    }
  }

  function validateStep(currentStep) {
    if (currentStep === 1) {
      if (!form.file) return 'Choose a CSV file.'
      if (!form.coordX || !form.coordY) return 'Choose both coordinate columns.'
      if (form.coordX === form.coordY) return 'X and Y coordinates must use different columns.'
      if (form.idCol && [form.coordX, form.coordY].includes(form.idCol)) return 'ID and coordinate columns must be distinct.'
    }
    if (currentStep === 2) {
      if (!form.yCol) return 'Choose a dependent variable.'
      if (!form.xCols.length) return 'Choose at least one explanatory variable.'
      const all = [form.idCol, form.coordX, form.coordY, form.yCol, ...form.xCols].filter(Boolean)
      if (new Set(all).size !== all.length) return 'ID, coordinates, Y, and X variables must all be distinct.'
    }
    if (currentStep === 3) {
      if (form.bwMin !== '' && form.bwMax !== '' && Number(form.bwMax) <= Number(form.bwMin)) return 'Maximum bandwidth must be greater than minimum bandwidth.'
      if (form.searchMethod === 'interval') {
        if (form.bwMin === '' || form.bwMax === '' || form.interval === '') return 'Interval search requires minimum, maximum, and interval values.'
        if (Number(form.interval) <= 0) return 'Bandwidth interval must be positive.'
      }
      if (form.initializationMethod === 'predefined' && (form.initializationBandwidth === '' || Number(form.initializationBandwidth) <= 0)) return 'Pre-defined initialization requires a positive bandwidth.'
      if (Number(form.searchTolerance) <= 0 || Number(form.convergenceThreshold) <= 0) return 'Convergence tolerances must be positive.'
      if (Number(form.searchMaxIterations) < 1 || Number(form.backfitMaxIterations) < 1 || Number(form.bandwidthStableIterations) < 1) return 'Iteration counts must be positive.'
      if (Number(form.nJobs) < 1 || Number(form.nJobs) > 192) return 'Parallel workers must be between 1 and 192.'
      if (Number(form.nChunks) < 1) return 'Chunks must be positive.'
      if (form.matrixFree && Number(form.nProbes) < 1) return 'Number of probes must be positive.'
      if (Number(form.ajBlockRatio) <= 0 || Number(form.ajBlockRatio) > 1) return 'A_j row-block ratio must be in (0, 1].'
      if (form.monteCarlo && Number(form.monteCarloIterations) < 1) return 'Monte Carlo iterations must be positive.'
      if (form.bandwidthCI && (Number(form.bandwidthCILevel) <= 0 || Number(form.bandwidthCILevel) >= 1)) return 'Bandwidth confidence level must be between 0 and 1.'
    }
    return null
  }

  function next() {
    const error = validateStep(step)
    if (error) return setToast({ type: 'error', message: error })
    setStep((s) => Math.min(4, s + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function back() {
    setStep((s) => Math.max(1, s - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function toggleX(field) {
    setForm((current) => ({
      ...current,
      xCols: current.xCols.includes(field)
        ? current.xCols.filter((x) => x !== field)
        : [...current.xCols, field],
    }))
  }

  async function submit() {
    const errors = [1, 2, 3].map(validateStep).filter(Boolean)
    if (errors.length) return setToast({ type: 'error', message: errors[0] })
    if (!profile?.is_vip && Number(profile?.remaining_minutes || 0) <= 0) {
      return setToast({ type: 'error', message: 'Your account has no remaining compute minutes.' })
    }

    setBusy(true)
    setUploadProgress(0)
    try {
      setStage('Requesting a secure upload URL')
      const uploadInfo = await backend.requestUpload(form.file.name)
      if (form.file.size > Number(uploadInfo.max_upload_bytes || Infinity)) {
        throw new Error(`The selected file exceeds the backend upload limit (${formatBytes(uploadInfo.max_upload_bytes)}).`)
      }

      setStage('Uploading CSV directly to CloudMGWR storage')
      await uploadCsvToPresignedUrl(uploadInfo, form.file, setUploadProgress)

      setStage('Creating trusted CloudMGWR job')
      const result = await backend.submitJob(
        uploadInfo.upload_id,
        form.file.name,
        buildModelParameters(form),
      )
      await refresh()
      setStage('Job accepted')
      navigate(`/jobs/${result.job_id}`)
    } catch (error) {
      setToast({ type: 'error', title: 'Submission failed', message: error.message || String(error) })
      setBusy(false)
      setStage('')
    }
  }

  return (
    <div className="page-stack new-job-page">
      <div className="page-heading-row">
        <div>
          <span className="eyebrow">New analysis</span>
          <h1>Configure MGWR</h1>
          <p>A modern workflow based on the MGWR desktop controls, mapped directly to the CloudMGWR job schema.</p>
        </div>
        <div className="version-pill"><Sparkles size={15} /> Gaussian MGWR · Version 1</div>
      </div>

      <Stepper steps={STEPS} current={step} onSelect={setStep} />

      {step === 1 && (
        <section className="wizard-grid">
          <div className="panel-card span-2">
            <div className="panel-heading">
              <div><span className="eyebrow">Input data</span><h2>Dataset setup</h2></div>
              <Database size={21} />
            </div>

            {!form.file ? (
              <label className="upload-zone">
                <input type="file" accept=".csv,text/csv" onChange={(e) => chooseFile(e.target.files?.[0])} />
                <div className="upload-icon"><UploadCloud size={27} /></div>
                <strong>Choose a CSV file</strong>
                <span>The browser reads only the header locally. The full file is uploaded only when you submit the job.</span>
                <em>CSV · up to the backend-configured upload limit</em>
              </label>
            ) : (
              <div className="file-card selected-file">
                <div className="file-icon"><FileSpreadsheet size={24} /></div>
                <div className="file-copy"><strong>{form.file.name}</strong><span>{formatBytes(form.file.size)} · {form.fields.length} columns detected</span></div>
                <label className="replace-file">Replace<input type="file" accept=".csv,text/csv" onChange={(e) => chooseFile(e.target.files?.[0])} /></label>
                <button type="button" className="icon-button" onClick={() => setForm(DEFAULT_FORM)}><X size={17} /></button>
              </div>
            )}

            {form.fields.length > 0 && (
              <div className="fields-preview">
                <span className="field-label">Detected fields</span>
                <div className="chips">{form.fields.map((field) => <span className="data-chip" key={field}>{field}</span>)}</div>
              </div>
            )}
          </div>

          <div className="panel-card">
            <div className="panel-heading"><div><span className="eyebrow">Location variables</span><h2>Coordinates</h2></div></div>
            <div className="form-grid one-col">
              <Field label="ID column" hint="Optional identifier preserved in outputs.">
                <Select value={form.idCol} onChange={(v) => cleanSelections({ idCol: v })} disabled={!form.fields.length}>
                  <option value="">None</option>{form.fields.map((f) => <option key={f}>{f}</option>)}
                </Select>
              </Field>
              <Field label="X coordinate">
                <Select value={form.coordX} onChange={(v) => cleanSelections({ coordX: v })} disabled={!form.fields.length}>
                  <option value="">Select a field</option>{form.fields.map((f) => <option key={f}>{f}</option>)}
                </Select>
              </Field>
              <Field label="Y coordinate">
                <Select value={form.coordY} onChange={(v) => cleanSelections({ coordY: v })} disabled={!form.fields.length}>
                  <option value="">Select a field</option>{form.fields.map((f) => <option key={f}>{f}</option>)}
                </Select>
              </Field>
            </div>
            <div className="segmented-control">
              <button type="button" className={form.coordinateType === 'projected' ? 'active' : ''} onClick={() => patch({ coordinateType: 'projected' })}>Projected</button>
              <button type="button" className={form.coordinateType === 'spherical' ? 'active' : ''} onClick={() => patch({ coordinateType: 'spherical' })}>Spherical</button>
            </div>
            <p className="micro-note"><Info size={14} /> Projected uses planar X/Y coordinates. Spherical uses longitude/latitude.</p>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="wizard-grid variable-grid">
          <div className="panel-card">
            <div className="panel-heading"><div><span className="eyebrow">Regression variables</span><h2>Dependent variable</h2></div></div>
            <Field label="Y">
              <Select value={form.yCol} onChange={(v) => cleanSelections({ yCol: v })}>
                <option value="">Select a dependent variable</option>
                {form.fields.filter((f) => ![form.idCol, form.coordX, form.coordY].includes(f)).map((f) => <option key={f}>{f}</option>)}
              </Select>
            </Field>
            <div className="selection-note"><ListChecks size={18} /><span>Choose exactly one observed response variable.</span></div>
          </div>

          <div className="panel-card span-2">
            <div className="panel-heading">
              <div><span className="eyebrow">Local variables</span><h2>Explanatory variables</h2></div>
              <span className="count-pill">{form.xCols.length} selected</span>
            </div>
            <p className="panel-intro">CloudMGWR Version 1 estimates a separate bandwidth for the intercept and each selected explanatory variable.</p>
            <div className="variable-picker">
              {eligibleX.map((field) => {
                const selected = form.xCols.includes(field)
                return (
                  <button type="button" key={field} className={selected ? 'selected' : ''} onClick={() => toggleX(field)}>
                    <span className="variable-check">{selected && <Check size={14} />}</span>
                    <span>{field}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {step === 3 && (
        <div className="page-stack">
          <section className="wizard-grid model-grid">
            <div className="panel-card">
              <div className="panel-heading"><div><span className="eyebrow">Model</span><h2>Model options</h2></div><Gauge size={20} /></div>
              <div className="locked-options">
                <div><span>Mode</span><strong>MGWR</strong><em>Version 1</em></div>
                <div><span>Family</span><strong>Gaussian</strong><em>Version 1</em></div>
              </div>
              <Toggle checked={form.standardize} onChange={(v) => patch({ standardize: v })} label="Variable standardization" hint="Standardize model variables before estimation." />
            </div>

            <div className="panel-card span-2">
              <div className="panel-heading"><div><span className="eyebrow">Spatial kernel</span><h2>Bandwidth & weighting</h2></div><Settings2 size={20} /></div>
              <div className="form-grid three-col">
                <Field label="Bandwidth type">
                  <Select value={form.bandwidthType} onChange={(v) => patch({ bandwidthType: v })}>
                    <option value="adaptive">Adaptive</option><option value="fixed">Fixed</option>
                  </Select>
                </Field>
                <Field label="Kernel function">
                  <Select value={form.kernel} onChange={(v) => patch({ kernel: v })}>
                    {KERNELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </Select>
                </Field>
                <Field label="Optimization criterion">
                  <Select value={form.criterion} onChange={(v) => patch({ criterion: v })}>
                    {CRITERIA.map((v) => <option key={v}>{v}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="form-grid three-col top-gap">
                <Field label="Search method">
                  <Select value={form.searchMethod} onChange={(v) => patch({ searchMethod: v })}>
                    {SEARCH_METHODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </Select>
                </Field>
                <Field label="Minimum bandwidth" hint="Optional unless using Interval search."><NumberInput value={form.bwMin} onChange={(v) => patch({ bwMin: v })} placeholder="Auto" /></Field>
                <Field label="Maximum bandwidth" hint="Optional unless using Interval search."><NumberInput value={form.bwMax} onChange={(v) => patch({ bwMax: v })} placeholder="Auto" /></Field>
              </div>
              {form.searchMethod === 'interval' && (
                <div className="form-grid three-col top-gap inline-callout">
                  <Field label="Interval"><NumberInput value={form.interval} onChange={(v) => patch({ interval: v })} placeholder="Required" /></Field>
                  <div className="field-span-2"><Info size={16} /><span>Interval search requires minimum, maximum, and a positive step interval.</span></div>
                </div>
              )}
            </div>
          </section>

          <section className="panel-card advanced-panel">
            <button className="advanced-toggle" type="button" onClick={() => setAdvanced(!advanced)}>
              <span><Settings2 size={18} /><strong>Advanced options</strong><small>Backfitting, inference, diagnostics, and compute parallelism.</small></span>
              <ChevronDown size={18} className={advanced ? 'rotate' : ''} />
            </button>

            {advanced && (
              <div className="advanced-content">
                <div className="advanced-section">
                  <h3>Bandwidth initialization & backfitting</h3>
                  <div className="form-grid four-col">
                    <Field label="Initialization">
                      <Select value={form.initializationMethod} onChange={(v) => patch({ initializationMethod: v })}>
                        {INITIALIZATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </Select>
                    </Field>
                    <Field label="Pre-defined bandwidth"><NumberInput value={form.initializationBandwidth} onChange={(v) => patch({ initializationBandwidth: v })} placeholder="Not used" disabled={form.initializationMethod !== 'predefined'} /></Field>
                    <Field label="Measure of SOC">
                      <Select value={form.soc} onChange={(v) => patch({ soc: v })}><option value="SOC-f">SOC-f</option><option value="SOC-RSS">SOC-RSS</option></Select>
                    </Field>
                    <Field label="Convergence threshold"><NumberInput value={form.convergenceThreshold} onChange={(v) => patch({ convergenceThreshold: v })} step="0.000001" /></Field>
                    <Field label="Search tolerance"><NumberInput value={form.searchTolerance} onChange={(v) => patch({ searchTolerance: v })} step="0.000001" /></Field>
                    <Field label="Search max iterations"><NumberInput value={form.searchMaxIterations} onChange={(v) => patch({ searchMaxIterations: v })} min="1" /></Field>
                    <Field label="Backfit max iterations"><NumberInput value={form.backfitMaxIterations} onChange={(v) => patch({ backfitMaxIterations: v })} min="1" /></Field>
                    <Field label="Stable bandwidth iterations"><NumberInput value={form.bandwidthStableIterations} onChange={(v) => patch({ bandwidthStableIterations: v })} min="1" /></Field>
                  </div>
                </div>

                <div className="advanced-section">
                  <h3>Matrix-free inference</h3>
                  <div className="advanced-toggle-grid">
                    <Toggle checked={form.matrixFree} onChange={(v) => patch({ matrixFree: v })} label="Matrix-free inference" hint="Randomized inference without materializing the full hat matrix." />
                  </div>
                  <div className="form-grid four-col top-gap">
                    <Field label="Number of probes"><NumberInput value={form.nProbes} onChange={(v) => patch({ nProbes: v })} min="1" max="10000" disabled={!form.matrixFree} /></Field>
                    <Field label="Probe seed"><NumberInput value={form.probeSeed} onChange={(v) => patch({ probeSeed: v })} disabled={!form.matrixFree} /></Field>
                    <Field label="Probe distribution"><Select value={form.probeDistribution} onChange={(v) => patch({ probeDistribution: v })} disabled={!form.matrixFree}><option value="rademacher">Rademacher</option><option value="gaussian">Gaussian</option></Select></Field>
                    <Field label="A_j row-block ratio"><NumberInput value={form.ajBlockRatio} onChange={(v) => patch({ ajBlockRatio: v })} min="0.01" max="1" step="0.01" disabled={!form.matrixFree} /></Field>
                  </div>
                </div>

                <div className="advanced-section">
                  <h3>Diagnostics</h3>
                  <div className="advanced-toggle-grid three">
                    <Toggle checked={form.monteCarlo} onChange={(v) => patch({ monteCarlo: v })} label="Monte Carlo spatial variability" />
                    <Toggle checked={form.localCollinearity} onChange={(v) => patch({ localCollinearity: v })} label="Local collinearity diagnostics" />
                    <Toggle checked={form.bandwidthCI} onChange={(v) => patch({ bandwidthCI: v })} label="Bandwidth confidence intervals" />
                  </div>
                  <div className="form-grid three-col top-gap">
                    <Field label="Monte Carlo iterations"><NumberInput value={form.monteCarloIterations} onChange={(v) => patch({ monteCarloIterations: v })} min="1" disabled={!form.monteCarlo} /></Field>
                    <Field label="Monte Carlo seed"><NumberInput value={form.monteCarloSeed} onChange={(v) => patch({ monteCarloSeed: v })} disabled={!form.monteCarlo} /></Field>
                    <Field label="Bandwidth CI level"><NumberInput value={form.bandwidthCILevel} onChange={(v) => patch({ bandwidthCILevel: v })} min="0.01" max="0.99" step="0.01" disabled={!form.bandwidthCI} /></Field>
                  </div>
                </div>

                <div className="advanced-section">
                  <h3>Execution</h3>
                  <div className="form-grid three-col">
                    <Field label="Parallel workers" hint="Default 185 · maximum 192 on the current worker."><NumberInput value={form.nJobs} onChange={(v) => patch({ nJobs: v })} min="1" max="192" /></Field>
                    <Field label="Chunks"><NumberInput value={form.nChunks} onChange={(v) => patch({ nChunks: v })} min="1" /></Field>
                    <div className="trust-callout"><ShieldCheck size={18} /><span><strong>Runtime limit is server-controlled.</strong> The website never sends a trusted max-runtime value.</span></div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {step === 4 && (
        <section className="review-layout">
          <div className="panel-card review-main">
            <div className="panel-heading"><div><span className="eyebrow">Review</span><h2>Analysis configuration</h2></div><ListChecks size={21} /></div>
            <div className="review-section">
              <h3>Dataset</h3>
              <div className="review-grid">
                <div><span>File</span><strong>{form.file?.name}</strong></div>
                <div><span>Size</span><strong>{formatBytes(form.file?.size)}</strong></div>
                <div><span>Coordinates</span><strong>{form.coordX}, {form.coordY}</strong></div>
                <div><span>Coordinate type</span><strong>{form.coordinateType}</strong></div>
                <div><span>ID</span><strong>{form.idCol || 'None'}</strong></div>
                <div><span>Standardize</span><strong>{form.standardize ? 'On' : 'Off'}</strong></div>
              </div>
            </div>
            <div className="review-section">
              <h3>Regression variables</h3>
              <div className="review-grid">
                <div><span>Dependent variable</span><strong>{form.yCol}</strong></div>
                <div className="wide"><span>Explanatory variables</span><strong>{form.xCols.join(', ')}</strong></div>
              </div>
            </div>
            <div className="review-section">
              <h3>MGWR model</h3>
              <div className="review-grid">
                <div><span>Mode / family</span><strong>MGWR / Gaussian</strong></div>
                <div><span>Kernel</span><strong>{form.bandwidthType} · {form.kernel}</strong></div>
                <div><span>Search</span><strong>{form.searchMethod}</strong></div>
                <div><span>Criterion</span><strong>{form.criterion}</strong></div>
                <div><span>Initialization</span><strong>{form.initializationMethod}</strong></div>
                <div><span>SOC</span><strong>{form.soc}</strong></div>
              </div>
            </div>
            <div className="review-section">
              <h3>Inference & execution</h3>
              <div className="review-grid">
                <div><span>Matrix-free</span><strong>{form.matrixFree ? `On · ${form.nProbes} probes` : 'Off'}</strong></div>
                <div><span>Parallel workers</span><strong>{form.nJobs}</strong></div>
                <div><span>Monte Carlo</span><strong>{form.monteCarlo ? 'On' : 'Off'}</strong></div>
                <div><span>Local collinearity</span><strong>{form.localCollinearity ? 'On' : 'Off'}</strong></div>
                <div><span>Bandwidth CI</span><strong>{form.bandwidthCI ? `${form.bandwidthCILevel}` : 'Off'}</strong></div>
                <div><span>Runtime policy</span><strong>{profile?.is_vip ? 'VIP · quota exempt' : 'Normal · server-enforced'}</strong></div>
              </div>
            </div>
          </div>

          <aside className="panel-card submit-card">
            <div className="submit-icon"><CloudUpload size={27} /></div>
            <h2>Create CloudMGWR job</h2>
            <p>The CSV will upload directly to private S3 storage, then the backend will create a trusted queued job.</p>
            <div className="submit-account">
              <span>Account</span><strong>{profile?.is_vip ? 'VIP' : 'Normal user'}</strong>
              <span>Compute balance</span><strong>{profile?.is_vip ? 'Quota exempt' : `${profile?.remaining_minutes ?? '—'} min`}</strong>
            </div>
            {busy && (
              <div className="submission-progress">
                <div className="progress-track"><span style={{ width: `${Math.max(8, uploadProgress)}%` }} /></div>
                <strong>{stage}</strong>
                <small>Please keep this tab open until the job is accepted.</small>
              </div>
            )}
            <button className="primary-button submit-job-button" type="button" disabled={busy} onClick={submit}>
              {busy ? <span className="mini-spinner" /> : <Cpu size={18} />}
              {busy ? 'Submitting…' : 'Run MGWR'}
            </button>
            <div className="secure-line"><ShieldCheck size={15} /> User ID, job ID, quota status and runtime limits are assigned by the trusted backend.</div>
          </aside>
        </section>
      )}

      <div className="wizard-footer">
        <button className="secondary-button" type="button" onClick={back} disabled={step === 1 || busy}><ArrowLeft size={17} /> Back</button>
        <span>Step {step} of 4</span>
        {step < 4 ? <button className="primary-button" type="button" onClick={next}>Continue <ArrowRight size={17} /></button> : <span className="footer-placeholder" />}
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
