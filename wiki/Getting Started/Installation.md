# Installation Guide

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Discord Bot Token
- Database (PostgreSQL recommended)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd amber
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your configuration:
   ```env
   DISCORD_TOKEN=your_discord_bot_token
   DATABASE_URL=your_database_connection_string
   ```

### 4. Database Setup

```bash
npm run migrate
```

### 5. Start the Bot

```bash
npm start
```

## Docker Installation

### Using Docker Compose

```bash
docker-compose up -d
```

### Manual Docker Build

```bash
docker build -t amber .
docker run -d --env-file .env amber
```

## Creating a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section
4. Create a bot and copy the token
5. Enable the necessary intents:
   - Server Members Intent
   - Message Content Intent

## Inviting the Bot

1. Go to the "OAuth2" > "URL Generator" section
2. Select "bot" and "applications.commands" scopes
3. Select the required permissions:
   - Send Messages
   - Use Slash Commands
   - Connect
   - Speak
   - Use Voice Activity
4. Use the generated URL to invite the bot to your server

## Next Steps

- Configure your bot settings in [Configuration](Configuration)
- Learn about available commands in [Commands Reference](Commands)
- Set up music service integrations