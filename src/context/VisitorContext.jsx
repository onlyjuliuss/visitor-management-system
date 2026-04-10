import { createContext, useContext, useState, useEffect } from 'react'

const VisitorContext = createContext()

export function VisitorProvider({ children }) {
  const [visitors, setVisitors] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch all visitors from backend on mount
  useEffect(() => {
    fetchAllVisitors()
  }, [])

  const fetchAllVisitors = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/visitors')
      if (response.ok) {
        const data = await response.json()
        setVisitors(data.visitors || [])
      }
    } catch (err) {
      console.error('Failed to fetch visitors:', err)
      setVisitors([])
    } finally {
      setLoading(false)
    }
  }

  const getVisitorById = async (id) => {
    try {
      const response = await fetch(`http://localhost:8080/api/visitors/${id}`)
      if (response.ok) {
        return await response.json()
      }
    } catch (err) {
      console.error('Failed to fetch visitor:', err)
    }
    return null
  }

  const signOutVisitor = async (visitorId) => {
    try {
      const response = await fetch('http://localhost:8080/api/visitors/sign-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: visitorId }),
      })
      if (response.ok) {
        const updatedVisitor = await response.json()
        // Update local state
        setVisitors(prev => prev.map(v => v.id === visitorId ? updatedVisitor : v))
        return updatedVisitor
      }
    } catch (err) {
      console.error('Failed to sign out visitor:', err)
    }
    return null
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
    return visitors.filter(v => new Date(v.sign_in_time) >= weekAgo).length
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
