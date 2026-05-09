package routes

import (
	"host-win-backend/handlers"
	"host-win-backend/middleware"
	"net/http"
)

// Register attaches all HTTP routes to the default http mux.
func Register() {
	// Admin routes
	http.HandleFunc("/api/admin/login", handlers.AdminLoginHandler)

	// Visitor routes
	http.HandleFunc("/api/visitors", middleware.AdminAuthMiddleware(handlers.GetAllVisitorsHandler))
	http.HandleFunc("/api/visitors/", middleware.AdminAuthMiddleware(handlers.GetVisitorByIDHandler))
	http.HandleFunc("/api/visitors/sign-in", handlers.VisitorSignInHandler)
	http.HandleFunc("/api/visitors/sign-out", middleware.AdminAuthMiddleware(handlers.VisitorSignOutHandler))
	http.HandleFunc("/api/visitors/stats", middleware.AdminAuthMiddleware(handlers.GetVisitorStatsHandler))
	http.HandleFunc("/api/visitors/status/", middleware.AdminAuthMiddleware(handlers.GetVisitorsByStatusHandler))
	http.HandleFunc("/api/visitors/send-reminder", middleware.AdminAuthMiddleware(handlers.SendReminderHandler))

	// Notification routes
	http.HandleFunc("/api/notifications/test-reminder", middleware.AdminAuthMiddleware(handlers.SendTestReminderHandler))
	http.HandleFunc("/api/notifications/visitors-needing-reminders", middleware.AdminAuthMiddleware(handlers.GetVisitorsNeedingRemindersHandler))

	// Activity log routes
	http.HandleFunc("/api/activity-logs/recent", middleware.AdminAuthMiddleware(handlers.GetRecentActivityLogsHandler))

	// Security risk routes
	http.HandleFunc("/api/security/risk-summary", middleware.AdminAuthMiddleware(handlers.GetRiskSummaryHandler))
	http.HandleFunc("/api/security/high-risk-visitors", middleware.AdminAuthMiddleware(handlers.GetHighRiskVisitorsHandler))
	http.HandleFunc("/api/security/recalculate-risks", middleware.AdminAuthMiddleware(handlers.RecalculateRisksHandler))

	// File serving routes
	http.HandleFunc("/api/photos/", middleware.AdminAuthMiddleware(handlers.ServePhotoHandler))
	http.HandleFunc("/api/qrcodes/", middleware.AdminAuthMiddleware(handlers.ServeQRHandler))
}
