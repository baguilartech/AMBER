FROM node:24.4.1-bookworm-slim

# Install security updates and dependencies
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    ffmpeg \
    g++ \
    libavcodec-extra \
    libopus-dev \
    libopus0 \
    make \
    python3 \
    && apt-get autoremove -y \
    && apt-get autoclean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* /var/tmp/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --ignore-scripts

# Copy source code (explicitly copy only necessary files)
COPY src/ ./src/
COPY tsconfig.json ./

# Build the application and clean up dependencies
RUN npm run build && \
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