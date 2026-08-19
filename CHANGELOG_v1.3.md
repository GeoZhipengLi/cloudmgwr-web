# CloudMGWR Web v1.3

- Adds a **Stop job** control for QUEUED and RUNNING jobs.
- Adds `CANCEL_REQUESTED` UI state displayed as **STOPPING**.
- Adds terminal `INTERRUPTED` state for EC2/worker loss.
- Cancelled and interrupted jobs do not expose result downloads.
- Preserves the v1.2 two-file result contract and v1.1 startup/flicker fix.
