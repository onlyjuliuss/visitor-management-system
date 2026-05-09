package models

import "time"

// Visitor represents a row in the visitors table.
type Visitor struct {
	ID                  int        `json:"id"`
	FullName            string     `json:"full_name"`
	Phone               string     `json:"phone"`
	Email               string     `json:"email"`
	Purpose             string     `json:"purpose"`
	HostName            string     `json:"host_name"`
	SignInTime          time.Time  `json:"sign_in_time"`
	SignOutTime         *time.Time `json:"sign_out_time,omitempty"` // nil until signed out
	PhotoURL            string     `json:"photo_url"`
	QRCode              string     `json:"qr_code"`
	QRTokenHash         string     `json:"qr_token_hash,omitempty"`
	QRExpiresAt         *time.Time `json:"qr_expires_at,omitempty"`
	QRLastScannedAt     *time.Time `json:"qr_last_scanned_at,omitempty"`
	QRRevoked           bool       `json:"qr_revoked"`
	QRScanCount         int        `json:"qr_scan_count"`
	RiskScore           int        `json:"risk_score"`
	RiskLevel           string     `json:"risk_level"`
	RiskReasons         []string   `json:"risk_reasons"`
	LastRiskEvaluatedAt *time.Time `json:"last_risk_evaluated_at,omitempty"`
	Status              string     `json:"status"` // "in" or "out"
}

// VisitorSignInRequest is what the frontend sends when a visitor signs in.
type VisitorSignInRequest struct {
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
	Email    string `json:"email"`
	Purpose  string `json:"purpose"`
	HostName string `json:"host_name"`
	PhotoURL string `json:"photo_url"`
}

// VisitorSignOutRequest is the payload for signing out a visitor.
type VisitorSignOutRequest struct {
	// Provide either ID or QRCode.
	ID     int    `json:"id"`
	QRCode string `json:"qr_code"`
}

// VisitorUpdateRequest is the payload for updating a visitor.
type VisitorUpdateRequest struct {
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
	Email    string `json:"email"`
	Purpose  string `json:"purpose"`
	HostName string `json:"host_name"`
	PhotoURL string `json:"photo_url"`
}

// VisitorStats represents daily statistics.
type VisitorStats struct {
	TotalVisitors     int `json:"total_visitors"`
	CurrentlySignedIn int `json:"currently_signed_in"`
	TotalSignedOut    int `json:"total_signed_out"`
}

// VisitorListResponse wraps a list of visitors.
type VisitorListResponse struct {
	Visitors []Visitor `json:"visitors"`
	Count    int       `json:"count"`
}
