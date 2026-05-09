package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"host-win-backend/config"
	"host-win-backend/models"
	"host-win-backend/utils"
)

type VisitorRiskResult struct {
	Score   int      `json:"score"`
	Level   string   `json:"level"`
	Reasons []string `json:"reasons"`
}

type RiskSummary struct {
	Low             int `json:"low"`
	Medium          int `json:"medium"`
	High            int `json:"high"`
	Critical        int `json:"critical"`
	OverdueVisitors int `json:"overdue_visitors"`
}

func scoreToLevel(score int) string {
	switch {
	case score >= 75:
		return "critical"
	case score >= 50:
		return "high"
	case score >= 25:
		return "medium"
	default:
		return "low"
	}
}

func CalculateVisitorRisk(ctx context.Context, visitorID int) (*VisitorRiskResult, error) {
	const visitorQuery = `
		SELECT id, full_name, phone, host_name, sign_in_time, sign_out_time, status
		FROM visitors
		WHERE id = $1
	`

	var v models.Visitor
	if err := config.DB.QueryRowContext(ctx, visitorQuery, visitorID).Scan(
		&v.ID, &v.FullName, &v.Phone, &v.HostName, &v.SignInTime, &v.SignOutTime, &v.Status,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("calculate risk visitor lookup: %w", err)
	}

	now := time.Now()
	score := 0
	reasons := make([]string, 0)

	if v.SignInTime.Local().Hour() >= 20 {
		score += 20
		reasons = append(reasons, "Visitor signed in after 20:00")
	}

	if v.Status == "in" || v.Status == "IN" {
		if now.Sub(v.SignInTime) > 6*time.Hour {
			score += 30
			reasons = append(reasons, "Visitor has been signed in for more than 6 hours")
		}
		if now.Local().Hour() >= 20 {
			score += 25
			reasons = append(reasons, "Visitor remains signed in after 20:00")
		}
	}

	var visitsLast7 int
	if err := config.DB.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM visitors
		WHERE phone = $1
		  AND sign_in_time >= NOW() - INTERVAL '7 days'
	`, v.Phone).Scan(&visitsLast7); err == nil && visitsLast7 > 3 {
		score += 15
		reasons = append(reasons, fmt.Sprintf("Same phone number has %d visits in the last 7 days", visitsLast7))
	}

	var distinctNames int
	if err := config.DB.QueryRowContext(ctx, `
		SELECT COUNT(DISTINCT LOWER(full_name))
		FROM visitors
		WHERE phone = $1
	`, v.Phone).Scan(&distinctNames); err == nil && distinctNames > 1 {
		score += 20
		reasons = append(reasons, "Same phone number appears with multiple visitor names")
	}

	var distinctHosts14 int
	if err := config.DB.QueryRowContext(ctx, `
		SELECT COUNT(DISTINCT LOWER(host_name))
		FROM visitors
		WHERE phone = $1
		  AND sign_in_time >= NOW() - INTERVAL '14 days'
	`, v.Phone).Scan(&distinctHosts14); err == nil && distinctHosts14 > 2 {
		score += 15
		reasons = append(reasons, fmt.Sprintf("Same phone number visited %d different hosts in the last 14 days", distinctHosts14))
	}

	var recentFailedQR int
	if err := config.DB.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM activity_logs
		WHERE visitor_id = $1
		  AND event_type = 'qr_scan_failed'
		  AND created_at >= NOW() - INTERVAL '24 hours'
	`, v.ID).Scan(&recentFailedQR); err == nil && recentFailedQR > 0 {
		score += 20
		reasons = append(reasons, "Recent failed QR scan events were detected")
	}

	var overdueHistory int
	if err := config.DB.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM visitors
		WHERE phone = $1
		  AND sign_out_time IS NOT NULL
		  AND sign_out_time - sign_in_time > INTERVAL '6 hours'
	`, v.Phone).Scan(&overdueHistory); err == nil && overdueHistory > 0 {
		score += 10
		reasons = append(reasons, "Visitor has previous overdue history")
	}

	return &VisitorRiskResult{
		Score:   score,
		Level:   scoreToLevel(score),
		Reasons: reasons,
	}, nil
}

func RecalculateVisitorRisk(ctx context.Context, visitorID int) (*VisitorRiskResult, error) {
	result, err := CalculateVisitorRisk(ctx, visitorID)
	if err != nil {
		return nil, err
	}

	reasonsJSON, _ := json.Marshal(result.Reasons)
	const updateQuery = `
		UPDATE visitors
		SET risk_score = $1,
		    risk_level = $2,
		    risk_reasons = $3::jsonb,
		    last_risk_evaluated_at = NOW()
		WHERE id = $4
	`
	if _, err := config.DB.ExecContext(ctx, updateQuery, result.Score, result.Level, reasonsJSON, visitorID); err != nil {
		return nil, fmt.Errorf("recalculate visitor risk update: %w", err)
	}

	_ = LogVisitorEvent(ctx, "risk_score_updated", visitorID, "info", "visitor risk score recalculated", map[string]interface{}{
		"risk_score": result.Score,
		"risk_level": result.Level,
		"reasons":    result.Reasons,
	})
	if result.Level == "high" || result.Level == "critical" {
		_ = LogVisitorEvent(ctx, "high_risk_visitor_detected", visitorID, "warning", "high risk visitor detected", map[string]interface{}{
			"risk_score": result.Score,
			"risk_level": result.Level,
		})
	}

	return result, nil
}

func RecalculateActiveVisitorRisks(ctx context.Context) (int, error) {
	rows, err := config.DB.QueryContext(ctx, `
		SELECT id
		FROM visitors
		WHERE status = 'in'
	`)
	if err != nil {
		return 0, fmt.Errorf("recalculate active risks query: %w", err)
	}
	defer rows.Close()

	updated := 0
	for rows.Next() {
		var visitorID int
		if err := rows.Scan(&visitorID); err != nil {
			return updated, fmt.Errorf("recalculate active risks scan: %w", err)
		}
		if _, err := RecalculateVisitorRisk(ctx, visitorID); err == nil {
			updated++
		}
	}
	return updated, rows.Err()
}

func GetHighRiskVisitors(ctx context.Context, limit int) ([]models.Visitor, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 200 {
		limit = 200
	}

	query := `
		SELECT ` + visitorSelectColumns + `
		FROM visitors
		WHERE COALESCE(risk_level, 'low') IN ('high', 'critical')
		ORDER BY COALESCE(risk_score, 0) DESC, sign_in_time DESC
		LIMIT $1
	`
	rows, err := config.DB.QueryContext(ctx, query, limit)
	if err != nil {
		log.Printf("[RISK] GetHighRiskVisitors query failed: %v", err)
		return nil, fmt.Errorf("get high risk visitors: %w", err)
	}
	defer rows.Close()

	visitors := make([]models.Visitor, 0)
	for rows.Next() {
		var v models.Visitor
		if err := scanFullVisitor(rows, &v); err != nil {
			log.Printf("[RISK] GetHighRiskVisitors scan failed: %v", err)
			return nil, fmt.Errorf("scan high risk visitor: %w", err)
		}
		visitors = append(visitors, v)
	}
	if err := rows.Err(); err != nil {
		log.Printf("[RISK] GetHighRiskVisitors rows iteration: %v", err)
		return nil, err
	}
	return visitors, nil
}

func GetRiskSummary(ctx context.Context) (*RiskSummary, error) {
	var summary RiskSummary
	const query = `
		SELECT
			COUNT(*) FILTER (WHERE COALESCE(risk_level, 'low') = 'low') AS low_count,
			COUNT(*) FILTER (WHERE COALESCE(risk_level, 'low') = 'medium') AS medium_count,
			COUNT(*) FILTER (WHERE COALESCE(risk_level, 'low') = 'high') AS high_count,
			COUNT(*) FILTER (WHERE COALESCE(risk_level, 'low') = 'critical') AS critical_count,
			COUNT(*) FILTER (WHERE status = 'in' AND sign_in_time < NOW() - INTERVAL '6 hours') AS overdue_count
		FROM visitors
	`
	if err := config.DB.QueryRowContext(ctx, query).Scan(
		&summary.Low,
		&summary.Medium,
		&summary.High,
		&summary.Critical,
		&summary.OverdueVisitors,
	); err != nil {
		log.Printf("[RISK] GetRiskSummary failed: %v", err)
		return nil, fmt.Errorf("get risk summary: %w", err)
	}
	return &summary, nil
}

func FindVisitorIDByQRCodeInput(ctx context.Context, qrCode string) (int, error) {
	qrCode = strings.TrimSpace(qrCode)
	if qrCode == "" {
		return 0, ErrNotFound
	}

	var visitorID int
	if strings.HasPrefix(qrCode, utils.SecureQRPrefix) {
		qrHash := utils.HashSecureQRToken(qrCode)
		err := config.DB.QueryRowContext(ctx, `
			SELECT id FROM visitors WHERE qr_token_hash = $1 LIMIT 1
		`, qrHash).Scan(&visitorID)
		if err != nil {
			if err == sql.ErrNoRows {
				return 0, ErrNotFound
			}
			return 0, err
		}
		return visitorID, nil
	}

	err := config.DB.QueryRowContext(ctx, `
		SELECT id FROM visitors WHERE qr_code = $1 LIMIT 1
	`, qrCode).Scan(&visitorID)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, ErrNotFound
		}
		return 0, err
	}
	return visitorID, nil
}
