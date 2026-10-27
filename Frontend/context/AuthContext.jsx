import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const SESSION_KEY = 'pennywise_mock_session'
export const DEMO_ACCOUNT = { email: 'demo@example.com', password: 'Demo123!' }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'active'
    ? { name: 'Demo User', email: DEMO_ACCOUNT.email }
    : null)
  const isInitializing = false

  const value = useMemo(() => ({
    user, isInitializing,
    login: async (email, password) => {
      if (email !== DEMO_ACCOUNT.email || password !== DEMO_ACCOUNT.password) throw new Error('Use the demo credentials shown below.')
      sessionStorage.setItem(SESSION_KEY, 'active')
      setUser({ name: 'Demo User', email })
    },
    logout: () => { sessionStorage.removeItem(SESSION_KEY); setUser(null) },
  }), [user, isInitializing])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
