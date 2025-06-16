# Dr. Claude Services Access Guide

It appears the domain "aixtiv-drclaude.live" is not currently accessible. Here are alternative ways to access Dr. Claude services:

## 1. Check Local Deployment

If Dr. Claude services are deployed locally or in your internal network:

```bash
# Check if there's a local service running
curl http://localhost:3000/api/claude/status

# Or check your organization's internal domain
curl https://claude.internal-domain.com/api/status
```

## 2. Use GitHub API Integration

You can access Dr. Claude services through the GitHub API integration:

```bash
# Replace with your GitHub token
export GH_TOKEN=your_github_token

# Access Claude services via GitHub API
curl -H "Authorization: token $GH_TOKEN" \
     https://api.github.com/app/installations/claude
```

## 3. Check Environment Configuration

Your local environment might have the correct URL configured:

```bash
# Check environment variables
grep CLAUDE_API .env

# Or check configuration files
cat config/claude.json
```

## 4. Alternative Services

If you can't access Dr. Claude services directly, consider these alternatives:

1. **Use Claude API directly**: 
   - If you have an Anthropic API key, you can use it directly
   - See the "claude:code:generate" command in your CLI

2. **Use the OAuth2 CLI tool**:
   - The OAuth2 CLI tool you just installed can be used for authentication
   - Example: `oauth2 auth /path/to/key.json`

3. **GitHub Claude App**:
   - Check for Claude for GitHub in your GitHub organization's installed apps
   - Access it through: `https://github.com/organizations/AI-Publishing-International-LLP-UK/settings/installations`

4. **Command Line Interface**:
   - You already have the aixtiv CLI with Claude integration
   - Try: `aixtiv claude:status` or `aixtiv claude:agent:delegate`
