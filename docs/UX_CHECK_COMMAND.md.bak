# Dr. Match UX Check Command Documentation

## Overview

The `claude:ux-check` command is a powerful visual UX review and assessment tool integrated with Dr. Match agent capabilities. It implements the Phase II "Visual Check" overlay tool for reviewing UX before go-live, helping teams identify and resolve user experience issues before deploying to production.

## Key Features

- **Screenshot Analysis**: Upload and analyze UI screenshots for UX issues
- **Live URL Review**: Review live websites with interactive overlay tools
- **UX Scoring**: Get quantitative assessment of accessibility, usability, and visual design
- **Issue Detection**: Identify specific UX issues with severity ratings and recommendations
- **Before/After Comparison**: Compare UX changes between iterations
- **Visual Overlays**: Apply grid, accessibility markers, and tap target overlays

## Prerequisites

Before using the UX Check tool, ensure that:

1. You have a Firebase project set up with Storage enabled
2. The Dr. Match agent service is properly configured
3. Your environment has the necessary permissions to upload files to Firebase Storage

## Command Usage

### Create a UX Review Session

Start by creating a session that will track all your UX review activities:

```bash
aixtiv claude ux-check --action create-session --userId <id> [--deviceType <type>] [--screenType <type>]
```

**Parameters:**

- `--userId`: Required. User identifier for tracking
- `--deviceType`: Optional. Device type for responsive design testing (desktop, tablet, mobile)
- `--screenType`: Optional. Screen type being tested (dashboard, product, checkout, etc.)
- `--showGrid`: Optional. Show grid overlay (true/false)
- `--showAccessibility`: Optional. Show accessibility markers (true/false)
- `--showTapTargets`: Optional. Show tap target areas (true/false)
- `--recordInteractions`: Optional. Record user interactions (true/false)

**Example:**

```bash
aixtiv claude ux-check --action create-session --userId john.doe --deviceType mobile --screenType checkout
```

### Check Screenshot for UX Issues

Upload and analyze a screenshot for UX issues:

```bash
aixtiv claude ux-check --action check-screenshot --session <id> --screenshot <path> [options]
```

**Parameters:**

- `--session`: Required. Session ID from create-session
- `--screenshot`: Required. Path to screenshot file (PNG or JPG)
- `--name`: Optional. Name for the review
- `--description`: Optional. Description for the review
- `--reviewType`: Optional. Review type (standard, accessibility, performance)
- `--showGrid`: Optional. Show grid overlay (true/false)
- `--showAccessibility`: Optional. Show accessibility markers (true/false)
- `--showTapTargets`: Optional. Show tap target areas (true/false)

**Example:**

```bash
aixtiv claude ux-check --action check-screenshot --session abc123 --screenshot /path/to/checkout-screen.png --reviewType accessibility
```

### Check Live URL for UX Issues

Review a live URL with interactive overlay tools:

```bash
aixtiv claude ux-check --action check-live --session <id> --url <url> [options]
```

**Parameters:**

- `--session`: Required. Session ID from create-session
- `--url`: Required. URL to check
- `--deviceType`: Optional. Device type to simulate
- `--showGrid`: Optional. Show grid overlay (true/false)
- `--showAccessibility`: Optional. Show accessibility markers (true/false)
- `--showTapTargets`: Optional. Show tap target areas (true/false)

**Example:**

```bash
aixtiv claude ux-check --action check-live --session abc123 --url https://example.com/checkout --deviceType mobile
```

### Check Review Status

Check the status of a review job:

```bash
aixtiv claude ux-check --action review-status --review <id>
```

**Parameters:**

- `--review`: Required. Review ID from check-screenshot or check-live

**Example:**

```bash
aixtiv claude ux-check --action review-status --review rev_12345
```

### Get Detailed Review Issues

Get detailed information about detected UX issues:

```bash
aixtiv claude ux-check --action get-issues --review <id>
```

**Parameters:**

- `--review`: Required. Review ID from check-screenshot or check-live

**Example:**

```bash
aixtiv claude ux-check --action get-issues --review rev_12345
```

### Compare Before/After Reviews

Compare two UX reviews to see improvements or regressions:

```bash
aixtiv claude ux-check --action compare --before <id> --after <id>
```

**Parameters:**

- `--before`: Required. Review ID for the "before" state
- `--after`: Required. Review ID for the "after" state

**Example:**

```bash
aixtiv claude ux-check --action compare --before rev_before --after rev_after
```

## UX Review Workflow

A typical UX review workflow:

1. **Create a session**:

   ```bash
   aixtiv claude ux-check --action create-session --userId designer1 --deviceType desktop
   ```

2. **Analyze a screenshot**:

   ```bash
   aixtiv claude ux-check --action check-screenshot --session [SESSION_ID] --screenshot dashboard.png
   ```

3. **Check review status until complete**:

   ```bash
   aixtiv claude ux-check --action review-status --review [REVIEW_ID]
   ```

4. **Get detailed issues**:

   ```bash
   aixtiv claude ux-check --action get-issues --review [REVIEW_ID]
   ```

5. **Fix issues and create new screenshot**

6. **Upload the new screenshot**:

   ```bash
   aixtiv claude ux-check --action check-screenshot --session [SESSION_ID] --screenshot dashboard-fixed.png
   ```

7. **Compare the before and after**:
   ```bash
   aixtiv claude ux-check --action compare --before [FIRST_REVIEW_ID] --after [SECOND_REVIEW_ID]
   ```

## UX Score Interpretation

The UX Review provides scores in several categories:

- **Accessibility Score**: Measures compliance with accessibility standards (WCAG)
- **Usability Score**: Measures ease of use, clarity, and user flow
- **Visual Design Score**: Measures aesthetics, consistency, and brand alignment
- **Overall Score**: Weighted average of all scores

Score ranges:

- 90-100: Excellent
- 80-89: Good
- 70-79: Acceptable
- 60-69: Needs Improvement
- Below 60: Poor

## Troubleshooting

### Common Issues

1. **File upload failures**:

   - Ensure Firebase Storage permissions are correctly configured
   - Check that the file format is supported (PNG or JPG)

2. **Review processing delays**:

   - Large screenshots may take longer to process
   - Check review status periodically with `review-status` command

3. **Empty issues list**:
   - If no issues are found, it could mean excellent design or incorrect configuration
   - Try adjusting the review type parameter for different analysis focus

### Support

For technical issues with the UX Check tool, contact:

- Technical support: support@coaching2100.com
- Dr. Match team: drmatch@coaching2100.com

## Integration

The UX Check command integrates with the following systems:

- **Dr. Match Agent**: Powers the UX analysis with specialized AI capabilities
- **Firebase Storage**: Stores screenshots and generated overlay images
- **Video System**: Processes screenshots and generates visual overlays
- **UX Preview Service**: Manages the UX review workflow and sessions

## See Also

- [Symphony Implementation Guide](../SYMPHONY_IMPLEMENTATION_GUIDE.md)
- [Video System Documentation](VIDEO_SYSTEM_FIX.md)
- [Dr. Match Assignment](DR_MATCH_ASSIGNMENT.md)
