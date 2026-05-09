import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminSidebar from '../components/AdminSidebar'
import AcademicCityLogo from '../components/AcademicCityLogo'
import { authFetch } from '../lib/api'
import './CommandCentre.css'

const REFRESH_MS = 10_000

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** Elapsed HH:MM:SS since sign-in (live wall clock via nowMs). */
function formatElapsed(signInISO, nowMs) {
  if (!signInISO) return '—'
  const start = new Date(signInISO).getTime()
  if (Number.isNaN(start)) return '—'
  let sec = Math.max(0, Math.floor((nowMs - start) / 1000))
  const h = Math.floor(sec / 3600)
  sec %= 3600
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`
}

function formatOverdue(signInISO, nowMs) {
  const elapsed = formatElapsed(signInISO, nowMs)
  if (elapsed === '—') return ''
  const sixHoursMs = 6 * 60 * 60 * 1000
  const start = new Date(signInISO).getTime()
  let overdueMs = nowMs - start - sixHoursMs
  if (overdueMs <= 0) return ''
  const sec = Math.floor(overdueMs / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`
}

function normalizeRisk(level) {
  const l = String(level || 'low').toLowerCase()
  if (['low', 'medium', 'high', 'critical'].includes(l)) return l
  return 'low'
}

function activityDisplay(log) {
  const t = log.event_type || ''
  const who = log.actor_identifier || log.message || ''
  const msg = log.message || ''
  switch (t) {
    case 'visitor.sign_in.success':
      return { text: `${who ? who + ' ' : ''}checked in successfully`, tone: 'in' }
    case 'visitor.sign_out.by_qr':
    case 'qr_scan_success':
      return { text: msg || 'Visitor left using their QR pass', tone: 'qr' }
    case 'visitor.sign_out.by_id':
      return { text: msg || 'Visitor signed out at the desk', tone: 'qr' }
    case 'qr_scan_failed':
      return { text: 'Wrong or invalid QR scanned at exit', tone: 'alert' }
    case 'qr_token_expired':
      return { text: 'Someone tried an expired visitor pass', tone: 'warn' }
    case 'qr_token_reused':
      return { text: 'Pass already used — possible repeat scan', tone: 'warn' }
    case 'qr_token_revoked':
      return { text: 'A revoked pass was scanned', tone: 'warn' }
    case 'reminder.send.success':
      return { text: 'Reminder text sent — pass ending soon', tone: 'info' }
    case 'high_risk_visitor_detected':
      return { text: msg || 'High-risk visitor flagged', tone: 'risk' }
    case 'risk_score_updated':
      return { text: msg || 'Visit risk reviewed', tone: 'info' }
    case 'admin.login.success':
      return { text: 'Staff signed into the dashboard', tone: 'admin' }
    default:
      return { text: msg || t.replace(/\./g, ' ') || 'Activity recorded', tone: 'neutral' }
  }
}

function ActivityIcon({ tone }) {
  const common = { className: `cc-act-icon cc-act-icon--${tone}`, viewBox: '0 0 24 24', fill: 'none' }
  if (tone === 'in')
    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  if (tone === 'qr')
    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
        <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  if (tone === 'alert')
    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M10.3 4.9L2.9 17.9c-.35.61.09 1.38.8 1.38h17.6c.71 0 1.15-.77.8-1.38L13.7 4.9c-.35-.6-1.25-.6-1.6 0z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  if (tone === 'warn')
    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  if (tone === 'info')
    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 18h.01M8 21h8a2 2 0 002-2V5l-4-3-4 3v14a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  if (tone === 'risk')
    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 5v7c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  if (tone === 'admin')
    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M5 21v-2a7 7 0 0114 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  return (
    <svg {...common} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  )
}

function CommandCentre() {
  const [summary, setSummary] = useState({ low: 0, medium: 0, high: 0, critical: 0, overdue_visitors: 0 })
  const [stats, setStats] = useState({
    total_visitors: 0,
    currently_signed_in: 0,
    total_signed_out: 0
  })
  const [highRiskVisitors, setHighRiskVisitors] = useState([])
  const [allVisitors, setAllVisitors] = useState([])
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [partialErrors, setPartialErrors] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const loadAll = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true)
    setError('')
    setPartialErrors([])
    const endpoints = [
      { key: 'visitors', path: '/api/visitors', label: 'Visitors' },
      { key: 'stats', path: '/api/visitors/stats', label: 'Stats' },
      { key: 'summary', path: '/api/security/risk-summary', label: 'Risk summary' },
      { key: 'highRisk', path: '/api/security/high-risk-visitors?limit=10', label: 'High-risk list' },
      { key: 'logs', path: '/api/activity-logs/recent?limit=50', label: 'Activity logs' }
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
        setPartialErrors(failed.map((r) => `${r.label}: ${r.body?.error || r.status}`))
      }

      const by = {}
      endpoints.forEach((e, i) => {
        by[e.key] = results[i]
      })

      if (by.visitors?.ok && by.visitors.body) {
        setAllVisitors(by.visitors.body.visitors || [])
      }
      if (by.stats?.ok && by.stats.body) {
        setStats(by.stats.body)
      }
      if (by.summary?.ok && by.summary.body) {
        setSummary(by.summary.body)
      }
      if (by.highRisk?.ok && by.highRisk.body) {
        setHighRiskVisitors(by.highRisk.body.visitors || [])
      }
      if (by.logs?.ok && by.logs.body) {
        setRecentLogs(by.logs.body.logs || [])
      }

      setLastUpdated(new Date())

      if (failed.length === endpoints.length) {
        setError('Could not refresh the Command Centre. Check your connection and try again.')
      }
    } catch (e) {
      setError(e.message || 'Refresh failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll(false)
  }, [loadAll])

  useEffect(() => {
    const id = setInterval(() => loadAll(false), REFRESH_MS)
    return () => clearInterval(id)
  }, [loadAll])

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const overdueLocal = useMemo(() => {
    const sixHours = 6 * 60 * 60 * 1000
    return (allVisitors || []).filter((v) => {
      if (!v.sign_in_time) return false
      const st = String(v.status || '').toLowerCase()
      if (st !== 'in') return false
      return Date.now() - new Date(v.sign_in_time).getTime() > sixHours
    })
  }, [allVisitors])

  const safetyBanner = useMemo(() => {
    const critical = summary.critical ?? 0
    const overdueCount = summary.overdue_visitors ?? overdueLocal.length
    const medium = summary.medium ?? 0
    const high = summary.high ?? 0

    if (critical > 0 || overdueCount > 0) {
      return {
        level: 'urgent',
        title: 'Hostel safety status: urgent',
        text: critical > 0 ? 'Someone needs attention right away or a visitor is overstaying.' : 'Visitors are overdue to sign out — check exits now.'
      }
    }
    if (medium > 0 || high > 0) {
      return {
        level: 'watch',
        title: 'Hostel safety status: watch',
        text: 'Stay alert — some visits need closer monitoring.'
      }
    }
    return {
      level: 'normal',
      title: 'Hostel safety status: normal',
      text: 'No urgent issues on the board right now.'
    }
  }, [summary, overdueLocal.length])

  const visitorsInside = useMemo(
    () => (allVisitors || []).filter((v) => String(v.status || '').toLowerCase() === 'in'),
    [allVisitors]
  )

  const feedLogs = useMemo(() => recentLogs.slice(0, 10), [recentLogs])

  const qrAlertLogs = useMemo(
    () =>
      recentLogs.filter((l) =>
        ['qr_token_expired', 'qr_token_reused', 'qr_scan_failed'].includes(l.event_type)
      ),
    [recentLogs]
  )

  const highRiskInside = useMemo(
    () => highRiskVisitors.filter((v) => String(v.status || '').toLowerCase() === 'in'),
    [highRiskVisitors]
  )

  return (
    <div className="command-centre-page">
      <AdminSidebar />
      <main className="command-centre-main">
        <header className="cc-topbar">
          <div className="cc-topbar-left">
            <AcademicCityLogo className="cc-logo" />
            <div className="cc-topbar-text">
              <div className="cc-title-row">
                <h1>Command Centre</h1>
                <span className="cc-live-pill">
                  <span className="cc-live-dot" aria-hidden /> Live
                </span>
              </div>
              <p className="cc-subtitle">Live picture of everyone in the hostel and what needs attention</p>
              {lastUpdated && (
                <p className="cc-updated">
                  Last updated{' '}
                  {lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              )}
            </div>
          </div>
          <div className="cc-topbar-actions">
            <button type="button" className="cc-btn cc-btn-ghost" disabled={loading} onClick={() => loadAll(true)}>
              {loading ? 'Refreshing…' : 'Refresh now'}
            </button>
            <Link to="/admin/security" className="cc-btn cc-btn-secondary">
              Security details
            </Link>
          </div>
        </header>

        {error && <div className="cc-banner-error">{error}</div>}
        {partialErrors.length > 0 && !error && (
          <div className="cc-banner-warn">
            Some data is missing: {partialErrors.join(' · ')}
          </div>
        )}

        <section className={`cc-safety-banner cc-safety-banner--${safetyBanner.level}`}>
          <div className="cc-safety-icon" aria-hidden>
            {safetyBanner.level === 'normal' ? (
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2l8 4v6c0 5-4 10-8 11-4-1-8-6-8-11V6l8-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path
                  d="M12 22s8-6 8-13a8 8 0 10-16 0c0 7 8 13 8 13z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <div className="cc-safety-copy">
            <h2>{safetyBanner.title}</h2>
            <p>{safetyBanner.text}</p>
          </div>
          <Link to="/admin/security" className="cc-safety-action">
            Open security board →
          </Link>
        </section>

        <section className="cc-kpi-grid" aria-label="Key counts">
          <article className="cc-kpi cc-kpi--blue">
            <span className="cc-kpi-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </span>
            <div>
              <span className="cc-kpi-value">{stats.currently_signed_in ?? 0}</span>
              <span className="cc-kpi-label">Visitors inside now</span>
              <span className="cc-kpi-hint">Live count</span>
            </div>
          </article>
          <article className="cc-kpi cc-kpi--amber">
            <span className="cc-kpi-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </span>
            <div>
              <span className="cc-kpi-value">{summary.overdue_visitors ?? overdueLocal.length}</span>
              <span className="cc-kpi-label">Overdue sign-outs</span>
              <span className="cc-kpi-hint">Past 6 hours inside</span>
            </div>
          </article>
          <article className="cc-kpi cc-kpi--yellow">
            <span className="cc-kpi-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.3 3.2L1.7 18c-.4.7.1 1.6.9 1.6h18.8c.8 0 1.3-.9.9-1.6L13.7 3.2c-.4-.6-1.4-.6-1.8 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <div>
              <span className="cc-kpi-value">{summary.high ?? 0}</span>
              <span className="cc-kpi-label">High-risk visits</span>
              <span className="cc-kpi-hint">Watch closely</span>
            </div>
          </article>
          <article className="cc-kpi cc-kpi--red">
            <span className="cc-kpi-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 22s8-6 8-13a8 8 0 10-16 0c0 7 8 13 8 13zM12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </span>
            <div>
              <span className="cc-kpi-value">{summary.critical ?? 0}</span>
              <span className="cc-kpi-label">Critical visits</span>
              <span className="cc-kpi-hint">Act now</span>
            </div>
          </article>
          <article className="cc-kpi cc-kpi--teal">
            <span className="cc-kpi-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </span>
            <div>
              <span className="cc-kpi-value">{stats.total_visitors ?? 0}</span>
              <span className="cc-kpi-label">Visits today</span>
              <span className="cc-kpi-hint">Signed in today</span>
            </div>
          </article>
          <article className="cc-kpi cc-kpi--indigo">
            <span className="cc-kpi-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <div>
              <span className="cc-kpi-value">{stats.total_signed_out ?? 0}</span>
              <span className="cc-kpi-label">Sign-outs today</span>
              <span className="cc-kpi-hint">Completed</span>
            </div>
          </article>
        </section>

        <div className="cc-three-col">
          <section className="cc-panel cc-panel-feed" aria-label="Live activity">
            <h2 className="cc-panel-title">Live activity</h2>
            <ul className="cc-feed-list">
              {feedLogs.map((log) => {
                const { text, tone } = activityDisplay(log)
                return (
                  <li key={log.id || `${log.event_type}-${log.created_at}`} className="cc-feed-row">
                    <ActivityIcon tone={tone} />
                    <div className="cc-feed-body">
                      <p className="cc-feed-msg">{text}</p>
                      <time className="cc-feed-time">
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString(undefined, {
                              weekday: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : ''}
                      </time>
                    </div>
                  </li>
                )
              })}
              {!feedLogs.length && <li className="cc-feed-empty">No recent activity yet.</li>}
            </ul>
          </section>

          <section className="cc-panel cc-panel-visitors" aria-label="Visitors currently inside">
            <h2 className="cc-panel-title">Visitors inside right now</h2>
            <div className="cc-table-scroll">
              <table className="cc-table">
                <thead>
                  <tr>
                    <th>Visitor</th>
                    <th>Host</th>
                    <th>Time inside</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {visitorsInside.map((v) => (
                    <tr key={v.id}>
                      <td className="cc-td-strong">{v.full_name}</td>
                      <td>{v.host_name}</td>
                      <td className="cc-mono">{formatElapsed(v.sign_in_time, nowMs)}</td>
                      <td>
                        <span className={`cc-risk-tag cc-risk-tag--${normalizeRisk(v.risk_level)}`}>
                          {normalizeRisk(v.risk_level)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visitorsInside.length && <p className="cc-empty">Nobody is marked inside.</p>}
            </div>
            <Link to="/admin/visitors" className="cc-panel-link">
              View all visitors →
            </Link>
          </section>

          <section className="cc-panel cc-panel-alert" aria-label="Attention required">
            <h2 className="cc-panel-title">Attention needed</h2>

            <h3 className="cc-attn-subtitle">Overdue to leave</h3>
            <ul className="cc-attn-list">
              {overdueLocal.slice(0, 6).map((v) => (
                <li key={`od-${v.id}`} className="cc-attn-card">
                  <div>
                    <strong>{v.full_name}</strong>
                    <span className="cc-attn-muted">Host: {v.host_name}</span>
                  </div>
                  <span className="cc-attn-badge">Overdue {formatOverdue(v.sign_in_time, nowMs)}</span>
                </li>
              ))}
              {!overdueLocal.length && <li className="cc-muted">None right now.</li>}
            </ul>

            <h3 className="cc-attn-subtitle">High or critical visits</h3>
            <ul className="cc-attn-list">
              {highRiskInside.slice(0, 6).map((v) => (
                <li key={`hr-${v.id}`} className="cc-attn-card cc-attn-card--risk">
                  <div>
                    <strong>{v.full_name}</strong>
                    <span className="cc-attn-muted">{v.host_name}</span>
                  </div>
                  <span className={`cc-risk-tag cc-risk-tag--${normalizeRisk(v.risk_level)}`}>
                    {normalizeRisk(v.risk_level)}
                  </span>
                </li>
              ))}
              {!highRiskInside.length && <li className="cc-muted">No high-risk guests inside right now.</li>}
            </ul>

            <h3 className="cc-attn-subtitle">Digital pass alerts</h3>
            <ul className="cc-attn-mini">
              {qrAlertLogs.slice(0, 5).map((l) => (
                <li key={`qr-${l.id}`}>
                  <span className="cc-dot cc-dot-warn" />
                  {activityDisplay(l).text}{' '}
                  <span className="cc-attn-muted">
                    {l.created_at && new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
              {!qrAlertLogs.length && <li className="cc-muted">No bad QR scans recently.</li>}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}

export default CommandCentre
