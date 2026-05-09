import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useVisitors } from '../context/VisitorContext'
import AcademicCityLogo from '../components/AcademicCityLogo'
import { apiUrl } from '../lib/api'
import './SignInPage.css'

function SignInPage() {
  const navigate = useNavigate()
  const { fetchAllVisitors } = useVisitors()
  const [formData, setFormData] = useState({
    fullName: '',
    contactNumber: '',
    personToVisit: '',
    purpose: '',
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [cameraFacingMode, setCameraFacingMode] = useState('user')
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const waitForVideoElement = (timeoutMs = 2000) =>
    new Promise((resolve, reject) => {
      const start = Date.now()
      const check = () => {
        if (videoRef.current) {
          resolve(videoRef.current)
          return
        }
        if (Date.now() - start > timeoutMs) {
          reject(new Error('camera preview element did not mount in time'))
          return
        }
        window.requestAnimationFrame(check)
      }
      check()
    })

  const waitForVideoFrames = (video, timeoutMs = 3000) =>
    new Promise((resolve, reject) => {
      if (!video) {
        reject(new Error('camera preview is unavailable'))
        return
      }
      const start = Date.now()
      const check = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
          resolve()
          return
        }
        if (Date.now() - start > timeoutMs) {
          reject(new Error('camera stream started but no frames were rendered'))
          return
        }
        window.requestAnimationFrame(check)
      }
      check()
    })

  const getCameraErrorMessage = (err) => {
    if (!window.isSecureContext) {
      return 'Camera requires a secure context (HTTPS) or localhost. Open the app on localhost for camera access.'
    }
    if (err.name === 'NotAllowedError') {
      return 'Camera permission was denied. Allow camera access and try again.'
    }
    if (err.name === 'NotFoundError') {
      return 'No camera was found on this device. Please upload a photo instead.'
    }
    if (err.name === 'OverconstrainedError') {
      return 'Selected camera is unavailable on this device. Switch camera mode and retry.'
    }
    return `Unable to access camera: ${err.message}`
  }

  const attachStreamToVideo = (stream) =>
    new Promise((resolve) => {
      if (!videoRef.current) {
        resolve()
        return
      }
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = async () => {
        try {
          await videoRef.current.play()
        } catch (_) {}
        resolve()
      }
    })

  const startCameraWithMode = async (mode) => {
    setCameraActive(true)
    const videoEl = await waitForVideoElement()
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: mode } },
      audio: false
    })
    streamRef.current = stream
    await attachStreamToVideo(stream)
    await waitForVideoFrames(videoEl)
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
      setCameraError('')
      if (cameraActive) {
        stopCamera()
      }
    }
  }

  const startCamera = async () => {
    try {
      setCameraError('')
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera API is not available in this browser. Please upload a photo instead.')
        return
      }

      // Try selected camera first, then fall back to default camera.
      try {
        await startCameraWithMode(cameraFacingMode)
      } catch (_) {
        // Some devices return a blank stream for one mode; try the opposite mode.
        const alternateMode = cameraFacingMode === 'user' ? 'environment' : 'user'
        try {
          await startCameraWithMode(alternateMode)
          setCameraFacingMode(alternateMode)
        } catch (_) {
          const videoEl = await waitForVideoElement()
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          })
          streamRef.current = stream
          await attachStreamToVideo(stream)
          await waitForVideoFrames(videoEl)
        }
      }
    } catch (err) {
      console.error('Camera access error:', err)
      stopCamera()
      setCameraError(getCameraErrorMessage(err))
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    
    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'captured-photo.jpg', { type: 'image/jpeg' })
        setPhotoFile(file)
        setPhotoPreview(URL.createObjectURL(blob))
        setCameraError('')
        stopCamera()
      }
    }, 'image/jpeg', 0.8)
  }

  const handleCamera = () => {
    if (cameraActive) {
      stopCamera()
    } else {
      startCamera()
    }
  }

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Create FormData for multipart upload
      const formDataToSend = new FormData()
      formDataToSend.append('full_name', formData.fullName)
      formDataToSend.append('phone', formData.contactNumber)
      formDataToSend.append('email', '') // Optional field
      formDataToSend.append('purpose', formData.purpose)
      formDataToSend.append('host_name', formData.personToVisit)
      
      if (photoFile) {
        formDataToSend.append('photo', photoFile)
      }

      const response = await fetch(apiUrl('/api/visitors/sign-in'), {
        method: 'POST',
        body: formDataToSend,
        // Don't set Content-Type header - browser will set it with boundary
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Failed to sign in')
        setLoading(false)
        return
      }

      const visitor = await response.json()
      const successVisitor = {
        id: visitor.id,
        fullName: visitor.full_name,
        hostName: visitor.host_name,
        purpose: visitor.purpose,
        signInTime: visitor.sign_in_time,
        qrCode: visitor.qr_code,
        qrExpiresAt: visitor.qr_expires_at ?? null,
        status: visitor.status ?? 'in'
      }
      // Refresh visitor list in context (safe even if not yet mounted).
      try {
        if (fetchAllVisitors) await fetchAllVisitors()
      } catch (_) {}
      // Navigate to success page with the visitor ID from the backend response
      navigate(`/sign-in/success/${visitor.id}`, { state: { visitor: successVisitor } })
    } catch (err) {
      setError('Failed to connect to server: ' + err.message)
      setLoading(false)
    }
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  })
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })

  return (
    <div className="sign-in-page">
      <div className="sign-in-container">
        <AcademicCityLogo className="page-brand-logo" />
        <div className="page-header">
          <button className="back-button" onClick={() => navigate('/')}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1>Visitor Sign In</h1>
            <p>Please fill in your details and capture your photo to register.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="sign-in-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-columns">
            <div className="form-fields">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Contact Number *</label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              <div className="form-group">
                <label>Person/Student to Visit *</label>
                <input
                  type="text"
                  name="personToVisit"
                  value={formData.personToVisit}
                  onChange={handleInputChange}
                  placeholder="Name or room number"
                  required
                />
              </div>

              <div className="form-group">
                <label>Purpose of Visit *</label>
                <textarea
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  placeholder="Briefly describe your visit"
                  rows="4"
                  required
                />
              </div>

              <div className="date-time-group">
                <div className="date-time-item">
                  <span className="label">Date:</span>
                  <span className="value">{currentDate}</span>
                </div>
                <div className="date-time-item">
                  <span className="label">Time In:</span>
                  <span className="value">{currentTime}</span>
                </div>
              </div>
            </div>

            <div className="photo-section">
              <label>Photo Capture *</label>
              <div className="photo-capture-box">
                {cameraActive ? (
                  <div className="camera-preview">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="camera-video"
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                  </div>
                ) : photoPreview ? (
                  <img src={photoPreview} alt="Captured" className="captured-photo" />
                ) : (
                  <div className="photo-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
                <p>Capture or upload your photo to complete registration</p>
                {cameraError && <p className="camera-error">{cameraError}</p>}
              </div>
              <div className="photo-buttons">
                <div className="camera-mode-row">
                  <label htmlFor="camera-mode">Camera Mode</label>
                  <select
                    id="camera-mode"
                    value={cameraFacingMode}
                    onChange={(e) => {
                      const nextMode = e.target.value
                      setCameraFacingMode(nextMode)
                      if (cameraActive) {
                        stopCamera()
                        setTimeout(() => {
                          startCamera()
                        }, 120)
                      }
                    }}
                  >
                    <option value="user">Front Camera</option>
                    <option value="environment">Back Camera</option>
                  </select>
                </div>
                <label className="upload-button">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                  />
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 10L12 5L17 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 5V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Upload Photo
                </label>
                <button 
                  type="button" 
                  className={`camera-button ${cameraActive ? 'active' : ''}`} 
                  onClick={handleCamera}
                >
                  {cameraActive ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 2L22 22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 9L15 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V5C1 4.46957 1.21071 3.96086 1.58579 3.58579C1.96086 3.21071 2.46957 3 3 3H21C21.5304 3 22.0391 3.21071 22.4142 3.58579C22.7893 3.96086 23 4.46957 23 5V19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Stop Camera
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Use Camera
                    </>
                  )}
                </button>
                {cameraActive && (
                  <button 
                    type="button" 
                    className="capture-button" 
                    onClick={capturePhoto}
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="3" fill="white"/>
                    </svg>
                    Capture
                  </button>
                )}
              </div>
            </div>
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Signing In...' : 'Complete Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default SignInPage

