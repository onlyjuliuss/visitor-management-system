package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"host-win-backend/services"
)

// GetRiskSummaryHandler handles GET /api/security/risk-summary
func GetRiskSummaryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	summary, err := services.GetRiskSummary(r.Context())
	if err != nil {
		log.Printf("[SECURITY] GetRiskSummary handler: %v", err)
		WriteJSONError(w, http.StatusInternalServerError, "could not fetch risk summary")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(summary)
}

// GetHighRiskVisitorsHandler handles GET /api/security/high-risk-visitors?limit=10
func GetHighRiskVisitorsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	limit := 10
	if raw := r.URL.Query().Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			http.Error(w, "limit must be a positive integer", http.StatusBadRequest)
			return
		}
		limit = parsed
	}

	visitors, err := services.GetHighRiskVisitors(r.Context(), limit)
	if err != nil {
		log.Printf("[SECURITY] GetHighRiskVisitors handler: %v", err)
		WriteJSONError(w, http.StatusInternalServerError, "could not fetch high risk visitors")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"visitors": visitors,
		"count":    len(visitors),
	})
}

// RecalculateRisksHandler handles POST /api/security/recalculate-risks
func RecalculateRisksHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	updated, err := services.RecalculateActiveVisitorRisks(r.Context())
	if err != nil {
		log.Printf("[SECURITY] RecalculateActiveVisitorRisks: %v", err)
		WriteJSONError(w, http.StatusInternalServerError, "could not recalculate risks")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":        "ok",
		"updated_count": updated,
	})
}
