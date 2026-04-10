import AdminSidebar from '../components/AdminSidebar'
import './SettingsPage.css'

function SettingsPage() {
  return (
    <div className="admin-dashboard">
      <AdminSidebar />
      
      <div className="main-content">
        <div className="content-header">
          <div>
            <h1>Settings</h1>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-card">
            <h3>System Configuration</h3>
            <p>Settings panel will be implemented based on specific requirements.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage

