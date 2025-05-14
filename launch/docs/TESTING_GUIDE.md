# Aixtiv CLI Testing Guide

This guide provides instructions for testing the Aixtiv CLI and its Elite Enhancements.

## Available Test Commands

- `npm test` - Run all Jest tests
- `npm run test:speaker-recognition` - Test speaker recognition functionality
- `npm run test:emotion-tuning` - Test emotion tuning core functionality
- `npm run test:emotion-tuning:speech` - Test emotion tuning with speech integration
- `npm run test:emotion-tuning:all` - Run all emotion tuning tests
- `npm run cicd:test:speaker-recognition` - Run speaker recognition tests for CI/CD
- `npm run cicd:test:emotion-tuning` - Run emotion tuning tests with CI/CD integration
- `npm run cicd:test:pre-rotation` - Test security before key rotation
- `npm run cicd:test:post-rotation` - Test security after key rotation

## Test Requirements

- Audio files for speaker recognition tests should be in the `/test/test-audio` directory
- Speaker profiles will be created during testing
- Test output will be displayed in the console

## Adding New Tests

1. Create test files in the `/test` directory
2. Follow the existing patterns for test organization
3. Use descriptive test names to make debugging easier
4. Add new test commands to `package.json` as needed

## Test Output

Test output includes:
- Pass/fail status for each test
- Detailed information about test failures
- Summary of tests run, passed, and failed
