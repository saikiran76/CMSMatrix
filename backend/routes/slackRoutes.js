import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getSlackClient } from '../services/slackService.js';
import { analyzeSentiment, categorizeMessage, generateMessageSummary } from '../services/matrixService.js'; // reuse AI logic
import { calculateMessagePriority } from '../services/matrixService.js'; // reuse priority logic

const router = express.Router();

router.use(authenticateToken);

const userCache = new Map();

async function resolveSlackUserIds(text, slack) {
  // Find all user mentions like <@U123ABC>
  const userMentions = text.match(/<@([A-Z0-9]+)>/g);
  if (!userMentions) return text;

  for (const mention of userMentions) {
    const userId = mention.slice(2, -1); // Extract ID from <@U123ABC>
    if (!userCache.has(userId)) {
      // Fetch user info
      const userInfo = await slack.users.info({ user: userId });
      if (userInfo.ok && userInfo.user) {
        userCache.set(userId, userInfo.user.real_name || userInfo.user.name);
      } else {
        userCache.set(userId, userId); // fallback to userId if no info
      }
    }
    const displayName = userCache.get(userId);
    // Replace the mention in the text
    text = text.replace(mention, displayName);
  }
  return text;
}

// GET /slack/channels - List all channels
router.get('/channels', async (req, res) => {
  try {
    const slack = getSlackClient();
    const response = await slack.conversations.list({
      limit: 100,
      types: 'public_channel,private_channel'
    });
    console.log('Full Slack response:', JSON.stringify(response, null, 2));
    
    if (!response.ok) {
      throw new Error('Failed to fetch Slack channels');
    }

    if (!response.channels) {
      console.log('No channels field in response:', response);
      return res.json([]);
    }

    // Normalize channel data
    const channels = response.channels.map(ch => ({
      id: ch.id,
      name: ch.name,
      isMember: ch.is_member,
      created: new Date(ch.created * 1000),
      isActive: true,
      memberCount: ch.num_members || 0
    }));

    console.log('Slack channels:', channels);

    // Return the normalized channels array
    res.json(channels);
  } catch (error) {
    console.error('Error fetching Slack channels:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /slack/channels/:channelId/messages - Send a message with user-chosen priority
router.post('/channels/:channelId/messages', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content, priority } = req.body;
    const slack = getSlackClient();

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const response = await slack.chat.postMessage({
      channel: channelId,
      text: content
    });

    if (!response.ok) {
      throw new Error('Failed to send Slack message');
    }

    // Use the priority from the request or default to 'medium'
    const finalPriority = priority || 'medium';

    // Just return the chosen priority, no recalculation
    const timestamp = Math.floor(parseFloat(response.ts) * 1000);
    res.json({
      success: true,
      eventId: response.ts,
      content: content,
      timestamp: timestamp,
      priority: finalPriority
    });
  } catch (error) {
    console.error('Failed to send Slack message:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /slack/channels/:channelId/messages - Fetch messages and resolve user names
router.get('/channels/:channelId/messages', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { limit = 50 } = req.query;
    const slack = getSlackClient();

    const response = await slack.conversations.history({
      channel: channelId,
      limit: parseInt(limit, 10),
      inclusive: true
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Slack messages');
    }

    let messages = response.messages || [];

    // Resolve user IDs in message text
    for (let i = 0; i < messages.length; i++) {
      messages[i].text = await resolveSlackUserIds(messages[i].text, slack);
    }

    // Now map the messages to a unified format
    const formatted = messages.map(msg => {
      const timestamp = Math.floor(parseFloat(msg.ts) * 1000);

      // Since we no longer recalculate priority based on content,
      // just default to low priority for displayed messages or add logic if needed.
      // Or leave as 'low' since these are historical messages.
      return {
        id: msg.ts,
        content: msg.text,
        sender: msg.user || 'unknown_user',
        senderName: msg.user || 'Unknown User',
        timestamp: timestamp,
        priority: 'low'
      };
    }).reverse();

    res.json({ messages: formatted, channelId });
  } catch (error) {
    console.error('Error fetching Slack messages:', error);
    res.status(500).json({ error: error.message });
  }
});


// GET /slack/channels/:channelId/summary - Generate summary of the channel
router.get('/channels/:channelId/summary', async (req, res) => {
  try {
    const { channelId } = req.params;
    const slack = getSlackClient();

    const messageResponse = await slack.conversations.history({
      channel: channelId,
      limit: 50
    });

    if (!messageResponse.ok) {
      throw new Error('Failed to fetch Slack messages for summary');
    }

    const messages = messageResponse.messages.map(msg => {
      const timestamp = Math.floor(parseFloat(msg.ts) * 1000);
      return {
        content: msg.text,
        sender: msg.user || 'unknown_user',
        timestamp,
        getContent: () => ({ body: msg.text }),
        getSender: () => msg.user || 'unknown_user',
        getDate: () => new Date(timestamp)
      };
    });

    const keyTopics = [...new Set(messages.flatMap(m => m.getContent().body.toLowerCase().split(/\W+/)))].slice(0,5);
    const priorityBreakdown = {
      high: messages.filter(m => calculateMessagePriority(m, { timeline: [] }) === 'high').length,
      medium: messages.filter(m => calculateMessagePriority(m, { timeline: [] }) === 'medium').length,
      low: messages.filter(m => calculateMessagePriority(m, { timeline: [] }) === 'low').length
    };
    const sentimentAnalysis = messages.reduce((acc, m) => {
      const s = analyzeSentiment(m.getContent().body);
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const categories = messages.reduce((acc, m) => {
      const c = categorizeMessage(m.getContent().body);
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {});

    const summary = {
      messageCount: messages.length,
      keyTopics: keyTopics,
      priorityBreakdown,
      sentimentAnalysis,
      categories
    };

    res.json(summary);
  } catch (error) {
    console.error('Error generating Slack channel summary:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
