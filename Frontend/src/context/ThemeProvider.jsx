import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { getSettings } from '../services/settingsService'
import ThemeContext from './themeContext'

const messageFromError = (error) => error.response?.data?.message
  || 'Unable to load your saved theme preference.'

export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const requestId = useRef(0)
  const [themeState, setThemeState] = useState({ userId: null, mode: 'system' })
  const [errorState, setErrorState] = useState({ userId: null, message: '' })
  const themeMode = user?.id && themeState.userId === user.id ? themeState.mode : 'system'
  const themeError = user?.id && errorState.userId === user.id ? errorState.message : ''

  useEffect(() => {
    if (!user?.id) return undefined

    let active = true
    const currentRequestId = ++requestId.current
    getSettings()
      .then((settings) => {
        if (!active || currentRequestId !== requestId.current) return
        setThemeState({ userId: user.id, mode: settings.theme })
        setErrorState({ userId: user.id, message: '' })
      })
      .catch((error) => {
        if (active && currentRequestId === requestId.current) {
          setErrorState({ userId: user.id, message: messageFromError(error) })
        }
      })

    return () => { active = false }
  }, [user?.id])

  useEffect(() => {
    const preference = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const activeTheme = themeMode === 'system'
        ? (preference.matches ? 'dark' : 'light')
        : themeMode
      document.documentElement.dataset.theme = activeTheme
    }

    applyTheme()
    preference.addEventListener('change', applyTheme)
    return () => preference.removeEventListener('change', applyTheme)
  }, [themeMode])

  const updateThemeMode = useCallback((nextMode) => {
    requestId.current += 1
    setThemeState({ userId: user?.id, mode: nextMode })
    setErrorState({ userId: user?.id, message: '' })
  }, [user?.id])

  const value = useMemo(() => ({
    themeMode,
    setThemeMode: updateThemeMode,
    themeError,
  }), [themeMode, themeError, updateThemeMode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
