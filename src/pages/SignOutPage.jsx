import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useVisitors } from '../context/VisitorContext'
import './SignOutPage.css'

function SignOutPage() {
  const navigate = useNavigate()
  const { getCurrentlySignedIn, signOutVisitor } = useVisitors()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSearch = (e) => {
    const query = e.target.value
    setSearchQuery(query)
    
    if (query.length > 0) {
      const signedIn = getCurrentlySignedIn()
      const filtered = signedIn.filter(visitor => 
        visitor.full_name.toLowerCase().includes(query.toLowerCase()) ||
        (visitor.id.toString().includes(query))
      )
      setSearchResults(filtered)
    } else {
      setSearchResults([])
    }
  }

  const handleSignOut = async (visitor) => {
    if (window.confirm(`Sign out ${visitor.full_name}?`)) {
      setLoading(true)
      await signOutVisitor(visitor.id)
      alert(`Successfully signed out ${visitor.full_name}`)
      setSearchQuery('')
      setSearchResults([])
      navigate('/')
      setLoading(false)
    }
  }

  return (
    <div className="sign-out-page">
      <div className="sign-out-container">
        <div className="page-header">
          <button className="back-button" onClick={() => navigate('/')}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1>Visitor Sign Out</h1>
            <p>Search for your name or visitor ID to sign out</p>
          </div>
        </div>

        <div className="sign-out-content">
          <div className="search-section">
            <label>Search by Name or Visitor ID</label>
            <div className="search-input-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="text"
                placeholder="Enter name or visitor ID"
                value={searchQuery}
                onChange={handleSearch}
                className="search-input"
              />
            </div>

            <div className="status-box">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8V12L16 14M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{getCurrentlySignedIn().length} visitor{getCurrentlySignedIn().length !== 1 ? 's' : ''} currently signed in</span>
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map(visitor => (
                  <div key={visitor.id} className="visitor-result" onClick={() => handleSignOut(visitor)} style={{ cursor: loading ? 'auto' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                    <div>
                      <h3>{visitor.full_name}</h3>
                      <p>ID: {visitor.id}</p>
                      <p className="visitor-purpose">Visiting: {visitor.host_name}</p>
                    </div>
                    <div className="status-badge in">In</div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length === 0 && (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p>Start typing to search for visitors currently signed in</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignOutPage

