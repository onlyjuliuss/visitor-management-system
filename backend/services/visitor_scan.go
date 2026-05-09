package services

import (
	"encoding/json"

	"host-win-backend/models"
)

// visitorSelectColumns is the canonical projection for full visitor rows. COALESCE keeps
// legacy NULLs (e.g. qr_token_hash before backfill, or partial migrations) from breaking Scan.
const visitorSelectColumns = `id, full_name, phone, email, purpose, host_name,
	sign_in_time, sign_out_time, photo_url, qr_code,
	COALESCE(qr_token_hash, '') AS qr_token_hash,
	qr_expires_at,
	qr_last_scanned_at,
	qr_revoked,
	qr_scan_count,
	COALESCE(risk_score, 0) AS risk_score,
	COALESCE(risk_level, 'low') AS risk_level,
	COALESCE(risk_reasons, '[]'::jsonb) AS risk_reasons,
	last_risk_evaluated_at,
	status`

type rowScanner interface {
	Scan(dest ...interface{}) error
}

func scanFullVisitor(sc rowScanner, v *models.Visitor) error {
	var reasonsRaw []byte
	if err := sc.Scan(
		&v.ID, &v.FullName, &v.Phone, &v.Email, &v.Purpose, &v.HostName,
		&v.SignInTime, &v.SignOutTime, &v.PhotoURL, &v.QRCode,
		&v.QRTokenHash, &v.QRExpiresAt, &v.QRLastScannedAt, &v.QRRevoked, &v.QRScanCount,
		&v.RiskScore, &v.RiskLevel, &reasonsRaw, &v.LastRiskEvaluatedAt, &v.Status,
	); err != nil {
		return err
	}
	v.RiskReasons = []string{}
	if len(reasonsRaw) > 0 {
		if err := json.Unmarshal(reasonsRaw, &v.RiskReasons); err != nil {
			v.RiskReasons = []string{}
		}
	}
	return nil
}
