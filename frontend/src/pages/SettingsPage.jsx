import { useState, useEffect } from 'react'
import AdminSidebar from '../components/AdminSidebar'
import AcademicCityLogo from '../components/AcademicCityLogo'
import { apiUrl } from '../lib/api'
import './SettingsPage.css'

function SettingsPage() {
  const [settings, setSettings] = useState({
    businessHours: {
      start: '09:00',
      end: '17:00',
      reminderTime: '20:00' // 8 PM
    },
    notifications: {
      smsEnabled: false,
      emailEnabled: false,
      reminderEnabled: true
    },
    system: {
      maxFileSize: 10, // MB
      allowedFileTypes: ['jpg', 'jpeg', 'png'],
      autoSignOutHours: 8
    }
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [testSMS, setTestSMS] = useState({ phone: '', name: '' })

  // Load settings from localStorage or API
  useEffect(() => {
    const savedSettings = localStorage.getItem('adminSettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const handleSettingChange = (category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }))
  }

  const saveSettings = () => {
    setLoading(true)
    try {
      localStorage.setItem('adminSettings', JSON.stringify(settings))
      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('Failed to save settings')
    }
    setLoading(false)
  }

  const sendTestSMS = async () => {
    if (!testSMS.phone || !testSMS.name) {
      setMessage('Please enter both phone number and name')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(apiUrl('/api/notifications/test-reminder'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testSMS),
      })

      if (response.ok) {
        setMessage('Test SMS sent successfully!')
      } else {
        setMessage('Failed to send test SMS')
      }
    } catch (error) {
      setMessage('Error sending test SMS: ' + error.message)
    }
    setLoading(false)
  }

  const checkVisitorsNeedingReminders = async () => {
    try {
      const response = await fetch(apiUrl('/api/notifications/visitors-needing-reminders'))
      if (response.ok) {
        const data = await response.json()
        alert(`${data.count} visitors would receive reminders today`)
      }
    } catch (error) {
      alert('Error checking visitors: ' + error.message)
    }
  }

  return (
    <div className="admin-dashboard">
      <AdminSidebar />

      <div className="main-content">
        <div className="content-header">
          <div>
            <h1>Settings</h1>
            <p>Configure system preferences and notification settings.</p>
          </div>
          <AcademicCityLogo className="header-logo" />
        </div>

        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div className="settings-grid">
          {/* Business Hours Settings */}
          <div className="settings-card">
            <div className="card-header">
              <h3>Business Hours</h3>
              <p>Configure operating hours and reminder schedules</p>
            </div>

            <div className="settings-group">
              <div className="setting-item">
                <label>Opening Time</label>
                <input
                  type="time"
                  value={settings.businessHours.start}
                  onChange={(e) => handleSettingChange('businessHours', 'start', e.target.value)}
                />
              </div>

              <div className="setting-item">
                <label>Closing Time</label>
                <input
                  type="time"
                  value={settings.businessHours.end}
                  onChange={(e) => handleSettingChange('businessHours', 'end', e.target.value)}
                />
              </div>

              <div className="setting-item">
                <label>Sign-out Reminder Time</label>
                <input
                  type="time"
                  value={settings.businessHours.reminderTime}
                  onChange={(e) => handleSettingChange('businessHours', 'reminderTime', e.target.value)}
                />
                <small>Visitors will receive SMS reminders at this time</small>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="settings-card">
            <div className="card-header">
              <h3>Notifications</h3>
              <p>Configure how and when notifications are sent</p>
            </div>

            <div className="settings-group">
              <div className="setting-item checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.notifications.smsEnabled}
                    onChange={(e) => handleSettingChange('notifications', 'smsEnabled', e.target.checked)}
                  />
                  Enable SMS Notifications
                </label>
              </div>

              <div className="setting-item checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.notifications.emailEnabled}
                    onChange={(e) => handleSettingChange('notifications', 'emailEnabled', e.target.checked)}
                  />
                  Enable Email Notifications
                </label>
              </div>

              <div className="setting-item checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.notifications.reminderEnabled}
                    onChange={(e) => handleSettingChange('notifications', 'reminderEnabled', e.target.checked)}
                  />
                  Enable Sign-out Reminders
                </label>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="settings-card">
            <div className="card-header">
              <h3>System Configuration</h3>
              <p>Configure file uploads and system behavior</p>
            </div>

            <div className="settings-group">
              <div className="setting-item">
                <label>Max File Size (MB)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.system.maxFileSize}
                  onChange={(e) => handleSettingChange('system', 'maxFileSize', parseInt(e.target.value))}
                />
              </div>

              <div className="setting-item">
                <label>Auto Sign-out After (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={settings.system.autoSignOutHours}
                  onChange={(e) => handleSettingChange('system', 'autoSignOutHours', parseInt(e.target.value))}
                />
                <small>Automatically sign out visitors after this many hours</small>
              </div>

              <div className="setting-item">
                <label>Allowed File Types</label>
                <div className="file-types">
                  {settings.system.allowedFileTypes.map(type => (
                    <span key={type} className="file-type-tag">{type}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SMS Testing */}
          <div className="settings-card">
            <div className="card-header">
              <h3>SMS Testing</h3>
              <p>Test SMS notifications and check reminder status</p>
            </div>

            <div className="settings-group">
              <div className="setting-item">
                <label>Test Phone Number</label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={testSMS.phone}
                  onChange={(e) => setTestSMS(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="setting-item">
                <label>Test Visitor Name</label>
                <input
                  type="text"
                  placeholder="Enter visitor name"
                  value={testSMS.name}
                  onChange={(e) => setTestSMS(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="setting-actions">
                <button
                  className="test-sms-btn"
                  onClick={sendTestSMS}
                  disabled={loading}
                >
                  Send Test SMS
                </button>
                <button
                  className="check-reminders-btn"
                  onClick={checkVisitorsNeedingReminders}
                >
                  Check Visitors Needing Reminders
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="settings-card">
            <div className="card-header">
              <h3>Quick Actions</h3>
              <p>Common administrative tasks</p>
            </div>

            <div className="quick-actions-grid">
              <button className="quick-action-btn">
                <div>
                  <h4>Export All Data</h4>
                  <p>Download complete visitor database</p>
                </div>
              </button>

              <button className="quick-action-btn">
                <div>
                  <h4>Clear Old Records</h4>
                  <p>Remove records older than 1 year</p>
                </div>
              </button>

              <button className="quick-action-btn">
                <div>
                  <h4>System Backup</h4>
                  <p>Create database backup</p>
                </div>
              </button>

              <button className="quick-action-btn">
                <div>
                  <h4>Reset Settings</h4>
                  <p>Restore default configuration</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="settings-actions">
          <button
            className="save-settings-btn"
            onClick={saveSettings}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage

