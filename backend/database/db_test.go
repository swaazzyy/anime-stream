package database

import (
	"path/filepath"
	"testing"
)

// The token signing key must be random per install and survive restarts (else every restart logs everyone out).
func TestJWTSecretPersists(t *testing.T) {
	path := filepath.Join(t.TempDir(), "test.db")
	open := func() []byte {
		db, err := InitDB(path)
		if err != nil {
			t.Fatal(err)
		}
		defer db.Close()
		secret, err := JWTSecret()
		if err != nil || len(secret) < 26 {
			t.Fatalf("JWTSecret() = %q, %v", secret, err)
		}
		return secret
	}

	if first, second := open(), open(); string(first) != string(second) {
		t.Fatalf("secret changed across restarts: %q -> %q", first, second)
	}
}
