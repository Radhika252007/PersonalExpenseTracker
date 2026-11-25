import { Bell, ChevronDown, Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
export default function Navbar({ onMenu }) {
  const { user, logout } = useAuth()
  return <header className="topbar"><div className="topbar-left"><button className="menu-button" onClick={onMenu}><Menu /></button><div><p className="eyebrow">Good morning, {user?.username}</p><h1>Overview</h1></div></div><div className="topbar-actions"><select className="month-select" defaultValue="October" aria-label="Select month"><option>October 2026</option><option>September 2026</option></select><button className="icon-button" aria-label="Notifications"><Bell size={19} /><span className="badge" /></button><button className="profile" onClick={logout}><span className="avatar">{user?.username?.slice(0, 2).toUpperCase()}</span><span><strong>{user?.username}</strong><span>Account</span></span><ChevronDown size={15} /></button></div></header>
}
