package models

import (
	"encoding/json"
	"time"
)

// ActivityLog stores a security-relevant event for auditing.
type ActivityLog struct {
	ID              int             `json:"id"`
	EventType       string          `json:"event_type"`
	ActorType       string          `json:"actor_type"`
	ActorIdentifier string          `json:"actor_identifier"`
	VisitorID       *int            `json:"visitor_id,omitempty"`
	Severity        string          `json:"severity"`
	Message         string          `json:"message"`
	Metadata        json.RawMessage `json:"metadata"`
	IPAddress       string          `json:"ip_address"`
	UserAgent       string          `json:"user_agent"`
	CreatedAt       time.Time       `json:"created_at"`
}
