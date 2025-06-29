# Copilot Emotion Tuning System

## Overview

The Copilot Emotion Tuning System allows users to customize the emotional tone of AI agent responses, making interactions more personalized and effective across different communication contexts. This system softens or sharpens agent tone based on user preferences, conversation domain, and contextual cues.

![Emotion Tuning System](../assets/emotion_tuning_logo.png)

## Key Features

- **Primary Tone Selection**: Choose from a range of emotional tones for copilot responses
- **Tone Intensity Control**: Adjust the intensity of emotional expression (1-10 scale)
- **Contextual Adaptation**: Allow copilots to adapt tone based on conversation context
- **Domain-Specific Tones**: Set different tones for different topics/domains
- **Custom Tone Creation**: Create personalized tone definitions
- **Tone Suggestions**: Get AI-powered tone recommendations based on message content
- **Preview Functionality**: Preview how tone adjustments affect messages

## Command Reference

### View Tone Preferences

View your current emotional tone preferences:

```bash
aixtiv copilot emotion preferences
```

This command displays:

- Your primary tone
- Tone intensity level
- Contextual tone adjustment status
- Domain-specific tone settings
- Any custom tone rules

### Set Tone Preferences

Set your preferred emotional tone:

```bash
aixtiv copilot emotion set
```

This interactive command guides you through:

1. Selecting a primary tone from available options
2. Setting tone intensity (1-10)
3. Enabling/disabling contextual tone adjustment

### Preview Tone Adjustment

Preview how tone adjustment affects a message:

```bash
aixtiv copilot emotion preview
```

This interactive command:

1. Prompts for a message to adjust
2. Allows selection of tone type
3. Allows setting tone intensity
4. Shows both original and tone-adjusted message
5. Collects feedback on the tone adjustment

### Get Tone Suggestions

Get AI-recommended tone based on message content:

```bash
aixtiv copilot emotion suggest
```

This interactive command:

1. Prompts for a message to analyze
2. Optionally accepts conversation domain/topic
3. Analyzes message intent and sentiment
4. Recommends appropriate tone and intensity
5. Explains the reasoning behind the suggestion
6. Offers to apply the suggestion to your preferences

### Create Custom Tones

Create personalized custom tones:

```bash
aixtiv copilot emotion custom
```

This interactive command guides you through creating a custom tone:

1. Name and description for the custom tone
2. Keywords to include in responses
3. Sentence structure style selection
4. Adds the custom tone to your available options

### Set Domain-Specific Tones

Configure different tones for different conversation domains:

```bash
aixtiv copilot emotion domain
```

This interactive command:

1. Prompts for domain/topic name
2. Allows selection of tone for that domain
3. Sets tone intensity for the domain
4. Updates your domain-specific preferences

## Available Tones

The system includes a range of built-in emotional tones:

| Tone          | Description                                               |
| ------------- | --------------------------------------------------------- |
| Neutral       | Balanced, objective tone without strong emotion           |
| Professional  | Formal, business-appropriate tone with clear structure    |
| Friendly      | Warm, approachable tone that builds rapport               |
| Empathetic    | Understanding, supportive tone that acknowledges feelings |
| Enthusiastic  | Energetic, positive tone with vibrant language            |
| Direct        | Straightforward, concise tone focused on clarity          |
| Authoritative | Confident, expert tone that establishes credibility       |
| Instructive   | Educational tone ideal for tutorials and guidance         |
| Compassionate | Deeply caring tone for sensitive conversations            |
| Inspirational | Motivational tone that encourages action                  |
| Humorous      | Light, playful tone with appropriate wit                  |

Each tone can be adjusted in intensity from 1 (subtly present) to 10 (strongly emphasized).

## Tone Intensity Levels

The intensity scale affects how strongly the selected tone manifests:

- **1-3**: Subtle tone influence, primarily visible in word choice
- **4-6**: Moderate tone presence with notable emotional coloring
- **7-8**: Strong tone presence with significant emotional framing
- **9-10**: Very pronounced tone with dominant emotional characteristics

## Context-Aware Tone Adaptation

When contextual tone adjustment is enabled, the system:

1. Analyzes user messages for sentiment and intent
2. Detects conversation domain or topic
3. Considers urgency and importance indicators
4. Adapts tone to be more appropriate for the context
5. May override primary tone for specific situations
6. Applies domain-specific tones when relevant

## Domain-Specific Tones

Domain-specific tones allow different emotional tones for different conversation topics:

```
User Preferences
├── Primary Tone: Professional (Intensity: 7)
├── Contextual Adaptation: Enabled
└── Domain-Specific Tones:
    ├── technical-support: Direct (Intensity: 8)
    ├── personal-finance: Empathetic (Intensity: 6)
    └── health-wellness: Compassionate (Intensity: 9)
```

When the conversation shifts to a registered domain, the corresponding tone is applied.

## Custom Tone Creation

Custom tones can be created with:

1. **Keywords**: Words to include or emphasize in responses
2. **Sentence Structure**: Style of sentence construction
3. **Description**: How the tone should feel/sound
4. **Rules**: Special handling for certain content types

Custom tones appear alongside built-in tones in selection menus and can be set as primary or domain-specific tones.

## Integration with Other Systems

The Emotion Tuning System integrates with:

- **Copilot Preview System**: Shows tone-adjusted previews of responses
- **Speaker Recognition**: Adapts voice output to match emotional tone
- **Claude Orchestration**: Coordinates tone-aware response generation
- **Sentiment Analysis**: Detects user emotional state for context-aware adaptation

## Example Workflows

### Basic Tone Setting

1. View current preferences:
   ```bash
   aixtiv copilot emotion preferences
   ```
2. Set preferred tone:
   ```bash
   aixtiv copilot emotion set
   ```
   - Select "Friendly" tone
   - Set intensity to 6
   - Enable contextual adaptation
3. Copilot responses now use a friendly tone with medium intensity, adapting to context as needed

### Multi-Domain Configuration

1. Set primary tone:
   ```bash
   aixtiv copilot emotion set
   ```
   - Select "Professional" tone
   - Set intensity to 7
   - Enable contextual adaptation
2. Set domain-specific tones:
   ```bash
   aixtiv copilot emotion domain
   ```
   - Add "customer-support" domain with "Empathetic" tone (intensity 8)
   - Add "technical-docs" domain with "Instructive" tone (intensity 9)
3. Copilot responses now use different tones based on conversation domain

### Custom Tone Creation

1. Create custom tone:
   ```bash
   aixtiv copilot emotion custom
   ```
   - Name: "Coaching"
   - Description: "Supportive yet challenging tone that encourages growth"
   - Keywords: inspiring, challenge, potential, growth, progress
   - Sentence Structure: Balanced
2. Set as primary tone:
   ```bash
   aixtiv copilot emotion set
   ```
   - Select "Coaching" tone
   - Set intensity to 8
3. Copilot responses now use your custom coaching tone

## Best Practices

1. **Start with moderate intensity**: Begin with intensity levels 4-6 and adjust based on feedback
2. **Enable contextual adaptation**: For most natural-sounding conversations
3. **Create domain-specific tones**: For frequently discussed topics
4. **Use preview function**: Test tone adjustments before applying preferences
5. **Provide feedback**: Help the system improve tone adjustments
6. **Combine with speaker settings**: Align voice and text emotional tones
7. **Review periodically**: User preferences and needs may change over time

## Troubleshooting

| Issue                   | Solution                                               |
| ----------------------- | ------------------------------------------------------ |
| Tone too subtle         | Increase intensity level                               |
| Tone too strong         | Decrease intensity level                               |
| Inappropriate tone      | Verify domain detection is working correctly           |
| Inconsistent tone       | Check for conflicting domain-specific settings         |
| Custom tone not working | Verify keywords are appropriate for the desired effect |

## Security and Privacy

- Tone preferences are stored securely in user profiles
- Sentiment analysis is performed locally when possible
- Message content is not stored long-term
- Custom tone definitions are private to each user

## Support

For assistance with the Emotion Tuning System:

- Contact: support@coaching2100.com
- Reference: Copilot Emotion Tuning v2.0
- Documentation: https://docs.aixtiv.ai/emotion-tuning
