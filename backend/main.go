package main

import (
	"host-win-backend/config"
	"host-win-backend/routes"
	"log"
	"net/http"
)

// CORSMiddleware adds CORS headers to responses
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	config.ConnectDB()

	// Register all API routes.
	routes.Register()

	log.Println("Server running on port 8080")
	http.ListenAndServe(":8080", CORSMiddleware(http.DefaultServeMux))
}
