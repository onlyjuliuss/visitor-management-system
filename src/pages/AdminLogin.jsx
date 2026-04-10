import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
      const response = await fetch('http://localhost:8080/api/admin/login', {
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
      const response = await fetch('http://localhost:8080/api/admin/login', {
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
      alert('✗ Cannot connect to server at http://localhost:8080\nError: ' + err.message)
    }
  }

  return (
    <div className="admin-login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#dc2626" />
              <path d="M2 17L12 22L22 17" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12L12 17L22 12" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
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

