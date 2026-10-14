package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestParseToken(t *testing.T) {
	SetSecret([]byte("test-secret"))

	tok, err := GenerateToken(7, "kai")
	if err != nil {
		t.Fatal(err)
	}
	if c, err := ParseToken(tok); err != nil || c.UserID != 7 || c.Username != "kai" {
		t.Fatalf("valid token rejected: claims=%+v err=%v", c, err)
	}

	sign := func(method jwt.SigningMethod, key any, exp time.Time) string {
		s, err := jwt.NewWithClaims(method, Claims{
			UserID:           7,
			RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(exp)},
		}).SignedString(key)
		if err != nil {
			t.Fatal(err)
		}
		return s
	}
	future := time.Now().Add(time.Hour)
	for name, bad := range map[string]string{
		"wrong key": sign(jwt.SigningMethodHS256, []byte("other-secret"), future),
		"expired":   sign(jwt.SigningMethodHS256, []byte("test-secret"), time.Now().Add(-time.Hour)),
		"alg none":  sign(jwt.SigningMethodNone, jwt.UnsafeAllowNoneSignatureType, future),
		"garbage":   "not.a.token",
	} {
		if _, err := ParseToken(bad); err == nil {
			t.Errorf("%s: token accepted", name)
		}
	}
}
