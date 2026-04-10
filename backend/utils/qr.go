package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/skip2/go-qrcode"
)

// GenerateQRCodeValue creates a unique QR code string and generates an image file
// Returns: (qr_code_string, qr_image_path, error)
func GenerateQRCodeValue() (string, string, error) {
	// Create qrcodes directory if it doesn't exist
	if err := os.MkdirAll("qrcodes", 0755); err != nil {
		return "", "", fmt.Errorf("create qrcodes dir: %w", err)
	}

	// Generate unique QR code value
	timestamp := time.Now().UnixNano()
	qrValue := fmt.Sprintf("V-%d", timestamp)

	// Generate QR code image
	qrImagePath := filepath.Join("qrcodes", fmt.Sprintf("%d.png", timestamp))

	err := qrcode.WriteFile(qrValue, qrcode.Medium, 256, qrImagePath)
	if err != nil {
		return "", "", fmt.Errorf("generate qr code image: %w", err)
	}

	return qrValue, qrImagePath, nil
}
