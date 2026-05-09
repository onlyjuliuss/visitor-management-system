package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"host-win-backend/models"
	"host-win-backend/services"
)

func requestIP(r *http.Request) string {
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}
	return strings.TrimSpace(r.RemoteAddr)
}

func metadataJSON(metadata map[string]interface{}) []byte {
	if metadata == nil {
		return []byte(`{}`)
	}
	b, err := json.Marshal(metadata)
	if err != nil {
		return []byte(`{}`)
	}
	return b
}

// VisitorSignInHandler handles POST /api/visitors/sign-in (multipart/form-data with photo)
func VisitorSignInHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// Parse multipart form (10MB max file size)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		log.Println("sign-in parse multipart error:", err)
		http.Error(w, "invalid form data", http.StatusBadRequest)
		return
	}

	// Extract form fields
	fullName := r.FormValue("full_name")
	phone := r.FormValue("phone")
	email := r.FormValue("email")
	purpose := r.FormValue("purpose")
	hostName := r.FormValue("host_name")

	if fullName == "" || phone == "" || purpose == "" || hostName == "" {
		http.Error(w, "full_name, phone, purpose and host_name are required", http.StatusBadRequest)
		return
	}

	// Get photo file if provided
	var photoURL string
	if file, handler, err := r.FormFile("photo"); err == nil {
		defer file.Close()
		savedPath, err := services.SavePhoto(file, handler.Filename)
		if err != nil {
			log.Println("sign-in save photo error:", err)
			http.Error(w, "could not save photo", http.StatusInternalServerError)
			return
		}
		photoURL = savedPath
	}

	req := models.VisitorSignInRequest{
		FullName: fullName,
		Phone:    phone,
		Email:    email,
		Purpose:  purpose,
		HostName: hostName,
		PhotoURL: photoURL,
	}

	visitor, err := services.CreateVisitor(r.Context(), req)
	if err != nil {
		log.Println("sign-in create visitor error:", err)
		if strings.Contains(err.Error(), "phone validation") {
			http.Error(w, "invalid phone number. Use 055..., 233..., or +233...", http.StatusBadRequest)
			return
		}
		http.Error(w, "could not create visitor", http.StatusInternalServerError)
		return
	}

	if logErr := services.CreateActivityLog(r.Context(), models.ActivityLog{
		EventType:       "visitor.sign_in.success",
		ActorType:       "visitor",
		ActorIdentifier: visitor.FullName,
		VisitorID:       &visitor.ID,
		Severity:        "info",
		Message:         "visitor sign-in completed successfully",
		Metadata: metadataJSON(map[string]interface{}{
			"phone":     visitor.Phone,
			"host_name": visitor.HostName,
			"purpose":   visitor.Purpose,
		}),
		IPAddress: requestIP(r),
		UserAgent: r.UserAgent(),
	}); logErr != nil {
		log.Println("[ACTIVITY] Failed to persist visitor sign-in log:", logErr)
	}

	if _, riskErr := services.RecalculateVisitorRisk(r.Context(), visitor.ID); riskErr != nil {
		log.Println("[RISK] Failed to recalculate risk after sign-in:", riskErr)
	}

	// Send welcome SMS (non-blocking for UX).
	// If Twilio is not configured or sending fails, we log it but do not fail sign-in.
	go func(phone string) {
		if err := services.SendSMS(phone, "Welcome to the hostel. Please remember to sign out before leaving."); err != nil {
			log.Println("[SMS] welcome SMS failed:", err)
		}
	}(phone)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(visitor); err != nil {
		log.Println("sign-in encode response error:", err)
	}
}

// SendReminderHandler handles POST /api/visitors/send-reminder
// Body: { "phone": "+123..." }
func SendReminderHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Phone string `json:"phone"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	req.Phone = strings.TrimSpace(req.Phone)
	if req.Phone == "" {
		http.Error(w, "phone is required", http.StatusBadRequest)
		return
	}

	if err := services.SendSignOutReminder(req.Phone); err != nil {
		log.Println("[SMS] reminder send failed:", err)
		if logErr := services.CreateActivityLog(r.Context(), models.ActivityLog{
			EventType: "reminder.send.failed",
			ActorType: "admin",
			Severity:  "warning",
			Message:   "manual reminder send failed",
			Metadata: metadataJSON(map[string]interface{}{
				"phone": req.Phone,
				"error": err.Error(),
			}),
			IPAddress: requestIP(r),
			UserAgent: r.UserAgent(),
		}); logErr != nil {
			log.Println("[ACTIVITY] Failed to persist reminder failure log:", logErr)
		}
		http.Error(w, "could not send reminder", http.StatusInternalServerError)
		return
	}

	if logErr := services.CreateActivityLog(r.Context(), models.ActivityLog{
		EventType: "reminder.send.success",
		ActorType: "admin",
		Severity:  "info",
		Message:   "manual reminder sent successfully",
		Metadata: metadataJSON(map[string]interface{}{
			"phone": req.Phone,
		}),
		IPAddress: requestIP(r),
		UserAgent: r.UserAgent(),
	}); logErr != nil {
		log.Println("[ACTIVITY] Failed to persist reminder success log:", logErr)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// VisitorSignOutHandler handles POST /api/visitors/sign-out
func VisitorSignOutHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("[SIGN-OUT] Received request")

	if r.Method != http.MethodPost {
		log.Printf("[SIGN-OUT] Method not allowed: %s\n", r.Method)
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req models.VisitorSignOutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("[SIGN-OUT] Decode error:", err)
		if logErr := services.CreateActivityLog(r.Context(), models.ActivityLog{
			EventType: "visitor.sign_out.failed",
			ActorType: "admin",
			Severity:  "warning",
			Message:   "visitor sign-out request rejected: invalid payload",
			Metadata: metadataJSON(map[string]interface{}{
				"reason": "invalid_payload",
			}),
			IPAddress: requestIP(r),
			UserAgent: r.UserAgent(),
		}); logErr != nil {
			log.Println("[ACTIVITY] Failed to persist sign-out payload failure log:", logErr)
		}
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("[SIGN-OUT] Request body - ID: %d, QR: %s\n", req.ID, req.QRCode)

	var (
		visitor *models.Visitor
		err     error
	)
	hasQRCode := strings.TrimSpace(req.QRCode) != ""

	// Allow sign-out by QR code (preferred) or by ID.
	if hasQRCode {
		log.Printf("[SIGN-OUT] Calling SignOutVisitorByQRCode with QR: %s\n", req.QRCode)
		visitor, err = services.SignOutVisitorByQRCode(r.Context(), strings.TrimSpace(req.QRCode))
	} else if req.ID > 0 {
		log.Printf("[SIGN-OUT] Calling SignOutVisitor with ID: %d\n", req.ID)
		visitor, err = services.SignOutVisitor(r.Context(), req.ID)
	} else {
		if logErr := services.CreateActivityLog(r.Context(), models.ActivityLog{
			EventType: "visitor.sign_out.failed",
			ActorType: "admin",
			Severity:  "warning",
			Message:   "visitor sign-out request rejected: missing id and qr_code",
			Metadata:  []byte(`{"reason":"missing_identifier"}`),
			IPAddress: requestIP(r),
			UserAgent: r.UserAgent(),
		}); logErr != nil {
			log.Println("[ACTIVITY] Failed to persist sign-out failure log:", logErr)
		}
		http.Error(w, "provide either qr_code or id", http.StatusBadRequest)
		return
	}

	if err != nil {
		switch err {
		case services.ErrNotFound:
			log.Printf("[SIGN-OUT] Visitor not found - ID: %d, QR: %s\n", req.ID, req.QRCode)
			if hasQRCode {
				if visitorID, lookupErr := services.FindVisitorIDByQRCodeInput(r.Context(), req.QRCode); lookupErr == nil && visitorID > 0 {
					if _, riskErr := services.RecalculateVisitorRisk(r.Context(), visitorID); riskErr != nil {
						log.Println("[RISK] Failed to recalculate visitor risk:", riskErr)
					}
				}
				if logErr := services.CreateActivityLog(r.Context(), models.ActivityLog{
					EventType: "qr_scan_failed",
					ActorType: "admin",
					Severity:  "warning",
					Message:   "qr scan failed: token not found",
					Metadata: metadataJSON(map[string]interface{}{
						"qr_code": req.QRCode,
					}),
					IPAddress: requestIP(r),
					UserAgent: r.UserAgent(),
				}); logErr != nil {
					log.Println("[ACTIVITY] Failed to persist qr_scan_failed log:", logErr)
				}
			}
			if logErr := services.CreateActivityLog(r.Context(), models.ActivityLog{
				EventType: "visitor.sign_out.failed",
				ActorType: "admin",
				Severity:  "warning",
				Message:   "visitor sign-out failed: visitor not found",
				Metadata: metadataJSON(map[string]interface{}{
					"id":      req.ID,
					"qr_code": req.QRCode,
					"reason":  "not_found",
				}),
				IPAddress: requestIP(r),
				UserAgent: r.UserAgent(),
			}); logErr != nil {
				log.Println("[ACTIVITY] Failed to persist sign-out failure log:", logErr)
			}
			http.Error(w, "visitor not found", http.StatusNotFound)
			return
		case services.ErrAlreadySignedOut:
			log.Printf("[SIGN-OUT] Visitor already signed out - ID: %d, QR: %s\n", req.ID, req.QRCode)
			if hasQRCode {
				if visitorID, lookupErr := services.FindVisitorIDByQRCodeInput(r.Context(), req.QRCode); lookupErr == nil && visitorID > 0 {
					if _, riskErr := services.RecalculateVisitorRisk(r.Context(), visitorID); riskErr != nil {
						log.Println("[RISK] Failed to recalculate visitor risk:", riskErr)
					}
				}
				if logErr := services.CreateActivityLog(r.Context(), models.ActivityLog{
					EventType: "qr_token_reused",
					ActorType: "admin",
					Severity:  "warning",
					Message:   "qr token reuse detected (already signed out)",
					Metadata: metadataJSON(map[string]interface{}{
						"qr_code": req.QRCode,
					}),
					IPAddress: requestIP(r),
					UserAgent: r.UserAgent(),
				}); logErr != nil {
					log.Println("[ACTIVITY] Failed to persist qr_token_reused log:", logErr)
				}
			}
			if logErr := services.CreateActivityLog(r.Context(), models.ActivityLog{
				EventType: "visitor.sign_out.failed",
				ActorType: "admin",
				Severity:  "warning",
				Message:   "visitor sign-out failed: already signed out",
				Metadata: metadataJSON(map[string]interface{}{
					"id":      req.ID,
					"qr_code": req.QRCode,
					"reason":  "already_signed_out",
				}),
				IPAddress: requestIP(r),
				UserAgent: r.UserAgent(),
			}); logErr != nil {
				log.Println("[ACTIVITY] Failed to persist sign-out failure log:", logErr)
			}
			http.Error(w, "visitor already signed out", http.StatusBadRequest)
			return
		case services.ErrQRTokenExpired:
			log.Printf("[SIGN-OUT] QR token expired - QR: %s\n", req.QRCode)
			if visitorID, lookupErr := services.FindVisitorIDByQRCodeInput(r.Context(), req.QRCode); lookupErr == nil && visitorID > 0 {
				if _, riskErr := services.RecalculateVisitorRisk(r.Context(), visitorID); riskErr != nil {
					log.Println("[RISK] Failed to recalculate visitor risk:", riskErr)
				}
			}
			if logErr := services.CreateActivityLog(r.Context(), models.ActivityLog{
				EventType: "qr_token_expired",
				ActorType: "admin",
				Severity:  "warning",
				Message:   "qr token expired",
				Metadata: metadataJSON(map[string]interface{}{
					"qr_code": req.QRCode,
				}),
				IPAddress: requestIP(r),
				UserAgent: r.UserAgent(),
			}); logErr != nil {
				log.Println("[ACTIVITY] Failed to persist qr_token_expired log:", logErr)
			}
			http.Error(w, "qr token expired", http.StatusBadRequest)
			return
		case services.ErrQRTokenRevoked:
			log.Printf("[SIGN-OUT] QR token revoked - QR: %s\n", req.QRCode)
			if visitorID, lookupErr := services.FindVisitorIDByQRCodeInput(r.Context(), req.QRCode); lookupErr == nil && visitorID > 0 {
				if _, riskErr := services.RecalculateVisitorRisk(r.Context(), visitorID); riskErr != nil {
					log.Println("[RISK] Failed to recalculate visitor risk:", riskErr)
				}
			}
			if logErr := services.CreateActivityLog(r.Context(), models.ActivityLog{
				EventType: "qr_token_revoked",
				ActorType: "admin",
				Severity:  "warning",
				Message:   "qr token revoked",
				Metadata: metadataJSON(map[string]interface{}{
					"qr_code": req.QRCode,
				}),
				IPAddress: requestIP(r),
				UserAgent: r.UserAgent(),
			}); logErr != nil {
				log.Println("[ACTIVITY] Failed to persist qr_token_revoked log:", logErr)
			}
			http.Error(w, "qr token revoked", http.StatusBadRequest)
			return
		default:
			log.Printf("[SIGN-OUT] Service error - ID: %d, QR: %s, Error: %v\n", req.ID, req.QRCode, err)
			if logErr := services.CreateActivityLog(r.Context(), models.ActivityLog{
				EventType: "visitor.sign_out.failed",
				ActorType: "admin",
				Severity:  "error",
				Message:   "visitor sign-out failed due to server error",
				Metadata: metadataJSON(map[string]interface{}{
					"id":      req.ID,
					"qr_code": req.QRCode,
					"reason":  "service_error",
				}),
				IPAddress: requestIP(r),
				UserAgent: r.UserAgent(),
			}); logErr != nil {
				log.Println("[ACTIVITY] Failed to persist sign-out failure log:", logErr)
			}
			http.Error(w, "could not sign out visitor", http.StatusInternalServerError)
			return
		}
	}

	log.Printf("[SIGN-OUT] Success - Visitor %d signed out\n", visitor.ID)
	eventType := "visitor.sign_out.by_id"
	if hasQRCode {
		eventType = "visitor.sign_out.by_qr"
		if logErr := services.CreateActivityLog(r.Context(), models.ActivityLog{
			EventType:       "qr_scan_success",
			ActorType:       "admin",
			ActorIdentifier: "admin",
			VisitorID:       &visitor.ID,
			Severity:        "info",
			Message:         "qr scan validated and sign-out completed",
			Metadata: metadataJSON(map[string]interface{}{
				"qr_code": req.QRCode,
			}),
			IPAddress: requestIP(r),
			UserAgent: r.UserAgent(),
		}); logErr != nil {
			log.Println("[ACTIVITY] Failed to persist qr_scan_success log:", logErr)
		}
	}
	if _, riskErr := services.RecalculateVisitorRisk(r.Context(), visitor.ID); riskErr != nil {
		log.Println("[RISK] Failed to recalculate risk after sign-out:", riskErr)
	}
	if logErr := services.CreateActivityLog(r.Context(), models.ActivityLog{
		EventType:       eventType,
		ActorType:       "admin",
		ActorIdentifier: "admin",
		VisitorID:       &visitor.ID,
		Severity:        "info",
		Message:         "visitor signed out successfully",
		Metadata: metadataJSON(map[string]interface{}{
			"id":      visitor.ID,
			"qr_code": visitor.QRCode,
		}),
		IPAddress: requestIP(r),
		UserAgent: r.UserAgent(),
	}); logErr != nil {
		log.Println("[ACTIVITY] Failed to persist sign-out success log:", logErr)
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(visitor); err != nil {
		log.Println("[SIGN-OUT] Encode response error:", err)
	}
}

// GetAllVisitorsHandler handles GET /api/visitors
func GetAllVisitorsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	visitors, err := services.GetAllVisitors(r.Context())
	if err != nil {
		log.Println("[VISITORS] GetAllVisitors failed:", err)
		http.Error(w, "could not fetch visitors", http.StatusInternalServerError)
		return
	}

	if visitors == nil {
		visitors = []models.Visitor{}
	}

	response := models.VisitorListResponse{
		Visitors: visitors,
		Count:    len(visitors),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetVisitorByIDHandler handles GET, PUT, DELETE /api/visitors/{id}
func GetVisitorByIDHandler(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/visitors/")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		http.Error(w, "invalid visitor id", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		visitor, err := services.GetVisitorByID(r.Context(), id)
		if err != nil {
			if err == services.ErrNotFound {
				http.Error(w, "visitor not found", http.StatusNotFound)
				return
			}
			log.Println("get visitor by id error:", err)
			http.Error(w, "could not fetch visitor", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(visitor)

	case http.MethodPut:
		var req models.VisitorUpdateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		visitor, err := services.UpdateVisitor(r.Context(), id, req)
		if err != nil {
			log.Println("update visitor error:", err)
			http.Error(w, "could not update visitor", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(visitor)

	case http.MethodDelete:
		err := services.DeleteVisitor(r.Context(), id)
		if err != nil {
			log.Println("delete visitor error:", err)
			http.Error(w, "could not delete visitor", http.StatusInternalServerError)
			return
		}

		if logErr := services.CreateActivityLog(r.Context(), models.ActivityLog{
			EventType:       "visitor.delete.success",
			ActorType:       "admin",
			ActorIdentifier: "admin",
			VisitorID:       &id,
			Severity:        "warning",
			Message:         "visitor record deleted",
			Metadata: metadataJSON(map[string]interface{}{
				"visitor_id": id,
			}),
			IPAddress: requestIP(r),
			UserAgent: r.UserAgent(),
		}); logErr != nil {
			log.Println("[ACTIVITY] Failed to persist visitor deletion log:", logErr)
		}

		w.WriteHeader(http.StatusNoContent)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

// GetVisitorsByStatusHandler handles GET /api/visitors/status/{status}
func GetVisitorsByStatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	status := strings.TrimPrefix(r.URL.Path, "/api/visitors/status/")
	if status == "" || (status != "in" && status != "out") {
		http.Error(w, "invalid status - must be 'in' or 'out'", http.StatusBadRequest)
		return
	}

	visitors, err := services.GetVisitorsByStatus(r.Context(), status)
	if err != nil {
		log.Println("get visitors by status error:", err)
		http.Error(w, "could not fetch visitors", http.StatusInternalServerError)
		return
	}

	if visitors == nil {
		visitors = []models.Visitor{}
	}

	response := models.VisitorListResponse{
		Visitors: visitors,
		Count:    len(visitors),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// UpdateVisitorHandler handles PUT /api/visitors/{id}
func UpdateVisitorHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	idStr := strings.TrimPrefix(r.URL.Path, "/api/visitors/")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		http.Error(w, "invalid visitor id", http.StatusBadRequest)
		return
	}

	var req models.VisitorUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("update visitor decode error:", err)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	visitor, err := services.UpdateVisitor(r.Context(), id, req)
	if err != nil {
		if err == services.ErrNotFound {
			http.Error(w, "visitor not found", http.StatusNotFound)
			return
		}
		log.Println("update visitor error:", err)
		http.Error(w, "could not update visitor", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(visitor)
}

// DeleteVisitorHandler handles DELETE /api/visitors/{id}
func DeleteVisitorHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	idStr := strings.TrimPrefix(r.URL.Path, "/api/visitors/")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		http.Error(w, "invalid visitor id", http.StatusBadRequest)
		return
	}

	err = services.DeleteVisitor(r.Context(), id)
	if err != nil {
		if err == services.ErrNotFound {
			http.Error(w, "visitor not found", http.StatusNotFound)
			return
		}
		log.Println("delete visitor error:", err)
		http.Error(w, "could not delete visitor", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GetVisitorStatsHandler handles GET /api/reports/stats
func GetVisitorStatsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	stats, err := services.GetVisitorStats(r.Context())
	if err != nil {
		log.Printf("[VISITORS] GetVisitorStats handler: %v", err)
		WriteJSONError(w, http.StatusInternalServerError, "could not fetch stats")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// ServePhotoHandler serves photo files from /uploads
func ServePhotoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	filename := strings.TrimPrefix(r.URL.Path, "/api/photos/")
	filePath := filepath.Join("uploads", filename)

	if _, err := os.Stat(filePath); err != nil {
		http.Error(w, "photo not found", http.StatusNotFound)
		return
	}

	http.ServeFile(w, r, filePath)
}

// ServeQRHandler serves QR code images from /qrcodes
func ServeQRHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	filename := strings.TrimPrefix(r.URL.Path, "/api/qrcodes/")
	filePath := filepath.Join("qrcodes", filename)

	if _, err := os.Stat(filePath); err != nil {
		http.Error(w, "qr code not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "image/png")
	http.ServeFile(w, r, filePath)
}
