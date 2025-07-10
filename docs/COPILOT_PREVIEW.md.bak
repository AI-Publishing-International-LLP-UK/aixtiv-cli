# Copilot Response Preview System

## Overview

The Copilot Response Preview System provides a transparent interface that shows "this is what the agent sees" to users, allowing them to preview, approve, edit, or request changes to AI copilot responses before they are delivered. This system is part of the Phase II transparency features in the Aixtiv CLI ecosystem.

![Copilot Preview System](../assets/copilot_preview_logo.png)

## Key Features

- **Response Preview Panel**: Preview copilot responses before delivery
- **Transparency Controls**: Show AI thinking, emotion indicators, and tone suggestions
- **Approval Workflow**: Approve responses or request changes
- **AI Thinking Visibility**: See the reasoning and analysis behind responses
- **Sentiment Analysis**: Understand user message sentiment and tone
- **Edit Capability**: Edit responses directly before delivery
- **Feedback System**: Provide feedback on response quality

## Command Reference

### Create a Response Preview

Create a new preview that shows how a copilot would respond to a message:

```bash
aixtiv copilot preview --action create --userId <id> --copilotId <id> --message "User message" --response "Copilot response"
```

**Parameters:**

- `--userId`: Required. User ID for the preview session
- `--copilotId`: Required. Copilot ID to use for the response
- `--message`: Required. The user's message or query
- `--response`: Required. The copilot's proposed response
- `--showEmotionIndicators`: Optional. Show emotion indicators (true/false)
- `--showToneSuggestions`: Optional. Show tone suggestions (true/false)
- `--showAIThinking`: Optional. Show AI thinking process (true/false)

**Example:**

```bash
aixtiv copilot preview --action create --userId john.doe --copilotId dr-match --message "How can I optimize my website?" --response "To optimize your website, focus on these key areas: performance, mobile compatibility, content quality, and SEO fundamentals..."
```

### Get a Preview

Retrieve and display an existing preview:

```bash
aixtiv copilot preview --action get --previewId <id>
```

**Parameters:**

- `--previewId`: Required. The ID of the preview to retrieve

**Example:**

```bash
aixtiv copilot preview --action get --previewId preview-abc123
```

### Approve a Preview

Approve a copilot response preview for delivery:

```bash
aixtiv copilot preview --action approve --previewId <id> [--note "Approval note"]
```

**Parameters:**

- `--previewId`: Required. The ID of the preview to approve
- `--note`: Optional. Note explaining the approval decision

**Example:**

```bash
aixtiv copilot preview --action approve --previewId preview-abc123 --note "Excellent response with clear action items"
```

### Request Changes

Request modifications to a copilot response:

```bash
aixtiv copilot preview --action request-changes --previewId <id> --feedback "Change feedback" [--changeOptions "tone,clarity,length"]
```

**Parameters:**

- `--previewId`: Required. The ID of the preview to modify
- `--feedback`: Required. Feedback explaining what needs to be changed
- `--changeOptions`: Optional. Comma-separated list of change categories

**Change Options:**

- `tone`: Adjust the emotional tone of the response
- `clarity`: Improve clarity and understandability
- `length`: Make the response longer or shorter
- `accuracy`: Fix factual errors
- `personalization`: Increase personalization
- `formatting`: Improve visual formatting

**Example:**

```bash
aixtiv copilot preview --action request-changes --previewId preview-abc123 --feedback "Please make the tone more friendly and add some concrete examples" --changeOptions "tone,clarity"
```

### Edit a Preview

Edit a copilot response directly:

```bash
aixtiv copilot preview --action edit --previewId <id> --editedText "Edited response text"
```

**Parameters:**

- `--previewId`: Required. The ID of the preview to edit
- `--editedText`: Required. The new edited response text

**Example:**

```bash
aixtiv copilot preview --action edit --previewId preview-abc123 --editedText "Here's a more personalized response based on your specific situation..."
```

### Manage Preview Settings

View or update user preview settings:

```bash
aixtiv copilot preview --action settings --userId <id> [--showEmotionIndicators true|false] [--showToneSuggestions true|false] [--showAIThinking true|false] [--transparencyLevel low|medium|high]
```

**Parameters:**

- `--userId`: Required. User ID for settings
- `--showEmotionIndicators`: Optional. Show emotion indicators
- `--showToneSuggestions`: Optional. Show tone suggestions
- `--showAIThinking`: Optional. Show AI thinking process
- `--transparencyLevel`: Optional. Transparency level (low, medium, high)

**Example:**

```bash
aixtiv copilot preview --action settings --userId john.doe --showAIThinking true --transparencyLevel high
```

### View Preview History

View a user's preview history:

```bash
aixtiv copilot preview --action history --userId <id> [--copilotId <id>] [--limit <number>] [--skipCache true|false]
```

**Parameters:**

- `--userId`: Required. User ID to retrieve history for
- `--copilotId`: Optional. Filter by specific copilot
- `--limit`: Optional. Maximum number of items to return
- `--skipCache`: Optional. Skip cache for fresh results

**Example:**

```bash
aixtiv copilot preview --action history --userId john.doe --limit 20
```

### Submit Feedback

Submit feedback on a copilot response:

```bash
aixtiv copilot preview --action submit-feedback --previewId <id> --userId <id> --feedbackType <type> [--comment "Feedback comment"]
```

**Parameters:**

- `--previewId`: Required. Preview ID to provide feedback on
- `--userId`: Required. User ID submitting feedback
- `--feedbackType`: Required. Type of feedback (helpful, not-helpful, tone-issue, needs-improvement)
- `--comment`: Optional. Additional feedback comments

**Example:**

```bash
aixtiv copilot preview --action submit-feedback --previewId preview-abc123 --userId john.doe --feedbackType helpful --comment "This was extremely useful and saved me hours of research"
```

## Understanding the Preview Display

The preview display provides a comprehensive view of the copilot's response process:

### User Message

The original user message or query

### Message Sentiment (if enabled)

- **Category**: Positive, Negative, or Neutral
- **Score**: Sentiment score (-1.0 to 1.0)
- **Magnitude**: Intensity of emotion (0.0 to +∞)

### AI Thought Process (if enabled)

- **Reasoning**: The overall reasoning approach
- **Analysis Steps**: Step-by-step reasoning process
- **Key Considerations**: Important factors in the decision

### Copilot Response

The proposed response with status indicator:

- **PREVIEW**: Initial preview status
- **EDITED**: Modified response
- **APPROVED**: Approved for delivery

### Tone Analysis (if enabled)

- **Primary Tone**: Detected tone (professional, friendly, direct, etc.)
- **Confidence**: Confidence in tone detection

### Preview Status

- **Preview ID**: Unique identifier
- **Created**: Creation timestamp
- **Status**: Current status (Pending, Approved, Changes Requested, Edited)
- **Additional details**: Depends on status (approval notes, feedback, etc.)

## Transparency Levels

The system supports three transparency levels:

1. **Low**: Shows only the basic preview with minimal details
2. **Medium**: Shows preview with tone analysis and some AI thinking
3. **High**: Shows full AI thinking process, sentiment analysis, and detailed reasoning

## Integration with Other Systems

The Copilot Preview System integrates with several Aixtiv CLI components:

- **SallyPort Security**: User authentication and authorization
- **Copilot Speaker System**: Voice-based preview capabilities
- **Claude Orchestration**: Advanced AI response generation
- **Sentiment Analysis**: Message sentiment detection
- **Emotion Tuning**: Response tone adjustment

## Workflow Examples

### Basic Preview and Approval

1. User submits a message to a copilot
2. System creates a preview of the response:
   ```bash
   aixtiv copilot preview --action create --userId john.doe --copilotId dr-match --message "How do I optimize my website?" --response "Here are 5 key ways to optimize your website..."
   ```
3. User reviews the response in the preview panel
4. User approves the response:
   ```bash
   aixtiv copilot preview --action approve --previewId preview-abc123
   ```
5. Response is delivered to the user

### Review and Edit Workflow

1. User submits a message to a copilot
2. System creates a preview of the response
3. User reviews the response but wants modifications
4. User edits the response directly:
   ```bash
   aixtiv copilot preview --action edit --previewId preview-abc123 --editedText "Based on your specific industry, here are the top 3 optimization strategies..."
   ```
5. Modified response is delivered to the user

### Request Changes Workflow

1. User submits a message to a copilot
2. System creates a preview of the response
3. User reviews the response and requests changes:
   ```bash
   aixtiv copilot preview --action request-changes --previewId preview-abc123 --feedback "The response is too technical. Please simplify and add examples."
   ```
4. System regenerates a response addressing the feedback
5. User reviews the updated response
6. User approves the new response

## Best Practices

- **Appropriate Transparency Level**: Choose a transparency level appropriate for the user's technical understanding
- **Specific Feedback**: When requesting changes, provide specific, actionable feedback
- **Consistent Workflow**: Use the same preview workflow consistently for better user experience
- **Background Context**: Include sufficient background context in the user message for accurate previews
- **Regular Feedback**: Submit feedback regularly to improve the system's understanding of preferences

## Security Considerations

- User IDs and preview content are securely stored
- Preview IDs are cryptographically generated to prevent guessing
- Access controls limit preview visibility to authorized users
- All preview actions are logged for audit purposes
- Preview data is automatically purged after a configurable retention period

## Troubleshooting

| Issue                      | Solution                                                        |
| -------------------------- | --------------------------------------------------------------- |
| Preview creation fails     | Check that user ID and copilot ID are valid                     |
| AI thinking not visible    | Verify that showAIThinking is enabled in settings               |
| Changes not appearing      | Ensure the preview ID is correct and the preview hasn't expired |
| Sentiment analysis missing | Check that the sentiment analysis service is available          |

## Support

For assistance with the Copilot Preview System:

- Contact: support@coaching2100.com
- Reference: Copilot Preview System v2.0
- Documentation: https://docs.aixtiv.ai/copilot-preview
