package middleware

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"host-win-backend/services"
)

// AdminAuthMiddleware wraps an HTTP handler and checks for valid JWT token
func AdminAuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			log.Println("[AUTH] Missing Authorization header")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "missing authorization header"})
			return
		}

		// Extract Bearer token
		const bearerPrefix = "Bearer "
		if !strings.HasPrefix(authHeader, bearerPrefix) {
			log.Println("[AUTH] Invalid Authorization header format")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid authorization header format"})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, bearerPrefix)

		// Validate token
		claims, err := services.ValidateToken(tokenString)
		if err != nil {
			log.Printf("[AUTH] Token validation failed: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid or expired token"})
			return
		}

		log.Printf("[AUTH] Token valid for user: %s with role: %s\n", claims.Username, claims.Role)

		// Store claims in request context for use in handlers
		ctx := context.WithValue(r.Context(), "admin_claims", claims)
		wrappedRequest := r.WithContext(ctx)

		// Call the next handler with the wrapped request
		next(w, wrappedRequest)
	}
}
