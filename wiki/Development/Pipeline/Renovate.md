# Self-Hosted Renovate Bot Setup

This document describes how to set up a self-hosted Renovate bot on Portainer to integrate with your GitLab instance for automated dependency updates.

## Overview

Renovate is a dependency update tool that automatically creates merge requests for outdated dependencies. This setup runs Renovate as a Docker container on your Portainer instance.

## Prerequisites

### 1. GitLab Personal Access Token

Create a GitLab Personal Access Token with the following scopes:
- `api`
- `read_user`
- `read_repository`
- `write_repository`

**Steps:**
1. Go to GitLab → User Settings → Access Tokens
2. Create a new token with the required scopes
3. Save the token securely (you'll need it for deployment)

### 2. Renovate Bot User (Recommended)

For better security, create a dedicated bot user:
1. Create a new GitLab user account: `renovate-bot`
2. Add this user to your projects with Developer/Maintainer access
3. Use this user's token instead of your personal token

## Configuration Files

The following files have been created for the Renovate setup:

### Docker Compose Configuration
- `docker-compose.renovate.yml` - Main deployment configuration
- `renovate-config/config.json` - Renovate bot configuration

### Repository Configuration
- `.gitlab/renovate.json` - Per-repository Renovate settings (already created)

## Deployment Options

### Option 1: Portainer Stack Deployment (Recommended)

1. **Prepare files on Portainer host:**
   ```bash
   # Copy files to your Portainer host
   scp docker-compose.renovate.yml user@portainer-host:/path/to/renovate/
   scp -r renovate-config user@portainer-host:/path/to/renovate/
   ```

2. **Deploy via Portainer Web UI:**
   - Go to Stacks → Add Stack
   - Name: `renovate-bot`
   - Upload the `docker-compose.renovate.yml` file
   - Set environment variables:
     - `GITLAB_TOKEN`: Your GitLab access token
   - Deploy the stack

### Option 2: Direct Docker Run

```bash
docker run -d \
  --name renovate-bot \
  --env RENOVATE_PLATFORM=gitlab \
  --env RENOVATE_ENDPOINT=https://gitlab.DOMAIN.com/api/v4/ \
  --env RENOVATE_TOKEN=your-gitlab-token \
  --env RENOVATE_AUTODISCOVER=true \
  --env RENOVATE_AUTODISCOVER_FILTER=discord-bots/* \
  --env LOG_LEVEL=info \
  --volume $(pwd)/renovate-config:/config:ro \
  --restart unless-stopped \
  renovate/renovate:latest
```

## Configuration Details

### Environment Variables

| Variable | Description | Value |
|----------|-------------|-------|
| `RENOVATE_PLATFORM` | Git platform | `gitlab` |
| `RENOVATE_ENDPOINT` | GitLab API endpoint | `https://gitlab.DOMAIN.com/api/v4/` |
| `RENOVATE_TOKEN` | GitLab access token | Your token |
| `RENOVATE_AUTODISCOVER` | Auto-discover repositories | `true` |
| `RENOVATE_AUTODISCOVER_FILTER` | Repository filter | `discord-bots/*` |
| `LOG_LEVEL` | Logging level | `info` |

### Schedule Configuration

- **Default Schedule**: Every 6 hours
- **Timezone**: America/Los_Angeles
- **Concurrent MRs**: Maximum 10
- **Hourly Limit**: Maximum 2 MRs per hour

## Testing and Verification

### 1. Check Container Status
```bash
docker ps | grep renovate
```

### 2. View Logs
```bash
docker logs renovate-bot
```

### 3. Manual Dry Run
```bash
docker exec renovate-bot renovate --dry-run
```

### 4. Force Run (for testing)
```bash
docker exec renovate-bot renovate --schedule=""
```

## Expected Behavior

Once deployed and running, Renovate will:

1. **Scan repositories** every 6 hours for outdated dependencies
2. **Create merge requests** for dependency updates
3. **Group related updates** according to configuration
4. **Auto-merge** patch updates and dev dependencies (if configured)
5. **Create dependency dashboard** issues in GitLab projects

## Monitoring

### Log Files
- Container logs: `docker logs renovate-bot`
- Detailed logs: Available in `/tmp/renovate/logs/renovate.log` inside container

### GitLab Integration
- Merge requests will appear in your GitLab projects
- Dependency dashboard issues will be created
- Activity will be logged in GitLab's activity feed

## Troubleshooting

### Common Issues

1. **Authentication errors**: Verify GitLab token has correct permissions
2. **No merge requests created**: Check repository access and configuration
3. **Container crashes**: Review logs and resource limits
4. **Rate limiting**: Adjust `prHourlyLimit` in configuration

### Debug Commands

```bash
# Check container status
docker inspect renovate-bot

# View environment variables
docker exec renovate-bot env | grep RENOVATE

# Test GitLab connectivity
docker exec renovate-bot curl -H "Authorization: Bearer $RENOVATE_TOKEN" \
  https://gitlab.DOMAIN.com/api/v4/user
```

## Maintenance

### Updating Renovate
```bash
docker pull renovate/renovate:latest
docker restart renovate-bot
```

### Backup Configuration
```bash
# Backup configuration files
tar -czf renovate-backup.tar.gz docker-compose.renovate.yml renovate-config/
```

### Scaling
- Increase memory limits if processing large repositories
- Adjust concurrent limits based on GitLab instance capacity
- Consider multiple instances for different repository groups

## Security Considerations

1. **Token Security**: Use dedicated bot account tokens
2. **Network Security**: Restrict container network access if needed
3. **Resource Limits**: Set appropriate CPU/memory limits
4. **Regular Updates**: Keep Renovate image updated

## Integration with CI/CD

Renovate will work alongside your existing GitLab CI/CD pipelines:
- Created MRs will trigger your CI pipelines
- Tests must pass before auto-merge (if configured)
- Release workflows will work with Renovate updates

## Support

For issues specific to this setup:
1. Check container logs first
2. Verify GitLab API connectivity
3. Review Renovate documentation: https://docs.renovatebot.com/
4. Check GitLab project access permissions