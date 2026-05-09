package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"host-win-backend/config"
	"host-win-backend/models"
)

// NotificationService handles automated notifications
type NotificationService struct {
	ctx context.Context
}

// NewNotificationService creates a new notification service
func NewNotificationService(ctx context.Context) *NotificationService {
	return &NotificationService{ctx: ctx}
}

// SendSignOutReminders checks for visitors who need sign-out reminders and sends SMS
func (ns *NotificationService) SendSignOutReminders() error {
	log.Println("[NOTIFICATION] Checking for visitors needing sign-out reminders")

	// Get current time
	now := time.Now()

	// Only send reminders at 8 PM
	if now.Hour() != 20 {
		log.Println("[NOTIFICATION] Not 8 PM yet, skipping reminders")
		return nil
	}

	// Query for visitors who are still signed in
	query := `
		SELECT id, full_name, phone, sign_in_time
		FROM visitors
		WHERE status = 'in'
		AND sign_in_time::date = CURRENT_DATE
	`

	rows, err := config.DB.QueryContext(ns.ctx, query)
	if err != nil {
		return fmt.Errorf("failed to query visitors needing reminders: %w", err)
	}
	defer rows.Close()

	var remindersSent int
	for rows.Next() {
		var visitor models.Visitor
		if err := rows.Scan(&visitor.ID, &visitor.FullName, &visitor.Phone, &visitor.SignInTime); err != nil {
			log.Printf("[NOTIFICATION] Error scanning visitor: %v", err)
			continue
		}

		// Send SMS reminder
		if err := SendSignOutReminder(visitor.Phone); err != nil {
			log.Printf("[NOTIFICATION] Failed to send reminder to %s (%s): %v", visitor.FullName, visitor.Phone, err)
			if logErr := LogVisitorEvent(ns.ctx, "reminder.send.failed", visitor.ID, "warning", "scheduled sign-out reminder failed", map[string]interface{}{
				"phone": visitor.Phone,
				"error": err.Error(),
			}); logErr != nil {
				log.Printf("[ACTIVITY] Failed to persist reminder failure activity log: %v", logErr)
			}
		} else {
			log.Printf("[NOTIFICATION] Reminder sent to %s (%s)", visitor.FullName, visitor.Phone)
			remindersSent++
			if logErr := LogVisitorEvent(ns.ctx, "reminder.send.success", visitor.ID, "info", "scheduled sign-out reminder sent", map[string]interface{}{
				"phone": visitor.Phone,
			}); logErr != nil {
				log.Printf("[ACTIVITY] Failed to persist reminder success activity log: %v", logErr)
			}
		}
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("error iterating visitors: %w", err)
	}

	log.Printf("[NOTIFICATION] Sent %d sign-out reminders", remindersSent)
	return nil
}

// StartScheduler starts the notification scheduler
func (ns *NotificationService) StartScheduler() {
	log.Println("[NOTIFICATION] Starting notification scheduler")

	ticker := time.NewTicker(1 * time.Hour) // Check every hour
	defer ticker.Stop()

	// Run initial check
	if err := ns.SendSignOutReminders(); err != nil {
		log.Printf("[NOTIFICATION] Error in initial reminder check: %v", err)
	}

	for {
		select {
		case <-ns.ctx.Done():
			log.Println("[NOTIFICATION] Stopping notification scheduler")
			return
		case <-ticker.C:
			if err := ns.SendSignOutReminders(); err != nil {
				log.Printf("[NOTIFICATION] Error sending reminders: %v", err)
			}
		}
	}
}

// GetVisitorsNeedingReminders returns visitors who should receive reminders (for testing/debugging)
func GetVisitorsNeedingReminders(ctx context.Context) ([]models.Visitor, error) {
	query := `
		SELECT id, full_name, phone, sign_in_time
		FROM visitors
		WHERE status = 'in'
		AND sign_in_time::date = CURRENT_DATE
	`

	rows, err := config.DB.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query visitors: %w", err)
	}
	defer rows.Close()

	var visitors []models.Visitor
	for rows.Next() {
		var visitor models.Visitor
		if err := rows.Scan(&visitor.ID, &visitor.FullName, &visitor.Phone, &visitor.SignInTime); err != nil {
			continue
		}
		visitors = append(visitors, visitor)
	}

	return visitors, rows.Err()
}
