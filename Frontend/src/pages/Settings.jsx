import { useEffect, useMemo, useState } from 'react'
import {
  BellRing,
  CalendarDays,
  CircleAlert,
  Download,
  FolderKanban,
  LockKeyhole,
  Mail,
  Pencil,
  Plus,
  Shield,
  Save,
  SlidersHorizontal,
  Trash2,
  UserRound,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/useTheme'
import { getBudgets } from '../services/budgetService'
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '../services/categoryService'
import { getSettings, updateSettings } from '../services/settingsService'
import { listAllTransactions } from '../services/transactionService'
import './Settings.css'

const DEFAULT_PREFERENCES = {
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
  theme: 'system',
  language: 'en',
}
const DEFAULT_BUDGET = { monthlyLimit: '', resetDay: '1' }
const DEFAULT_NOTIFICATIONS = {
  budgetAlerts: true,
  monthlySummary: true,
  recurringReminders: true,
  transactionAlerts: false,
}
const DEFAULT_SETTINGS = {
  profile: { name: '', email: '' },
  preferences: DEFAULT_PREFERENCES,
  budget: DEFAULT_BUDGET,
  notifications: DEFAULT_NOTIFICATIONS,
}

const messageFromError = (error, fallback) => error.response?.data?.errors?.[0]?.message
  || error.response?.data?.message
  || fallback

const currencyAmount = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(amount)

const downloadCsv = (transactions, categories) => {
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
  const fields = ['date', 'type', 'amount', 'category', 'description']
  const rows = transactions.map((transaction) => [
    transaction.date,
    transaction.type,
    transaction.amount,
    categoryNames.get(transaction.categoryId) || '',
    transaction.description || '',
  ])
  const escape = (value) => {
    const text = String(value ?? '')
    const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text
    return `"${safeText.replaceAll('"', '""')}"`
  }
  const csv = [fields, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `pennywise-transactions-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function SectionHeading({ icon: Icon, title, description }) {
  return (
    <div className="settings-section-heading">
      <span className="settings-section-icon"><Icon size={18} /></span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  )
}

function SectionActions({ onCancel, onReset, onSave, saving = false }) {
  return (
    <div className="settings-actions">
      <button className="settings-button settings-button-quiet" type="button" onClick={onReset} disabled={saving}>Reset</button>
      <button className="settings-button settings-button-quiet" type="button" onClick={onCancel} disabled={saving}>Cancel</button>
      <button className="settings-button settings-button-primary" type="button" onClick={onSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}

function CategoryRows({
  categories,
  editingCategory,
  onEdit,
  onDelete,
  onChange,
  onSave,
  onCancel,
  saving,
}) {
  const groups = [
    { key: 'income', title: 'Income categories' },
    { key: 'expense', title: 'Expense categories' },
    { key: 'both', title: 'Income & expense categories' },
  ]

  return groups.map((group) => {
    const items = categories.filter((category) => (category.type || 'both') === group.key)
    if (!items.length) return null
    return (
      <div className="settings-category-group" key={group.key}>
        <div className="settings-category-group-title">{group.title}<span>{items.length}</span></div>
        {items.map((category) => (
          editingCategory?.id === category.id ? (
            <form className="settings-category-edit" key={category.id} onSubmit={onSave}>
              <input
                value={editingCategory.name}
                onChange={(event) => onChange('name', event.target.value)}
                maxLength="60"
                aria-label="Category name"
                required
              />
              <select value={editingCategory.type} onChange={(event) => onChange('type', event.target.value)} aria-label="Category type">
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="both">Income & expense</option>
              </select>
              <button className="settings-icon-action settings-edit-save" type="submit" disabled={saving} aria-label="Save category"><Save size={15} /></button>
              <button className="settings-icon-action" type="button" disabled={saving} onClick={onCancel} aria-label="Cancel category edit"><X size={15} /></button>
            </form>
          ) : (
            <div className="settings-category-row" key={category.id}>
              <span className="settings-category-mark">{category.icon || <FolderKanban size={15} />}</span>
              <strong>{category.name}</strong>
              <div className="settings-category-actions">
                <button type="button" className="settings-icon-action" aria-label={`Edit ${category.name}`} onClick={() => onEdit(category)}>
                  <Pencil size={15} />
                </button>
                <button type="button" className="settings-icon-action settings-icon-danger" aria-label={`Delete ${category.name}`} onClick={() => onDelete(category)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          )
        ))}
      </div>
    )
  })
}

export default function Settings() {
  const { user, updateProfile, changePassword, deleteAccount } = useAuth()
  const { setThemeMode } = useTheme()
  const defaults = useMemo(() => ({
    ...DEFAULT_SETTINGS,
    profile: {
      name: user?.name || user?.username || '',
      email: user?.email || '',
    },
    preferences: { ...DEFAULT_PREFERENCES, currency: user?.currency || 'INR' },
  }), [user])
  const [categories, setCategories] = useState([])
  const [categoryName, setCategoryName] = useState('')
  const [categoryType, setCategoryType] = useState('expense')
  const [editingCategory, setEditingCategory] = useState(null)
  const [budgetTotal, setBudgetTotal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingCategory, setSavingCategory] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [savingSection, setSavingSection] = useState('')
  const [accountPassword, setAccountPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busyAccountAction, setBusyAccountAction] = useState(false)
  const [notice, setNotice] = useState('')
  const [dialog, setDialog] = useState(null)
  const [savedSettings, setSavedSettings] = useState(defaults)
  const [draft, setDraft] = useState(defaults)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const now = new Date()
    Promise.allSettled([
      getCategories(),
      getBudgets({ month: now.getUTCMonth() + 1, year: now.getUTCFullYear() }),
      getSettings(),
    ]).then(([categoryResult, budgetResult, settingsResult]) => {
      if (!active) return
      if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value)
      else setError(messageFromError(categoryResult.reason, 'Unable to load categories.'))
      if (budgetResult.status === 'fulfilled') {
        setBudgetTotal(budgetResult.value.budgets.reduce((total, budget) => total + budget.amount, 0))
      } else {
        setNotice((current) => current || 'Current category budgets could not be loaded.')
      }
      if (settingsResult.status === 'fulfilled') {
        const next = {
          ...defaults,
          preferences: {
            currency: settingsResult.value.currency,
            dateFormat: settingsResult.value.dateFormat,
            theme: settingsResult.value.theme,
            language: settingsResult.value.language,
          },
          budget: {
            monthlyLimit: settingsResult.value.monthlyBudget ? String(settingsResult.value.monthlyBudget) : '',
            resetDay: String(settingsResult.value.budgetResetDay),
          },
          notifications: settingsResult.value.notifications,
        }
        setSavedSettings(next)
        setDraft(next)
      } else {
        setError(messageFromError(settingsResult.reason, 'Unable to load account settings.'))
      }
    }).finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [defaults])

  const updateDraft = (section, field, value) => {
    setDraft((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value },
    }))
  }

  const saveSection = async (section) => {
    setError('')
    setNotice('')
    setSavingSection(section)
    try {
      let nextSection
      if (section === 'profile') {
        const updatedUser = await updateProfile(draft.profile)
        nextSection = { name: updatedUser.name, email: updatedUser.email }
      } else if (section === 'preferences') {
        const updated = await updateSettings(draft.preferences)
        setThemeMode(updated.theme)
        nextSection = {
          currency: updated.currency,
          dateFormat: updated.dateFormat,
          theme: updated.theme,
          language: updated.language,
        }
      } else if (section === 'budget') {
        const updated = await updateSettings({
          monthlyBudget: Number(draft.budget.monthlyLimit || 0),
          budgetResetDay: Number(draft.budget.resetDay),
        })
        nextSection = {
          monthlyLimit: updated.monthlyBudget ? String(updated.monthlyBudget) : '',
          resetDay: String(updated.budgetResetDay),
        }
      } else {
        const updated = await updateSettings({ notifications: draft.notifications })
        nextSection = updated.notifications
      }
      const next = { ...savedSettings, [section]: nextSection }
      setSavedSettings(next)
      setDraft((current) => ({ ...current, [section]: nextSection }))
      setNotice('Settings saved to your account.')
    } catch (requestError) {
      setError(messageFromError(requestError, 'Unable to save settings. Please try again.'))
    } finally {
      setSavingSection('')
    }
  }

  const cancelSection = (section) => {
    setDraft((current) => ({ ...current, [section]: savedSettings[section] }))
    setError('')
    setNotice('')
  }

  const resetSection = (section) => {
    setDraft((current) => ({ ...current, [section]: defaults[section] }))
    setNotice('')
  }

  const addCategory = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSavingCategory(true)
    try {
      const category = await createCategory({ name: categoryName.trim(), type: categoryType })
      setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)))
      setCategoryName('')
      setCategoryType('expense')
      setNotice('Category added to your account.')
    } catch (requestError) {
      setError(messageFromError(requestError, 'Unable to add this category. Please try again.'))
    } finally {
      setSavingCategory(false)
    }
  }

  const startCategoryEdit = (category) => {
    setEditingCategory({ id: category.id, name: category.name, type: category.type || 'both' })
    setError('')
    setNotice('')
  }

  const updateCategoryDraft = (field, value) => {
    setEditingCategory((current) => ({ ...current, [field]: value }))
  }

  const saveCategoryEdit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSavingEdit(true)
    try {
      const updated = await updateCategory(editingCategory.id, {
        name: editingCategory.name.trim(),
        type: editingCategory.type,
      })
      setCategories((current) => current.map((category) => category.id === updated.id ? updated : category))
      setEditingCategory(null)
      setNotice('Category updated.')
    } catch (requestError) {
      setError(messageFromError(requestError, 'Unable to update this category.'))
    } finally {
      setSavingEdit(false)
    }
  }

  const removeCategory = async () => {
    setError('')
    setDeletingCategory(true)
    try {
      await deleteCategory(dialog.category.id)
      setCategories((current) => current.filter((category) => category.id !== dialog.category.id))
      setDialog(null)
      setNotice('Category deleted.')
    } catch (requestError) {
      setDialog({
        type: 'information',
        title: 'Unable to delete category',
        message: messageFromError(requestError, 'This category could not be deleted.'),
      })
    } finally {
      setDeletingCategory(false)
    }
  }

  const submitPasswordChange = async (event) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setDialog({ type: 'information', title: 'Passwords do not match', message: 'Enter the same new password in both fields.' })
      return
    }
    setBusyAccountAction(true)
    try {
      await changePassword(accountPassword, newPassword)
    } catch (requestError) {
      setDialog({
        type: 'information',
        title: 'Unable to change password',
        message: messageFromError(requestError, 'Please check your current password and try again.'),
      })
    } finally {
      setBusyAccountAction(false)
    }
  }

  const submitAccountDeletion = async (event) => {
    event.preventDefault()
    setBusyAccountAction(true)
    try {
      await deleteAccount(accountPassword)
    } catch (requestError) {
      setDialog({
        type: 'information',
        title: 'Unable to delete account',
        message: messageFromError(requestError, 'Please check your password and try again.'),
      })
    } finally {
      setBusyAccountAction(false)
    }
  }

  const closeDialog = () => {
    setDialog(null)
    setAccountPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const exportTransactions = async () => {
    setError('')
    setNotice('')
    setExporting(true)
    try {
      const allTransactions = await listAllTransactions()
      downloadCsv(allTransactions, categories)
      setNotice(`Exported ${allTransactions.length} transactions as a CSV file.`)
    } catch (requestError) {
      setError(messageFromError(requestError, 'Unable to export transactions. Please try again.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="page-content settings-page">
      <header className="settings-page-heading">
        <div>
          <p className="eyebrow">Manage your account</p>
          <h2>Settings</h2>
          <p className="muted">Personalize your workspace and manage your financial data.</p>
        </div>
      </header>

      {error && <div className="error-message settings-feedback" role="alert">{error}</div>}
      {notice && <div className="success-message settings-feedback" role="status">{notice}</div>}

      <section className="card settings-card">
        <SectionHeading icon={UserRound} title="Profile settings" description="Your account details and contact information." />
        <div className="settings-form-grid">
          <label className="settings-field">
            <span>Full name</span>
            <input maxLength="80" autoComplete="name" value={draft.profile.name} onChange={(event) => updateDraft('profile', 'name', event.target.value)} />
          </label>
          <label className="settings-field">
            <span>Email address</span>
            <input type="email" maxLength="254" autoComplete="email" value={draft.profile.email} onChange={(event) => updateDraft('profile', 'email', event.target.value)} />
          </label>
        </div>
        <p className="settings-note"><CircleAlert size={15} /> Your name and email are saved to your account. Changing your email may affect how you sign in.</p>
        <div className="settings-profile-actions">
          <button className="settings-button settings-button-quiet" type="button" onClick={() => setDialog({
            type: 'password',
            title: 'Change password',
          })}><LockKeyhole size={15} /> Change password</button>
          <SectionActions
            onCancel={() => cancelSection('profile')}
            onReset={() => resetSection('profile')}
            onSave={() => saveSection('profile')}
            saving={savingSection === 'profile'}
          />
        </div>
      </section>

      <section className="card settings-card">
        <SectionHeading icon={SlidersHorizontal} title="Preferences" description="Choose the defaults that work best for you." />
        <div className="settings-form-grid settings-preferences-grid">
          <label className="settings-field">
            <span>Currency</span>
            <select value={draft.preferences.currency} onChange={(event) => updateDraft('preferences', 'currency', event.target.value)}>
              <option value="INR">INR — Indian Rupee</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="CAD">CAD — Canadian Dollar</option>
              <option value="AUD">AUD — Australian Dollar</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Date format</span>
            <select value={draft.preferences.dateFormat} onChange={(event) => updateDraft('preferences', 'dateFormat', event.target.value)}>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Theme</span>
            <select value={draft.preferences.theme} onChange={(event) => updateDraft('preferences', 'theme', event.target.value)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System default</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Language</span>
            <select value={draft.preferences.language} onChange={(event) => updateDraft('preferences', 'language', event.target.value)}>
              <option value="en">English</option>
            </select>
          </label>
        </div>
        <p className="settings-note"><CircleAlert size={15} /> Theme applies across the app, and System follows your device preference. Currency and language are saved, but not every view currently uses them.</p>
        <SectionActions
          onCancel={() => cancelSection('preferences')}
          onReset={() => resetSection('preferences')}
          onSave={() => saveSection('preferences')}
          saving={savingSection === 'preferences'}
        />
      </section>

      <section className="card settings-card">
        <SectionHeading icon={Wallet} title="Budget settings" description="Set a personal monthly target and choose when your cycle resets." />
        <div className="settings-budget-summary">
          <span className="settings-budget-summary-icon"><CalendarDays size={17} /></span>
          <div>
            <span className="settings-label">Current category budgets this month</span>
            <strong>{budgetTotal === null ? (loading ? 'Loading…' : 'Unavailable') : currencyAmount(budgetTotal)}</strong>
          </div>
        </div>
        <div className="settings-form-grid settings-budget-fields">
          <label className="settings-field">
            <span>Personal monthly target (INR)</span>
            <input type="number" min="0" max="999999999.99" step="0.01" value={draft.budget.monthlyLimit} onChange={(event) => updateDraft('budget', 'monthlyLimit', event.target.value)} placeholder="e.g. 50000" />
          </label>
          <label className="settings-field">
            <span>Budget cycle reset day</span>
            <select value={draft.budget.resetDay} onChange={(event) => updateDraft('budget', 'resetDay', event.target.value)}>
              {Array.from({ length: 28 }, (_, index) => <option key={index + 1} value={String(index + 1)}>Day {index + 1} of each month</option>)}
            </select>
          </label>
        </div>
        <p className="settings-note"><CircleAlert size={15} /> Your overall target and reset day are saved to your account. Category budgets above are read from your account and can be edited on the Budgets page.</p>
        <SectionActions
          onCancel={() => cancelSection('budget')}
          onReset={() => resetSection('budget')}
          onSave={() => saveSection('budget')}
          saving={savingSection === 'budget'}
        />
      </section>

      <section className="card settings-card">
        <SectionHeading icon={BellRing} title="Notifications" description="Choose which reminders you would like to receive." />
        <div className="settings-notification-list">
          {[
            ['budgetAlerts', 'Budget threshold alerts', 'Alerts when spending reaches 80% and 100% of a category budget.'],
            ['monthlySummary', 'Monthly expense summary', 'A monthly overview of your income and spending.'],
            ['recurringReminders', 'Upcoming recurring expenses', 'Reminders before a scheduled recurring expense.'],
            ['transactionAlerts', 'Transaction notifications', 'A notification when a transaction is recorded.'],
          ].map(([key, title, description]) => (
            <label className="settings-toggle-row" key={key}>
              <span><strong>{title}</strong><small>{description}</small></span>
              <input
                type="checkbox"
                role="switch"
                checked={draft.notifications[key]}
                onChange={(event) => updateDraft('notifications', key, event.target.checked)}
                aria-label={title}
              />
            </label>
          ))}
        </div>
        <p className="settings-note"><CircleAlert size={15} /> Notification choices are saved to your account. The app does not currently deliver notifications.</p>
        <SectionActions
          onCancel={() => cancelSection('notifications')}
          onReset={() => resetSection('notifications')}
          onSave={() => saveSection('notifications')}
          saving={savingSection === 'notifications'}
        />
      </section>

      <section className="card settings-card settings-categories-card">
        <SectionHeading icon={FolderKanban} title="Category management" description="Create, edit, and organize income and expense categories." />
        <form className="settings-add-category" onSubmit={addCategory}>
          <label className="settings-field">
            <span>Add a category</span>
            <input maxLength="60" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="e.g. Home supplies" required />
          </label>
          <label className="settings-field">
            <span>Category type</span>
            <select value={categoryType} onChange={(event) => setCategoryType(event.target.value)}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="both">Income & expense</option>
            </select>
          </label>
          <button className="settings-button settings-button-primary" type="submit" disabled={savingCategory}>
            <Plus size={16} /> {savingCategory ? 'Adding…' : 'Add category'}
          </button>
        </form>
        <p className="settings-note"><CircleAlert size={15} /> Categories already in use by transactions, budgets, or recurring expenses cannot be deleted.</p>
        {loading ? (
          <div className="settings-empty">Loading categories…</div>
        ) : categories.length ? (
          <CategoryRows
            categories={categories}
            editingCategory={editingCategory}
            onEdit={startCategoryEdit}
            onDelete={(category) => setDialog({
              type: 'delete-category',
              title: 'Delete category',
              category,
            })}
            onChange={updateCategoryDraft}
            onSave={saveCategoryEdit}
            onCancel={() => setEditingCategory(null)}
            saving={savingEdit}
          />
        ) : (
          <div className="settings-empty">No categories are available.</div>
        )}
      </section>

      <section className="card settings-card">
        <SectionHeading icon={Shield} title="Data & privacy" description="Download a copy of your transactions or review account actions." />
        <div className="settings-data-row">
          <span className="settings-data-icon"><Download size={17} /></span>
          <div className="settings-data-copy">
            <strong>Export transactions</strong>
            <span>Download all of your transactions as a CSV file.</span>
          </div>
          <button className="settings-button settings-button-quiet" type="button" onClick={exportTransactions} disabled={exporting}>
            <Download size={15} /> {exporting ? 'Preparing…' : 'Export CSV'}
          </button>
        </div>
        <div className="settings-danger-row">
          <span className="settings-data-icon settings-danger-icon"><Trash2 size={17} /></span>
          <div className="settings-data-copy">
            <strong>Delete account</strong>
            <span>Permanently remove your account and associated data.</span>
          </div>
          <button className="settings-button settings-button-danger" type="button" onClick={() => setDialog({
            type: 'delete-account',
            title: 'Delete account',
          })}>Delete account</button>
        </div>
      </section>

      {dialog && (
        <div className="settings-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}>
          <section className="card settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title">
            <span className="settings-dialog-icon">{dialog.type === 'delete-account' || dialog.type === 'delete-category' ? <Trash2 size={20} /> : <Mail size={20} />}</span>
            <h3 id="settings-dialog-title">{dialog.title}</h3>
            {dialog.type === 'password' ? (
              <form className="settings-dialog-form" onSubmit={submitPasswordChange}>
                <p>Enter your current password and choose a new password. You will need to sign in again after changing it.</p>
                <label className="settings-field">Current password
                  <input type="password" autoComplete="current-password" value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} required />
                </label>
                <label className="settings-field">New password
                  <input type="password" autoComplete="new-password" minLength="8" maxLength="128" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
                </label>
                <label className="settings-field">Confirm new password
                  <input type="password" autoComplete="new-password" minLength="8" maxLength="128" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                </label>
                <div className="settings-dialog-actions">
                  <button className="settings-button settings-button-quiet" type="button" disabled={busyAccountAction} onClick={closeDialog}>Cancel</button>
                  <button className="settings-button settings-button-primary" type="submit" disabled={busyAccountAction}>{busyAccountAction ? 'Updating…' : 'Update password'}</button>
                </div>
              </form>
            ) : dialog.type === 'delete-account' ? (
              <form className="settings-dialog-form" onSubmit={submitAccountDeletion}>
                <p>This permanently deletes your account, transactions, budgets, recurring schedules, and personal categories. Enter your password to confirm. This cannot be undone.</p>
                <label className="settings-field">Current password
                  <input type="password" autoComplete="current-password" value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} required />
                </label>
                <div className="settings-dialog-actions">
                  <button className="settings-button settings-button-quiet" type="button" disabled={busyAccountAction} onClick={closeDialog}>Cancel</button>
                  <button className="settings-button settings-button-danger" type="submit" disabled={busyAccountAction}>{busyAccountAction ? 'Deleting…' : 'Permanently delete'}</button>
                </div>
              </form>
            ) : dialog.type === 'delete-category' ? (
              <div>
                <p>Delete “{dialog.category.name}”? This cannot be undone. Categories linked to transactions, budgets, or recurring expenses cannot be deleted.</p>
                <div className="settings-dialog-actions">
                  <button className="settings-button settings-button-quiet" type="button" disabled={deletingCategory} onClick={closeDialog}>Cancel</button>
                  <button className="settings-button settings-button-danger" type="button" disabled={deletingCategory} onClick={removeCategory}>{deletingCategory ? 'Deleting…' : 'Delete category'}</button>
                </div>
              </div>
            ) : (
              <>
                <p>{dialog.message}</p>
                <button className="settings-button settings-button-primary" type="button" autoFocus onClick={closeDialog}>Close</button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
