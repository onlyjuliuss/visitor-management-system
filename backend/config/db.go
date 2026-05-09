package config

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
)

var DB *sql.DB

const (
	defaultLocalFallback = "postgres://postgres:selasie@localhost:5432/hostel_vms?sslmode=disable"
	pingTimeout          = 15 * time.Second
)

// FinalizeDatabaseURL ensures sslmode is set when absent: disable for localhost,
// require for remote hosts (matches pushschema / Supabase expectations).
func FinalizeDatabaseURL(connStr string) string {
	if strings.Contains(connStr, "sslmode=") {
		return connStr
	}
	u, err := url.Parse(connStr)
	if err != nil {
		// Non-URL libpq-style DSNs: cannot append query params safely.
		return connStr
	}
	q := u.Query()
	host := strings.ToLower(u.Hostname())
	if host == "localhost" || host == "127.0.0.1" || host == "::1" {
		q.Set("sslmode", "disable")
	} else {
		q.Set("sslmode", "require")
	}
	u.RawQuery = q.Encode()
	return u.String()
}

// SanitizedDatabaseTarget returns host, port, user, db name for logs (no password).
func SanitizedDatabaseTarget(connStr string) string {
	u, err := url.Parse(connStr)
	if err != nil {
		return "(could not parse DATABASE_URL)"
	}
	user := ""
	if u.User != nil {
		user = u.User.Username()
	}
	dbName := strings.TrimPrefix(u.Path, "/")
	if dbName == "" {
		dbName = "(no database in path)"
	}
	host := u.Host
	if host == "" {
		host = "(no host)"
	}
	scheme := u.Scheme
	if scheme == "" {
		scheme = "postgres"
	}
	return fmt.Sprintf("%s://%s@%s/%s", scheme, user, host, dbName)
}

func simpleProtocolFromEnv() bool {
	v := strings.TrimSpace(strings.ToLower(os.Getenv("DB_SIMPLE_PROTOCOL")))
	return v == "1" || v == "true" || v == "yes"
}

// OpenPostgres builds a *sql.DB using pgx stdlib (better compatibility with Supabase pooler
// than lib/pq). Pass the full connection string (after FinalizeDatabaseURL).
func OpenPostgres(ctx context.Context, connStr string) (*sql.DB, error) {
	cfg, err := pgx.ParseConfig(connStr)
	if err != nil {
		return nil, fmt.Errorf("pgx parse config: %w", err)
	}
	if simpleProtocolFromEnv() {
		cfg.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
		log.Println("[DB] default_query_exec_mode=simple_protocol (DB_SIMPLE_PROTOCOL=true)")
	}

	db := stdlib.OpenDB(*cfg)
	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(2)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(1 * time.Minute)

	pingCtx, cancel := context.WithTimeout(ctx, pingTimeout)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return db, nil
}

// ConnectDB initializes the global DB from DATABASE_URL (or local fallback).
func ConnectDB() {
	raw := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	usingFallback := raw == ""
	if usingFallback {
		raw = defaultLocalFallback
		log.Printf("[DB] DATABASE_URL is empty; using local fallback target %s", SanitizedDatabaseTarget(raw))
	}

	final := FinalizeDatabaseURL(raw)

	if strings.Contains(strings.ToLower(final), "pooler.supabase.com") {
		log.Println("[DB] Supabase pooler detected. If you see prepared statement errors (26000) or protocol errors (08P01), use the direct DB host from Supabase or set DB_SIMPLE_PROTOCOL=true.")
	}

	log.Printf("[DB] connecting to %s (driver=pgx/stdlib)", SanitizedDatabaseTarget(final))

	db, err := OpenPostgres(context.Background(), final)
	if err != nil {
		log.Fatalf("[DB] could not connect: %v", err)
	}

	DB = db
	log.Println("[DB] database connected and ping succeeded")
}
