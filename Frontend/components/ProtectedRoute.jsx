import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { user, isInitializing } = useAuth()
  const location = useLocation()
  if (isInitializing) return <div className="auth-page"><p>Loading your workspace...</p></div>
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />
}
