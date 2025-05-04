# Dr. Claude Delegator Cloud Function

This cloud function implements the missing `/projects/delegate` endpoint needed by the Aixtiv CLI's Dr. Claude delegation commands.

## Function Details

- **Name**: dr-claude
- **Region**: us-west1
- **Trigger**: HTTP
- **Entry Point**: drClaude
- **Runtime**: Node.js 18

## Endpoints

- **GET /** - Health check endpoint
- **POST /projects/delegate** - Project delegation endpoint

## Deployment

Deploy this function to Google Cloud using:

```bash
cd cloud-functions/dr-claude
npm install
npm run deploy
```

Or manually using gcloud:

```bash
gcloud functions deploy dr-claude \
  --gen2 \
  --runtime=nodejs18 \
  --region=us-west1 \
  --source=. \
  --entry-point=drClaude \
  --trigger-http \
  --allow-unauthenticated
```

## Testing

Once deployed, you can test the function with:

```bash
curl -X POST https://us-west1-aixtiv-symphony.cloudfunctions.net/dr-claude/projects/delegate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "description": "This is a test project",
    "priority": "high",
    "assigned_to": "dr-claude-orchestrator"
  }'
```

## Verification

After deployment, the Aixtiv CLI command should work:

```bash
node bin/aixtiv.js claude:agent:delegate -p "SallyPort Security Update" -d "Deploy the updated SallyPort security management system" --priority high --assign-to "dr-claude-orchestrator"
```

