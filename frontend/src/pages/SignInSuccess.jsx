import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMemo, useEffect, useState } from 'react'
import AcademicCityLogo from '../components/AcademicCityLogo'
import { QRCodeSVG } from 'qrcode.react'
import './SignInSuccess.css'

/** Fallback QR / pass lifetime when backend does not send qr_expires_at (matches typical 12h policy). */
const FALLBACK_PASS_HOURS = 12

function normalizeVisitor(raw, routeId) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id ?? routeId
  return {
    id,
    fullName: raw.fullName ?? raw.full_name ?? '',
    hostName: raw.hostName ?? raw.host_name ?? '',
    purpose: raw.purpose ?? '',
    signInTime: raw.signInTime ?? raw.sign_in_time,
    qrCode: raw.qrCode ?? raw.qr_code ?? '',
    qrExpiresAt: raw.qrExpiresAt ?? raw.qr_expires_at ?? null,
    status: String(raw.status ?? 'in').toLowerCase()
  }
}

function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Expiry: prefer qr_expires_at; else sign_in_time + FALLBACK_PASS_HOURS. */
function getPassExpiryDate(visitor) {
  const fromServer = parseDate(visitor.qrExpiresAt)
  if (fromServer) return { date: fromServer, usedFallback: false }
  const signIn = parseDate(visitor.signInTime)
  if (!signIn) return { date: null, usedFallback: false }
  return {
    date: new Date(signIn.getTime() + FALLBACK_PASS_HOURS * 60 * 60 * 1000),
    usedFallback: true
  }
}

function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function derivePassStatus(visitor, expiryDate, remainingMs) {
  if (!visitor) return 'unknown'
  if (visitor.status === 'out') return 'signed_out'
  if (!expiryDate) return 'active'
  if (remainingMs <= 0) return 'expired'
  if (remainingMs <= 30 * 60 * 1000) return 'expiring_soon'
  return 'active'
}

function SignInSuccess() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()

  const visitor = useMemo(() => {
    const stateVisitor = location.state?.visitor
    if (!stateVisitor || String(stateVisitor.id) !== String(id)) return null
    return normalizeVisitor(stateVisitor, id)
  }, [location.state, id])

  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (!visitor) return undefined
    const t = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [visitor])

  const { expiryDate, usedFallback } = useMemo(() => {
    if (!visitor) return { expiryDate: null, usedFallback: false }
    const r = getPassExpiryDate(visitor)
    return { expiryDate: r.date, usedFallback: r.usedFallback }
  }, [visitor])

  const remainingMs = expiryDate ? expiryDate.getTime() - nowMs : 0
  const statusKey = derivePassStatus(visitor, expiryDate, remainingMs)

  const statusLabel =
    {
      active: 'ACTIVE',
      expiring_soon: 'EXPIRING SOON',
      expired: 'EXPIRED',
      signed_out: 'SIGNED OUT',
      unknown: '—'
    }[statusKey] ?? '—'

  if (!visitor) {
    return (
      <div className="sign-in-success-page">
        <div className="pass-page-inner">
          <AcademicCityLogo className="pass-brand-outside" />
          <div className="pass-lost-state">
            <h1>Pass not available</h1>
            <p>
              This page works right after sign-in. If you refreshed or opened this link in a new tab, your digital pass
              cannot be shown here.
            </p>
            <p className="pass-lost-hint">Please visit reception for help, or sign in again to get a new pass.</p>
            <button type="button" className="pass-btn pass-btn-primary" onClick={() => navigate('/sign-in')}>
              Sign in again
            </button>
            <button type="button" className="pass-btn pass-btn-ghost" onClick={() => navigate('/')}>
              Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  const qrValue = visitor.qrCode
  const signedInDisplay = parseDate(visitor.signInTime)
    ? new Date(visitor.signInTime).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : '—'
  const expiryDisplay = expiryDate
    ? expiryDate.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : '—'

  return (
    <div className="sign-in-success-page">
      <div className="pass-page-inner">
        <AcademicCityLogo className="pass-brand-outside" />

        <article className="digital-pass" aria-label="Digital visitor pass">
          <header className="digital-pass-header">
            <div className="digital-pass-title-block">
              <span className="digital-pass-kicker">Academic City</span>
              <h1 className="digital-pass-title">ACITY VISITOR PASS</h1>
            </div>
            <span className={`pass-status-badge pass-status-badge--${statusKey}`}>{statusLabel}</span>
          </header>

          <div className="digital-pass-body">
            <div className="pass-identity">
              <h2 className="pass-name">{visitor.fullName || 'Visitor'}</h2>
              <dl className="pass-meta">
                <div>
                  <dt>Host</dt>
                  <dd>{visitor.hostName || '—'}</dd>
                </div>
                <div>
                  <dt>Purpose</dt>
                  <dd>{visitor.purpose || '—'}</dd>
                </div>
              </dl>
            </div>

            <div className="pass-times">
              <div>
                <span className="pass-times-label">Signed in</span>
                <span className="pass-times-value">{signedInDisplay}</span>
              </div>
              <div>
                <span className="pass-times-label">Pass expires</span>
                <span className="pass-times-value">{expiryDisplay}</span>
                {usedFallback && <span className="pass-fallback-note">Estimated ({FALLBACK_PASS_HOURS}h from sign-in)</span>}
              </div>
            </div>

            <div className="pass-countdown-block">
              <span className="pass-countdown-label">
                {statusKey === 'signed_out' ? 'Pass status' : 'Time remaining'}
              </span>
              <span className="pass-countdown-value" aria-live="polite">
                {statusKey === 'signed_out'
                  ? '—'
                  : statusKey === 'expired'
                    ? '00:00:00'
                    : formatCountdown(remainingMs)}
              </span>
            </div>

            <div className="pass-qr-section">
              <div className="pass-qr-frame">
                {qrValue ? (
                  <QRCodeSVG value={qrValue} size={220} level="M" includeMargin />
                ) : (
                  <p className="pass-qr-missing">QR unavailable</p>
                )}
              </div>
              <p className="pass-staff-instruction">Show this pass to hostel staff when leaving.</p>
            </div>

            <footer className="pass-security-note">
              <strong>Security note:</strong> This pass expires automatically. After you sign out, the same QR cannot be
              used again—staff will issue or verify your exit at reception.
            </footer>
          </div>
        </article>

        <div className="pass-actions no-print">
          <button type="button" className="pass-btn pass-btn-primary" onClick={() => navigate('/')}>
            Done
          </button>
          <button type="button" className="pass-btn pass-btn-secondary" onClick={() => window.print()}>
            Print pass
          </button>
        </div>
      </div>
    </div>
  )
}

export default SignInSuccess
