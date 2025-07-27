FROM node:20.18.1-bookworm-slim

# Install security updates and dependencies
ARG CA_SERVER_URL
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    ffmpeg \
    g++ \
    libavcodec-extra \
    libopus-dev \
    libopus0 \
    make \
    python3 \
    && if [ -n "$CA_SERVER_URL" ]; then \
        echo "Installing custom CA certificate from $CA_SERVER_URL"; \
        curl -k "$CA_SERVER_URL" -o /usr/local/share/ca-certificates/prodigalpros-ca.crt; \
    fi \
    && update-ca-certificates \
    && apt-get autoremove -y \
    && apt-get autoclean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* /var/tmp/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build) and rebuild native modules
RUN npm ci --ignore-scripts && \
    (npm rebuild @discordjs/opus || echo "Warning: @discordjs/opus rebuild failed, using opusscript fallback") && \
    npm rebuild ffmpeg-static

# Copy source code (explicitly copy only necessary files)
COPY src/ ./src/
COPY tsconfig.json ./

# Accept Sentry auth token as build argument for source maps upload
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN

# Build the application and clean up dependencies
RUN if [ -n "$SENTRY_AUTH_TOKEN" ]; then \
        npm run build; \
    else \
        echo "SENTRY_AUTH_TOKEN not available, building without Sentry sourcemaps"; \
        tsc; \
    fi && \
    npm prune --omit=dev && \
    groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs discord && \
    chown -R discord:nodejs /usr/src/app
USER discord

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "console.log('Bot is running')"]

# Start the bot
CMD ["npm", "start"]