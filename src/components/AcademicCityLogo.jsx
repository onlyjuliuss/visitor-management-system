import { useState } from 'react'
import './AcademicCityLogo.css'

function AcademicCityLogo({ className = '' }) {
  const [hasImageError, setHasImageError] = useState(false)

  return (
    <div className={`academic-city-logo ${className}`.trim()}>
      {!hasImageError ? (
        <img
          src="/academic-city-logo.png"
          alt="Academic City University College"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <div className="logo-fallback">Academic City</div>
      )}
    </div>
  )
}

export default AcademicCityLogo
