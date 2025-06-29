# Copilot Commands

## Overview

The copilot commands provide a suite of tools for managing and interacting with AI copilots in the Aixtiv CLI ecosystem. These commands enable linking copilots to principals, managing voice capabilities, speaker recognition, response previews, and emotional tuning.

## Command Categories

### Core Copilot Management

- `copilot:link` - Link a copilot to a principal
- `copilot:unlink` - Unlink a copilot from a principal
- `copilot:list` - List copilots linked to a principal
- `copilot:verify` - Verify copilot identity and cultural empathy
- `copilot:grant` - Grant copilot access to a resource
- `copilot:expiration` - Set an expiration period for a copilot relationship

### Voice & Speech Capabilities

- `copilot:voice` - Speech capabilities using Google STT/TTS with personalization
- `copilot:speaker` - Speaker recognition for voice biometrics

### User Experience Enhancement

- `copilot:preview` - Copilot response preview panel with transparency features
- `copilot:emotion` - Agent emotion tuner for tone adjustment

## Usage Examples

### Core Copilot Management

```bash
# Link a copilot to a principal
aixtiv copilot:link --email pr@coaching2100.com --copilot lucy

# Link with enhanced access level
aixtiv copilot:link --email pr@coaching2100.com --copilot grant@drgrant.live --level executive

# List all copilots
aixtiv copilot:list

# List copilots for a specific principal
aixtiv copilot:list --email pr@coaching2100.com

# Verify copilot for higher access levels
aixtiv copilot:verify --email lucy@drlucy.live --principal pr@coaching2100.com

# Grant copilot access to a resource
aixtiv copilot:grant --email pr@coaching2100.com --copilot lucy --resource pr-2bd91160bf21ba21 --type delegated

# Unlink a copilot
aixtiv copilot:unlink --email pr@coaching2100.com --copilot lucy

# Set expiration for a copilot relationship
aixtiv copilot:expiration --email pr@coaching2100.com --copilot lucy --period 30 --unit days
```

### Voice & Speech Management

```bash
# Convert text to speech with personalization
aixtiv copilot:voice --action speak --text "Hello, how can I help you today?" --output output.mp3 --copilotId lucy

# Transcribe audio to text
aixtiv copilot:voice --action transcribe --file input.wav

# Create a speaker profile
aixtiv copilot:speaker --action create-profile --email user@example.com --name "User's Voice"

# Enroll a speaker with audio
aixtiv copilot:speaker --action enroll --profileId profile123 --file voice-sample.wav --phrase "My voice is my passport"

# Verify a speaker against their profile
aixtiv copilot:speaker --action verify --profileId profile123 --file verification.wav
```

### User Experience Enhancement

```bash
# Preview a copilot response before delivery
aixtiv copilot:preview --action create --userId user123 --copilotId lucy --message "How do I optimize my website?"

# Approve a preview
aixtiv copilot:preview --action approve --previewId preview123 --note "This looks good"

# Request changes to a preview
aixtiv copilot:preview --action request-changes --previewId preview123 --feedback "Please make the tone more professional"

# Adjust copilot emotional tone
aixtiv copilot:emotion
```

## Integration Points

The copilot commands integrate with several other system components:

- **SallyPort Security Framework**: For authentication and resource access control
- **Speech Services**: For voice-related capabilities
- **Dr. Claude Agents**: For specialized copilot functions
- **Universal Dispatcher**: For routing actions to the appropriate services
- **Symphony Interface**: For seamless user experience

## Documentation

For more detailed information on specific commands, see:

- [Speaker Recognition](../docs/SPEAKER_RECOGNITION.md)
- [Copilot Voice Documentation](../docs/COPILOT_VOICE.md)
- [Copilot Preview System](../docs/COPILOT_PREVIEW.md)
- [Emotion Tuning Framework](../docs/EMOTION_TUNING.md)

## Security Considerations

- Copilot access is managed through SallyPort security
- Voice biometrics provide an additional layer of security
- All API communications are encrypted
- Access tokens have configurable expiration periods
- Resource access is controlled via explicit grants

## Development Notes

When adding new copilot commands, follow these guidelines:

1. Use consistent option naming across commands
2. Implement interactive mode for better user experience
3. Include proper error handling and user feedback
4. Document new capabilities in this README
5. Update relevant integration points

## Contact

- Technical Lead: Phillip Roark (pr@coaching2100.com)
- Support: support@coaching2100.com
