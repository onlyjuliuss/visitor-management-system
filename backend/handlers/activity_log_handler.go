package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"host-win-backend/services"
)

// GetRecentActivityLogsHandler handles GET /api/activity-logs/recent?limit=50
func GetRecentActivityLogsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	limit := 50
	if raw := r.URL.Query().Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			http.Error(w, "limit must be a positive integer", http.StatusBadRequest)
			return
		}
		limit = parsed
	}

	logs, err := services.GetRecentActivityLogs(r.Context(), limit)
	if err != nil {
		log.Printf("[ACTIVITY] GetRecentActivityLogs handler: %v", err)
		WriteJSONError(w, http.StatusInternalServerError, "could not fetch activity logs")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"logs":  logs,
		"count": len(logs),
	}); err != nil {
		log.Println("encode recent activity logs response error:", err)
	}
}
