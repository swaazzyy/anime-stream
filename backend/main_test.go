package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestGzipMiddleware(t *testing.T) {
	body := strings.Repeat("anime ", 1000)
	srv := httptest.NewServer(gzipMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.ServeContent(w, r, "x.json", time.Time{}, strings.NewReader(body)) // sets Content-Length like the file server
	})))
	defer srv.Close()

	// Go's client asks for gzip and decompresses it; a leftover uncompressed Content-Length would break the read.
	resp, err := http.Get(srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	got, err := io.ReadAll(resp.Body)
	if err != nil || string(got) != body || !resp.Uncompressed {
		t.Fatalf("err=%v gzipped=%v len=%d want %d", err, resp.Uncompressed, len(got), len(body))
	}
}
