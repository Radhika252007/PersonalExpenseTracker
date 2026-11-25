import { useEffect, useMemo, useState } from 'react'
import { Download, FileBarChart2, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatINR } from '../data/dashboardMockData'
import { getCategoryReport, getMonthlyTrend, getSummary, downloadReport } from '../services/reportsService'
import './Reports.css'

const colors = ['#438eba', '#52a782', '#e69a4d', '#8768bd', '#de7180', '#8a9bad']
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2026, index, 1))),
}))
const errorMessage = (error) => error.response?.data?.message || 'Unable to load reports. Please try again.'
const currency = (value) => formatINR(Number(value) || 0)
const getCurrentPeriod = () => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return {
    month,
    year,
    from: `${year}-${String(month).padStart(2, '0')}-01`,
    to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }
}

export default function Reports() {
  const [initialPeriod] = useState(getCurrentPeriod)
  const [month, setMonth] = useState(initialPeriod.month)
  const [year, setYear] = useState(initialPeriod.year)
  const [dateRange, setDateRange] = useState({ from: initialPeriod.from, to: initialPeriod.to })
  const [summary, setSummary] = useState(null)
  const [categories, setCategories] = useState([])
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      getSummary({ month, year }),
      getMonthlyTrend({ year }),
      getCategoryReport(dateRange),
    ])
      .then(([nextSummary, nextTrend, nextCategories]) => {
        if (!active) return
        setSummary(nextSummary)
        setTrend(nextTrend.months)
        setCategories(nextCategories)
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError))
      })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [month, year, dateRange])

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.expenses > 0),
    [categories],
  )

  const updateMonth = (event) => {
    setError('')
    setLoading(true)
    setMonth(Number(event.target.value))
  }
  const updateYear = (event) => {
    setError('')
    setLoading(true)
    setYear(Number(event.target.value))
  }
  const updateDateRange = (field, value) => {
    setError('')
    setLoading(true)
    setDateRange((current) => ({ ...current, [field]: value }))
  }

  const exportCsv = async () => {
    setError('')
    setExporting(true)
    try {
      const file = await downloadReport(dateRange)
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = 'transactions.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="page-content analytics-page">
      <header className="analytics-heading">
        <div>
          <p className="eyebrow">Understand your money</p>
          <h2>Reports &amp; analytics</h2>
          <p className="muted">Track cash flow, spending patterns, and savings over time.</p>
        </div>
        <button className="transaction-filter-button analytics-export" type="button" onClick={exportCsv} disabled={exporting}>
          <Download size={16} />{exporting ? 'Preparing...' : 'Export CSV'}
        </button>
      </header>

      <section className="card analytics-filters" aria-label="Report filters">
        <label>
          <span className="muted">Summary month</span>
          <select value={month} onChange={updateMonth}>
            {monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          <span className="muted">Year</span>
          <input type="number" min="1" max="9999" value={year} onChange={updateYear} />
        </label>
        <span className="analytics-filter-divider" />
        <label>
          <span className="muted">Category report from</span>
          <input type="date" value={dateRange.from} max={dateRange.to || undefined} onChange={(event) => updateDateRange('from', event.target.value)} />
        </label>
        <label>
          <span className="muted">To</span>
          <input type="date" value={dateRange.to} min={dateRange.from || undefined} onChange={(event) => updateDateRange('to', event.target.value)} />
        </label>
      </section>

      {error && <div className="error-message" role="alert">{error}</div>}

      <section className="analytics-summary-grid" aria-label="Monthly summary">
        <article className="card analytics-metric-card">
          <span className="summary-icon green"><TrendingUp size={19} /></span>
          <p>Income</p>
          <strong>{currency(summary?.totals.income)}</strong>
          <span className="muted">Selected month</span>
        </article>
        <article className="card analytics-metric-card">
          <span className="summary-icon red"><TrendingDown size={19} /></span>
          <p>Expenses</p>
          <strong>{currency(summary?.totals.expenses)}</strong>
          <span className="muted">Selected month</span>
        </article>
        <article className="card analytics-metric-card">
          <span className="summary-icon blue"><WalletIcon /></span>
          <p>Net savings</p>
          <strong className={summary?.savings < 0 ? 'negative' : ''}>{currency(summary?.savings)}</strong>
          <span className="muted">Income minus expenses</span>
        </article>
        <article className="card analytics-metric-card">
          <span className="summary-icon purple"><PiggyBank size={19} /></span>
          <p>Savings rate</p>
          <strong>{Number(summary?.savingsRate || 0).toFixed(1)}%</strong>
          <span className="muted">{summary?.transactionCount || 0} transactions</span>
        </article>
      </section>

      {loading ? (
        <div className="card analytics-empty" role="status">Loading your analytics...</div>
      ) : (
        <>
          <div className="analytics-chart-grid">
            <section className="card analytics-chart-card">
              <div className="card-header">
                <div><h3>Monthly cash flow</h3><span className="muted">Income and expenses · {year}</span></div>
                <FileBarChart2 size={19} color="#438eba" />
              </div>
              {trend.some((entry) => entry.income || entry.expenses) ? (
                <div className="analytics-chart-wrap">
                  <ResponsiveContainer>
                    <BarChart data={trend} barGap={5}>
                      <CartesianGrid vertical={false} stroke="#edf0f4" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8b95a5' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8b95a5' }} tickFormatter={(value) => `${value / 1000}k`} />
                      <Tooltip formatter={(value) => currency(value)} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="income" name="Income" fill="#438eba" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#e69a4d" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="analytics-empty">No transactions recorded for {year}.</div>}
            </section>

            <section className="card analytics-chart-card">
              <div className="card-header">
                <div><h3>Expenses by category</h3><span className="muted">Selected date range</span></div>
              </div>
              {expenseCategories.length ? (
                <>
                  <div className="analytics-donut-wrap">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={expenseCategories} dataKey="expenses" nameKey="name" innerRadius={56} outerRadius={84} paddingAngle={3}>
                          {expenseCategories.map((entry, index) => <Cell key={entry.categoryId || entry.name} fill={colors[index % colors.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => currency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="analytics-category-list">
                    {expenseCategories.map((entry, index) => (
                      <div className="analytics-category-row" key={entry.categoryId || entry.name}>
                        <span><i className="dot" style={{ background: colors[index % colors.length] }} />{entry.name}</span>
                        <strong>{currency(entry.expenses)}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div className="analytics-empty">No categorized expenses in this date range.</div>}
            </section>
          </div>

          <section className="card analytics-table-card">
            <div className="card-header">
              <div><h3>Category breakdown</h3><span className="muted">Income and expenses from {dateRange.from} to {dateRange.to}</span></div>
            </div>
            {categories.length ? (
              <div className="analytics-table-scroll">
                <table className="analytics-table">
                  <thead><tr><th>Category</th><th>Income</th><th>Expenses</th><th>Net</th></tr></thead>
                  <tbody>{categories.map((entry) => (
                    <tr key={entry.categoryId || entry.name}>
                      <td>{entry.name}</td>
                      <td className="income">{currency(entry.income)}</td>
                      <td className="expense">{currency(entry.expenses)}</td>
                      <td>{currency(entry.income - entry.expenses)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <div className="analytics-empty">No transactions in this date range.</div>}
          </section>
        </>
      )}
    </div>
  )
}

function WalletIcon() {
  return <span aria-hidden="true" className="analytics-wallet-mark">₹</span>
}
