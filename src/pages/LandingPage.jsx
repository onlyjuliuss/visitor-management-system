import { useNavigate } from 'react-router-dom'
import AcademicCityLogo from '../components/AcademicCityLogo'
import './LandingPage.css'

function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing-page">
      <div className="landing-container">
        <div className="logo-container">
          <AcademicCityLogo className="brand-logo" />
          <h1 className="main-title">
            <span className="brand-name">acity</span>
            <span className="brand-amp">-</span>
            <span className="brand-name">PASS</span>
          </h1>
          <p className="subtitle">Digital Sign-in/Sign-out Portal</p>
        </div>

        <div className="action-cards">
          <div className="action-card" onClick={() => navigate('/sign-in')}>
            <div className="card-icon green">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 13H22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="card-content">
              <h2>Sign In</h2>
              <p>Register your visit to the hostel</p>
            </div>
          </div>

        </div>

        <div className="reception-note">
          For sign-out, please proceed to reception.
        </div>

        <button className="admin-button" onClick={() => navigate('/admin')}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 15C15.866 15 19 11.866 19 8C19 4.13401 15.866 1 12 1C8.13401 1 5 4.13401 5 8C5 11.866 8.13401 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8.21 13.89L7 23L12 20L17 23L15.79 13.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Admin Dashboard
        </button>

        <footer className="footer">
          <p>© 2024 acity-PASS Management System</p>
        </footer>
      </div>
    </div>
  )
}

export default LandingPage

