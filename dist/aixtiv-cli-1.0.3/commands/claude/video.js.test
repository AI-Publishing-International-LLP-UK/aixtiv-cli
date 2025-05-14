/**
 * Test command for video functionality
 * 
 * Run this command to test the video green screen functionality.
 * This will create a test session and ensure everything is working.
 */

const videoSystem = require('../../src/services/video-system');

// Create test session for validation
async function testGreenScreen() {
  console.log('Testing green screen functionality...');
  
  try {
    // Initialize the interface
    const browser = videoSystem.interface.createBrowser({
      headless: true,
      greenScreenEnabled: true,
      recordingFPS: 30
    });
    
    // Create a new page
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({
      width: 1280,
      height: 720,
      deviceScaleFactor: 1
    });
    
    // Set the background color to green
    await page.setBackgroundColor('#00FF00');
    
    // Start recording
    const recording = await page.startRecording({
      fps: 30,
      audio: false
    });
    
    if (recording) {
      console.log('✅ Green screen recording started successfully!');
      
      // Stop recording after 2 seconds
      setTimeout(async () => {
        const buffer = await page.stopRecording();
        if (buffer) {
          console.log('✅ Green screen recording stopped successfully!');
          console.log(`Video size: ${buffer.length} bytes`);
          
          // Close the browser
          await browser.close();
          console.log('✅ Browser closed successfully!');
          
          console.log('Green screen functionality test completed successfully!');
        } else {
          console.error('❌ Failed to stop recording!');
        }
      }, 2000);
    } else {
      console.error('❌ Failed to start recording!');
    }
  } catch (error) {
    console.error('❌ Error testing green screen:', error);
  }
}

// Run the test
testGreenScreen();