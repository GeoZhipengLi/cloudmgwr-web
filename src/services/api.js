import { APP_CONFIG } from '../config'
import { getAccessToken } from './auth'

export class ApiError extends Error {
  constructor(message, status, code, payload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.payload = payload
  }
}

async function parseResponse(response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

export async function publicApi(path, options = {}) {
  const response = await fetch(`${APP_CONFIG.apiBaseUrl}${path}`, options)
  const payload = await parseResponse(response)
  if (!response.ok) {
    throw new ApiError(payload.message || `Request failed (${response.status})`, response.status, payload.error, payload)
  }
  return payload
}

export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const token = await getAccessToken()
  const requestHeaders = {
    Authorization: `Bearer ${token}`,
    ...headers,
  }
  let requestBody
  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json'
    requestBody = JSON.stringify(body)
  }

  const response = await fetch(`${APP_CONFIG.apiBaseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: requestBody,
  })
  const payload = await parseResponse(response)
  if (!response.ok) {
    throw new ApiError(payload.message || `Request failed (${response.status})`, response.status, payload.error, payload)
  }
  return payload
}

export const backend = {
  health: () => publicApi('/health'),
  me: () => api('/me'),
  jobs: () => api('/jobs'),
  job: (jobId) => api(`/jobs/${encodeURIComponent(jobId)}`),
  cancelJob: (jobId) => api(`/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' }),
  requestUpload: (filename) => api('/upload-url', { method: 'POST', body: { filename } }),
  submitJob: (uploadId, filename, modelParameters) =>
    api('/jobs', {
      method: 'POST',
      body: {
        upload_id: uploadId,
        filename,
        model_parameters: modelParameters,
      },
    }),
  artifacts: (jobId) => api(`/jobs/${encodeURIComponent(jobId)}/download`),
  artifactUrl: (jobId, name) =>
    api(`/jobs/${encodeURIComponent(jobId)}/download?file=${encodeURIComponent(name)}`),
}

export async function uploadCsvToPresignedUrl(uploadInfo, file, onProgress) {
  // Fetch does not expose upload progress in a portable way; this function reports coarse stages.
  onProgress?.(10)
  const response = await fetch(uploadInfo.upload_url, {
    method: uploadInfo.method || 'PUT',
    headers: uploadInfo.required_headers || { 'Content-Type': 'text/csv' },
    body: file,
  })
  if (!response.ok) {
    throw new Error(`Direct S3 upload failed with HTTP ${response.status}.`)
  }
  onProgress?.(100)
}
