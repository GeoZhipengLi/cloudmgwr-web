import {
  confirmResetPassword,
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  resendSignUpCode,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth'

export async function signInWithEmail(email, password) {
  const result = await signIn({
    username: email.trim().toLowerCase(),
    password,
    options: {
      authFlowType: 'USER_AUTH',
      preferredChallenge: 'PASSWORD',
    },
  })

  if (!result.isSignedIn && result.nextStep?.signInStep !== 'DONE') {
    const step = result.nextStep?.signInStep || 'UNKNOWN'
    throw new Error(`Additional Cognito sign-in step is required: ${step}`)
  }
  return result
}

export async function createAccount(email, password) {
  return signUp({
    username: email.trim().toLowerCase(),
    password,
    options: {
      userAttributes: {
        email: email.trim().toLowerCase(),
      },
    },
  })
}

export async function confirmAccount(email, confirmationCode) {
  return confirmSignUp({
    username: email.trim().toLowerCase(),
    confirmationCode: confirmationCode.trim(),
  })
}

export async function resendConfirmation(email) {
  return resendSignUpCode({ username: email.trim().toLowerCase() })
}

export async function startPasswordReset(email) {
  return resetPassword({ username: email.trim().toLowerCase() })
}

export async function finishPasswordReset(email, confirmationCode, newPassword) {
  return confirmResetPassword({
    username: email.trim().toLowerCase(),
    confirmationCode: confirmationCode.trim(),
    newPassword,
  })
}

export async function getAccessToken() {
  const session = await fetchAuthSession()
  const token = session.tokens?.accessToken
  if (!token) throw new Error('No Cognito access token is available. Please sign in again.')
  return token.toString()
}

export async function currentUser() {
  return getCurrentUser()
}

export async function logout() {
  return signOut()
}
