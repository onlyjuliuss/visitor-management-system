package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	_ = godotenv.Load()

	url := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if url == "" {
		log.Fatal("DATABASE_URL is not set (expected in backend/.env)")
	}
	if !strings.Contains(url, "sslmode=") {
		if strings.Contains(url, "?") {
			url += "&sslmode=require"
		} else {
			url += "?sslmode=require"
		}
	}

	sqlBytes, err := os.ReadFile("migrations/001_init_visitors.sql")
	if err != nil {
		log.Fatalf("read migration: %v", err)
	}

	db, err := sql.Open("postgres", url)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Printf("ping db: %v", err)
		if strings.Contains(err.Error(), "no such host") || strings.Contains(err.Error(), "lookup ") {
			log.Print("hint: Supabase \"Direct connection\" hosts are often IPv6-only. Use the \"Session pooler\" URI from Project Settings → Database (host like *.pooler.supabase.com:5432, user postgres.<project-ref>) so traffic goes over IPv4, then retry.")
		}
		os.Exit(1)
	}

	for _, raw := range strings.Split(string(sqlBytes), ";") {
		stmt := stripSQLComments(raw)
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		if _, err := db.Exec(stmt); err != nil {
			log.Fatalf("exec failed: %v\n\n---- SQL ----\n%s\n------------", err, stmt)
		}
	}

	fmt.Println("OK: applied migrations/001_init_visitors.sql to DATABASE_URL")
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
