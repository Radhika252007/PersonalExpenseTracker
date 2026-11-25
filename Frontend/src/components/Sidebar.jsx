import { BarChart3, CalendarClock, LayoutDashboard, Receipt, Settings, WalletCards, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const links = [
  ['Dashboard', '/dashboard', LayoutDashboard], ['Transactions', '/transactions', Receipt], ['Budgets', '/budgets', WalletCards],
  ['Reports & Analytics', '/reports', BarChart3], ['Recurring Transactions', '/recurring', CalendarClock], ['Settings', '/settings', Settings],
]
export default function Sidebar({ open, onClose }) {
  return <aside className={`sidebar ${open ? 'open' : ''}`}>
    <div className="brand"><span className="brand-mark">₿</span> PennyWise <button className="icon-button mobile-close" onClick={onClose}><X size={18} /></button></div>
    <div className="nav-label">Workspace</div>
    <nav>{links.map(([label, path, Icon]) => <NavLink key={path} to={path} onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}><Icon size={17} />{label}</NavLink>)}</nav>
  </aside>
}
