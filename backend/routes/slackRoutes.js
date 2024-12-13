import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getSlackClient } from '../services/slackService.js';
import { analyzeSentiment, categorizeMessage, generateMessageSummary } from '../services/matrixService.js'; // reuse AI logic
import { calculateMessagePriority } from '../services/matrixService.js'; // reuse priority logic

const router = express.Router();

router.use(authenticateToken);

// GET /slack/channels - List all channels
router.get('/channels', async (req, res) => {
  try {
    const slack = getSlackClient();
    const response = await slack.conversations.list({ limit: 100 });
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
      isActive: true, // Slack doesn't have the same active concept, defaulting true
      memberCount: ch.num_members || 0
    }));

    // In Dashboard.jsx after fetching
    console.log('Slack channels:', response.data);


    res.json(channels);
  } catch (error) {
    console.error('Error fetching Slack channels:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /slack/channels/:channelId/messages - Fetch messages
router.get('/channels/:channelId/messages', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { limit = 50 } = req.query;
    const slack = getSlackClient();

    const response = await slack.conversations.history({
      channel: channelId,
      limit: parseInt(limit),
      inclusive: true
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Slack messages');
    }

    // Slack messages structure: { text, user, ts }
    // Normalize to a structure similar to Matrix messages
    const messages = (response.messages || []).map(msg => {
      // Convert ts to a proper timestamp
      const timestamp = Math.floor(parseFloat(msg.ts) * 1000);

      // Priority calculation (reusing existing logic)
      // We wrap message in an object with getContent/getSender/getDate to fit our existing function
      const pseudoEvent = {
        getContent: () => ({ body: msg.text }),
        getSender: () => msg.user || 'unknown_user',
        getDate: () => new Date(timestamp)
      };
      const priority = calculateMessagePriority(pseudoEvent, { timeline: [] }); // room not relevant here, pass empty

      return {
        id: msg.ts,
        content: msg.text,
        sender: msg.user || 'unknown_user',
        senderName: msg.user || 'Unknown User',
        timestamp: timestamp,
        priority
      };
    }).reverse(); // Slack returns messages newest first, reverse to oldest first if needed

    res.json({ messages, channelId });
  } catch (error) {
    console.error('Error fetching Slack messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /slack/channels/:channelId/messages - Send a message
router.post('/channels/:channelId/messages', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content } = req.body;
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

    // Construct a message object to return
    const timestamp = Math.floor(parseFloat(response.ts) * 1000);
    const pseudoEvent = {
      getContent: () => ({ body: content }),
      getSender: () => response.message.user || 'unknown_user',
      getDate: () => new Date(timestamp)
    };
    const priority = calculateMessagePriority(pseudoEvent, { timeline: [] });

    res.json({
      success: true,
      eventId: response.ts,
      content: content,
      timestamp: timestamp,
      priority
    });
  } catch (error) {
    console.error('Failed to send Slack message:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /slack/channels/:channelId/summary - Generate summary of the channel
router.get('/channels/:channelId/summary', async (req, res) => {
  try {
    const { channelId } = req.params;
    const slack = getSlackClient();

    // Fetch recent messages
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

    // AI analysis logic reused from matrix
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
