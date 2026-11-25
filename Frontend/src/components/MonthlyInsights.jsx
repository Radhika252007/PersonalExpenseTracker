import { Activity, ArrowUpRight, ReceiptText } from 'lucide-react'
import { formatINR } from '../data/dashboardMockData'

export default function MonthlyInsights({ insights }) {
  return (
    <article className="card budget-card">
      <div className="card-header">
        <div><h3>Monthly activity</h3><span className="muted">Based on your transactions</span></div>
      </div>
      <div className="monthly-insight">
        <span className="summary-icon blue"><ReceiptText size={19} /></span>
        <div><strong>{insights.transactionCount}</strong><span>transactions this month</span></div>
      </div>
      <div className="monthly-insight">
        <span className="summary-icon green"><Activity size={19} /></span>
        <div><strong>{formatINR(insights.averageExpense)}</strong><span>average expense</span></div>
      </div>
      <div className="monthly-insight">
        <span className="summary-icon red"><ArrowUpRight size={19} /></span>
        <div><strong>{insights.largestExpense ? formatINR(insights.largestExpense.amount) : formatINR(0)}</strong><span>{insights.largestExpense?.description || 'largest expense this month'}</span></div>
      </div>
    </article>
  )
}
