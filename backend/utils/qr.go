package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/skip2/go-qrcode"
)

const SecureQRPrefix = "ACITYPASS:"

// HashSecureQRToken returns the SHA-256 hash for raw secure QR token.
func HashSecureQRToken(rawToken string) string {
	sum := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(sum[:])
}

func randomHex(nBytes int) (string, error) {
	buf := make([]byte, nBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

// GenerateSecureQRCodeValue creates a cryptographically secure QR token and image.
// Returns: (raw_qr_value, qr_token_hash, qr_image_path, error)
func GenerateSecureQRCodeValue() (string, string, string, error) {
	// Create qrcodes directory if it doesn't exist
	if err := os.MkdirAll("qrcodes", 0755); err != nil {
		return "", "", "", fmt.Errorf("create qrcodes dir: %w", err)
	}

	// 32 random bytes -> 64-char hex token.
	tokenHex, err := randomHex(32)
	if err != nil {
		return "", "", "", fmt.Errorf("generate secure qr token: %w", err)
	}
	qrValue := SecureQRPrefix + tokenHex
	qrHash := HashSecureQRToken(qrValue)

	// Generate QR code image
	filenameSeed, err := randomHex(8)
	if err != nil {
		return "", "", "", fmt.Errorf("generate qr filename seed: %w", err)
	}
	qrImagePath := filepath.Join("qrcodes", fmt.Sprintf("%d_%s.png", time.Now().UnixNano(), filenameSeed))

	err = qrcode.WriteFile(qrValue, qrcode.Medium, 256, qrImagePath)
	if err != nil {
		return "", "", "", fmt.Errorf("generate qr code image: %w", err)
	}

	return qrValue, qrHash, qrImagePath, nil
}
