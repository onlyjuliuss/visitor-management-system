import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { useVisitors } from '../context/VisitorContext'
import AcademicCityLogo from '../components/AcademicCityLogo'
import './SignOutPage.css'

function SignOutPage() {
  const navigate = useNavigate()
  const { getCurrentlySignedIn, signOutVisitor } = useVisitors()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [scannerActive, setScannerActive] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const [scannerSupported, setScannerSupported] = useState(false)
  const [scannerEngine, setScannerEngine] = useState('jsQR')
  const [cameraFacingMode, setCameraFacingMode] = useState('user')
  const [manualQR, setManualQR] = useState('')
  const [signOutFeedback, setSignOutFeedback] = useState({ type: '', text: '' })

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const scanAnimationRef = useRef(null)
  const processingScanRef = useRef(false)
  const scannerRunningRef = useRef(false)

  const waitForVideoElement = (timeoutMs = 2000) =>
    new Promise((resolve, reject) => {
      const start = Date.now()
      const check = () => {
        if (videoRef.current) {
          resolve(videoRef.current)
          return
        }
        if (Date.now() - start > timeoutMs) {
          reject(new Error('scanner preview element did not mount in time'))
          return
        }
        window.requestAnimationFrame(check)
      }
      check()
    })

  const waitForVideoFrames = (video, timeoutMs = 3000) =>
    new Promise((resolve, reject) => {
      if (!video) {
        reject(new Error('scanner preview is unavailable'))
        return
      }
      const start = Date.now()
      const check = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
          resolve()
          return
        }
        if (Date.now() - start > timeoutMs) {
          reject(new Error('camera stream started but preview stayed blank'))
          return
        }
        window.requestAnimationFrame(check)
      }
      check()
    })

  useEffect(() => {
    setScannerSupported(
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      !!navigator.mediaDevices.getUserMedia
    )
    return () => {
      stopScanner()
    }
  }, [])

  const handleSearch = (e) => {
    const query = e.target.value
    setSearchQuery(query)
    
    if (query.length > 0) {
      const signedIn = getCurrentlySignedIn()
      const filtered = signedIn.filter(visitor => 
        visitor.fullName.toLowerCase().includes(query.toLowerCase()) ||
        visitor.id.toString().includes(query) ||
        (visitor.qrCode || '').toLowerCase().includes(query.toLowerCase())
      )
      setSearchResults(filtered)
    } else {
      setSearchResults([])
    }
  }

  const handleSignOut = async (visitor) => {
    if (window.confirm(`Sign out ${visitor.fullName}?`)) {
      setLoading(true)
      setSignOutFeedback({ type: '', text: '' })
      const result = await signOutVisitor(visitor.id)
      if (result?.success) {
        setSignOutFeedback({ type: 'success', text: `${visitor.fullName} has been signed out successfully.` })
      } else {
        setSignOutFeedback({ type: 'error', text: result?.error || 'Failed to sign out visitor. Please try again.' })
      }
      setSearchQuery('')
      setSearchResults([])
      navigate('/admin/sign-out-desk')
      setLoading(false)
    }
  }

  const scanFrame = async (detector) => {
    if (!videoRef.current || !canvasRef.current || processingScanRef.current) {
      return
    }
    const video = videoRef.current
    if (video.readyState < 2) return

    let rawValue = ''
    if (detector) {
      try {
        const codes = await detector.detect(video)
        if (codes.length > 0 && codes[0].rawValue) {
          rawValue = codes[0].rawValue
        }
      } catch (_) {}
    }

    if (!rawValue) {
      const canvas = canvasRef.current
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const qrResult = jsQR(imageData.data, imageData.width, imageData.height)
      if (qrResult?.data) {
        rawValue = qrResult.data
      }
    }

    if (rawValue) {
      handleQRCodeSignOut(rawValue)
    }
  }

  const scanLoop = async (detector) => {
    await scanFrame(detector)
    if (scannerRunningRef.current) {
      scanAnimationRef.current = window.requestAnimationFrame(() => scanLoop(detector))
    }
  }

  const stopScanner = () => {
    if (scanAnimationRef.current) {
      window.cancelAnimationFrame(scanAnimationRef.current)
      scanAnimationRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    scannerRunningRef.current = false
    setScannerActive(false)
  }

  const handleQRCodeSignOut = async (qrValue) => {
    const qr = (qrValue || '').trim()
    if (!qr) return
    if (processingScanRef.current) return

    processingScanRef.current = true
    setLoading(true)
    stopScanner()
    setSignOutFeedback({ type: '', text: '' })

    const result = await signOutVisitor({ qrCode: qr })
    if (result?.success) {
      setSignOutFeedback({ type: 'success', text: `${result.visitor.fullName} has been signed out successfully.` })
      setSearchQuery('')
      setSearchResults([])
      setManualQR('')
    } else {
      const rawError = (result?.error || '').toLowerCase()
      let message = 'Invalid QR code. No active visitor was found.'
      if (rawError.includes('already signed out')) {
        message = 'This visitor is already signed out.'
      } else if (rawError.includes('qr token expired')) {
        message = 'This QR pass has expired. Please use admin sign-out by ID.'
      } else if (rawError.includes('qr token revoked')) {
        message = 'This QR pass has already been revoked. Use admin sign-out by ID.'
      } else if (rawError.includes('not found')) {
        message = 'This QR code does not match any active visitor.'
      } else if (rawError.includes('network')) {
        message = 'Network error while verifying QR. Please try again.'
      }
      setSignOutFeedback({ type: 'error', text: message })
    }

    setLoading(false)
    processingScanRef.current = false
  }

  const startScanner = async () => {
    if (!scannerSupported) {
      setScannerError('Camera scanning is not supported on this browser. Use manual QR entry below.')
      return
    }

    if (!window.isSecureContext) {
      setScannerError('Camera scanning requires HTTPS or localhost. Open this app on localhost for camera usage.')
      return
    }

    try {
      setScannerError('')
      const startWithMode = async (mode) => {
        setScannerActive(true)
        const videoEl = await waitForVideoElement()
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode } },
          audio: false
        })
        streamRef.current = stream
        videoEl.srcObject = stream
        await videoEl.play()
        await waitForVideoFrames(videoEl)
      }

      try {
        await startWithMode(cameraFacingMode)
      } catch (_) {
        const alternateMode = cameraFacingMode === 'user' ? 'environment' : 'user'
        try {
          await startWithMode(alternateMode)
          setCameraFacingMode(alternateMode)
        } catch (_) {
          const videoEl = await waitForVideoElement()
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          })
          streamRef.current = stream
          videoEl.srcObject = stream
          await videoEl.play()
          await waitForVideoFrames(videoEl)
        }
      }

      let detector = null
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        setScannerEngine('BarcodeDetector + jsQR fallback')
      } else {
        setScannerEngine('jsQR fallback')
      }
      scannerRunningRef.current = true
      window.requestAnimationFrame(() => scanLoop(detector))
    } catch (err) {
      setScannerError(`Unable to start camera: ${err.message}`)
      stopScanner()
    }
  }

  const handleManualQRSubmit = async (e) => {
    e.preventDefault()
    if (!manualQR.trim()) return
    await handleQRCodeSignOut(manualQR)
  }

  return (
    <div className="sign-out-page">
      <div className="sign-out-container">
        <AcademicCityLogo className="page-brand-logo" />
        <div className="page-header">
          <button className="back-button" onClick={() => navigate('/admin')}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1>Reception Sign-out Desk</h1>
            <p>Search active visitors by name, visitor ID, or QR value.</p>
          </div>
        </div>

        <div className="sign-out-content">
          <button
            type="button"
            className="qr-scan-button"
            onClick={scannerActive ? stopScanner : startScanner}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 7V5C3 3.89543 3.89543 3 5 3H7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 3H19C20.1046 3 21 3.89543 21 5V7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 17V19C21 20.1046 20.1046 21 19 21H17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 21H5C3.89543 21 3 20.1046 3 19V17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {scannerActive ? 'Stop QR Scanner' : 'Scan Visitor QR Code'}
          </button>

          {scannerError && <div className="scan-error">{scannerError}</div>}
          {signOutFeedback.text && (
            <div className={`signout-feedback ${signOutFeedback.type}`}>
              {signOutFeedback.text}
            </div>
          )}

          <div className="scanner-controls">
            <label htmlFor="camera-facing-mode">Camera</label>
            <select
              id="camera-facing-mode"
              value={cameraFacingMode}
              onChange={(e) => {
                const nextMode = e.target.value
                setCameraFacingMode(nextMode)
                if (scannerActive) {
                  stopScanner()
                  setTimeout(() => {
                    startScanner()
                  }, 120)
                }
              }}
              disabled={loading}
            >
              <option value="environment">Back camera (recommended)</option>
              <option value="user">Front camera</option>
            </select>
            <span className="engine-note">Engine: {scannerEngine}</span>
          </div>

          {scannerActive && (
            <div className="camera-preview-box">
              <video ref={videoRef} className="scanner-video" autoPlay playsInline muted />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <p>Point the camera at the visitor QR code.</p>
            </div>
          )}

          <form className="qr-input-form" onSubmit={handleManualQRSubmit}>
            <label>Manual QR Entry (fallback)</label>
            <input
              type="text"
              className="qr-input"
              value={manualQR}
              onChange={(e) => setManualQR(e.target.value)}
              placeholder="Paste or type QR value"
            />
            <div className="qr-form-buttons">
              <button type="submit" className="submit-qr-button" disabled={loading}>
                Sign out with QR
              </button>
            </div>
          </form>

          <div className="separator">
            <div className="separator-line" />
            OR search manually
            <div className="separator-line" />
          </div>

          <div className="search-section">
            <label>Search by Name or Visitor ID</label>
            <div className="search-input-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="text"
                placeholder="Enter name or visitor ID"
                value={searchQuery}
                onChange={handleSearch}
                className="search-input"
              />
            </div>

            <div className="status-box">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8V12L16 14M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{getCurrentlySignedIn().length} visitor{getCurrentlySignedIn().length !== 1 ? 's' : ''} currently signed in</span>
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map(visitor => (
                  <div key={visitor.id} className="visitor-result" onClick={() => handleSignOut(visitor)} style={{ cursor: loading ? 'auto' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                    <div>
                      <h3>{visitor.fullName}</h3>
                      <p>ID: {visitor.id}</p>
                      <p className="visitor-purpose">QR: {visitor.qrCode}</p>
                      <p className="visitor-purpose">Visiting: {visitor.hostName}</p>
                    </div>
                    <div className="status-badge in">In</div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length === 0 && (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p>Start typing to search for visitors currently signed in</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignOutPage

