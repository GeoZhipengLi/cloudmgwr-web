export const KERNELS = [
  ['bisquare', 'Bisquare'],
  ['gaussian', 'Gaussian'],
  ['exponential', 'Exponential'],
  ['triangular', 'Triangular'],
  ['uniform', 'Uniform'],
  ['quadratic', 'Quadratic'],
  ['quartic', 'Quartic'],
]

export const CRITERIA = ['AICc', 'AIC', 'BIC', 'CV']

export const SEARCH_METHODS = [
  ['golden_section', 'Golden section'],
  ['interval', 'Interval'],
  ['scipy', 'SciPy'],
]

export const INITIALIZATIONS = [
  ['gwr', 'GWR estimates'],
  ['predefined', 'Pre-defined bandwidth'],
]

export const DEFAULT_FORM = {
  file: null,
  fields: [],
  previewRows: [],
  idCol: '',
  coordX: '',
  coordY: '',
  coordinateType: 'projected',
  yCol: '',
  xCols: [],
  standardize: true,
  bandwidthType: 'adaptive',
  kernel: 'bisquare',
  searchMethod: 'golden_section',
  criterion: 'AICc',
  bwMin: '',
  bwMax: '',
  interval: '',
  initializationMethod: 'gwr',
  initializationBandwidth: '',
  searchTolerance: 1e-6,
  searchMaxIterations: 200,
  soc: 'SOC-f',
  convergenceThreshold: 1e-5,
  backfitMaxIterations: 200,
  bandwidthStableIterations: 5,
  matrixFree: true,
  nProbes: 3000,
  probeSeed: 2026,
  probeDistribution: 'rademacher',
  ajBlockRatio: 0.2,
  monteCarlo: false,
  monteCarloIterations: 1000,
  monteCarloSeed: 5536,
  localCollinearity: false,
  bandwidthCI: false,
  bandwidthCILevel: 0.95,
  nJobs: 185,
  nChunks: 1,
}

function nullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function buildModelParameters(form) {
  return {
    data: {
      id_col: form.idCol || null,
      coord_cols: { x: form.coordX, y: form.coordY },
      coordinate_type: form.coordinateType,
      y_col: form.yCol,
      x_cols: form.xCols,
      standardize: Boolean(form.standardize),
      drop_missing: true,
    },
    model: {
      mode: 'MGWR',
      family: 'Gaussian',
      kernel: {
        bandwidth_type: form.bandwidthType,
        function: form.kernel,
      },
    },
    bandwidth: {
      search: {
        method: form.searchMethod,
        criterion: form.criterion,
        min: nullableNumber(form.bwMin),
        max: nullableNumber(form.bwMax),
        interval: form.searchMethod === 'interval' ? nullableNumber(form.interval) : null,
        initialization: {
          method: form.initializationMethod,
          bandwidth:
            form.initializationMethod === 'predefined'
              ? nullableNumber(form.initializationBandwidth)
              : null,
        },
        tolerance: Number(form.searchTolerance),
        max_iterations: Number(form.searchMaxIterations),
      },
      backfitting: {
        soc: form.soc,
        convergence_threshold: Number(form.convergenceThreshold),
        max_iterations: Number(form.backfitMaxIterations),
        bandwidth_stable_iterations: Number(form.bandwidthStableIterations),
      },
    },
    inference: {
      matrix_free: Boolean(form.matrixFree),
      n_probes: Number(form.nProbes),
      probe_seed: form.probeSeed === '' ? null : Number(form.probeSeed),
      probe_distribution: form.probeDistribution,
      aj_block_ratio: Number(form.ajBlockRatio),
      verbose: true,
    },
    diagnostics: {
      monte_carlo_spatial_variability: {
        enabled: Boolean(form.monteCarlo),
        n_iterations: Number(form.monteCarloIterations),
        seed: form.monteCarloSeed === '' ? null : Number(form.monteCarloSeed),
      },
      local_collinearity: {
        enabled: Boolean(form.localCollinearity),
      },
      bandwidth_confidence_intervals: {
        enabled: Boolean(form.bandwidthCI),
        level: Number(form.bandwidthCILevel),
      },
    },
    execution: {
      n_jobs: Number(form.nJobs),
      n_chunks: Number(form.nChunks),
    },
  }
}
