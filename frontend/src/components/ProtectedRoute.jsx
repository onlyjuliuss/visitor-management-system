import { Navigate } from 'react-router-dom'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('adminToken')
  const tokenExpiry = localStorage.getItem('adminTokenExpiry')

  if (!token) {
    return <Navigate to="/admin/login" replace />
  }

  if (tokenExpiry) {
    const expiryTime = new Date(tokenExpiry).getTime()
    if (!Number.isNaN(expiryTime) && Date.now() >= expiryTime) {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminTokenExpiry')
      return <Navigate to="/admin/login" replace />
    }
  }

  return children
}

export default ProtectedRoute

