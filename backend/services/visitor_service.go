package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"time"

	"host-win-backend/config"
	"host-win-backend/models"
	"host-win-backend/utils"
)

// SavePhoto saves an uploaded photo file to disk and returns the path
func SavePhoto(file io.Reader, originalFilename string) (string, error) {
	// Create uploads directory if it doesn't exist
	if err := os.MkdirAll("uploads", 0755); err != nil {
		return "", fmt.Errorf("create uploads dir: %w", err)
	}

	// Generate unique filename using timestamp
	timestamp := time.Now().UnixNano()
	filename := fmt.Sprintf("%d_%s", timestamp, originalFilename)
	filePath := filepath.Join("uploads", filename)

	// Create file on disk
	out, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("create file: %w", err)
	}
	defer out.Close()

	// Copy uploaded file to disk
	if _, err := io.Copy(out, file); err != nil {
		os.Remove(filePath) // Clean up on error
		return "", fmt.Errorf("save file: %w", err)
	}

	// Return relative path for database
	return filepath.Join("uploads", filename), nil
}

// CreateVisitor handles the core sign-in logic:
// - generate a QR code string
// - insert a new visitor row
// - return the saved visitor
func CreateVisitor(ctx context.Context, req models.VisitorSignInRequest) (*models.Visitor, error) {
	normalizedPhone, err := NormalizePhoneNumber(req.Phone)
	if err != nil {
		return nil, fmt.Errorf("create visitor phone validation: %w", err)
	}

	qrValue, _, err := utils.GenerateQRCodeValue()
	if err != nil {
		return nil, fmt.Errorf("create visitor: %w", err)
	}

	const query = `
		INSERT INTO visitors (full_name, phone, email, purpose, host_name, photo_url, qr_code, sign_in_time, sign_out_time, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NULL, 'in')
		RETURNING id, full_name, phone, email, purpose, host_name,
		          sign_in_time, sign_out_time, photo_url, qr_code, status
	`

	row := config.DB.QueryRowContext(
		ctx,
		query,
		req.FullName,
		normalizedPhone,
		req.Email,
		req.Purpose,
		req.HostName,
		req.PhotoURL,
		qrValue,
	)

	var v models.Visitor
	if err := row.Scan(
		&v.ID,
		&v.FullName,
		&v.Phone,
		&v.Email,
		&v.Purpose,
		&v.HostName,
		&v.SignInTime,
		&v.SignOutTime,
		&v.PhotoURL,
		&v.QRCode,
		&v.Status,
	); err != nil {
		return nil, fmt.Errorf("create visitor scan: %w", err)
	}

	return &v, nil
}

// Sentinel errors returned by SignOutVisitor so handlers can map to HTTP codes.
var (
	ErrNotFound         = errors.New("visitor not found")
	ErrAlreadySignedOut = errors.New("visitor already signed out")
)

// SignOutVisitor marks a visitor as 'out' and records sign_out_time.
// It only allows sign-out when the current status is 'in' (case-insensitive).
func SignOutVisitor(ctx context.Context, id int) (*models.Visitor, error) {
	log.Printf("[SERVICE] SignOutVisitor called with ID: %d\n", id)

	const updateQuery = `
		UPDATE visitors
		SET status = 'out', sign_out_time = NOW()
		WHERE id = $1 AND (status = 'in' OR status = 'IN')
		RETURNING id, full_name, phone, email, purpose, host_name,
				  sign_in_time, sign_out_time, photo_url, qr_code, status
	`

	log.Printf("[SERVICE] Executing UPDATE query for visitor ID: %d\n", id)
	row := config.DB.QueryRowContext(ctx, updateQuery, id)
	var v models.Visitor
	if err := row.Scan(
		&v.ID,
		&v.FullName,
		&v.Phone,
		&v.Email,
		&v.Purpose,
		&v.HostName,
		&v.SignInTime,
		&v.SignOutTime,
		&v.PhotoURL,
		&v.QRCode,
		&v.Status,
	); err != nil {
		log.Printf("[SERVICE] Scan error for ID %d: %v\n", id, err)
		if err == sql.ErrNoRows {
			// Determine whether the visitor doesn't exist or is already signed out.
			log.Printf("[SERVICE] No rows affected. Checking if visitor exists...\n")
			var exists bool
			var currentStatus string
			err2 := config.DB.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM visitors WHERE id=$1), COALESCE((SELECT status FROM visitors WHERE id=$1), 'N/A') AS status", id).Scan(&exists, &currentStatus)
			if err2 != nil {
				log.Printf("[SERVICE] Existence check error: %v\n", err2)
				return nil, fmt.Errorf("sign-out existence check: %w", err2)
			}
			log.Printf("[SERVICE] Visitor exists: %v, Current status: %s\n", exists, currentStatus)
			if !exists {
				log.Printf("[SERVICE] Visitor ID %d does not exist\n", id)
				return nil, ErrNotFound
			}
			log.Printf("[SERVICE] Visitor ID %d already signed out (status: %s)\n", id, currentStatus)
			return nil, ErrAlreadySignedOut
		}
		return nil, fmt.Errorf("sign-out scan: %w", err)
	}

	log.Printf("[SERVICE] Successfully signed out visitor ID: %d, new status: %s\n", v.ID, v.Status)
	return &v, nil
}

// SignOutVisitorByQRCode marks a visitor as 'out' by QR code and records sign_out_time.
// It only allows sign-out when the current status is 'in' (case-insensitive).
func SignOutVisitorByQRCode(ctx context.Context, qrCode string) (*models.Visitor, error) {
	log.Printf("[SERVICE] SignOutVisitorByQRCode called with QR: %s\n", qrCode)

	const updateQuery = `
		UPDATE visitors
		SET status = 'out', sign_out_time = NOW()
		WHERE qr_code = $1 AND (status = 'in' OR status = 'IN')
		RETURNING id, full_name, phone, email, purpose, host_name,
				  sign_in_time, sign_out_time, photo_url, qr_code, status
	`

	row := config.DB.QueryRowContext(ctx, updateQuery, qrCode)
	var v models.Visitor
	if err := row.Scan(
		&v.ID,
		&v.FullName,
		&v.Phone,
		&v.Email,
		&v.Purpose,
		&v.HostName,
		&v.SignInTime,
		&v.SignOutTime,
		&v.PhotoURL,
		&v.QRCode,
		&v.Status,
	); err != nil {
		if err == sql.ErrNoRows {
			// Determine whether the visitor doesn't exist or is already signed out.
			var exists bool
			var currentStatus string
			err2 := config.DB.QueryRowContext(
				ctx,
				"SELECT EXISTS(SELECT 1 FROM visitors WHERE qr_code=$1), COALESCE((SELECT status FROM visitors WHERE qr_code=$1), 'N/A') AS status",
				qrCode,
			).Scan(&exists, &currentStatus)
			if err2 != nil {
				return nil, fmt.Errorf("sign-out qr existence check: %w", err2)
			}
			if !exists {
				return nil, ErrNotFound
			}
			return nil, ErrAlreadySignedOut
		}
		return nil, fmt.Errorf("sign-out qr scan: %w", err)
	}

	log.Printf("[SERVICE] Successfully signed out visitor by QR, ID: %d, new status: %s\n", v.ID, v.Status)
	return &v, nil
}

// GetAllVisitors returns all visitors from the database.
func GetAllVisitors(ctx context.Context) ([]models.Visitor, error) {
	const query = `
		SELECT id, full_name, phone, email, purpose, host_name,
		       sign_in_time, sign_out_time, photo_url, qr_code, status
		FROM visitors
		ORDER BY sign_in_time DESC
	`

	rows, err := config.DB.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("get all visitors query: %w", err)
	}
	defer rows.Close()

	var visitors []models.Visitor
	for rows.Next() {
		var v models.Visitor
		if err := rows.Scan(
			&v.ID, &v.FullName, &v.Phone, &v.Email, &v.Purpose, &v.HostName,
			&v.SignInTime, &v.SignOutTime, &v.PhotoURL, &v.QRCode, &v.Status,
		); err != nil {
			return nil, fmt.Errorf("get all visitors scan: %w", err)
		}
		visitors = append(visitors, v)
	}

	return visitors, rows.Err()
}

// GetVisitorByID returns a single visitor by ID.
func GetVisitorByID(ctx context.Context, id int) (*models.Visitor, error) {
	const query = `
		SELECT id, full_name, phone, email, purpose, host_name,
		       sign_in_time, sign_out_time, photo_url, qr_code, status
		FROM visitors
		WHERE id = $1
	`

	row := config.DB.QueryRowContext(ctx, query, id)
	var v models.Visitor
	if err := row.Scan(
		&v.ID, &v.FullName, &v.Phone, &v.Email, &v.Purpose, &v.HostName,
		&v.SignInTime, &v.SignOutTime, &v.PhotoURL, &v.QRCode, &v.Status,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get visitor by id: %w", err)
	}

	return &v, nil
}

// GetVisitorsByStatus returns all visitors with a specific status ('in' or 'out').
func GetVisitorsByStatus(ctx context.Context, status string) ([]models.Visitor, error) {
	const query = `
		SELECT id, full_name, phone, email, purpose, host_name,
		       sign_in_time, sign_out_time, photo_url, qr_code, status
		FROM visitors
		WHERE LOWER(status) = LOWER($1)
		ORDER BY sign_in_time DESC
	`

	rows, err := config.DB.QueryContext(ctx, query, status)
	if err != nil {
		return nil, fmt.Errorf("get visitors by status query: %w", err)
	}
	defer rows.Close()

	var visitors []models.Visitor
	for rows.Next() {
		var v models.Visitor
		if err := rows.Scan(
			&v.ID, &v.FullName, &v.Phone, &v.Email, &v.Purpose, &v.HostName,
			&v.SignInTime, &v.SignOutTime, &v.PhotoURL, &v.QRCode, &v.Status,
		); err != nil {
			return nil, fmt.Errorf("get visitors by status scan: %w", err)
		}
		visitors = append(visitors, v)
	}

	return visitors, rows.Err()
}

// UpdateVisitor updates a visitor's details.
func UpdateVisitor(ctx context.Context, id int, req models.VisitorUpdateRequest) (*models.Visitor, error) {
	const query = `
		UPDATE visitors
		SET full_name = COALESCE(NULLIF($1, ''), full_name),
		    phone = COALESCE(NULLIF($2, ''), phone),
		    email = COALESCE(NULLIF($3, ''), email),
		    purpose = COALESCE(NULLIF($4, ''), purpose),
		    host_name = COALESCE(NULLIF($5, ''), host_name),
		    photo_url = COALESCE(NULLIF($6, ''), photo_url)
		WHERE id = $7
		RETURNING id, full_name, phone, email, purpose, host_name,
		          sign_in_time, sign_out_time, photo_url, qr_code, status
	`

	row := config.DB.QueryRowContext(ctx, query, req.FullName, req.Phone, req.Email, req.Purpose, req.HostName, req.PhotoURL, id)
	var v models.Visitor
	if err := row.Scan(
		&v.ID, &v.FullName, &v.Phone, &v.Email, &v.Purpose, &v.HostName,
		&v.SignInTime, &v.SignOutTime, &v.PhotoURL, &v.QRCode, &v.Status,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("update visitor: %w", err)
	}

	return &v, nil
}

// DeleteVisitor removes a visitor record by ID.
func DeleteVisitor(ctx context.Context, id int) error {
	const query = `DELETE FROM visitors WHERE id = $1`
	result, err := config.DB.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete visitor: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("delete visitor rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

// GetVisitorStats returns statistics about visitor sign-ins/outs for today.
func GetVisitorStats(ctx context.Context) (*models.VisitorStats, error) {
	const query = `
		SELECT
			COUNT(*) FILTER (WHERE DATE(sign_in_time) = CURRENT_DATE) as total_today,
			COUNT(*) FILTER (WHERE DATE(sign_in_time) = CURRENT_DATE AND status = 'in') as signed_in,
			COUNT(*) FILTER (WHERE DATE(sign_in_time) = CURRENT_DATE AND status = 'out') as signed_out
		FROM visitors
	`

	row := config.DB.QueryRowContext(ctx, query)
	var stats models.VisitorStats
	if err := row.Scan(&stats.TotalVisitors, &stats.CurrentlySignedIn, &stats.TotalSignedOut); err != nil {
		return nil, fmt.Errorf("get visitor stats: %w", err)
	}

	return &stats, nil
}
