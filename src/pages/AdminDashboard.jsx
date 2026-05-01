import { useNavigate } from 'react-router-dom'
import { useVisitors } from '../context/VisitorContext'
import AdminSidebar from '../components/AdminSidebar'
import AcademicCityLogo from '../components/AcademicCityLogo'
import './AdminDashboard.css'

function AdminDashboard() {
  const navigate = useNavigate()
  const { 
    visitors, 
    getCurrentlySignedIn, 
    getNotSignedOut, 
    getWeeklyTotal
  } = useVisitors()

  const currentlySignedIn = getCurrentlySignedIn()
  const notSignedOut = getNotSignedOut()
  const weeklyTotal = getWeeklyTotal()
  const recentVisitors = visitors.slice(0, 5)

  return (
    <div className="admin-dashboard">
      <AdminSidebar />

      <div className="main-content">
        <div className="content-header">
          <button className="back-arrow-button" onClick={() => navigate('/')}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1>Dashboard</h1>
            <p>Welcome to the acity-PASS Visitor Management System.</p>
          </div>
          <AcademicCityLogo className="header-logo" />
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div>
                <div className="stat-title">Total Visitors</div>
                <div className="stat-number">{visitors.length}</div>
                <div className="stat-change positive">All time</div>
              </div>
              <div className="stat-icon red">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div>
                <div className="stat-title">Currently Signed In</div>
                <div className="stat-number">{currentlySignedIn.length}</div>
                <div className="stat-status active">Active</div>
              </div>
              <div className="stat-icon green">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8V12L16 14M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div>
                <div className="stat-title">Not Signed Out</div>
                <div className="stat-number">{notSignedOut.length}</div>
                <div className="stat-status warning">Requires attention</div>
              </div>
              <div className="stat-icon red">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9V13M12 17H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div>
                <div className="stat-title">Weekly Total</div>
                <div className="stat-number">{weeklyTotal}</div>
                <div className="stat-change positive">Last 7 days</div>
              </div>
              <div className="stat-icon purple">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 3V21H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 16L12 11L16 15L21 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 10H16V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-section">
            <h2>Recent Visitors</h2>
            <div className="visitors-list">
              {recentVisitors.length > 0 ? (
                recentVisitors.map(visitor => (
                  <div key={visitor.id} className="visitor-item">
                    <div className="visitor-info">
                      <div className="visitor-name">{visitor.fullName}</div>
                      <div className="visitor-purpose">Visiting: {visitor.hostName}</div>
                    </div>
                    <div className="visitor-meta">
                      <span className={`visitor-status-badge ${visitor.status}`}>
                        {visitor.status === 'in' ? 'In' : 'Out'}
                      </span>
                      <span className="visitor-time">
                        {new Date(visitor.signInTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
                  No visitors yet
                </p>
              )}
            </div>
          </div>

          <div className="dashboard-section">
            <h2>Quick Actions</h2>
            <div className="quick-actions">
              <button className="action-button">
                <div>
                  <h3>Export Today's Report</h3>
                  <p>Download visitor log for today.</p>
                </div>
              </button>
              <button className="action-button" onClick={() => navigate('/admin/visitors')}>
                <div>
                  <h3>View Pending Sign-outs</h3>
                  <p>{notSignedOut.length} visitor{notSignedOut.length !== 1 ? 's' : ''} need attention.</p>
                </div>
              </button>
              <button className="action-button">
                <div>
                  <h3>Weekly Summary</h3>
                  <p>Generate weekly visitor statistics.</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard

