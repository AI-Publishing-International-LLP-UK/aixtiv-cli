/**
 * Firebase Agent Trigger Functions
 *
 * This module provides Firebase Cloud Functions for agent triggers, scheduled operations,
 * and agent-specific integrations within the Aixtiv CLI Owner-Subscriber V1-V2 Immersive System.
 *
 * @module firebase_agent_trigger
 * @author Aixtiv Symphony Team
 * @copyright 2025 AI Publishing International LLP
 * @version 1.0.0
 */

const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { regional } = require('./config/region');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const { dispatcher } = require('../src/functions/universalDispatcher');

/**
 * Constants for agent configuration
 */
const AGENT_FAMILIES = {
  LUCY: 'lucy',
  PROFESSOR: 'professor',
  MEMORIA: 'memoria',
  GRANT: 'grant',
  MATCH: 'match',
  CYPRIOT: 'cypriot',
  MARIA: 'maria',
  BURBY: 'burby',
  SABINA: 'sabina',
  ROARK: 'roark',
  CLAUDE: 'claude',
};

/**
 * HTTP function to trigger a specific agent
 */
exports.triggerAgent = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required to trigger agents'
    );
  }

  try {
    const { agentId, prompt, options = {} } = data;

    if (!agentId || !prompt) {
      throw new functions.https.HttpsError('invalid-argument', 'Agent ID and prompt are required');
    }

    // Get agent configuration
    const agentConfig = await getAgentConfig(agentId);
    if (!agentConfig) {
      throw new functions.https.HttpsError(
        'not-found',
        `Agent ${agentId} not found or not configured`
      );
    }

    // Prepare trigger context
    const triggerContext = {
      userId: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      sessionId: options.sessionId || uuidv4(),
      promptType: options.promptType || 'user_input',
      agentFamily: agentConfig.family,
      agentSpecialization: agentConfig.specialization || 'general',
    };

    // Log the trigger
    await db.collection('agent_triggers').add({
      ...triggerContext,
      agentId,
      prompt,
      options,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Dispatch to the agent
    const result = await dispatcher.dispatch(
      {
        type: 'agent_request',
        content: prompt,
        agentId,
        targetId: options.targetId,
        metadata: {
          ...options.metadata,
          triggerContext,
        },
      },
      {
        ...options,
        userId: context.auth.uid,
      }
    );

    return result;
  } catch (error) {
    console.error('Error triggering agent:', error);

    throw new functions.https.HttpsError(
      'internal',
      error.message || 'An unknown error occurred',
      error
    );
  }
});

/**
 * Firestore trigger for automated agent responses based on chat messages
 */
exports.onChatMessageCreated = regional.firestore
  .onDocumentCreated('chats/{chatId}/messages/{messageId}', async (event) => {
    try {
      const message = event.data.data();
      const { chatId, messageId } = event.params;

      // Only process user messages
      if (message.sender_type !== 'user') {
        return null;
      }

      // Get the chat information
      const chatDoc = await db.collection('chats').doc(chatId).get();
      if (!chatDoc.exists) {
        console.log(`Chat ${chatId} not found, skipping message processing`);
        return null;
      }

      const chatData = chatDoc.data();

      // Skip if no assigned agent
      if (!chatData.assigned_agent_id) {
        console.log(`Chat ${chatId} has no assigned agent, skipping message processing`);
        return null;
      }

      // Get agent configuration
      const agentConfig = await getAgentConfig(chatData.assigned_agent_id);
      if (!agentConfig) {
        console.error(`Agent ${chatData.assigned_agent_id} not found or not configured`);
        return null;
      }

      console.log(
        `Processing message ${messageId} in chat ${chatId} for agent ${chatData.assigned_agent_id}`
      );

      // Create a session ID if not exists
      const sessionId = chatData.session_id || `chat-${chatId}-${Date.now()}`;

      // Update the chat with session ID if needed
      if (!chatData.session_id) {
        await db.collection('chats').doc(chatId).update({
          session_id: sessionId,
        });
      }

      // Store the message in chat history for memory
      await db.collection('chat_history').add({
        id: uuidv4(),
        sessionId,
        userId: message.sender_id,
        copilotId: chatData.assigned_agent_id,
        timestamp: message.timestamp || admin.firestore.FieldValue.serverTimestamp(),
        type: 'user_input',
        content: message.content,
        importance: 5, // Default importance, will be analyzed by another function
        category: 'chat',
        metadata: {
          chatId,
          messageId,
          channel: 'chat',
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Dispatch to the agent
      const dispatchResult = await dispatcher.dispatch(
        {
          type: 'agent_request',
          content: message.content,
          agentId: chatData.assigned_agent_id,
          metadata: {
            chatId,
            messageId,
            sessionId,
            isResponseToMessage: true,
          },
        },
        {
          userId: message.sender_id,
          sessionId,
        }
      );

      if (!dispatchResult.success) {
        console.error(
          `Failed to dispatch to agent ${chatData.assigned_agent_id}:`,
          dispatchResult.error
        );

        // Add a system message about the failure
        await db
          .collection('chats')
          .doc(chatId)
          .collection('messages')
          .add({
            content:
              "I'm having trouble processing your message right now. Please try again in a moment.",
            sender_id: 'system',
            sender_type: 'system',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            metadata: {
              error: true,
              errorMessage: dispatchResult.error,
            },
          });

        return null;
      }

      // Store agent response in chat
      await db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .add({
          content: dispatchResult.result.message || dispatchResult.result,
          sender_id: chatData.assigned_agent_id,
          sender_type: 'agent',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          in_response_to: messageId,
          metadata: dispatchResult.result.metadata || {},
        });

      // Store the response in chat history for memory
      await db.collection('chat_history').add({
        id: uuidv4(),
        sessionId,
        userId: message.sender_id,
        copilotId: chatData.assigned_agent_id,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'copilot_response',
        content: dispatchResult.result.message || dispatchResult.result,
        importance: 5, // Default importance, will be analyzed by another function
        category: 'chat',
        metadata: {
          chatId,
          in_response_to: messageId,
          channel: 'chat',
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update last activity timestamp
      return db
        .collection('chats')
        .doc(chatId)
        .update({
          last_activity: admin.firestore.FieldValue.serverTimestamp(),
          message_count: admin.firestore.FieldValue.increment(1),
        });
    } catch (error) {
      console.error('Error processing chat message:', error);
      return null;
    }
  });

/**
 * Scheduled function to trigger periodic agent actions
 */
exports.scheduledAgentActions = regional.scheduler
  .onSchedule('every 30 minutes', async (event) => {
    try {
      console.log('Running scheduled agent actions');

      // Get active bonded relationships
      const bonds = await db.collection('user_profiles').where('bondedCopilots', '!=', []).get();

      console.log(`Found ${bonds.size} users with bonded copilots`);

      const now = new Date();
      const actionPromises = [];

      // Process each user's bonded copilots
      for (const userDoc of bonds.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;

        if (!userData.bondedCopilots || !Array.isArray(userData.bondedCopilots)) {
          continue;
        }

        // Check each bonded copilot for scheduled actions
        for (const bond of userData.bondedCopilots) {
          // Skip if bond level is too low or if last interaction was too recent
          if (bond.bondLevel < 3 || !bond.lastInteraction) {
            continue;
          }

          const lastInteraction = new Date(bond.lastInteraction);
          const daysSinceInteraction = Math.floor((now - lastInteraction) / (1000 * 60 * 60 * 24));

          // Check if it's time for a scheduled action based on bond level
          let shouldTrigger = false;

          if (bond.bondLevel >= 5 && daysSinceInteraction >= 3) {
            // Level 5 bonds: check every 3 days
            shouldTrigger = true;
          } else if (bond.bondLevel >= 4 && daysSinceInteraction >= 7) {
            // Level 4 bonds: check every 7 days
            shouldTrigger = true;
          } else if (bond.bondLevel >= 3 && daysSinceInteraction >= 14) {
            // Level 3 bonds: check every 14 days
            shouldTrigger = true;
          }

          if (shouldTrigger) {
            console.log(
              `Scheduling action for user ${userId} with agent ${bond.copilotId} (bond level ${bond.bondLevel}, days since interaction: ${daysSinceInteraction})`
            );

            // Get agent configuration
            const agentConfig = await getAgentConfig(bond.copilotId);
            if (!agentConfig) {
              console.log(`Agent ${bond.copilotId} not found, skipping scheduled action`);
              continue;
            }

            // Generate appropriate action based on agent family
            let action;
            switch (agentConfig.family) {
              case AGENT_FAMILIES.LUCY:
                action = 'wellness_check';
                break;
              case AGENT_FAMILIES.MEMORIA:
                action = 'memory_digest';
                break;
              case AGENT_FAMILIES.GRANT:
                action = 'project_update';
                break;
              case AGENT_FAMILIES.MATCH:
                action = 'creative_prompt';
                break;
              default:
                action = 'check_in';
            }

            // Schedule the action
            actionPromises.push(
              db.collection('scheduled_agent_actions').add({
                userId,
                agentId: bond.copilotId,
                action,
                scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'pending',
                triggerReason: 'automated_bond_maintenance',
                bondLevel: bond.bondLevel,
                daysSinceInteraction,
                metadata: {
                  agentFamily: agentConfig.family,
                  specializations: bond.specializations || [],
                },
              })
            );
          }
        }
      }

      // Wait for all actions to be scheduled
      await Promise.all(actionPromises);

      console.log(`Scheduled ${actionPromises.length} agent actions`);

      return { scheduled: actionPromises.length };
    } catch (error) {
      console.error('Error in scheduled agent actions:', error);
      return { error: error.message };
    }
  });

/**
 * Firestore trigger to process scheduled agent actions
 */
exports.processScheduledAgentActions = regional.firestore
  .onDocumentCreated('scheduled_agent_actions/{actionId}', async (event) => {
    try {
      const actionData = event.data.data();
      
      // Skip if already processed
      if (actionData.status !== 'pending') {
        return null;
      }
      
      console.log(
        `Processing scheduled action ${event.params.actionId} for agent ${actionData.agentId}`
      );

      // Get agent configuration
      const agentConfig = await getAgentConfig(actionData.agentId);
      if (!agentConfig) {
        console.error(`Agent ${actionData.agentId} not found or not configured`);

        return event.data.ref.update({
          status: 'failed',
          error: `Agent ${actionData.agentId} not found or not configured`,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Get user preferences to see if automated actions are enabled
      const userDoc = await db.collection('user_profiles').doc(actionData.userId).get();

      if (!userDoc.exists) {
        console.log(`User ${actionData.userId} not found, skipping scheduled action`);

        return event.data.ref.update({
          status: 'cancelled',
          reason: 'user_not_found',
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      const userData = userDoc.data();

      // Check if automated actions are disabled
      if (userData.preferences && userData.preferences.agentAutomation === false) {
        console.log(`Automated actions disabled for user ${actionData.userId}, skipping`);

        return event.data.ref.update({
          status: 'cancelled',
          reason: 'automation_disabled',
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Generate prompt based on action type
      let prompt;
      let notificationType;

      switch (actionData.action) {
        case 'wellness_check':
          prompt = generateWellnessCheckPrompt(userData, actionData);
          notificationType = 'wellness_check';
          break;
        case 'memory_digest':
          prompt = generateMemoryDigestPrompt(userData, actionData);
          notificationType = 'memory_digest';
          break;
        case 'project_update':
          prompt = generateProjectUpdatePrompt(userData, actionData);
          notificationType = 'project_update';
          break;
        case 'creative_prompt':
          prompt = generateCreativePromptPrompt(userData, actionData);
          notificationType = 'creative_prompt';
          break;
        case 'check_in':
          prompt = generateCheckInPrompt(userData, actionData);
          notificationType = 'check_in';
          break;
        default:
          prompt = `Hello ${userData.displayName || 'there'}! I noticed it's been a while since we last connected. Is there anything I can help you with today?`;
          notificationType = 'general_check_in';
      }

      // Create a new notification
      const notificationId = uuidv4();
      await db
        .collection('user_notifications')
        .doc(notificationId)
        .set({
          userId: actionData.userId,
          type: notificationType,
          title: `Message from ${agentConfig.name || actionData.agentId}`,
          content: prompt,
          agentId: actionData.agentId,
          read: false,
          actionable: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          metadata: {
            actionId: event.params.actionId,
            agentFamily: agentConfig.family,
            bondLevel: actionData.bondLevel,
          },
        });

      // Update action status
      return event.data.ref.update({
        status: 'completed',
        notificationId,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error processing scheduled agent action:', error);

      return event.data.ref.update({
        status: 'failed',
        error: error.message || 'An unknown error occurred',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

/**
 * Helper function to get agent configuration
 * @param {string} agentId - The ID of the agent
 * @returns {Promise<Object|null>} - Agent configuration or null if not found
 */
async function getAgentConfig(agentId) {
  try {
    // Check agent cards collection first
    const cardDoc = await db.collection('agent_cards').doc(agentId).get();

    if (cardDoc.exists) {
      return cardDoc.data().agentProfile;
    }

    // Fall back to agents collection
    const agentDoc = await db.collection('agents').doc(agentId).get();

    if (agentDoc.exists) {
      return agentDoc.data();
    }

    // Check config file
    const configDoc = await db.collection('config').doc('agents').get();

    if (configDoc.exists) {
      const agents = configDoc.data().agents || [];
      const agent = agents.find((a) => a.id === agentId);

      if (agent) {
        return agent;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting agent configuration:', error);
    return null;
  }
}

/**
 * Helper functions to generate prompts based on action type
 */
function generateWellnessCheckPrompt(userData, actionData) {
  const userName = userData.displayName || 'there';
  return `Hello ${userName}! I'm checking in to see how you're doing. It's been ${actionData.daysSinceInteraction} days since we last spoke. How has your well-being been lately? Is there anything specific you'd like to discuss about your health or wellness goals?`;
}

function generateMemoryDigestPrompt(userData, actionData) {
  const userName = userData.displayName || 'there';
  return `Hello ${userName}! I've compiled some highlights from our past interactions that might be valuable to revisit. It's been ${actionData.daysSinceInteraction} days since we last connected. Would you like me to share this memory digest with you?`;
}

function generateProjectUpdatePrompt(userData, actionData) {
  const userName = userData.displayName || 'there';
  return `Hello ${userName}! I noticed it's been ${actionData.daysSinceInteraction} days since we last discussed your projects. Would you like to provide any updates or discuss current project priorities?`;
}

function generateCreativePromptPrompt(userData, actionData) {
  const userName = userData.displayName || 'there';
  return `Hello ${userName}! I thought you might enjoy a creative prompt to spark some inspiration. It's been ${actionData.daysSinceInteraction} days since our last creative session. Would you like me to share a tailored creative challenge with you?`;
}

function generateCheckInPrompt(userData, actionData) {
  const userName = userData.displayName || 'there';
  return `Hello ${userName}! I noticed it's been ${actionData.daysSinceInteraction} days since we last connected. I'm checking in to see if there's anything I can assist you with. How have you been?`;
}
