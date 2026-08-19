import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Amplify } from 'aws-amplify'
import { APP_CONFIG } from './config'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import './styles.css'

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: APP_CONFIG.userPoolId,
      userPoolClientId: APP_CONFIG.userPoolClientId,
      loginWith: { email: true },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: { required: true },
      },
    },
  },
})

// StrictMode is intentionally omitted here because its development-only
// double effect cycle makes network-heavy authentication startup noisier.
// The auth/profile lifecycle itself is safe without relying on this omission.
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>,
)
