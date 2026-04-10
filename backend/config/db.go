package config

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func ConnectDB() {
	// 1. Read connection string from env, fall back to a default.
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		// CHANGE these values to match your local PostgreSQL setup.
		connStr = "postgres://postgres:selasie@localhost:5432/hostel_vms?sslmode=disable"
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Error opening DB:", err)
	}

	// 2. Verify the connection is actually alive.
	if err := db.Ping(); err != nil {
		log.Fatal("Error pinging DB:", err)
	}

	DB = db
	log.Println("Database connected")
}