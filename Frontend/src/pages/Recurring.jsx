import { useEffect, useState } from 'react'
import { CalendarDays, Clock3, Pause, Pencil, Play, Plus, Repeat2, Trash2, X } from 'lucide-react'
import { getCategories } from '../services/categoryService'
import {
  createRecurringSchedule,
  deleteRecurringSchedule,
  getRecurringSchedules,
  updateRecurringSchedule,
} from '../services/recurringService'
import './Recurring.css'

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const emptyForm = () => {
  const date = today()
  return {
    type: 'expense',
    amount: '',
    categoryId: '',
    description: '',
    frequency: 'monthly',
    startDate: date,
    nextDueDate: date,
    endDate: '',
  }
}

const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(amount)

const formatDate = (date) => new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(`${date}T00:00:00Z`))

const errorMessage = (error) => error.response?.data?.errors?.[0]?.message
  || error.response?.data?.message
  || 'Unable to complete the request. Please try again.'

export default function Recurring() {
  const [schedules, setSchedules] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([getRecurringSchedules(), getCategories()])
      .then(([scheduleResult, categoryResult]) => {
        if (!active) return
        setSchedules(scheduleResult)
        setCategories(categoryResult)
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError))
      })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [refresh])

  const updateForm = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'type' && current.categoryId && !categoryMatchesType(current.categoryId, value)
        ? { categoryId: '' }
        : {}),
      ...(name === 'startDate' && current.nextDueDate === current.startDate
        ? { nextDueDate: value }
        : {}),
    }))
  }

  const categoryMatchesType = (categoryId, type) => {
    const category = categories.find((item) => item.id === categoryId)
    return !category || !category.type || category.type === 'both' || category.type === type
  }
  const availableCategories = (type) => categories.filter((category) => (
    !category.type || category.type === 'both' || category.type === type
  ))

  const resetForm = () => {
    setForm(emptyForm())
    setEditingId(null)
  }

  const editSchedule = (schedule) => {
    setError('')
    setNotice('')
    setEditingId(schedule.id)
    setForm({
      type: schedule.type,
      amount: String(schedule.amount),
      categoryId: schedule.categoryId || '',
      description: schedule.description || '',
      frequency: schedule.frequency,
      startDate: schedule.startDate,
      nextDueDate: schedule.nextDueDate,
      endDate: schedule.endDate || '',
      isActive: schedule.isActive,
    })
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)
    const values = {
      type: form.type,
      amount: form.amount,
      categoryId: form.categoryId || null,
      description: form.description.trim() || null,
      frequency: form.frequency,
      startDate: form.startDate,
      nextDueDate: form.nextDueDate,
      endDate: form.endDate || null,
      ...(editingId ? { isActive: form.isActive } : {}),
    }

    try {
      if (editingId) {
        await updateRecurringSchedule(editingId, values)
        setNotice('Recurring schedule updated.')
      } else {
        await createRecurringSchedule(values)
        setNotice('Recurring schedule created.')
      }
      resetForm()
      setLoading(true)
      setRefresh((value) => value + 1)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  const toggleSchedule = async (schedule) => {
    setError('')
    setNotice('')
    setBusyId(schedule.id)
    try {
      await updateRecurringSchedule(schedule.id, { isActive: !schedule.isActive })
      setNotice(`Schedule ${schedule.isActive ? 'paused' : 'resumed'}.`)
      setLoading(true)
      setRefresh((value) => value + 1)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusyId(null)
    }
  }

  const removeSchedule = async (schedule) => {
    const label = schedule.categoryName || schedule.description || schedule.type
    if (!window.confirm(`Delete the recurring schedule "${label}"? Existing transactions will remain.`)) return

    setError('')
    setNotice('')
    setBusyId(schedule.id)
    try {
      await deleteRecurringSchedule(schedule.id)
      if (editingId === schedule.id) resetForm()
      setNotice('Recurring schedule deleted.')
      setLoading(true)
      setRefresh((value) => value + 1)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page-content recurring-page">
      <header className="transaction-page-heading">
        <div>
          <p className="eyebrow">Automate your routine entries</p>
          <h2>Recurring transactions</h2>
          <p className="muted">Schedule income and expenses, and manage when they run.</p>
        </div>
      </header>

      {error && <div className="error-message" role="alert">{error}</div>}
      {notice && <div className="success-message" role="status">{notice}</div>}

      <section className="card recurring-editor">
        <div className="card-header">
          <div>
            <h3><Plus size={17} /> {editingId ? 'Edit recurring schedule' : 'Create a schedule'}</h3>
            <span className="muted">Generated entries appear in your transaction history.</span>
          </div>
          {editingId && (
            <button className="icon-button" type="button" aria-label="Cancel editing" onClick={resetForm}>
              <X size={18} />
            </button>
          )}
        </div>
        <form className="recurring-form" onSubmit={submit}>
          <label>
            <span>Type</span>
            <select name="type" value={form.type} onChange={updateForm}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
          <label>
            <span>Amount (INR)</span>
            <input name="amount" type="number" min="0.01" max="999999999.99" step="0.01" required value={form.amount} onChange={updateForm} placeholder="0.00" />
          </label>
          <label>
            <span>Category <em>(optional)</em></span>
            <select name="categoryId" value={form.categoryId} onChange={updateForm}>
              <option value="">Uncategorized</option>
              {availableCategories(form.type).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label>
            <span>Description <em>(optional)</em></span>
            <input name="description" type="text" maxLength="200" value={form.description} onChange={updateForm} placeholder="e.g. Rent" />
          </label>
          <label>
            <span>Frequency</span>
            <select name="frequency" value={form.frequency} onChange={updateForm}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
          <label>
            <span>Start date</span>
            <input name="startDate" type="date" required value={form.startDate} onChange={updateForm} />
          </label>
          <label>
            <span>Next due date</span>
            <input name="nextDueDate" type="date" required value={form.nextDueDate} onChange={updateForm} />
          </label>
          <label>
            <span>End date <em>(optional)</em></span>
            <input name="endDate" type="date" value={form.endDate} onChange={updateForm} />
          </label>
          <div className="recurring-form-actions">
            {editingId && (
              <button className="transaction-filter-button secondary" type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create schedule'}
            </button>
          </div>
        </form>
      </section>

      <section className="card recurring-list-card">
        <div className="card-header">
          <div>
            <h3><Repeat2 size={17} /> Your schedules</h3>
            <span className="muted">Pause or resume a schedule at any time.</span>
          </div>
          <span className="muted">{schedules.length} {schedules.length === 1 ? 'schedule' : 'schedules'}</span>
        </div>
        {loading ? (
          <div className="transaction-empty" role="status">Loading recurring schedules...</div>
        ) : schedules.length ? (
          <div className="recurring-list">
            {schedules.map((schedule) => {
              const label = schedule.categoryName || schedule.description || schedule.type
              return (
                <article className="recurring-row" key={schedule.id}>
                  <span className={`transaction-icon ${schedule.type === 'income' ? 'income-icon' : 'expense-icon'}`}>
                    {schedule.type === 'income' ? <Play size={16} /> : <Clock3 size={16} />}
                  </span>
                  <div className="recurring-details">
                    <div className="recurring-title">
                      <strong>{label}</strong>
                      <span className={`recurring-status ${schedule.isActive ? 'active' : 'paused'}`}>
                        {schedule.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <span className="recurring-subtitle">
                      {schedule.type} · {schedule.frequency} · {formatCurrency(schedule.amount)}
                      {schedule.description && schedule.categoryName ? ` · ${schedule.description}` : ''}
                    </span>
                    <span className="recurring-date">
                      <CalendarDays size={13} /> Next {formatDate(schedule.nextDueDate)}
                      {schedule.endDate ? ` · Ends ${formatDate(schedule.endDate)}` : ''}
                    </span>
                  </div>
                  <div className="transaction-row-actions">
                    <button className="transaction-action" type="button" aria-label={`Edit ${label}`} disabled={busyId === schedule.id} onClick={() => editSchedule(schedule)}>
                      <Pencil size={15} />
                    </button>
                    <button className="transaction-action" type="button" aria-label={`${schedule.isActive ? 'Pause' : 'Resume'} ${label}`} disabled={busyId === schedule.id} onClick={() => toggleSchedule(schedule)}>
                      {schedule.isActive ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                    <button className="transaction-action delete" type="button" aria-label={`Delete ${label}`} disabled={busyId === schedule.id} onClick={() => removeSchedule(schedule)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="transaction-empty">
            <Repeat2 size={28} />
            <strong>No recurring schedules yet</strong>
            <span>Create a schedule above to automate routine income or expenses.</span>
          </div>
        )}
      </section>
    </div>
  )
}
