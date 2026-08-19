export const APP_CONFIG = {
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_K3mHABKcV',
  userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '561lienmif7t2rp42aab7roq72',
  apiBaseUrl:
    (import.meta.env.VITE_API_BASE_URL || 'https://jmrtnx2uaj.execute-api.us-east-1.amazonaws.com').replace(/\/$/, ''),
  appName: 'CloudMGWR',
  versionLabel: 'Version 1',
}
