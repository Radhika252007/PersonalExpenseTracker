import { DEMO_ACCOUNT } from '../context/AuthContext'

export const mockLogin = (email, password) => email === DEMO_ACCOUNT.email && password === DEMO_ACCOUNT.password
export const registerDemoUser = () => ({ message: 'Registration is available when the backend is connected.' })
