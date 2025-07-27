# 🎵 Amber Discord Music Bot Wiki

Welcome to the documentation for Amber, a self-hosted Discord music bot with multi-platform streaming support!

## 📋 Complete Documentation Index

### 📚 Getting Started
- [📦 Installation Guide](Installation) - Set up Amber in minutes
- [⚙️ Configuration](Configuration) - Configure your bot settings and API keys
- [🛠️ Troubleshooting](Troubleshooting) - Common issues and solutions

### 🎮 Using Amber
- [🎵 Commands Reference](Commands) - Complete command documentation

### 👩‍💻 Development

#### 📖 Development Guides  
- [🏗️ Architecture](Architecture) - System design and patterns
- [📖 Development Guide](Developing) - Get started contributing
- [🧪 Testing Guide](Testing) - Testing strategies and best practices
- [🚀 Release Guide](Releasing) - Release management

#### 🚀 Pipeline & Deployment
- [☸️ Kubernetes Deployment](Kubernetes) - Production K8s deployment guide
- [🔗 GitLab K8s Integration](GitLab%20Kubernetes%20Integration) - CI/CD with Kubernetes
- [🤖 GitLab Agent Setup](GitLab%20Agent%20Setup) - Configure GitLab agents
- [🔄 Renovate Bot](Renovate) - Automated dependency management

#### 🛠️ How To Contribute
- [🎼 Adding Music Services](Adding%20Music%20Services) - Integrate new streaming platforms
- [⚡ Creating Commands](Creating%20Commands) - Build new Discord commands
- [🎮 Adding Features and Games](Adding%20Features%20and%20Games) - Extend with new features

## ✨ What is Amber?

Amber is a **self-hosted Discord music bot** designed for reliability and ease of use. Built with TypeScript and modern development practices.

### 🎵 Supported Platforms
- **YouTube** - High-quality audio streaming with intelligent search
- **Spotify** - Track metadata and search integration
- **SoundCloud** - Independent artist and content support

### 🌟 Key Features

#### 🎛️ **Music Management**
- High-quality audio streaming
- Queue management with skip, pause, resume
- Volume control and auto-disconnect
- Smart prebuffering for seamless playback

#### 🚀 **Modern Interface**
- Discord slash commands
- Rich embeds with song information
- Real-time queue display
- User-friendly error messages

#### 🐳 **Production Ready**
- Docker containerization for easy deployment
- Resource limits and health monitoring
- Comprehensive error handling
- Automatic cleanup and optimization
- Prometheus metrics and health endpoints
- Sentry error tracking integration
- ELK stack logging support

#### 🔧 **Developer Friendly**
- TypeScript with full type safety
- Simple, modular architecture
- Comprehensive test coverage
- Clear documentation

## 🎯 Quick Start Paths

### 🎵 **For Server Owners**
1. **[Install Amber](Installation)** - Get your bot running
2. **[Configure Settings](Configuration)** - Set up API keys
3. **[Learn Commands](Commands)** - Master the 9 available commands

### 👩‍💻 **For Developers**
1. **[Understand Architecture](Architecture)** - Learn the simple design
2. **[Setup Development](Developing)** - Get development environment ready
3. **[Create Commands](Creating%20Commands)** - Add new functionality

## 📊 Current Features

### Available Commands (9 total)
- **Music Playback**: `/play`, `/pause`, `/resume`, `/stop`, `/skip`
- **Audio Control**: `/volume`
- **Queue Management**: `/queue`, `/nowplaying`

### Architecture Components
- **Commands Layer**: 9 slash commands with BaseCommand pattern
- **Services Layer**: YouTube, Spotify, SoundCloud integration
- **Management Layer**: Queue, music player, prebuffer service
- **Utilities**: Logger, config, error handling, formatters, metrics, monitoring

### Performance Features
- **Prebuffering**: Smart background preparation of next songs
- **Intelligent Search**: YouTube searches prioritize official channels
- **Resource Management**: Docker limits and automatic cleanup

## 💡 Why Choose Amber?

### 🔒 **Self-Hosted Control**
- Complete privacy and control over your bot
- No external dependencies for core functionality
- Customizable for your server's specific needs

### 🎯 **Simple & Reliable**
- Straightforward architecture that's easy to understand
- Proven reliability with comprehensive error handling
- Resource-efficient with automatic management

### 🛠️ **Developer Experience**
- Clean, well-documented codebase
- Simple patterns that are easy to extend
- Comprehensive testing for confidence in changes

## 🆘 Need Help?

### 📖 **Documentation**
Start with our guides organized by your role and needs.

### 🐛 **Issues & Bugs**
- Check [Troubleshooting](Troubleshooting) for common solutions
- Review Docker logs for specific error messages
- Verify API credentials and permissions

### 💬 **Community**
- Share configurations and customizations
- Contribute to documentation improvements
- Report issues and suggest enhancements

---

## 📈 Contributing

We welcome contributions! See our [development guides](Developing) to get started.

**Current Status**: Simple, focused music bot with 9 core commands and multi-platform support.

*Built for the Discord community with simplicity and reliability in mind*