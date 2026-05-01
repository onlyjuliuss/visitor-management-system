package services

import (
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

func getEnvAny(keys ...string) string {
	for _, key := range keys {
		v := strings.TrimSpace(os.Getenv(key))
		if v != "" {
			return v
		}
	}
	return ""
}

// NormalizePhoneNumber converts common Ghana number formats to E.164.
// Supported inputs include:
// - 0551234567
// - 233551234567
// - +233551234567
func NormalizePhoneNumber(raw string) (string, error) {
	phone := strings.TrimSpace(raw)
	if phone == "" {
		return "", errors.New("phone is required")
	}

	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")
	phone = strings.ReplaceAll(phone, "(", "")
	phone = strings.ReplaceAll(phone, ")", "")

	switch {
	case strings.HasPrefix(phone, "+233") && len(phone) == 13:
		return phone, nil
	case strings.HasPrefix(phone, "233") && len(phone) == 12:
		return "+" + phone, nil
	case strings.HasPrefix(phone, "0") && len(phone) == 10:
		return "+233" + phone[1:], nil
	case len(phone) == 9:
		return "+233" + phone, nil
	default:
		return "", fmt.Errorf("invalid phone format: %s", raw)
	}
}

// SendSMS sends an SMS using Twilio's REST API.
//
// Requirements (environment variables):
// - TWILIO_ACCOUNT_SID
// - TWILIO_AUTH_TOKEN
// - TWILIO_PHONE_NUMBER (the Twilio "From" number, in E.164 format e.g. +1234567890)
//
// NOTE: common Ghana formats are normalized internally before calling Twilio.
func SendSMS(phone, message string) error {
	accountSID := getEnvAny("TWILIO_ACCOUNT_SID", "SMS_API_KEY")
	authToken := getEnvAny("TWILIO_AUTH_TOKEN", "SMS_API_SECRET")
	fromNumber := getEnvAny("TWILIO_PHONE_NUMBER", "SMS_SENDER_ID")

	if accountSID == "" || authToken == "" || fromNumber == "" {
		return errors.New("twilio not configured: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER")
	}
	if strings.TrimSpace(message) == "" {
		return errors.New("message is required")
	}

	normalizedPhone, err := NormalizePhoneNumber(phone)
	if err != nil {
		return err
	}

	endpoint := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", url.PathEscape(accountSID))

	// Twilio expects application/x-www-form-urlencoded.
	form := url.Values{}
	form.Set("To", normalizedPhone)
	form.Set("From", fromNumber)
	form.Set("Body", message)

	req, err := http.NewRequest(http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return fmt.Errorf("create twilio request: %w", err)
	}
	req.SetBasicAuth(accountSID, authToken)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("twilio request failed: %w", err)
	}
	defer resp.Body.Close()

	// Twilio returns 201 Created on success.
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[SMS] Twilio send failed. Status=%d Body=%s", resp.StatusCode, string(body))
		return fmt.Errorf("twilio send failed: status %d", resp.StatusCode)
	}

	log.Printf("[SMS] Sent SMS to %s", normalizedPhone)
	return nil
}

// SendSignOutReminder sends a reminder SMS.
func SendSignOutReminder(phone string) error {
	return SendSMS(phone, "Reminder: You have not signed out. Please sign out before leaving the hostel.")
}
