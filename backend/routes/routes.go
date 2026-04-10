package routes

import (
	"host-win-backend/handlers"
	"net/http"
)

// Register attaches all HTTP routes to the default http mux.
func Register() {
	// Admin routes
	http.HandleFunc("/api/admin/login", handlers.AdminLoginHandler)

	// Visitor routes
	http.HandleFunc("/api/visitors", handlers.GetAllVisitorsHandler)
	http.HandleFunc("/api/visitors/", handlers.GetVisitorByIDHandler)
	http.HandleFunc("/api/visitors/sign-in", handlers.VisitorSignInHandler)
	http.HandleFunc("/api/visitors/sign-out", handlers.VisitorSignOutHandler)
	http.HandleFunc("/api/visitors/stats", handlers.GetVisitorStatsHandler)

	// File serving routes
	http.HandleFunc("/api/photos/", handlers.ServePhotoHandler)
	http.HandleFunc("/api/qrcodes/", handlers.ServeQRHandler)
}
