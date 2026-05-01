import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AcademicCityLogo from '../components/AcademicCityLogo'
import { apiUrl } from '../lib/api'
import './AdminLogin.css'

function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError('Username and password are required')
      return
    }

    try {
      const response = await fetch(apiUrl('/api/admin/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Login failed')
        return
      }

      const data = await response.json()
      localStorage.setItem('adminToken', data.token)
      localStorage.setItem('adminTokenExpiry', data.expires_at)
      navigate('/admin')
    } catch (err) {
      setError('Failed to connect to server: ' + err.message)
    }
  }

  const testConnection = async () => {
    try {
      const response = await fetch(apiUrl('/api/admin/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      })
      if (response.ok) {
        alert('✓ Connection successful!')
      } else {
        alert('✗ Server responded with error: ' + response.status)
      }
    } catch (err) {
      alert('✗ Cannot connect to backend API\nError: ' + err.message)
    }
  }

  return (
    <div className="admin-login-page">
      <div className="login-container">
        <div className="login-header">
          <AcademicCityLogo className="admin-login-logo" />
          <h1>Admin Login</h1>
          <p>Enter your credentials to access the admin panel</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <button type="submit" className="login-button">
            Login
          </button>

          <button type="button" onClick={testConnection} className="login-button" style={{backgroundColor: '#10b981', marginTop: '10px'}}>
            Test Connection
          </button>

          <div className="demo-credentials">
            <p>Demo Credentials:</p>
            <p><strong>Username:</strong> admin</p>
            <p><strong>Password:</strong> admin123</p>
          </div>
        </form>

        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
      </div>
    </div>
  )
}

export default AdminLogin

