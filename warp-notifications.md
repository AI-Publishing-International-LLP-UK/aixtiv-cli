# Fixing Warp Terminal Notifications

This guide provides step-by-step instructions for resolving notification issues with the Warp terminal application on macOS.

## Prerequisites

- macOS operating system
- Warp terminal application installed

## Troubleshooting Steps

### 1. Verify Notification Settings

Warp requires two distinct notification settings to be enabled:

1. **macOS System Settings:**

   - Navigate to Apple menu (🍎) > System Preferences > Notifications & Focus
   - Find and select "Warp" in the application list
   - Ensure notifications are enabled
   - Enable either banner style or alert style notifications

2. **Warp Application Settings:**
   - Open Warp preferences
   - Go to Settings > Features > Session
   - Ensure notifications are enabled

### 2. Common Fixes

If notifications are still not working after verifying settings:

- **Check application focus:**

  - Ensure you are navigated away from Warp when expecting notifications
  - Warp only shows system notifications when it's not the active window

- **Verify Focus settings:**

  - Go to Apple menu (🍎) > System Preferences > Notifications & Focus > Focus
  - Make sure "Do Not Disturb" mode is turned off

- **Reset notification permissions:**
  - Open Terminal
  - Run: `defaults delete dev.warp.Warp-Stable Notifications`
  - Restart Warp
  - Toggle on Settings > Features > Receive desktop notifications from Warp

### 3. Final Steps

After trying the above solutions:

1. Save any ongoing work in Warp
2. Close Warp completely
3. Restart macOS to apply all changes
4. Launch Warp after system restart
5. Test notifications

## Additional Information

- Notification settings might need to be reconfigured after macOS updates
- Newer versions of macOS may have slightly different menu names (e.g., "Notifications & Focus" vs. "Notifications")
- If issues persist, check the Warp GitHub repository for known issues related to notifications

## Support

If you continue to experience issues with Warp notifications after following these steps, contact Warp support or check the official documentation at https://docs.warp.dev/
