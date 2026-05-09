package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"

	"host-win-backend/config"
	"host-win-backend/models"
)

func metadataToJSON(metadata map[string]interface{}) []byte {
	if metadata == nil {
		return []byte(`{}`)
	}
	data, err := json.Marshal(metadata)
	if err != nil {
		return []byte(`{}`)
	}
	return data
}

// CreateActivityLog inserts one activity log record.
func CreateActivityLog(ctx context.Context, entry models.ActivityLog) error {
	const query = `
		INSERT INTO activity_logs (
			event_type, actor_type, actor_identifier, visitor_id, severity, message,
			metadata, ip_address, user_agent
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
	`

	eventType := entry.EventType
	if eventType == "" {
		eventType = "system.event"
	}
	actorType := entry.ActorType
	if actorType == "" {
		actorType = "system"
	}
	severity := entry.Severity
	if severity == "" {
		severity = "info"
	}
	message := entry.Message
	if message == "" {
		message = "event logged"
	}
	metadata := entry.Metadata
	if len(metadata) == 0 {
		metadata = []byte(`{}`)
	}

	_, err := config.DB.ExecContext(
		ctx,
		query,
		eventType,
		actorType,
		entry.ActorIdentifier,
		entry.VisitorID,
		severity,
		message,
		metadata,
		entry.IPAddress,
		entry.UserAgent,
	)
	if err != nil {
		return fmt.Errorf("create activity log: %w", err)
	}
	return nil
}

// LogVisitorEvent logs visitor-related events quickly with defaults.
func LogVisitorEvent(ctx context.Context, eventType string, visitorID int, severity, message string, metadata map[string]interface{}) error {
	var visitorIDPtr *int
	if visitorID > 0 {
		visitorIDPtr = &visitorID
	}
	return CreateActivityLog(ctx, models.ActivityLog{
		EventType: eventType,
		ActorType: "visitor",
		VisitorID: visitorIDPtr,
		Severity:  severity,
		Message:   message,
		Metadata:  metadataToJSON(metadata),
	})
}

// LogSystemEvent logs non-visitor system-level events quickly with defaults.
func LogSystemEvent(ctx context.Context, eventType, severity, message string, metadata map[string]interface{}) error {
	return CreateActivityLog(ctx, models.ActivityLog{
		EventType: eventType,
		ActorType: "system",
		Severity:  severity,
		Message:   message,
		Metadata:  metadataToJSON(metadata),
	})
}

// GetRecentActivityLogs returns recent activity logs, newest first.
func GetRecentActivityLogs(ctx context.Context, limit int) ([]models.ActivityLog, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 500 {
		limit = 500
	}

	const query = `
		SELECT id, event_type, actor_type, actor_identifier, visitor_id, severity, message,
		       metadata, ip_address, user_agent, created_at
		FROM activity_logs
		ORDER BY created_at DESC
		LIMIT $1
	`

	rows, err := config.DB.QueryContext(ctx, query, limit)
	if err != nil {
		log.Printf("[ACTIVITY] GetRecentActivityLogs query failed: %v", err)
		return nil, fmt.Errorf("get recent activity logs: %w", err)
	}
	defer rows.Close()

	logs := make([]models.ActivityLog, 0)
	for rows.Next() {
		var (
			entry         models.ActivityLog
			visitorIDNull sql.NullInt64
			metadataBytes []byte
		)
		if err := rows.Scan(
			&entry.ID,
			&entry.EventType,
			&entry.ActorType,
			&entry.ActorIdentifier,
			&visitorIDNull,
			&entry.Severity,
			&entry.Message,
			&metadataBytes,
			&entry.IPAddress,
			&entry.UserAgent,
			&entry.CreatedAt,
		); err != nil {
			log.Printf("[ACTIVITY] GetRecentActivityLogs scan failed: %v", err)
			return nil, fmt.Errorf("scan recent activity log: %w", err)
		}
		if visitorIDNull.Valid {
			v := int(visitorIDNull.Int64)
			entry.VisitorID = &v
		}
		if len(metadataBytes) == 0 {
			entry.Metadata = json.RawMessage(`{}`)
		} else {
			entry.Metadata = json.RawMessage(metadataBytes)
		}
		logs = append(logs, entry)
	}

	if err := rows.Err(); err != nil {
		log.Printf("[ACTIVITY] GetRecentActivityLogs rows iteration: %v", err)
		return nil, err
	}
	return logs, nil
}

// GetActivityLogsByVisitor returns logs for a specific visitor.
func GetActivityLogsByVisitor(ctx context.Context, visitorID int) ([]models.ActivityLog, error) {
	const query = `
		SELECT id, event_type, actor_type, actor_identifier, visitor_id, severity, message,
		       metadata, ip_address, user_agent, created_at
		FROM activity_logs
		WHERE visitor_id = $1
		ORDER BY created_at DESC
	`

	rows, err := config.DB.QueryContext(ctx, query, visitorID)
	if err != nil {
		return nil, fmt.Errorf("get activity logs by visitor: %w", err)
	}
	defer rows.Close()

	logs := make([]models.ActivityLog, 0)
	for rows.Next() {
		var (
			entry         models.ActivityLog
			visitorIDNull sql.NullInt64
			metadataBytes []byte
		)
		if err := rows.Scan(
			&entry.ID,
			&entry.EventType,
			&entry.ActorType,
			&entry.ActorIdentifier,
			&visitorIDNull,
			&entry.Severity,
			&entry.Message,
			&metadataBytes,
			&entry.IPAddress,
			&entry.UserAgent,
			&entry.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan activity log by visitor: %w", err)
		}
		if visitorIDNull.Valid {
			v := int(visitorIDNull.Int64)
			entry.VisitorID = &v
		}
		if len(metadataBytes) == 0 {
			entry.Metadata = json.RawMessage(`{}`)
		} else {
			entry.Metadata = json.RawMessage(metadataBytes)
		}
		logs = append(logs, entry)
	}

	return logs, rows.Err()
}
