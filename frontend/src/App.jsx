import { Routes, Route, Navigate } from 'react-router-dom'
import { VisitorProvider } from './context/VisitorContext'
import LandingPage from './pages/LandingPage'
import SignInPage from './pages/SignInPage'
import SignInSuccess from './pages/SignInSuccess'
import SignOutPage from './pages/SignOutPage'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import VisitorsPage from './pages/VisitorsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <VisitorProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-in/success/:id" element={<SignInSuccess />} />
        <Route path="/sign-out" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route 
          path="/admin/sign-out-desk" 
          element={
            <ProtectedRoute>
              <SignOutPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/visitors" 
          element={
            <ProtectedRoute>
              <VisitorsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/reports" 
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/settings" 
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </VisitorProvider>
  )
}

export default App

