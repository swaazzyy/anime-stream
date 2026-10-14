# Lightweight Alpine runtime around the standalone Go binary (React frontend is embedded)
FROM alpine:3.20

# ca-certificates for HTTPS scraping
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Picks anime-stream-linux-amd64 or anime-stream-linux-arm64 to match the build platform
# (the legacy builder doesn't set TARGETARCH: pass --build-arg TARGETARCH=arm64 on ARM).
# No --chmod (BuildKit-only): git stores the binaries as executable and COPY keeps that mode.
ARG TARGETARCH=amd64
COPY anime-stream-linux-${TARGETARCH} /app/anime-stream

# Directory for the persistent database
RUN mkdir -p /app/data

ENV PORT=8080 \
    DB_PATH=/app/data/anime_stream.db

EXPOSE 8080

ENTRYPOINT ["/app/anime-stream"]
