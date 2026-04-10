package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"host-win-backend/services"
)

// AdminLoginHandler handles POST /api/admin/login
func AdminLoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req services.AdminLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("[ADMIN] Login decode error:", err)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Username == "" || req.Password == "" {
		http.Error(w, "username and password are required", http.StatusBadRequest)
		return
	}

	// Authenticate and get token
	response, err := services.LoginAdmin(req.Username, req.Password)
	if err != nil {
		log.Println("[ADMIN] Login failed:", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	log.Printf("[ADMIN] User %s logged in successfully\n", req.Username)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
