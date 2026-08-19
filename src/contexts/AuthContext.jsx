import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { currentUser, logout as cognitoLogout } from '../services/auth'
import { backend } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // `loading` is ONLY the one-time Cognito session check at app startup.
  // Profile refreshes must never turn this back on, otherwise protected pages
  // are unmounted and remounted while they are trying to refresh the profile.
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [cognitoUser, setCognitoUser] = useState(null)
  const [profile, setProfile] = useState(null)

  const loadProfile = useCallback(async () => {
    setProfileLoading(true)
    try {
      const me = await backend.me()
      setProfile(me)
      return me
    } catch (error) {
      console.error('Could not load /me', error)
      setProfile(null)
      return null
    } finally {
      setProfileLoading(false)
    }
  }, [])

  // Used after sign-in, job submission, and when the dashboard wants fresh quota.
  // IMPORTANT: this does not toggle the global startup loading screen.
  const refresh = useCallback(async () => {
    try {
      const user = await currentUser()
      setCognitoUser(user)
      setSignedIn(true)
      await loadProfile()
      return true
    } catch {
      setSignedIn(false)
      setCognitoUser(null)
      setProfile(null)
      return false
    }
  }, [loadProfile])

  // One-time startup check. Once Cognito tells us whether a user exists, the
  // full-screen loader can disappear. /me is then loaded without blocking the UI.
  useEffect(() => {
    let active = true

    async function initialize() {
      setLoading(true)
      try {
        const user = await currentUser()
        if (!active) return

        setCognitoUser(user)
        setSignedIn(true)
        setLoading(false)

        try {
          const me = await backend.me()
          if (active) setProfile(me)
        } catch (error) {
          console.error('Could not load /me during startup', error)
          if (active) setProfile(null)
        }
      } catch {
        if (!active) return
        setSignedIn(false)
        setCognitoUser(null)
        setProfile(null)
        setLoading(false)
      }
    }

    initialize()
    return () => {
      active = false
    }
  }, [])

  const logout = useCallback(async () => {
    await cognitoLogout()
    setSignedIn(false)
    setCognitoUser(null)
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({ loading, profileLoading, signedIn, cognitoUser, profile, refresh, loadProfile, logout }),
    [loading, profileLoading, signedIn, cognitoUser, profile, refresh, loadProfile, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
