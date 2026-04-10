import { useState } from 'react'
import AdminSidebar from '../components/AdminSidebar'
import { useVisitors } from '../context/VisitorContext'
import './VisitorsPage.css'

function VisitorsPage() {
  const { visitors } = useVisitors()
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const signedIn = visitors.filter(v => v.status === 'in')
  const signedOut = visitors.filter(v => v.status === 'out')

  const filteredVisitors = visitors.filter(visitor => {
    const matchesSearch = !searchQuery || 
      visitor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.contactNumber.includes(searchQuery) ||
      visitor.personToVisit.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = filter === 'all' || 
      (filter === 'in' && visitor.status === 'in') ||
      (filter === 'out' && visitor.status === 'out')
    
    return matchesSearch && matchesFilter
  })

  const exportCSV = () => {
    const headers = ['Date', 'Name', 'Contact', 'Visiting', 'Time In', 'Time Out', 'Status']
    const rows = filteredVisitors.map(v => [
      new Date(v.signInTime).toLocaleDateString(),
      v.fullName,
      v.contactNumber,
      v.personToVisit,
      new Date(v.signInTime).toLocaleTimeString(),
      v.signOutTime ? new Date(v.signOutTime).toLocaleTimeString() : '-',
      v.status === 'in' ? 'In' : 'Out'
    ])
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `visitors-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-dashboard">
      <AdminSidebar />
      
      <div className="main-content">
        <div className="content-header">
          <div>
            <h1>Visitor Records</h1>
            <p>Manage and view all visitor entries.</p>
          </div>
        </div>

        <div className="visitors-section">
          <div className="action-bar">
            <div className="search-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search by..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-buttons">
              <button
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({visitors.length})
              </button>
              <button
                className={`filter-btn ${filter === 'in' ? 'active' : ''}`}
                onClick={() => setFilter('in')}
              >
                Signed In ({signedIn.length})
              </button>
              <button
                className={`filter-btn ${filter === 'out' ? 'active' : ''}`}
                onClick={() => setFilter('out')}
              >
                Signed Out ({signedOut.length})
              </button>
            </div>

            <button className="export-csv-btn" onClick={exportCSV}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export CSV
            </button>
          </div>

          <div className="visitor-list-section">
            <h3 className="list-title">Visitor List ({filteredVisitors.length} record{filteredVisitors.length !== 1 ? 's' : ''})</h3>
            
            <div className="visitors-table">
              <div className="table-header">
                <div>Date</div>
                <div>Name</div>
                <div>Contact</div>
                <div>Visiting</div>
                <div>Time In</div>
                <div>Time Out</div>
                <div>Status</div>
                <div>Actions</div>
              </div>
              <div className="table-body">
                {filteredVisitors.length > 0 ? (
                  filteredVisitors.map(visitor => (
                    <div key={visitor.id} className="table-row">
                      <div>{new Date(visitor.signInTime).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</div>
                      <div className="visitor-name-cell">{visitor.fullName}</div>
                      <div>{visitor.contactNumber}</div>
                      <div>{visitor.personToVisit}</div>
                      <div>{new Date(visitor.signInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</div>
                      <div>{visitor.signOutTime ? new Date(visitor.signOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '-'}</div>
                      <div>
                        <span className={`status-badge ${visitor.status}`}>
                          {visitor.status === 'in' ? 'In' : 'Out'}
                        </span>
                      </div>
                      <div>
                        <button className="view-button" title="View details">
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>No visitors found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VisitorsPage
