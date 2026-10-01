package api

import (
	"cmp"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

type VPNStatusResponse struct {
	Configured bool   `json:"configured"` // Gluetun's control server answered
	Connected  bool   `json:"connected"`  // VPN running AND this app's traffic exits through it
	PublicIP   string `json:"public_ip"`  // this app's real egress IP
	Country    string `json:"country"`
	City       string `json:"city"`
	Region     string `json:"region"`
	Service    string `json:"service"`
	Provider   string `json:"provider"`
	Status     string `json:"status"`
	ControlURL string `json:"control_url"`
	Error      string `json:"error,omitempty"`
}

var vpnClient = &http.Client{Timeout: 3 * time.Second}

// getJSON GETs url and decodes the JSON body into v; apiKey (if any) goes in Gluetun's X-API-Key header.
func getJSON(r *http.Request, url, apiKey string, v any) error {
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	if apiKey != "" {
		req.Header.Set("X-API-Key", apiKey)
	}
	resp, err := vpnClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(v)
}

// HandleVPNStatus reports whether GoAnime's own traffic leaves through Gluetun.
// Gluetun only protects us when we share its network namespace (network_mode: "service:gluetun"),
// so "connected" also requires our egress IP to equal Gluetun's public IP.
func HandleVPNStatus(w http.ResponseWriter, r *http.Request) {
	controlURL := strings.TrimRight(cmp.Or(os.Getenv("GLUETUN_CONTROL_URL"), "http://127.0.0.1:8000"), "/")
	apiKey := os.Getenv("GLUETUN_API_KEY") // Gluetun >= v3.39.1 rejects unauthenticated control requests
	res := VPNStatusResponse{
		ControlURL: controlURL,
		Provider:   cmp.Or(os.Getenv("VPN_SERVICE_PROVIDER"), "gluetun"),
		Service:    os.Getenv("VPN_TYPE"),
	}

	var own struct {
		IP string `json:"ip"`
	}
	_ = getJSON(r, "https://api.ipify.org?format=json", "", &own) // never send the API key to a third party
	res.PublicIP = cmp.Or(own.IP, "Desconocida")

	var vpn struct {
		Status string `json:"status"`
	}
	var gip struct {
		PublicIP string `json:"public_ip"`
		Country  string `json:"country"`
		Region   string `json:"region"`
		City     string `json:"city"`
	}
	if err := cmp.Or(getJSON(r, controlURL+"/v1/vpn/status", apiKey, &vpn), getJSON(r, controlURL+"/v1/publicip/ip", apiKey, &gip)); err != nil {
		res.Status = "desconectado"
		res.Error = fmt.Sprintf("Gluetun no responde en %s (%v). Inicia el contenedor de Gluetun; si responde HTTP 401, define GLUETUN_API_KEY.", controlURL, err)
		WriteJSON(w, http.StatusOK, res)
		return
	}

	res.Configured = true
	res.Status = vpn.Status
	res.Country, res.Region, res.City = gip.Country, gip.Region, gip.City
	// If the egress lookup failed we can't compare IPs, so trust Gluetun's own status.
	sameExit := own.IP == "" || own.IP == gip.PublicIP
	res.Connected = vpn.Status == "running" && sameExit
	if vpn.Status == "running" && !sameExit {
		res.Error = fmt.Sprintf("Gluetun está activo (IP %s), pero el tráfico de GoAnime sale por %s: ejecuta la app con network_mode: \"service:gluetun\".", gip.PublicIP, own.IP)
	}
	WriteJSON(w, http.StatusOK, res)
}
