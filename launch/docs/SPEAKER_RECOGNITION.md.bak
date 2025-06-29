# Speaker Recognition System

## Overview

The Speaker Recognition System provides voice biometric capabilities for aixtiv-cli, allowing you to create speaker profiles, enroll voice samples, verify identities, and identify speakers based on their voice patterns. This technology enables secure, voice-based authentication and personalization for copilot interactions.

## Key Features

- **Speaker Profiles**: Create and manage unique voice profiles for users
- **Voice Enrollment**: Enroll users with multiple voice samples to improve recognition accuracy
- **Voice Verification**: Verify a user's identity by comparing their voice to an enrolled profile
- **Speaker Identification**: Identify an unknown speaker from a set of enrolled profiles
- **Multi-language Support**: Support for multiple languages and locales
- **Quality Analysis**: Automatic analysis of audio quality for optimal performance
- **Interactive Workflow**: Guided enrollment and verification processes
- **SallyPort Integration**: Seamless integration with SallyPort security framework

## Prerequisites

Before using the Speaker Recognition System, ensure that:

1. You have access to the Speech Service backend
2. Audio files are in a supported format (WAV, 16-bit PCM, 16kHz mono recommended)
3. Recording environment is relatively quiet for best results
4. Users understand the phrases they need to speak for enrollment

## Command Usage

### Create a Speaker Profile

Create a new speaker profile that will store a user's voice characteristics:

```bash
aixtiv copilot speaker --action create-profile --userId <id> [--name "Display Name"] [--description "Description"] [--locale "en-US"]
```

**Parameters:**

- `--userId`: Required. Unique identifier for the user
- `--name`: Optional. Human-readable name for the profile
- `--description`: Optional. Description or notes about this profile
- `--locale`: Optional. Language locale (en-US, en-GB, es-ES, fr-FR, de-DE, etc.)
- `--nonInteractive`: Optional. Skip interactive prompts

**Example:**

```bash
aixtiv copilot speaker --action create-profile --userId john.doe --name "John Doe" --locale "en-US"
```

**Output:**
The command will return a Profile ID that's needed for subsequent operations.

### Enroll a Speaker

Add voice samples to a speaker profile to improve recognition accuracy:

```bash
aixtiv copilot speaker --action enroll --profileId <id> --file <audio-path> [--phrase "Enrollment phrase"]
```

**Parameters:**

- `--profileId`: Required. The speaker profile ID from create-profile
- `--file`: Required. Path to audio file (WAV format recommended)
- `--phrase`: Optional, but recommended. The text that was spoken in the audio
- `--nonInteractive`: Optional. Skip interactive prompts

**Example:**

```bash
aixtiv copilot speaker --action enroll --profileId speaker-123 --file /path/to/enrollment.wav --phrase "My voice is my passport"
```

**Notes:**

- Multiple enrollments improve accuracy (3-5 samples recommended)
- Vary phrases for text-independent speaker recognition
- Use consistent phrases for text-dependent verification

### Verify a Speaker

Verify a user's identity against their enrolled profile:

```bash
aixtiv copilot speaker --action verify --profileId <id> --file <audio-path> [--phrase "Expected phrase"]
```

**Parameters:**

- `--profileId`: Required. The speaker profile to verify against
- `--file`: Required. Path to audio file for verification
- `--phrase`: Optional. Expected phrase if using text-dependent verification

**Example:**

```bash
aixtiv copilot speaker --action verify --profileId speaker-123 --file /path/to/verification.wav
```

**Output:**

- Verification result (verified or not)
- Confidence score (0.0-1.0)
- Threshold used for decision

### Identify a Speaker

Identify an unknown speaker from a set of profiles:

```bash
aixtiv copilot speaker --action identify --file <audio-path> [--profiles "id1,id2,id3"]
```

**Parameters:**

- `--file`: Required. Path to audio file for identification
- `--profiles`: Optional. Comma-separated list of profile IDs to check. If omitted, all accessible profiles will be checked.

**Example:**

```bash
aixtiv copilot speaker --action identify --file /path/to/unknown.wav --profiles "speaker-123,speaker-456,speaker-789"
```

**Output:**

- Top matching profile if identified
- Confidence scores for potential matches
- Listing of other potential matches

### List Speaker Profiles

List all speaker profiles for a specific user:

```bash
aixtiv copilot speaker --action list-profiles --userId <id>
```

**Parameters:**

- `--userId`: Required. User ID to list profiles for

**Example:**

```bash
aixtiv copilot speaker --action list-profiles --userId john.doe
```

**Output:**

- List of profiles with their status, name, and enrollment progress

### Get Profile Details

Get detailed information about a specific speaker profile:

```bash
aixtiv copilot speaker --action profile-details --profileId <id>
```

**Parameters:**

- `--profileId`: Required. The speaker profile ID to view

**Example:**

```bash
aixtiv copilot speaker --action profile-details --profileId speaker-123
```

**Output:**

- Detailed profile information including:
  - Enrollment status
  - Creation and update dates
  - Enrolled phrases
  - Recent verification attempts

### Delete a Speaker Profile

Delete a speaker profile and all associated voice data:

```bash
aixtiv copilot speaker --action delete-profile --profileId <id>
```

**Parameters:**

- `--profileId`: Required. The speaker profile ID to delete

**Example:**

```bash
aixtiv copilot speaker --action delete-profile --profileId speaker-123
```

**Note:** This operation is irreversible. A confirmation prompt will appear unless `--nonInteractive` is used.

## Voice Recognition Workflow

### Typical Enrollment Workflow

1. **Create a profile**:

   ```bash
   aixtiv copilot speaker --action create-profile --userId john.doe
   ```

2. **Enroll multiple voice samples**:

   ```bash
   aixtiv copilot speaker --action enroll --profileId <id> --file sample1.wav --phrase "My voice is my passport"
   aixtiv copilot speaker --action enroll --profileId <id> --file sample2.wav --phrase "Verify me"
   aixtiv copilot speaker --action enroll --profileId <id> --file sample3.wav --phrase "Access granted"
   ```

3. **Check enrollment status**:
   ```bash
   aixtiv copilot speaker --action profile-details --profileId <id>
   ```

### Verification Workflow

1. **Capture verification audio sample**
2. **Verify against profile**:
   ```bash
   aixtiv copilot speaker --action verify --profileId <id> --file verification.wav
   ```
3. **Process result based on confidence score**

## Understanding Results

### Enrollment Quality

Enrollment quality is rated on a scale of 0-100%:

- **90-100%**: Excellent - High-quality audio with clear speech
- **70-89%**: Good - Acceptable quality for recognition
- **Below 70%**: Poor - Consider re-recording in a quieter environment

### Verification Confidence

Verification confidence scores indicate match probability:

- **80-100%**: Strong match - High confidence
- **60-79%**: Moderate match - Be cautious
- **Below 60%**: Weak match - Consider additional verification

## Integration with Copilots

The Speaker Recognition System integrates with copilots to enable:

1. **Voice-based authentication** - Verify user identity before granting access
2. **Personalized voice responses** - Customize copilot responses based on the speaker
3. **Multi-user environments** - Switch between users automatically based on voice
4. **Security enhancements** - Add voice as a biometric factor in authentication

## Integration Notes

### Adding Speaker Recognition to Applications

To integrate speaker recognition into your applications:

1. Import the speech service:

```javascript
const speechService = require('path/to/speech');
```

2. Create profiles and enroll voices:

```javascript
// Create a profile
const profile = await speechService.createSpeakerProfile(userId, {
  displayName: "User's Voice Profile",
  description: 'Mobile authentication',
  locale: 'en-US',
});

// Enroll voice samples
for (const audioSample of voiceSamples) {
  await speechService.enrollSpeaker(profile.profileId, audioSample, phrase);
}
```

3. Verify or identify speakers:

```javascript
// Verify a claimed identity
const verificationResult = await speechService.verifySpeaker(profileId, audioSample);
if (verificationResult.verified) {
  // Access granted
} else {
  // Access denied
}

// Identify an unknown speaker
const identificationResult = await speechService.identifySpeaker(audioSample);
if (identificationResult.identified) {
  const topMatch = identificationResult.matches[0];
  // Found user: topMatch.profileId with confidence: topMatch.confidence
}
```

## Best Practices

1. **Audio Quality**:

   - Use a good quality microphone
   - Record in a quiet environment
   - Maintain consistent distance from microphone

2. **Enrollment**:

   - Enroll with 3-5 different phrases for best results
   - Re-enroll periodically as voices can change over time
   - Include natural variations in speaking style

3. **Verification**:

   - Set confidence thresholds appropriate for security needs
   - Consider environmental factors when verifying
   - Use longer phrases for more secure verification

4. **Privacy & Security**:
   - Inform users about voice data collection
   - Store profile IDs securely
   - Implement proper access controls

## Security Considerations

1. **Storage**: Voice profiles and audio samples are stored securely in Firestore and local encrypted storage
2. **Verification Threshold**: Adjust the verification threshold based on security requirements
3. **Spoofing Detection**: The system includes basic spoofing detection capability
4. **Multi-factor**: Combine voice biometrics with other authentication factors for enhanced security

## Troubleshooting

### Common Issues

| Issue                     | Possible Solution                                                   |
| ------------------------- | ------------------------------------------------------------------- |
| Low quality score         | Record in a quieter environment; speak clearly and at normal volume |
| Failed verifications      | Ensure profile has sufficient enrollments; check audio quality      |
| "Profile not found" error | Verify the profileId is correct and the profile hasn't been deleted |
| Slow processing           | Check network connection; ensure audio file isn't excessively large |

### Audio Requirements

For optimal results:

- File format: WAV (16-bit PCM)
- Sample rate: 16kHz or higher
- Channels: Mono
- Duration: 2-10 seconds of speech
- Signal-to-noise ratio: As high as possible

## Testing

A test script is provided to validate the speaker recognition functionality:

```bash
node test/speech-system-test.js
```

## Future Enhancements

- Enhanced anti-spoofing detection
- Support for additional languages
- Integration with FIDO2 authentication
- Transfer learning for faster enrollment

## See Also

- [Copilot Voice Documentation](COPILOT_VOICE.md)
- [Speech Service Implementation](../src/services/speech/index.js)
- [Symphony Implementation Guide](../SYMPHONY_IMPLEMENTATION_GUIDE.md)
