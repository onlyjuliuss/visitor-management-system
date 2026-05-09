import { createContext, useContext, useState, useEffect } from 'react'
import { apiUrl, authFetch } from '../lib/api'

const VisitorContext = createContext()

export function VisitorProvider({ children }) {
  const [visitors, setVisitors] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch all visitors from backend on mount
  useEffect(() => {
    fetchAllVisitors()
  }, [])

  const fetchAllVisitors = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      setVisitors([])
      setLoading(false)
      return
    }

    try {
      const response = await authFetch('/api/visitors')
      if (response.ok) {
        const data = await response.json()
        // Transform snake_case from backend to camelCase for frontend
        const transformedVisitors = (data.visitors || []).map(v => ({
          id: v.id,
          fullName: v.full_name,
          phone: v.phone,
          email: v.email,
          purpose: v.purpose,
          hostName: v.host_name,
          signInTime: v.sign_in_time,
          signOutTime: v.sign_out_time,
          photoURL: v.photo_url,
          qrCode: v.qr_code,
          status: v.status
        }))
        setVisitors(transformedVisitors)
      }
    } catch (err) {
      console.error('Failed to fetch visitors:', err)
      setVisitors([])
    } finally {
      setLoading(false)
    }
  }

  const getVisitorById = async (id) => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      return null
    }

    try {
      const response = await authFetch(`/api/visitors/${id}`)
      if (response.ok) {
        const v = await response.json()
        // Transform snake_case from backend to camelCase for frontend
        return {
          id: v.id,
          fullName: v.full_name,
          phone: v.phone,
          email: v.email,
          purpose: v.purpose,
          hostName: v.host_name,
          signInTime: v.sign_in_time,
          signOutTime: v.sign_out_time,
          photoURL: v.photo_url,
          qrCode: v.qr_code,
          status: v.status
        }
      }
    } catch (err) {
      console.error('Failed to fetch visitor:', err)
    }
    return null
  }

  // signOutVisitor supports:
  // - signOutVisitor(123)
  // - signOutVisitor({ id: 123 })
  // - signOutVisitor({ qr_code: "V-..." }) or signOutVisitor({ qrCode: "V-..." })
  const signOutVisitor = async (payload) => {
    try {
      let bodyObj = {}
      if (typeof payload === 'number') {
        bodyObj = { id: payload }
      } else if (typeof payload === 'string') {
        bodyObj = { qr_code: payload }
      } else if (payload && typeof payload === 'object') {
        if (payload.id) bodyObj.id = payload.id
        if (payload.qr_code) bodyObj.qr_code = payload.qr_code
        if (payload.qrCode) bodyObj.qr_code = payload.qrCode
      }

      const response = await authFetch('/api/visitors/sign-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyObj),
      })

      if (!response.ok) {
        const errorText = (await response.text()) || 'Failed to sign out visitor'
        return { success: false, error: errorText.trim() }
      }

      if (response.ok) {
        const v = await response.json()
        // Transform snake_case from backend to camelCase for frontend
        const updatedVisitor = {
          id: v.id,
          fullName: v.full_name,
          phone: v.phone,
          email: v.email,
          purpose: v.purpose,
          hostName: v.host_name,
          signInTime: v.sign_in_time,
          signOutTime: v.sign_out_time,
          photoURL: v.photo_url,
          qrCode: v.qr_code,
          status: v.status
        }
        // Update local state
        setVisitors(prev => prev.map(visitor => visitor.id === updatedVisitor.id ? updatedVisitor : visitor))
        return { success: true, visitor: updatedVisitor }
      }
    } catch (err) {
      console.error('Failed to sign out visitor:', err)
      return { success: false, error: 'Network error while signing out visitor' }
    }
    return { success: false, error: 'Failed to sign out visitor' }
  }

  const getCurrentlySignedIn = () => {
    return visitors.filter(v => v.status === 'in')
  }

  const getNotSignedOut = () => {
    return visitors.filter(v => v.status === 'in')
  }

  const getWeeklyTotal = () => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return visitors.filter(v => new Date(v.signInTime) >= weekAgo).length
  }

  const logoutAdmin = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminTokenExpiry')
  }

  return (
    <VisitorContext.Provider value={{
      visitors,
      loading,
      getVisitorById,
      signOutVisitor,
      getCurrentlySignedIn,
      getNotSignedOut,
      getWeeklyTotal,
      logoutAdmin,
      fetchAllVisitors
    }}>
      {children}
    </VisitorContext.Provider>
  )
}

export const useVisitors = () => {
  const context = useContext(VisitorContext)
  if (!context) {
    throw new Error('useVisitors must be used within VisitorProvider')
  }
  return context
}
