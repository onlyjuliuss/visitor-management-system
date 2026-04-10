import { useState } from 'react'
import AdminSidebar from '../components/AdminSidebar'
import { useVisitors } from '../context/VisitorContext'
import './ReportsPage.css'

function ReportsPage() {
  const { visitors, getCurrentlySignedIn } = useVisitors()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [status, setStatus] = useState('all')
  const [visitorName, setVisitorName] = useState('')
  
  const currentlySignedIn = getCurrentlySignedIn()
  const signedOut = visitors.filter(v => v.status === 'out')
  const stillSignedIn = currentlySignedIn.length
  
  // Filter visitors based on criteria
  const filteredVisitors = visitors.filter(visitor => {
    const visitDate = new Date(visitor.signInTime)
    const from = fromDate ? new Date(fromDate) : null
    const to = toDate ? new Date(toDate) : null
    
    if (from && visitDate < from) return false
    if (to && visitDate > to) return false
    if (status !== 'all' && visitor.status !== status) return false
    if (visitorName && !visitor.fullName.toLowerCase().includes(visitorName.toLowerCase())) return false
    
    return true
  })
  
  const daysCovered = fromDate && toDate 
    ? Math.ceil((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)) + 1
    : visitors.length > 0 ? 1 : 0

  const applyQuickFilter = (filter) => {
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    
    switch(filter) {
      case 'today':
        setFromDate(startOfDay.toISOString().split('T')[0])
        setToDate(new Date().toISOString().split('T')[0])
        break
      case 'week':
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        setFromDate(weekAgo.toISOString().split('T')[0])
        setToDate(new Date().toISOString().split('T')[0])
        break
      case 'month':
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        setFromDate(monthAgo.toISOString().split('T')[0])
        setToDate(new Date().toISOString().split('T')[0])
        break
      case 'clear':
        setFromDate('')
        setToDate('')
        setStatus('all')
        setVisitorName('')
        break
    }
  }

  const exportCSV = () => {
    const headers = ['Date', 'Name', 'Contact', 'Visiting', 'Purpose', 'Time In', 'Time Out', 'Status']
    const rows = filteredVisitors.map(v => [
      new Date(v.signInTime).toLocaleDateString(),
      v.fullName,
      v.contactNumber,
      v.personToVisit,
      v.purpose,
      new Date(v.signInTime).toLocaleTimeString(),
      v.signOutTime ? new Date(v.signOutTime).toLocaleTimeString() : '-',
      v.status === 'in' ? 'In' : 'Out'
    ])
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `visitor-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printReport = () => {
    window.print()
  }

  return (
    <div className="admin-dashboard">
      <AdminSidebar />
      
      <div className="main-content">
        <div className="content-header">
          <div>
            <h1>Reports</h1>
            <p>Generate and export visitor reports with custom filters.</p>
          </div>
        </div>

        <div className="report-filters-section">
          <div className="filters-header">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3>Report Filters</h3>
          </div>

          <div className="filters-grid">
            <div className="filter-group">
              <label>From Date</label>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="date-input"
                />
                <svg className="calendar-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <div className="filter-group">
              <label>To Date</label>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="date-input"
                />
                <svg className="calendar-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <div className="filter-group">
              <label>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="status-select"
              >
                <option value="all">All Statuses</option>
                <option value="in">Signed In</option>
                <option value="out">Signed Out</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Visitor Name</label>
              <input
                type="text"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="Filter by name..."
                className="name-input"
              />
            </div>
          </div>

          <div className="quick-filters">
            <span className="quick-filters-label">Quick filters:</span>
            <div className="quick-filter-buttons">
              <button onClick={() => applyQuickFilter('today')} className="quick-filter-btn">Today</button>
              <button onClick={() => applyQuickFilter('week')} className="quick-filter-btn">This Week</button>
              <button onClick={() => applyQuickFilter('month')} className="quick-filter-btn">This Month</button>
              <button onClick={() => applyQuickFilter('clear')} className="quick-filter-btn">Clear All</button>
            </div>
          </div>

          <div className="filter-actions">
            <button className="export-csv-button" onClick={exportCSV}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 10L12 15L17 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 15V3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export CSV
            </button>
            <button className="print-button" onClick={printReport}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9V2H18V9M6 18H4C3.46957 18 2.96086 17.7893 2.58579 17.4142C2.21071 17.0391 2 16.5304 2 16V11C2 10.4696 2.21071 9.96086 2.58579 9.58579C2.96086 9.21071 3.46957 9 4 9H20C20.5304 9 21.0391 9.21071 21.4142 9.58579C21.7893 9.96086 22 10.4696 22 11V16C22 16.5304 21.7893 17.0391 21.4142 17.4142C21.0391 17.7893 20.5304 18 20 18H18M6 14H18V22H6V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Print Report
            </button>
          </div>
        </div>

        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-number red">{filteredVisitors.length}</div>
            <div className="summary-label">Total Visitors</div>
          </div>
          <div className="summary-card">
            <div className="summary-number green">{signedOut.length}</div>
            <div className="summary-label">Signed Out</div>
          </div>
          <div className="summary-card">
            <div className="summary-number red">{stillSignedIn}</div>
            <div className="summary-label">Still Signed In</div>
          </div>
          <div className="summary-card">
            <div className="summary-number purple">{daysCovered}</div>
            <div className="summary-label">Days Covered</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsPage
