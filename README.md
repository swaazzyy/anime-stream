# 🎌 GoAnime FLV — Plataforma de Streaming de Anime en Go

Plataforma de streaming de anime con arquitectura **Cliente-Servidor** de alto rendimiento escrita en **Go**, con base de datos **SQLite**, **motor BitTorrent integrado** para descarga de capítulos, múltiples **servidores al estilo AnimeFLV** (Streamwish, Mega, Streamtape, YourUpload, Mp4Upload) y una interfaz moderna con tema oscuro inspirada en **Crunchyroll**.

---

## 🌟 Características Principales

### 1. 🚀 Backend en Go (Alto Rendimiento y Conexión Fluida)
- Escrito completamente en Go sin dependencias de CGO (`modernc.org/sqlite`).
- Servidor REST API ultrarrápido con soporte de streaming parcial por rangos HTTP (`Accept-Ranges: bytes` para reproducción fluida).
- Autenticación segura mediante **JWT (JSON Web Tokens)** y contraseñas hasheadas con **bcrypt**.
- Servidor estático integrado: sirve la aplicación frontend Single Page Application (SPA) directamente desde `http://localhost:8080`.

### 2. 🗄️ Base de Datos SQLite Integrada (`anime_stream.db`)
- **Gestión de usuarios**: Registro, login, perfiles y sesiones.
- **"Siguiendo Viendo" (Still Viewing / Continue Watching)**: Guarda el segundo exacto de reproducción de cada anime y capítulo, duración total y estado de completado. Sincronización automática cada 5 segundos mientras el usuario mira el anime.
- **"Para el Futuro / Mi Lista" (Watchlist)**: Organización por pestañas: *Por Ver (Para el Futuro)*, *Viendo (Siguiendo)*, *Completados* y *Favoritos*.
- **Historial de descargas**: Registro de torrents y archivos descargados.

### 3. ⚡ Motor BitTorrent Integrado & Descarga de Capítulos
- Desarrollado sobre `github.com/anacrolix/torrent`.
- **Botón de Descarga de Caps**: disponible en cada capítulo, tarjeta y en el reproductor.
  - **⚡ Descargar vía BitTorrent (Magnet)**: añade la tarea directamente al motor de Go con reporte en tiempo real de velocidad (MB/s), porcentaje, peers y tamaño.
  - **🌐 Descarga Directa (Mega / Servidores)**: descarga directa o redirección al archivo MP4.
  - **📋 Copiar Magnet**: para usar en clientes externos si se desea.
- **Reproducción Local de Caps**: una vez descargado el capítulo, puedes reproducirlo directamente en la aplicación desde el servidor local sin consumir ancho de banda de internet y con 0 buffering.

### 4. 📺 Servidores al estilo AnimeFLV
- Selección múltiple de servidores por episodio:
  - **Streamwish [HD]**
  - **Mega Cloud**
  - **Streamtape**
  - **YourUpload**
  - **Mp4Upload** (Castellano / Latino / Sub)
- Selector de servidor dinámico en el encabezado del reproductor con cambio instantáneo.

### 5. 🎨 Frontend Cómodo y Movimientos Suaves (Estilo Crunchyroll)
- Tema visual oscuro Crunchyroll (`#0b0c0e`, acentos anaranjados `#f47521`, tarjetas `#14151a`).
- **Carrusel Billboard Principal**: anime destacado con sinopsis, puntuación, géneros y botón de inicio rápido.
- **Fila "Siguiendo Viendo"**: muestra miniaturas con barra de progreso naranja y tiempo restante estimado (ej. "14 min restantes"). Al hacer clic reanuda en el segundo exacto.
- **Reproductor Cinema**:
  - Controles completos: Play/Pausa, barra de búsqueda, volumen.
  - **Saltar Intro (+85s)** y **Saltar Outro (+90s)** como en Crunchyroll.
  - Velocidad de reproducción (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x).
  - Modo teatro y Pantalla completa (`F` o botón).
  - Atajos de teclado: Espacio para pausar, flechas para avanzar/retroceder 10s.

---

## 📁 Estructura del Proyecto

```
f:\anime-stream\
├── anime-stream-linux-amd64       # Binario standalone para Linux 64-bit (x86_64)
├── anime-stream-linux-arm64       # Binario standalone para Linux ARM64 (aarch64)
├── anime-stream-windows-amd64.exe # Binario standalone para Windows 64-bit
├── backend/
│   ├── api/             # Endpoints REST (auth, catalog, player, history, torrents)
│   ├── auth/            # JWT tokens y hashing bcrypt
│   ├── database/        # Driver SQLite puro en Go y migraciones de tablas
│   ├── providers/       # Servidores AnimeAV1, catálogo y búsqueda Jikan
│   ├── torrent/         # Cliente BitTorrent (anacrolix/torrent) y streaming local
│   ├── downloads/       # Directorio de capítulos descargados
│   ├── dist/            # Build de Vite (`npm run build` escribe aquí) empaquetado con embed.FS
│   └── main.go          # Servidor HTTP, CORS, ruteo SPA y embed
├── frontend/
│   ├── src/
│   │   ├── components/  # Navbar, HeroBanner, ContinueWatching, VideoPlayer, Downloads...
│   │   ├── pages/       # AnimeDetailPage (/media/:slug), WatchPage (/media/:slug/:ep)
│   │   ├── services/    # Cliente de API con persistencia local
│   │   └── App.jsx      # Rutas SPA y navegación
└── README.md
```

---

## 🚀 Cómo Ejecutar la Plataforma

### 🐧 Opción 1: Ejecutable Standalone en Linux (Ubuntu, Debian, Fedora, Arch, Alpine, etc.)

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

### 🪟 Opción 2: Ejecutable Standalone en Windows

Haz doble clic en:
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
# Ejemplo en Linux: cambiar puerto y ruta de base de datos
PORT=3000 DB_PATH=/var/data/anime.db ./anime-stream-linux-amd64
```

| Variable | Valor por defecto | Descripción |
| :--- | :--- | :--- |
| `PORT` | `8080` | Puerto en el que escucha el servidor web |
| `DB_PATH` | `anime_stream.db` | Ruta del archivo de base de datos SQLite |
| `DOWNLOADS_DIR` | `downloads` | Carpeta donde se guardan los torrents y capítulos descargados |
| `FRONTEND_DIST` | *(embebido)* | Ruta opcional a una carpeta dist externa si se desea sobrescribir el frontend |

---

### 🛡️ Ejecutar como Servicio en Linux (Systemd)

Para mantener el servidor ejecutándose en segundo plano en un VPS o servidor Linux:

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

[Install]
WantedBy=multi-user.target
```

Luego actívalo e inícialo:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now anime-stream
sudo systemctl status anime-stream
```

