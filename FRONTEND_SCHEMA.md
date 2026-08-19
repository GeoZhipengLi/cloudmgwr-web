# CloudMGWR Frontend → Backend Parameter Mapping

The website sends only browser-controlled model configuration. It does **not** send trusted job identity, trusted local paths, VIP/quota flags, or the trusted runtime limit.

The `POST /jobs` body is:

```json
{
  "upload_id": "up_...",
  "filename": "data.csv",
  "model_parameters": {
    "data": {},
    "model": {},
    "bandwidth": {},
    "inference": {},
    "diagnostics": {},
    "execution": {}
  }
}
```

The form produces this model structure:

```json
{
  "data": {
    "id_col": "ID",
    "coord_cols": {
      "x": "x_coord",
      "y": "y_coord"
    },
    "coordinate_type": "projected",
    "y_col": "Y",
    "x_cols": ["X1", "X2"],
    "standardize": true,
    "drop_missing": true
  },
  "model": {
    "mode": "MGWR",
    "family": "Gaussian",
    "kernel": {
      "bandwidth_type": "adaptive",
      "function": "bisquare"
    }
  },
  "bandwidth": {
    "search": {
      "method": "golden_section",
      "criterion": "AICc",
      "min": null,
      "max": null,
      "interval": null,
      "initialization": {
        "method": "gwr",
        "bandwidth": null
      },
      "tolerance": 0.000001,
      "max_iterations": 200
    },
    "backfitting": {
      "soc": "SOC-f",
      "convergence_threshold": 0.00001,
      "max_iterations": 200,
      "bandwidth_stable_iterations": 5
    }
  },
  "inference": {
    "matrix_free": true,
    "n_probes": 3000,
    "probe_seed": 2026,
    "probe_distribution": "rademacher",
    "aj_block_ratio": 0.2,
    "verbose": true
  },
  "diagnostics": {
    "monte_carlo_spatial_variability": {
      "enabled": false,
      "n_iterations": 1000,
      "seed": 5536
    },
    "local_collinearity": {
      "enabled": false
    },
    "bandwidth_confidence_intervals": {
      "enabled": false,
      "level": 0.95
    }
  },
  "execution": {
    "n_jobs": 185,
    "n_chunks": 1
  }
}
```

## Desktop-control mapping

- Location Variables `ID`, `X`, `Y` → `data.id_col`, `data.coord_cols`
- Projected / Spherical → `data.coordinate_type`
- Regression `Y` → `data.y_col`
- Local Variables → `data.x_cols`
- MGWR / Gaussian → fixed Version-1 model values
- Adaptive / Fixed → `model.kernel.bandwidth_type`
- Kernel function → `model.kernel.function`
- Golden Section / Interval / SciPy → `bandwidth.search.method`
- AICc / AIC / BIC / CV → `bandwidth.search.criterion`
- Min / Max / Interval → `bandwidth.search.min/max/interval`
- Variable standardization → `data.standardize`
- Initialization → `bandwidth.search.initialization`
- SOC → `bandwidth.backfitting.soc`
- Convergence threshold → `bandwidth.backfitting.convergence_threshold`
- Monte Carlo → `diagnostics.monte_carlo_spatial_variability`
- Local collinearity → `diagnostics.local_collinearity`
- Bandwidth CI → `diagnostics.bandwidth_confidence_intervals`
- Matrix-free inference controls → `inference.*`
- Parallel workers / chunks → `execution.n_jobs/n_chunks`

## Trusted fields intentionally absent from the website

These are created or injected by the backend/EC2 worker instead of the browser:

```text
job.user_id
job.job_id
job.input_csv
job.output_dir
quota_exempt
execution.max_runtime_seconds
```


## Stable public result contract

For a successfully completed job, the website exposes exactly two files:

- `output/Local_results.csv`
- `output/Summary.txt`

The frontend does not interpret the internal columns/content of these files. Their
contents may evolve with future CloudMGWR algorithms while the two filenames remain
stable. Operational logs and metadata are private backend artifacts and are not
presented as user downloads.

`execution.n_jobs` defaults to 185 in the frontend and the current public maximum is 192.
The trusted backend must use `MAX_N_JOBS=192` for this setting to be effective.
