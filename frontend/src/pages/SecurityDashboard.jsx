import { useEffect, useMemo, useState } from 'react'
import AdminSidebar from '../components/AdminSidebar'
import AcademicCityLogo from '../components/AcademicCityLogo'
import { authFetch } from '../lib/api'
import './SecurityDashboard.css'

function SecurityDashboard() {
  const [summary, setSummary] = useState({ low: 0, medium: 0, high: 0, critical: 0, overdue_visitors: 0 })
  const [stats, setStats] = useState({ currently_signed_in: 0 })
  const [highRiskVisitors, setHighRiskVisitors] = useState([])
  const [recentLogs, setRecentLogs] = useState([])
  const [allVisitors, setAllVisitors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [partialErrors, setPartialErrors] = useState([])

  const loadSecurityData = async () => {
    setLoading(true)
    setError('')
    setPartialErrors([])
    const endpoints = [
      { key: 'summary', path: '/api/security/risk-summary', label: 'Risk summary' },
      { key: 'highRisk', path: '/api/security/high-risk-visitors?limit=10', label: 'High-risk visitors' },
      { key: 'logs', path: '/api/activity-logs/recent?limit=50', label: 'Activity logs' },
      { key: 'visitors', path: '/api/visitors', label: 'Visitors list' },
      { key: 'stats', path: '/api/visitors/stats', label: 'Visitor stats' }
    ]

    try {
      const results = await Promise.all(
        endpoints.map(async ({ path, label }) => {
          const res = await authFetch(path)
          let body = null
          try {
            body = await res.json()
          } catch {
            body = null
          }
          return { label, ok: res.ok, status: res.status, body }
        })
      )

      const failed = results.filter((r) => !r.ok)
      if (failed.length > 0) {
        setPartialErrors(
          failed.map((r) => `${r.label} (${r.status}): ${r.body?.error || 'request failed'}`)
        )
      }

      const byKey = {}
      endpoints.forEach((ep, i) => {
        byKey[ep.key] = results[i]
      })

      if (byKey.summary?.ok && byKey.summary.body) {
        setSummary(byKey.summary.body)
      }
      if (byKey.highRisk?.ok && byKey.highRisk.body) {
        setHighRiskVisitors(byKey.highRisk.body.visitors || [])
      }
      if (byKey.logs?.ok && byKey.logs.body) {
        setRecentLogs(byKey.logs.body.logs || [])
      }
      if (byKey.visitors?.ok && byKey.visitors.body) {
        setAllVisitors(byKey.visitors.body.visitors || [])
      }
      if (byKey.stats?.ok && byKey.stats.body) {
        setStats(byKey.stats.body || {})
      }

      if (failed.length === endpoints.length) {
        setError('Security dashboard could not load any data sources. Check API logs and database connectivity.')
      }
    } catch (err) {
      setError(`Failed to load security dashboard: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSecurityData()
  }, [])

  const overdueVisitors = useMemo(() => {
    const now = Date.now()
    return allVisitors.filter((v) => {
      if (v.status !== 'in' || !v.sign_in_time) return false
      const signInMs = new Date(v.sign_in_time).getTime()
      return now - signInMs > 6 * 60 * 60 * 1000
    })
  }, [allVisitors])

  const mediumRiskCount = summary.medium || 0
  const highRiskCount = summary.high || 0
  const criticalRiskCount = summary.critical || 0
  const activeVisitorsCount = stats.currently_signed_in ?? 0

  const startOfToday = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [])

  const failedQRScansToday = useMemo(
    () =>
      recentLogs.filter(
        (entry) =>
          entry.event_type === 'qr_scan_failed' &&
          new Date(entry.created_at).getTime() >= startOfToday
      ).length,
    [recentLogs, startOfToday]
  )

  const remindersSentToday = useMemo(
    () =>
      recentLogs.filter(
        (entry) =>
          entry.event_type === 'reminder.send.success' &&
          new Date(entry.created_at).getTime() >= startOfToday
      ).length,
    [recentLogs, startOfToday]
  )

  const recalculateRisks = async () => {
    setError('')
    try {
      const response = await authFetch('/api/security/recalculate-risks', {
        method: 'POST'
      })
      if (!response.ok) {
        throw new Error('Risk recalculation failed')
      }
      await loadSecurityData()
    } catch (err) {
      setError(`Failed to recalculate risks: ${err.message}`)
    }
  }

  return (
    <div className="security-dashboard-page">
      <AdminSidebar />
      <div className="security-main-content">
        <div className="security-header">
          <div>
            <h1>Security Operations Dashboard</h1>
            <p>Operational visitor risk intelligence and recent security events.</p>
          </div>
          <div className="security-header-actions">
            <button className="recalc-button" onClick={recalculateRisks} disabled={loading}>
              Recalculate Risks
            </button>
            <AcademicCityLogo className="header-logo" />
          </div>
        </div>

        {error && <div className="security-error">{error}</div>}
        {partialErrors.length > 0 && (
          <div className="security-error security-partial-errors">
            <strong>Some data sources failed:</strong>
            <ul>
              {partialErrors.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="kpi-grid">
          <div className="kpi-card">
            <h3>Active Visitors</h3>
            <p>{activeVisitorsCount}</p>
          </div>
          <div className="kpi-card">
            <h3>Overdue Visitors</h3>
            <p>{summary.overdue_visitors ?? overdueVisitors.length}</p>
          </div>
          <div className="kpi-card medium">
            <h3>Medium Risk Visitors</h3>
            <p>{mediumRiskCount}</p>
          </div>
          <div className="kpi-card high">
            <h3>High Risk Visitors</h3>
            <p>{highRiskCount}</p>
          </div>
          <div className="kpi-card critical">
            <h3>Critical Risk Visitors</h3>
            <p>{criticalRiskCount}</p>
          </div>
          <div className="kpi-card">
            <h3>Failed QR Scans Today</h3>
            <p>{failedQRScansToday}</p>
          </div>
          <div className="kpi-card">
            <h3>Reminders Sent Today</h3>
            <p>{remindersSentToday}</p>
          </div>
          <div className="kpi-card">
            <h3>Recent Security Events</h3>
            <p>{recentLogs.length}</p>
          </div>
        </div>

        <section className="security-panel">
          <h2>High Risk Visitors</h2>
          {loading ? (
            <p className="panel-state">Loading high risk visitors...</p>
          ) : highRiskVisitors.length === 0 ? (
            <p className="panel-state">No high-risk visitors currently.</p>
          ) : (
            <div className="table-wrapper">
              <table className="security-table">
                <thead>
                  <tr>
                    <th>Visitor name</th>
                    <th>Phone</th>
                    <th>Host</th>
                    <th>Sign-in time</th>
                    <th>Risk score</th>
                    <th>Risk level</th>
                    <th>Risk reasons</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {highRiskVisitors.map((visitor) => (
                    <tr key={visitor.id}>
                      <td>{visitor.full_name}</td>
                      <td>{visitor.phone}</td>
                      <td>{visitor.host_name}</td>
                      <td>{visitor.sign_in_time ? new Date(visitor.sign_in_time).toLocaleString() : '-'}</td>
                      <td>{visitor.risk_score}</td>
                      <td>
                        <span className={`risk-level-badge ${visitor.risk_level}`}>{visitor.risk_level}</span>
                      </td>
                      <td>
                        {Array.isArray(visitor.risk_reasons) && visitor.risk_reasons.length > 0
                          ? visitor.risk_reasons.join('; ')
                          : 'No reasons'}
                      </td>
                      <td>{visitor.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="security-panel">
          <h2>Overdue Visitors</h2>
          {loading ? (
            <p className="panel-state">Loading overdue visitors...</p>
          ) : overdueVisitors.length === 0 ? (
            <p className="panel-state">No overdue active visitors.</p>
          ) : (
            <div className="table-wrapper">
              <table className="security-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Host</th>
                    <th>Sign-in time</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueVisitors.map((visitor) => {
                    const durationHours = Math.floor((Date.now() - new Date(visitor.sign_in_time).getTime()) / (60 * 60 * 1000))
                    return (
                      <tr key={`overdue-${visitor.id}`}>
                        <td>{visitor.full_name}</td>
                        <td>{visitor.phone}</td>
                        <td>{visitor.host_name}</td>
                        <td>{new Date(visitor.sign_in_time).toLocaleString()}</td>
                        <td>{durationHours}h</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="security-panel">
          <h2>Recent Security Events</h2>
          {loading ? (
            <p className="panel-state">Loading recent events...</p>
          ) : recentLogs.length === 0 ? (
            <p className="panel-state">No activity logs available.</p>
          ) : (
            <div className="table-wrapper">
              <table className="security-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Severity</th>
                    <th>Event type</th>
                    <th>Message</th>
                    <th>Actor</th>
                    <th>Visitor ID</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.created_at).toLocaleString()}</td>
                      <td>
                        <span className={`severity-badge ${entry.severity}`}>{entry.severity}</span>
                      </td>
                      <td>{entry.event_type}</td>
                      <td>{entry.message}</td>
                      <td>{entry.actor_identifier || entry.actor_type || 'system'}</td>
                      <td>{entry.visitor_id ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default SecurityDashboard
