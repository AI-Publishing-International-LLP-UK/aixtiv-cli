# Visionary 1 Command Suite

## Overview
The `summon:visionary` command invokes the Visionary 1 Command Suite with audio and visual effects, creating an immersive experience for users.

## Usage
```bash
# Standard invocation with audio and visual effects
aixtiv summon:visionary

# Silent mode (no audio)
aixtiv summon:visionary --silent
```

## Features
- 🎶 Audio welcome sequence
- 🌈 Visual interface loading simulation
- 💼 Integration with Dr. Maria's agent profile
- 🧮 Command suggestions for related functionality

## Dependencies
This command relies on the `play-sound` npm package for audio playback. Make sure the package is installed:
```bash
npm install play-sound
```

## Troubleshooting
If audio doesn't play, ensure:
1. The audio file exists at `/assets/spring0.mp3` relative to the project root
2. Your system has a compatible audio player installed (mplayer, afplay, etc.)
3. Your system sound is enabled

## Future Enhancements
- [ ] Add customizable themes
- [ ] Integrate with real-time agent status reports
- [ ] Enable pluggable audio themes

