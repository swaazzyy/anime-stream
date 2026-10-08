# 🎌 GoAnime FLV — Plataforma de Streaming de Anime en Go

Plataforma de streaming de anime con arquitectura **Cliente-Servidor** de alto rendimiento escrita en **Go**, con base de datos **SQLite**, **protección opcional con Gluetun VPN (Kill Switch & Zero IP Leaks)**, enlaces de descarga de AnimeAV1 y una interfaz moderna con tema oscuro inspirada en **Crunchyroll**.

---

## 🌟 Características Principales

### 1. 🚀 Backend en Go (Alto Rendimiento y Conexión Fluida)
- Escrito completamente en Go sin dependencias de CGO (`modernc.org/sqlite`).
- Servidor REST API ligero sobre `net/http` de la biblioteca estándar.
- Autenticación segura mediante **JWT (JSON Web Tokens)** y contraseñas hasheadas con **bcrypt**.
- Servidor estático integrado: sirve la aplicación frontend Single Page Application (SPA) directamente desde `http://localhost:8080` mediante `embed.FS`.

### 2. 🛡️ Anonimato y Protección Total con Gluetun VPN
- **Integración Nativa con Gluetun (`qmcgaw/gluetun`)**:
  - En entornos Docker, el servicio web comparte el espacio de red de Gluetun (`network_mode: "service:gluetun"`).
  - Todas las peticiones del servidor (scraping de AnimeAV1 y AniList) viajan obligatoriamente a través del túnel VPN cifrado. Los reproductores embebidos los carga tu navegador directamente.
- **Kill Switch Integrado**:
  - Si el enlace VPN cae o se desconecta inesperadamente, el firewall a nivel de red corta de inmediato toda salida de paquetes a internet. **Cero fugas de tu IP real ante tu ISP**.
- **Endpoint de Estado VPN** (`GET /api/vpn/status`): IP pública saliente, país, protocolo activo (WireGuard / OpenVPN) y si el tráfico de GoAnime sale realmente por el túnel.
- **Compatibilidad con Múltiples Proveedores**:
  - Soporte para Mullvad, ProtonVPN, NordVPN, Surfshark, PIA, Windscribe, CyberGhost y túneles personalizados WireGuard / OpenVPN.

### 3. 👤 Gestión de Usuarios y Personalización Total
- **Foto de Perfil Personalizada**:
  - Subida directa de imágenes desde el equipo con compresión client-side automática (vía Canvas HTML5) para máxima velocidad y ligereza.
  - Galería integrada de avatares anime predeterminados (Luffy, Zoro, Gojo, Tanjiro, Frieren, Eren, Jin-woo, Anya).
  - Posibilidad de enlazar imágenes por URL directa o restablecer al avatar por iniciales.
- **Cambio de Nombre de Usuario**: Modificación en tiempo real del nombre visible en la plataforma, comentarios y listas.
- **Cambio Seguro de Contraseña**: Verificación de contraseña actual con hash bcrypt y confirmación de nueva clave.
- **Panel de Estadísticas de Usuario**: Resumen visual de animes en seguimiento, Mi Lista y capítulos vistos.

### 4. 🗄️ Base de Datos SQLite Integrada (`anime_stream.db`)
- **Gestión de usuarios y perfiles**: Registro, login, tokens de sesión y almacenamiento de avatar.
- **"Siguiendo Viendo" (Still Viewing / Continue Watching)**: Guarda el último capítulo de cada anime, el progreso y el estado de completado. Los reproductores embebidos no exponen su posición, así que el progreso es el tiempo que la página del capítulo permanece visible (se sincroniza cada 15 segundos).
- **"Para el Futuro / Mi Lista" (Watchlist)**: Organización por pestañas: *Por Ver (Para el Futuro)*, *Viendo (Siguiendo)*, *Completados* y *Favoritos*.

### 5. 📥 Descarga de Capítulos
- **🌐 Servidores Espejo de AnimeAV1**: Enlaces reales de descarga (Mega, 1Fichier, TransferIt, MP4Upload) obtenidos en vivo para cada episodio.

### 6. 📺 Servidores AnimeAV1
- **Selector de Servidores con Logotipo Oficial AnimeAV1**:
  - Distintivo visual oficial en turquesa (`#3CECD6`) junto al selector de servidores.
  - Servidores obtenidos en vivo para cada episodio (Sub / Latino según disponibilidad), reproducidos en el reproductor embebido de cada servidor.
- **Miniaturas de Episodios Precisas y Resistentes**:
  - Vinculación directa con capturas reales de alta definición provistas por la red de contenidos de AnimeAV1 mediante ID numérico.
  - Sistema de respaldo automático (`onError`) en cascada para evitar imágenes rotas o errores de CDN.

### 7. 🎨 Frontend Cómodo y Movimientos Suaves
- Tema visual oscuro Crunchyroll (`#0b0c0e`, acentos anaranjados `#f47521`, tarjetas `#14151a`) con alternador a Modo Claro (Light Mode).
- **Carrusel Billboard Principal**: Anime destacado con sinopsis en español, puntuación, géneros y botón de inicio rápido.
- **Fila "Siguiendo Viendo"**: Miniaturas con barra de progreso naranja y tiempo restante estimado (ej. "14 min restantes"). Un clic reanuda el último capítulo visto.
- **Fichas Técnicas Detalladas**: Tráilers oficiales de YouTube embebidos, sinopsis, géneros y listado interactivo de episodios.

---

## 📁 Estructura del Proyecto

```
f:\anime-stream\
├── anime-stream-linux-amd64       # Binario standalone para Linux 64-bit (x86_64)
├── anime-stream-linux-arm64       # Binario standalone para Linux ARM64 (aarch64)
├── anime-stream-windows-amd64.exe # Binario standalone para Windows 64-bit
├── run.bat                        # Lanzador para Windows (inicia el servidor y abre el navegador)
├── Dockerfile                     # Imagen contenedor ligera en Alpine Linux
├── docker-compose.yml             # Stack de despliegue multi-contenedor con Gluetun VPN
├── .env.example                   # Plantilla de credenciales y configuración VPN
├── backend/
│   ├── api/
│   │   ├── handlers.go  # Endpoints REST (auth, profile, catalog, episode, history, lists)
│   │   └── vpn.go       # Cliente de telemetría y estado con Gluetun Control API
│   ├── auth/            # JWT tokens y hashing bcrypt
│   ├── database/        # Driver SQLite puro en Go, migraciones de usuarios y avatares
│   ├── providers/       # Servidores AnimeAV1, catálogo, miniaturas y metadatos de AniList
│   ├── dist/            # Build de Vite (`npm run build`) empaquetado con embed.FS
│   └── main.go          # Servidor HTTP, CORS, ruteo SPA y embed
├── frontend/
│   ├── src/
│   │   ├── components/  # Navbar, UserProfileModal, GluetunModal, AnimeAV1Logo, DownloadCapModal...
│   │   ├── pages/       # AnimeDetailPage (/media/:slug), WatchPage (/media/:slug/:ep)
│   │   ├── services/    # Cliente de API con persistencia local
│   │   └── App.jsx      # Rutas SPA, modales globales y navegación
│   └── vite.config.js   # Compilación directa hacia backend/dist
└── README.md
```

---

## 🚀 Cómo Ejecutar la Plataforma

### 🐳 Opción 1: Despliegue con Docker Compose + Gluetun VPN (Recomendado para Máxima Privacidad)

Esta modalidad garantiza que **el 100% de las conexiones del servidor pasen por un túnel cifrado** con Kill Switch automático en caso de corte:

1. **Crear archivo de configuración `.env`**:
   ```bash
   cp .env.example .env
   ```
2. **Configurar el proveedor en `.env`** (ejemplo con Mullvad WireGuard):
   ```env
   VPN_SERVICE_PROVIDER=mullvad
   VPN_TYPE=wireguard
   WIREGUARD_PRIVATE_KEY=tu_clave_privada_aqui=
   WIREGUARD_ADDRESSES=10.64.0.1/32
   SERVER_COUNTRIES=Switzerland
   ```
   *(También compatible con ProtonVPN, NordVPN, Surfshark, PIA, Windscribe, etc.)*

3. **Iniciar el stack con Docker Compose**:
   ```bash
   docker compose up -d
   ```

4. **Verificar que la VPN está conectada y protegida**:
   ```bash
   docker compose logs -f gluetun
   ```
   Abre tu navegador en `http://localhost:8080`. Para confirmar que el tráfico sale por la VPN, consulta `http://localhost:8080/api/vpn/status`: debe responder `"connected": true` con la IP pública y el país de salida.

---

### 🐧 Opción 2: Ejecutable Standalone en Linux (Ubuntu, Debian, Fedora, Arch, Alpine, etc.)

El binario es **100% autónomo** (no requiere Node.js, npm, GCC ni dependencias externas; el frontend React viene empaquetado dentro del ejecutable con `embed.FS`):

#### Arquitectura x86_64 (amd64):
```bash
# 1. Dar permisos de ejecución
chmod +x anime-stream-linux-amd64

# 2. Iniciar el servidor
./anime-stream-linux-amd64
```

#### Arquitectura ARM64 (Raspberry Pi 4/5, Oracle Cloud ARM, AWS Graviton):
```bash
chmod +x anime-stream-linux-arm64
./anime-stream-linux-arm64
```

Abre tu navegador en `http://localhost:8080` (o `http://<IP-DE-TU-SERVIDOR>:8080`).

---

### 🪟 Opción 3: Ejecutable Standalone en Windows

Haz doble clic en `run.bat` (inicia el servidor y abre el navegador) o directamente en:
```
anime-stream-windows-amd64.exe
```
O ejecútalo desde PowerShell / CMD:
```powershell
.\anime-stream-windows-amd64.exe
```
Abre `http://localhost:8080` en tu navegador.

---

### ⚙️ Variables de Entorno de Configuración

Puedes personalizar la configuración pasando variables de entorno antes de ejecutar:

```bash
# Ejemplo en Linux: cambiar puerto, base de datos y URL de control de Gluetun
PORT=3000 DB_PATH=/var/data/anime.db GLUETUN_CONTROL_URL=http://localhost:8000 ./anime-stream-linux-amd64
```

| Variable | Valor por defecto | Descripción |
| :--- | :--- | :--- |
| `PORT` | `8080` | Puerto en el que escucha el servidor web |
| `DB_PATH` | `anime_stream.db` | Ruta del archivo de base de datos SQLite |
| `GLUETUN_CONTROL_URL` | `http://127.0.0.1:8000` | URL del servidor de control de Gluetun para telemetría de VPN |
| `GLUETUN_API_KEY` | *(vacío)* | Clave `X-API-Key` de la API de control (Gluetun ≥ v3.39.1 la exige); debe coincidir con la de Gluetun |
| `FRONTEND_DIST` | *(embebido)* | Ruta opcional a una carpeta dist externa si se desea sobrescribir el frontend |

---

### 🛡️ Ejecutar como Servicio en Linux (Systemd)

Para mantener el servidor ejecutable nativo en segundo plano en un VPS o servidor Linux:

Crea el archivo `/etc/systemd/system/anime-stream.service`:
```ini
[Unit]
Description=Anime Stream Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/anime-stream
ExecStart=/opt/anime-stream/anime-stream-linux-amd64
Restart=always
Environment=PORT=8080
Environment=GLUETUN_CONTROL_URL=http://localhost:8000

[Install]
WantedBy=multi-user.target
```

Luego actívalo e inícialo:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now anime-stream
sudo systemctl status anime-stream
```
