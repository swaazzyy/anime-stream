# Lightweight Alpine runtime around the standalone Go binary (React frontend is embedded)
FROM alpine:3.20

# ca-certificates for HTTPS scraping, tzdata for correct timestamps
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Picks anime-stream-linux-amd64 or anime-stream-linux-arm64 to match the build platform
ARG TARGETARCH=amd64
COPY --chmod=755 anime-stream-linux-${TARGETARCH} /app/anime-stream

# Directory for the persistent database
RUN mkdir -p /app/data

ENV PORT=8080 \
    DB_PATH=/app/data/anime_stream.db \
    GLUETUN_CONTROL_URL=http://localhost:8000

EXPOSE 8080

ENTRYPOINT ["/app/anime-stream"]
