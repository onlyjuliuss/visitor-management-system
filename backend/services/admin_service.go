package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	// Admin credentials - in production, these would be in a database
	AdminUsername = "admin"
	AdminPassword = "admin123"
	
	// JWT secret key - in production, use a strong random key from environment
	JWTSecretKey = "your-secret-key-change-this-in-production"
	
	// Token expiration time
	TokenExpiration = 24 * time.Hour
)

// AdminLoginRequest represents the login payload
type AdminLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// AdminLoginResponse represents the login response with JWT token
type AdminLoginResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}

// TokenClaims represents JWT token claims
type TokenClaims struct {
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// LoginAdmin validates credentials and returns a JWT token
func LoginAdmin(username, password string) (*AdminLoginResponse, error) {
	// Validate credentials
	if username != AdminUsername || password != AdminPassword {
		return nil, errors.New("invalid username or password")
	}

	// Create token claims
	expiresAt := time.Now().Add(TokenExpiration)
	claims := TokenClaims{
		Username: username,
		Role:     "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "visitor-management-system",
		},
	}

	// Generate token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(JWTSecretKey))
	if err != nil {
		return nil, fmt.Errorf("failed to sign token: %w", err)
	}

	return &AdminLoginResponse{
		Token:     tokenString,
		ExpiresAt: expiresAt,
	}, nil
}

// ValidateToken verifies and parses a JWT token
func ValidateToken(tokenString string) (*TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(JWTSecretKey), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*TokenClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}

	return claims, nil
}
