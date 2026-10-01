package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// ponytail: hardcoded secret, anyone with the source can forge tokens; read it from an env var before exposing the server beyond localhost.
var jwtSecret = []byte("anime-stream-super-secret-key-change-in-prod-2026")

type ctxKey struct{}

type Claims struct {
	UserID   int64  `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

type AuthUser struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
}

// HashPassword hashes a raw password string using bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	return string(bytes), err
}

// CheckPasswordHash compares a hashed password with its raw counterpart
func CheckPasswordHash(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// GenerateToken creates a signed JWT token valid for 7 days
func GenerateToken(userID int64, username string) (string, error) {
	claims := Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "anime-stream",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ParseToken parses and validates a JWT token string
func ParseToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(*jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}
	return nil, errors.New("invalid token")
}

// Middleware injects the authenticated user into context if a valid Bearer token is sent
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if tokenStr, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer "); ok {
			if claims, err := ParseToken(tokenStr); err == nil {
				r = r.WithContext(context.WithValue(r.Context(), ctxKey{}, &AuthUser{
					ID:       claims.UserID,
					Username: claims.Username,
				}))
			}
		}
		next.ServeHTTP(w, r)
	})
}

// GetUserFromContext retrieves the AuthUser from context
func GetUserFromContext(ctx context.Context) *AuthUser {
	user, _ := ctx.Value(ctxKey{}).(*AuthUser)
	return user
}
