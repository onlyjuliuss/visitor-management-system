package main

import (
	"context"
	"host-win-backend/config"
	"host-win-backend/routes"
	"host-win-backend/services"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
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
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file loaded; using system environment variables")
	}

	config.ConnectDB()

	// Register all API routes.
	routes.Register()

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start notification service
	notificationService := services.NewNotificationService(ctx)
	go notificationService.StartScheduler()

	// Setup graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		log.Println("Shutting down server...")
		cancel()
		time.Sleep(2 * time.Second) // Give services time to cleanup
		os.Exit(0)
	}()

	log.Println("Server running on port 8080")
	log.Println("Notification service started - reminders will be sent at 8 PM daily")
	http.ListenAndServe(":8080", CORSMiddleware(http.DefaultServeMux))
}
