package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"host-win-backend/services"
)

// SendTestReminderHandler sends a test reminder SMS (for testing purposes)
func SendTestReminderHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Phone string `json:"phone"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("[NOTIFICATION] Test reminder decode error:", err)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Phone == "" {
		http.Error(w, "phone is required", http.StatusBadRequest)
		return
	}

	if err := services.SendSignOutReminder(req.Phone); err != nil {
		log.Printf("[NOTIFICATION] Test reminder failed for %s: %v", req.Phone, err)
		http.Error(w, "failed to send test reminder", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Test reminder sent successfully",
	})
}

// GetVisitorsNeedingRemindersHandler returns visitors who would receive reminders
func GetVisitorsNeedingRemindersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	visitors, err := services.GetVisitorsNeedingReminders(r.Context())
	if err != nil {
		log.Println("[NOTIFICATION] Get visitors needing reminders error:", err)
		http.Error(w, "failed to fetch visitors", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"visitors": visitors,
		"count":    len(visitors),
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Println("[NOTIFICATION] Encode response error:", err)
	}
}
