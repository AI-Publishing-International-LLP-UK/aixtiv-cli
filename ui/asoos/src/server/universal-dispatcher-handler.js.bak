const fetch = require('node-fetch');
const { admin } = require('../../../lib/firestore');
const { logAgentAction } = require('../../../lib/agent-tracking');
const telemetry = require('../../../lib/telemetry');

/**
 * Universal Dispatcher Handler
 * Provides API endpoints for the React UI to interact with Universal Dispatcher
 */

// Environment variables
const CLAUDE_API_ENDPOINT =
  process.env.CLAUDE_API_ENDPOINT ||
  process.env.DR_CLAUDE_API ||
  'https://us-west1-aixtiv-symphony.cloudfunctions.net';
const UNIVERSAL_DISPATCHER_ENDPOINT = `${CLAUDE_API_ENDPOINT}/dr-claude/universal-dispatcher`;

// Process a message through the Universal Dispatcher
const processMessage = async (req, res) => {
  try {
    const { message, userId, agentId, operation = 'process-message' } = req.body;

    // Validate required parameters
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    // Record in telemetry
    telemetry.recordRequest('universal-dispatcher:process-message');

    // Create payload for Universal Dispatcher
    const payload = {
      message,
      principal: userId,
      agentId: agentId || 'dr-claude-orchestrator',
      operation,
      timestamp: new Date().toISOString(),
    };

    // Get antropic API key from environment or config
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY || process.env.DR_CLAUDE_API || '';

    // Call Universal Dispatcher API
    const response = await fetch(UNIVERSAL_DISPATCHER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'x-agent-id': agentId || 'dr-claude-orchestrator',
      },
      body: JSON.stringify(payload),
    });

    // Parse API response
    const apiResponse = await response.json();

    // Log agent action for tracking
    await logAgentAction('message_processed', {
      principal: userId,
      agent_id: agentId,
      message_length: message.length,
      success: apiResponse.success,
    });

    // Add emotion & tone detection
    let processedResponse = {
      ...apiResponse,
      emotion: detectEmotion(apiResponse.text || apiResponse.message || ''),
      tone: detectTone(apiResponse.text || apiResponse.message || ''),
    };

    // Return response to client
    return res.status(response.ok ? 200 : 400).json(processedResponse);
  } catch (error) {
    console.error('Error processing message:', error);
    telemetry.recordError('universal-dispatcher:process-message', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error processing message',
    });
  }
};

// Get tasks (S2DOs) for a user/agent
const getTasks = async (req, res) => {
  try {
    const { userId, agentId } = req.query;

    // Validate required parameters
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // Record in telemetry
    telemetry.recordRequest('universal-dispatcher:get-tasks');

    // Query Firestore for tasks
    const tasksRef = admin.firestore().collection('s2doTasks');
    let query = tasksRef.where('principal', '==', userId);

    // Filter by agent if provided
    if (agentId) {
      query = query.where('agentId', '==', agentId);
    }

    // Get the tasks
    const tasksSnapshot = await query.get();

    // Format tasks for the response
    const tasks = [];
    tasksSnapshot.forEach((doc) => {
      const task = doc.data();
      tasks.push({
        id: doc.id,
        content: task.description || task.content,
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        createdAt: task.createdAt?.toDate() || new Date(),
        updatedAt: task.updatedAt?.toDate() || new Date(),
        agentId: task.agentId,
      });
    });

    // Return tasks
    return res.status(200).json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error('Error getting tasks:', error);
    telemetry.recordError('universal-dispatcher:get-tasks', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error getting tasks',
    });
  }
};

// Update a task status
const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, userId } = req.body;

    // Validate required parameters
    if (!taskId || !status || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Task ID, status, and user ID are required',
      });
    }

    // Record in telemetry
    telemetry.recordRequest('universal-dispatcher:update-task');

    // Get the task
    const taskRef = admin.firestore().collection('s2doTasks').doc(taskId);
    const taskDoc = await taskRef.get();

    // Check if task exists and belongs to the user
    if (!taskDoc.exists || taskDoc.data().principal !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or access denied',
      });
    }

    // Update the task
    await taskRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log agent action for tracking
    await logAgentAction('task_updated', {
      principal: userId,
      task_id: taskId,
      new_status: status,
    });

    // Return success
    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
    });
  } catch (error) {
    console.error('Error updating task:', error);
    telemetry.recordError('universal-dispatcher:update-task', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error updating task',
    });
  }
};

/**
 * Detect emotion from text response
 * @param {string} text - Response text
 * @returns {string} Emoji representing detected emotion
 */
function detectEmotion(text) {
  // Simple emotion detection based on keywords
  const emotionMap = {
    '😊': ['happy', 'excited', 'great', 'good', 'pleasure', 'wonderful'],
    '🤔': ['think', 'consider', 'curious', 'wonder', 'question'],
    '📊': ['analyze', 'data', 'statistics', 'metrics', 'performance'],
    '📝': ['plan', 'task', 'schedule', 'organize', 'list'],
    '🔍': ['search', 'find', 'look', 'examine', 'investigate'],
    '⚠️': ['warning', 'caution', 'careful', 'alert', 'attention'],
    '👍': ['approve', 'confirm', 'agree', 'recommend', 'perfect'],
  };

  // Default emotion
  let detectedEmotion = '😊';

  // Check for each emotion's keywords
  for (const [emotion, keywords] of Object.entries(emotionMap)) {
    if (keywords.some((keyword) => text.toLowerCase().includes(keyword))) {
      detectedEmotion = emotion;
      break;
    }
  }

  return detectedEmotion;
}

/**
 * Detect tone from text response
 * @param {string} text - Response text
 * @returns {string} Detected tone
 */
function detectTone(text) {
  // Simple tone detection
  const toneMap = {
    professional: ['I would recommend', 'The analysis shows', 'data indicates', 'professional'],
    friendly: ['happy to help', 'glad to', 'wonderful', 'sure thing', 'absolutely'],
    technical: ['technical', 'implementation', 'algorithm', 'function', 'parameter'],
  };

  // Default tone
  let detectedTone = 'professional';

  // Check for each tone's keywords
  for (const [tone, keywords] of Object.entries(toneMap)) {
    if (keywords.some((keyword) => text.toLowerCase().includes(keyword))) {
      detectedTone = tone;
      break;
    }
  }

  return detectedTone;
}

module.exports = {
  processMessage,
  getTasks,
  updateTask,
};
