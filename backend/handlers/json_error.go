package handlers

import (
	"encoding/json"
	"net/http"
)

// WriteJSONError writes a JSON body {"error": "..."} with the given HTTP status.
func WriteJSONError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
