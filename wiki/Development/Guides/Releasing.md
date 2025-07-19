# Releasing Amber Discord Bot

This document describes how to create releases for the Amber Discord Bot project on both GitHub and GitLab.

## Prerequisites

- Push access to the repository
- Proper permissions for GitHub/GitLab package registries
- All tests passing on the main branch

## Release Process

### 1. Prepare the Release

Before creating a release, ensure:

```bash
# Run tests locally
npm run test:ci

# Run linting
npm run lint

# Build the project
npm run build
```

### 2. Update Version

Use npm to bump the version:

```bash
# For patch releases (bug fixes)
npm version patch

# For minor releases (new features)
npm version minor

# For major releases (breaking changes)
npm version major
```

This will:
- Update the version in `package.json`
- Create a git commit with the version change
- Create a git tag (e.g., `v1.1.2`)

### 3. Push the Release

```bash
# Push the version commit and tag
git push origin main
git push origin --tags
```

### 4. Automated Release Process

Once you push the tag, both GitHub and GitLab will automatically:

#### GitHub Actions will:
- Build and test the project
- Create a GitHub release with release notes
- Build and push Docker images to GitHub Container Registry (`ghcr.io`)
- Publish the NPM package to GitHub Packages

#### GitLab CI will:
- Build and test the project
- Build and push Docker images to GitLab Container Registry
- Publish the NPM package to GitLab Package Registry

## Using Released Packages

### Docker Images

**From GitHub:**
```bash
docker pull ghcr.io/baguilar/amber:latest
docker pull ghcr.io/baguilar/amber:v1.1.2
```

**From GitLab:**
```bash
docker pull registry.gitlab.com/baguilar/amber/discord-bot:latest
docker pull registry.gitlab.com/baguilar/amber/discord-bot:v1.1.2
```

### NPM Package

**From GitHub Packages:**
```bash
npm install @baguilar/amber-discord-bot
```

**From GitLab Package Registry:**
```bash
npm install @baguilar/amber-discord-bot --registry=https://gitlab.com/api/v4/packages/npm/
```

## Manual Release (if needed)

If automatic releases fail, you can create releases manually:

### GitHub Manual Release
1. Go to the repository's "Releases" page
2. Click "Create a new release"
3. Choose the tag version
4. Add release notes
5. Publish the release

### GitLab Manual Release
1. Go to the repository's "Releases" page
2. Click "New release"
3. Choose the tag version
4. Add release notes
5. Create the release

## Troubleshooting

### Common Issues

1. **Release workflow fails**: Check the Actions/CI logs for specific errors
2. **Package registry authentication**: Ensure proper tokens are configured
3. **Docker build fails**: Check the Dockerfile and build context
4. **Tests fail**: Fix failing tests before releasing

### Rollback

If a release has issues:

```bash
# Revert to previous version
npm version <previous-version>
git push origin main --force-with-lease
git push origin --tags --force-with-lease
```

## Release Checklist

- [ ] All tests pass locally
- [ ] Code is linted and formatted
- [ ] CHANGELOG.md is updated (if maintained)
- [ ] Version is bumped using `npm version`
- [ ] Tags are pushed to trigger release
- [ ] Release notes are added (automatically or manually)
- [ ] Docker images are built and pushed
- [ ] NPM packages are published
- [ ] Release is announced (if applicable)

## Notes

- Releases are triggered by pushing git tags that start with `v` (e.g., `v1.1.2`)
- Both GitHub and GitLab releases run in parallel
- Docker images are tagged with both the version and `latest`
- NPM packages are published to both GitHub and GitLab package registries
- Release workflows include full testing and linting before publishing