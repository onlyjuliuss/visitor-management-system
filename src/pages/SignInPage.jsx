import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import './SignInPage.css'

function SignInPage() {
  const navigate = useNavigate()
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
    }
  }

  const handleCamera = () => {
    // In a real app, this would open the camera
    alert('Camera functionality would be implemented here')
  }

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

      const response = await fetch('http://localhost:8080/api/visitors/sign-in', {
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
      // Navigate to success page with the visitor ID from the backend response
      navigate(`/sign-in/success/${visitor.id}`)
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
                {photoPreview ? (
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
              </div>
              <div className="photo-buttons">
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
                <button type="button" className="camera-button" onClick={handleCamera}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Use Camera
                </button>
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

