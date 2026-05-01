import { useNavigate, useParams } from 'react-router-dom'
import { useVisitors } from '../context/VisitorContext'
import { useEffect, useState } from 'react'
import AcademicCityLogo from '../components/AcademicCityLogo'
import { apiUrl } from '../lib/api'
import './SignInSuccess.css'

function SignInSuccess() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { getVisitorById, fetchAllVisitors } = useVisitors()
  const [visitor, setVisitor] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVisitor = async () => {
      const visitorData = await getVisitorById(id)
      setVisitor(visitorData)
      // Ensure the shared visitor list is up to date for sign-out/admin views.
      fetchAllVisitors?.()
      setLoading(false)
    }
    fetchVisitor()
  }, [id, getVisitorById, fetchAllVisitors])

  if (loading) {
    return (
      <div className="sign-in-success-page">
        <div className="success-container">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!visitor) {
    return (
      <div className="sign-in-success-page">
        <div className="success-container">
          <p>Visitor not found</p>
          <button onClick={() => navigate('/')}>Go Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="sign-in-success-page">
      <div className="success-container">
        <AcademicCityLogo className="success-brand-logo" />
        <div className="success-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 4L12 14.01L9 11.01" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1>Sign In Successful!</h1>
        <p className="success-message">Your visitor registration is complete. Please keep this QR code for sign out.</p>

        <div className="visitor-info">
          <div className="info-item">
            <span className="label">Name:</span>
            <span className="value">{visitor.fullName}</span>
          </div>
          <div className="info-item">
            <span className="label">Visitor ID:</span>
            <span className="value">{visitor.qrCode}</span>
          </div>
          <div className="info-item">
            <span className="label">Time In:</span>
            <span className="value">{new Date(visitor.signInTime).toLocaleString()}</span>
          </div>
        </div>

        <div className="qr-code-container">
          <h3>Your QR Code</h3>
          <div className="qr-code-wrapper">
            {visitor.qrCode && (
              <img 
                src={apiUrl(`/api/qrcodes/${visitor.qrCode.substring(2)}.png`)}
                alt="QR Code" 
                style={{width: '200px', height: '200px'}}
              />
            )}
          </div>
          <p className="qr-instruction">Scan this QR code when signing out</p>
        </div>

        <div className="action-buttons">
          <button className="primary-button" onClick={() => navigate('/')}>
            Done
          </button>
          <button className="secondary-button" onClick={() => window.print()}>
            Print QR Code
          </button>
        </div>
      </div>
    </div>
  )
}

export default SignInSuccess
