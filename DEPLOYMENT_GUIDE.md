# CloudMGWR Frontend — GitHub + AWS Amplify Deployment

## 1. Test locally first

From the project directory:

```bash
npm install
npm run dev
```

Test at least:

1. Sign in with the existing normal Cognito account.
2. Dashboard loads `/me` and `/jobs`.
3. Create a small test MGWR job.
4. Confirm it reaches COMPLETED and the output files download.
5. Sign out and sign in with the VIP account.

## 2. Create the GitHub repository

Create a new repository, recommended name:

```text
cloudmgwr-web
```

Do not upload the ZIP itself as the repository content. Unzip it and push the project files so that `package.json`, `amplify.yml`, and `src/` are at the repository root.

Example commands:

```bash
cd cloudmgwr-web
git init
git add .
git commit -m "Initial CloudMGWR frontend"
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git push -u origin main
```

## 3. Connect GitHub to Amplify Hosting

In AWS Console:

```text
AWS Amplify
→ All apps
→ New app / Create new app
→ Host web app
→ GitHub
→ Continue
```

Authorize the AWS Amplify GitHub App if requested.

Then select:

```text
Repository: cloudmgwr-web
Branch: main
```

Amplify should discover the included `amplify.yml`:

```text
preBuild: npm install
build:    npm run build
output:   dist
```

Choose **Save and deploy**.

## 4. Optional but recommended: set Amplify environment variables

The source code has the current public AWS identifiers as fallbacks, so the first deployment can build without environment variables. For maintainability, add these under the Amplify app's environment-variable settings:

```text
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_K3mHABKcV
VITE_COGNITO_CLIENT_ID=561lienmif7t2rp42aab7roq72
VITE_API_BASE_URL=https://jmrtnx2uaj.execute-api.us-east-1.amazonaws.com
```

Then redeploy the branch.

## 5. Add the React single-page-app rewrite

This frontend uses React Router. A direct browser visit to `/jobs/...` must still serve `index.html`.

In the Amplify app:

```text
Hosting
→ Rewrites and redirects
→ Manage redirects
```

Add the AWS-recommended SPA 200 rewrite pattern:

```json
[
  {
    "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>",
    "status": "200",
    "target": "/index.html",
    "condition": null
  }
]
```

Save.

## 6. Copy the real Amplify website origin

After deployment, Amplify provides an HTTPS domain similar to:

```text
https://main.xxxxxxxxxxxxxx.amplifyapp.com
```

Use the exact origin shown for your deployed branch.

## 7. Tighten API Gateway CORS

The current development configuration uses `*`. After the real Amplify origin is known, change API Gateway CORS to:

```text
Access-Control-Allow-Origin:
https://<YOUR-AMPLIFY-DOMAIN>

Allowed methods:
GET
POST
OPTIONS

Allowed headers:
Authorization
Content-Type

Max age:
300

Allow credentials:
NO
```

Do not include a trailing `/` in the origin.

## 8. Tighten S3 CORS

S3 → `cloudmgwrbucket` → Permissions → Cross-origin resource sharing (CORS) → Edit.

Use:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": ["https://<YOUR-AMPLIFY-DOMAIN>"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Again, use the exact Amplify origin and no trailing `/`.

## 9. Disable internal API traces before public release

Lambda → `cloudmgwr-api` → Configuration → Environment variables.

Change:

```text
TRACE_IN_RESPONSE=true
```

to:

```text
TRACE_IN_RESPONSE=false
```

The public website does not need internal trace data in API responses.

## 10. Final website E2E

From the real Amplify website, test:

### Normal user

- Sign in
- `/me` displays the correct remaining minutes
- Upload CSV
- Select ID/coordinates/Y/X
- Submit MGWR
- Job transitions QUEUED → RUNNING → COMPLETED
- Normal quota decreases by charged runtime
- Results download

### VIP user

- Sign in
- VIP badge / quota-exempt state is displayed
- Submit MGWR
- Job completes
- Remaining minutes do not decrease

### Negative UI path

- Wrong file type is rejected before upload
- Missing coordinate/Y/X selections cannot advance
- A second job is blocked while one is active
- FAILED job displays the backend error and exposes logs/status artifacts

## 11. Continuous deployment after this

Once Amplify is connected to the GitHub `main` branch, future UI changes are normally:

```bash
git add .
git commit -m "Update frontend"
git push
```

Amplify automatically builds and deploys the new commit.


## v1.2 backend requirements

Before testing this frontend against AWS:

1. Deploy `worker_v4_two_outputs.py` as the EC2 project's `worker.py`.
2. Deploy `cloudmgwr_api_v2_two_outputs.py` as the Lambda source.
3. In Lambda environment variables, change `MAX_N_JOBS` to `192`.
4. Do not change API Gateway routes.
5. `aws_worker.py` can remain unchanged.

The public download API then exposes only:

- `output/Local_results.csv`
- `output/Summary.txt`

Internal `run.log`, status/failure/timeout JSON, and resolved parameters may remain in S3
for trusted operations but are not shown to website users.

## v1.3 cancellation / interruption backend requirement

This frontend expects one additional authenticated API route:

- `POST /jobs/{job_id}/cancel`

It also recognizes these job states:

- `CANCEL_REQUESTED` (displayed as STOPPING)
- `CANCELLED`
- `INTERRUPTED`

Deploy the matching `cloudmgwr_api_v3_cancel_interrupt.py`,
`aws_worker_v2_cancelable.py`, and `worker_v4_3_cancelable.py` before using
the Stop job button.
