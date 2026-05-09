package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"host-win-backend/config"
	"host-win-backend/utils"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	url := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if url == "" {
		log.Fatal("DATABASE_URL is not set (expected in backend/.env)")
	}
	finalURL := config.FinalizeDatabaseURL(url)
	log.Printf("pushschema: target %s", config.SanitizedDatabaseTarget(finalURL))

	migrationFiles, err := filepath.Glob("migrations/*.sql")
	if err != nil {
		log.Fatalf("list migrations: %v", err)
	}
	if len(migrationFiles) == 0 {
		log.Fatal("no migration files found in migrations/")
	}
	sort.Strings(migrationFiles)
	log.Printf("pushschema: applying %d migration file(s) in sorted order:", len(migrationFiles))
	for _, p := range migrationFiles {
		log.Printf("pushschema:   - %s", p)
	}

	db, err := config.OpenPostgres(context.Background(), finalURL)
	if err != nil {
		log.Printf("open/ping db: %v", err)
		if strings.Contains(err.Error(), "no such host") || strings.Contains(err.Error(), "lookup ") {
			log.Print("hint: Supabase \"Direct connection\" hosts are often IPv6-only. Use the \"Session pooler\" URI from Project Settings → Database (host like *.pooler.supabase.com:5432, user postgres.<project-ref>) so traffic goes over IPv4, then retry.")
		}
		os.Exit(1)
	}
	defer db.Close()

	for _, migrationPath := range migrationFiles {
		log.Printf("pushschema: applying %s", migrationPath)
		sqlBytes, err := os.ReadFile(migrationPath)
		if err != nil {
			log.Fatalf("read migration %s: %v", migrationPath, err)
		}

		for _, raw := range strings.Split(string(sqlBytes), ";") {
			stmt := stripSQLComments(raw)
			stmt = strings.TrimSpace(stmt)
			if stmt == "" {
				continue
			}
			if _, err := db.Exec(stmt); err != nil {
				log.Fatalf("exec failed (%s): %v\n\n---- SQL ----\n%s\n------------", migrationPath, err, stmt)
			}
		}
		fmt.Printf("OK: applied %s\n", migrationPath)
	}

	// Backfill qr_token_hash for legacy rows where only qr_code exists.
	rows, err := db.Query(`
		SELECT id, qr_code
		FROM visitors
		WHERE qr_token_hash IS NULL
		  AND COALESCE(qr_code, '') <> ''
	`)
	if err != nil {
		log.Fatalf("query legacy qr rows for backfill: %v", err)
	}
	defer rows.Close()

	backfilled := 0
	for rows.Next() {
		var (
			id     int
			qrCode string
		)
		if err := rows.Scan(&id, &qrCode); err != nil {
			log.Fatalf("scan legacy qr row: %v", err)
		}
		hash := utils.HashSecureQRToken(qrCode)
		if _, err := db.Exec(`UPDATE visitors SET qr_token_hash = $1 WHERE id = $2`, hash, id); err != nil {
			log.Fatalf("backfill qr_token_hash for visitor %d: %v", id, err)
		}
		backfilled++
	}
	if err := rows.Err(); err != nil {
		log.Fatalf("iterate legacy qr rows: %v", err)
	}
	fmt.Printf("OK: backfilled qr_token_hash for %d legacy visitors\n", backfilled)
}

func stripSQLComments(block string) string {
	var out []string
	for _, line := range strings.Split(block, "\n") {
		t := strings.TrimSpace(line)
		if t == "" || strings.HasPrefix(t, "--") {
			continue
		}
		out = append(out, line)
	}
	return strings.Join(out, "\n")
}
