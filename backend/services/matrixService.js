import * as sdk from 'matrix-js-sdk';
import { createClient } from 'matrix-js-sdk';
import { NodeCryptoStore } from './matrixCryptoStore.js';
import Olm from '@matrix-org/olm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RateLimiter } from 'limiter';
import { getCachedAnalysis, setCachedAnalysis } from './cacheService.js';

// Initialize Olm globally
global.Olm = Olm;

let matrixClient = null;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Create rate limiter - 10 requests per minute
const limiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 'minute'
});

export const initializeMatrixClient = async () => {
  try {
    if (!Olm) {
      throw new Error('Olm is not available');
    }

    // Generate a stable device ID if not provided
    const deviceId = process.env.MATRIX_DEVICE_ID || 
      `MATRIX_DEVICE_${Buffer.from(process.env.MATRIX_USER_ID).toString('base64')}`;

    await Olm.init();
    const cryptoStore = new NodeCryptoStore();
    
    const client = createClient({
      baseUrl: process.env.MATRIX_HOME_SERVER,
      accessToken: process.env.MATRIX_ACCESS_TOKEN,
      userId: process.env.MATRIX_USER_ID,
      deviceId: deviceId, // Use the generated or provided device ID
      cryptoStore,
      store: new sdk.MemoryStore(),
      verificationMethods: [],
      cryptoCallbacks: {
        getCrossSigningKey: async () => null,
        saveCrossSigningKeys: async () => {},
        getSecretStorageKey: async () => null,
      },
      useAuthorizationHeader: true
    });

    await client.initCrypto();
    await client.startClient({ initialSyncLimit: 10 });

    // Set up automatic key sharing
    client.setCryptoTrustCrossSignedDevices(false);
    client.setGlobalErrorOnUnknownDevices(false);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.removeAllListeners('sync');
        reject(new Error('Sync timeout'));
      }, 30000);

      client.once('sync', (state) => {
        if (state === 'PREPARED') {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    return client;
  } catch (error) {
    console.error('Matrix client initialization error:', error);
    throw error;
  }
};

export const searchMessages = async (client, term, page = 1, limit = 10) => {
  const rooms = client.getRooms();
  const searchResults = rooms.flatMap(room => {
    return room.timeline
      .filter(event => 
        event.getType() === 'm.room.message' &&
        event.getContent().body.toLowerCase().includes(term.toLowerCase())
      )
      .map(event => ({
        roomId: room.roomId,
        roomName: room.name,
        content: event.getContent().body,
        sender: event.getSender(),
        timestamp: event.getDate(),
        eventId: event.getId()
      }));
  });

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  return {
    results: searchResults.slice(startIndex, endIndex),
    total: searchResults.length,
    page: parseInt(page),
    totalPages: Math.ceil(searchResults.length / limit)
  };
};

export const getRoomMessages = async (client, roomId, limit = 50) => {
  try {
    const room = client.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Wait for room state to be ready
    if (!client.isInitialSyncComplete()) {
      await new Promise((resolve) => {
        client.once('sync', (state) => {
          if (state === 'PREPARED') resolve();
        });
      });
    }

    const timeline = room.timeline || [];
    const messages = timeline
      .filter(event => event.getType() === 'm.room.message')
      .slice(-limit)
      .map(event => ({
        id: event.getId(),
        content: event.getContent().body || '',
        sender: event.getSender(),
        senderName: room.getMember(event.getSender())?.name || event.getSender(),
        timestamp: event.getDate().getTime(),
        type: event.getType()
      }));

    // Calculate priority for messages
    const messagesWithPriority = messages.map(msg => ({
      ...msg,
      priority: calculateMessagePriority({
        getContent: () => ({ body: msg.content }),
        getSender: () => msg.sender,
        getDate: () => new Date(msg.timestamp)
      }, room)
    }));

    return messagesWithPriority;
  } catch (error) {
    console.error('Error fetching room messages:', error);
    throw new Error(`Failed to fetch room messages: ${error.message}`);
  }
};

export const calculateMessagePriority = (message, room) => {
  // Get message content and metadata
  const content = message.getContent().body.toLowerCase();
  const sender = message.getSender();
  const timestamp = message.getDate();

  // Priority indicators
  const urgentKeywords = ['urgent', 'asap', 'emergency', 'critical', 'important'];
  const mediumKeywords = ['review', 'update', 'question', 'help', 'issue'];
  
  // Calculate time-based priority
  const hoursSinceMessage = (Date.now() - timestamp) / (1000 * 60 * 60);
  
  // Calculate keyword-based priority
  const hasUrgentKeywords = urgentKeywords.some(keyword => content.includes(keyword));
  const hasMediumKeywords = mediumKeywords.some(keyword => content.includes(keyword));
  
  // Calculate response time priority
  const responseTime = getAverageResponseTime(room);
  
  // Combine factors for final priority
  if (hasUrgentKeywords || hoursSinceMessage < 1 || responseTime > 4) {
    return 'high';
  } else if (hasMediumKeywords || hoursSinceMessage < 4 || responseTime > 2) {
    return 'medium';
  }
  return 'low';
};

function getAverageResponseTime(room) {
  const timeline = room.timeline || [];
  let totalResponseTime = 0;
  let responseCount = 0;

  // Calculate average response time from customer messages
  for (let i = 1; i < timeline.length; i++) {
    const prevMessage = timeline[i - 1];
    const currentMessage = timeline[i];
    
    if (prevMessage.getSender() !== currentMessage.getSender()) {
      const responseTime = (currentMessage.getDate() - prevMessage.getDate()) / (1000 * 60 * 60);
      totalResponseTime += responseTime;
      responseCount++;
    }
  }

  return responseCount > 0 ? totalResponseTime / responseCount : 0;
}

export const getRoomSummary = async (client, roomId) => {
  try {
    console.log('Getting room summary for:', roomId);
    
    // Verify client
    if (!client || !client.getRoom) {
      throw new Error('Invalid Matrix client');
    }

    // Get room
    const room = client.getRoom(roomId);
    console.log('Room found:', !!room);

    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    // Safely get timeline
    const timeline = room.timeline || [];
    console.log('Timeline events:', timeline.length);

    // Safely get message events
    const messageEvents = timeline.filter(event => {
      try {
        return event && event.getType && event.getType() === 'm.room.message';
      } catch (e) {
        console.warn('Error filtering event:', e);
        return false;
      }
    });

    // Safely get room state
    let roomState = {
      name: room.name || roomId,
      topic: '',
      created: new Date().toISOString()
    };

    try {
      const stateEvents = room.currentState?.getStateEvents('m.room.create');
      if (stateEvents && stateEvents[0]) {
        roomState.created = stateEvents[0].getDate().toISOString();
      }
    } catch (e) {
      console.warn('Error getting room state:', e);
    }

    // Get members safely
    let members = [];
    try {
      members = room.getJoinedMembers() || [];
    } catch (e) {
      console.warn('Error getting members:', e);
    }

    // Build summary with safe accessors
    const summary = {
      roomId: room.roomId,
      roomName: roomState.name,
      topic: roomState.topic,
      created: roomState.created,
      memberCount: members.length,
      totalMessages: messageEvents.length,
      activeParticipants: new Set(messageEvents.map(e => e.getSender()).filter(Boolean)).size,
      lastContact: messageEvents.length > 0 
        ? messageEvents[messageEvents.length - 1].getDate().toISOString() 
        : null,
      status: members.length > 1 ? 'active' : 'inactive',
      recentActivity: messageEvents.slice(-5).map(event => {
        try {
          return {
            sender: event.getSender() || 'Unknown',
            senderName: room.getMember(event.getSender())?.name || event.getSender() || 'Unknown',
            content: event.getContent()?.body || '',
            timestamp: event.getDate().toISOString()
          };
        } catch (e) {
          console.warn('Error mapping recent activity:', e);
          return null;
        }
      }).filter(Boolean).reverse()
    };

    console.log('Summary generated successfully:', {
      roomId: summary.roomId,
      messageCount: summary.totalMessages,
      memberCount: summary.memberCount
    });

    return summary;
  } catch (error) {
    console.error('Detailed error in getRoomSummary:', {
      message: error.message,
      stack: error.stack,
      roomId
    });
    throw error;
  }
};

export const getCustomerDetails = async (client, roomId) => {
  try {
    const room = client.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Get the first non-bot member as the customer
    const members = room.getJoinedMembers() || [];
    const customer = members.find(member => !member.userId.includes('bot'));

    if (!customer) {
      throw new Error('No customer found in room');
    }

    return {
      userId: customer.userId,
      displayName: customer.name || customer.userId,
      avatarUrl: customer.avatarUrl || null,
      joinedAt: customer.membership ? new Date(customer.membership.getTs()).toISOString() : null,
      presence: customer.presence || 'unknown',
      notes: '', // Add if you have a notes system
      tags: [], // Add if you have a tagging system
      customFields: {} // Add if you have custom fields
    };
  } catch (error) {
    console.error('Error fetching customer details:', error);
    throw new Error(`Failed to fetch customer details: ${error.message}`);
  }
};

// Helper functions
export function extractKeyTopics(messages) {
  const commonWords = new Set(['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have']);
  const words = messages
    .map(event => {
      try {
        return event.getContent().body.toLowerCase().split(/\W+/);
      } catch (error) {
        console.warn('Error processing message content:', error);
        return [];
      }
    })
    .flat()
    .filter(word => word.length > 3 && !commonWords.has(word));

  const wordFreq = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  return Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}

function calculatePriority(messages) {
  const hoursSinceLastMessage = (Date.now() - new Date(messages[messages.length - 1]?.getDate() || 0)) / (1000 * 60 * 60);
  const messageFrequency = messages.length / 24; // messages per hour over last day

  if (hoursSinceLastMessage < 1 || messageFrequency > 10) return 'high';
  if (hoursSinceLastMessage < 6 || messageFrequency > 5) return 'medium';
  return 'low';
}

export const initializeRoomListener = (client, callback) => {
  client.on('Room.timeline', async (event, room) => {
    if (event.getType() === 'm.room.message') {
      // Get message data from Matrix
      const messageData = {
        roomId: room.roomId,
        roomName: room.name || room.roomId,
        content: event.getContent().body,
        sender: event.getSender(),
        senderName: room.getMember(event.getSender())?.name || event.getSender(),
        timestamp: event.getDate().toISOString(),
        platform: 'matrix',
        priority: calculatePriority([event]),
        summary: await generateMessageSummary(event.getContent().body)
      };
      
      callback(messageData);
    }
  });
};

export const generateMessageSummary = async (content) => {
  try {
    // Check cache first
    const cached = getCachedAnalysis(content, 'summary');
    if (cached) return cached;

    // Check rate limit
    const hasToken = await limiter.tryRemoveTokens(1);
    if (!hasToken) {
      console.warn('AI API rate limit reached, using fallback analysis');
      return generateFallbackAnalysis(content);
    }

    const analysis = await generateAIAnalysis(content);
    setCachedAnalysis(content, 'summary', analysis);
    return analysis;
  } catch (error) {
    console.error('Error in generateMessageSummary:', error);
    return generateFallbackAnalysis(content);
  }
};

const generateAIAnalysis = async (content) => {
  const prompt = `Analyze this message and provide a JSON response with the following structure:
    {
      "keyPoints": [array of main topics],
      "sentiment": "positive/negative/neutral",
      "category": "technical/inquiry/feedback/urgent/general",
      "priority": "high/medium/low",
      "suggestedResponse": [array of 2-3 possible responses]
    }
    Message: "${content}"
    Only respond with valid JSON, no additional text.`;

  const result = await model.generateContent(prompt);
  return {
    ...JSON.parse(result.response.text()),
    timestamp: new Date().toISOString(),
    originalContent: content
  };
};

export const analyzeSentiment = (content) => {
  // Add sentiment analysis logic
  const keywords = {
    positive: ['thanks', 'great', 'good', 'happy', 'pleased'],
    negative: ['issue', 'problem', 'error', 'wrong', 'bad']
  };
  
  content = content.toLowerCase();
  let sentiment = 'neutral';
  
  if (keywords.positive.some(word => content.includes(word))) sentiment = 'positive';
  if (keywords.negative.some(word => content.includes(word))) sentiment = 'negative';
  
  return sentiment;
};

export const categorizeMessage = (content) => {
  const categories = {
    technical: ['error', 'bug', 'issue', 'problem', 'broken'],
    inquiry: ['how', 'what', 'when', 'where', 'why'],
    feedback: ['suggest', 'improve', 'better', 'would', 'could'],
    urgent: ['asap', 'urgent', 'emergency', 'critical']
  };

  content = content.toLowerCase();
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(word => content.includes(word))) {
      return category;
    }
  }
  return 'general';
};

export const getRoomSummaryWithUpdates = async (client, roomId, onUpdate) => {
  const summary = await getRoomSummary(client, roomId);
  
  // Add AI analysis for recent messages
  const recentMessages = summary.recentActivity.map(msg => msg.content);
  const aiSummaryPrompt = `Analyze these ${recentMessages.length} messages and provide a JSON response with:
  {
    "conversationTone": "string",
    "mainTopics": [array of topics],
    "actionItems": [array of required actions],
    "customerSentiment": "string",
    "suggestedNextSteps": [array of suggestions]
  }`;

  try {
    const result = await model.generateContent(aiSummaryPrompt);
    const aiAnalysis = JSON.parse(result.response.text());
    summary.aiAnalysis = aiAnalysis;
  } catch (error) {
    console.error('Error generating conversation AI summary:', error);
    summary.aiAnalysis = null;
  }

  const timelineCallback = (event, room) => {
    if (room.roomId === roomId && event.getType() === 'm.room.message') {
      const updatedSummary = {
        ...summary,
        totalMessages: summary.totalMessages + 1,
        lastContact: event.getDate().toISOString(),
        recentActivity: [
          {
            sender: event.getSender(),
            senderName: room.getMember(event.getSender())?.name || event.getSender(),
            content: event.getContent().body,
            timestamp: event.getDate().toISOString()
          },
          ...summary.recentActivity.slice(0, 4)
        ]
      };
      
      onUpdate(updatedSummary);
    }
  };

  client.on('Room.timeline', timelineCallback);
  return () => client.removeListener('Room.timeline', timelineCallback);
};

export const generateResponseSuggestions = async (message, context) => {
  const priority = calculatePriority([message]);
  const keyTopics = extractKeyTopics([message]);
  
  // Generate response templates based on priority and topics
  const templates = {
    high: [
      "I understand this is urgent. Let me help you with {topic} right away.",
      "I'll prioritize your {topic} request and get back to you shortly.",
      "Thank you for bringing this urgent matter to our attention."
    ],
    medium: [
      "I'd be happy to help you with {topic}.",
      "Let me look into your {topic} question.",
      "Thanks for your patience while I check this for you."
    ],
    low: [
      "Thank you for your message about {topic}.",
      "I'll be glad to assist you with this.",
      "Let me help you with your request."
    ]
  };

  return templates[priority].map(template => 
    template.replace('{topic}', keyTopics[0] || 'request')
  );
};

export const sendMessage = async (client, roomId, content) => {
  try {
    const room = client.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const membership = room.getMyMembership();
    if (membership !== 'join') {
      throw new Error(`Cannot send message - room membership is ${membership}`);
    }

    const isEncrypted = room.currentState.getStateEvents('m.room.encryption').length > 0;
    const txnId = `m${Date.now()}`;

    if (isEncrypted) {
      // Trust all devices in the room
      const members = room.getJoinedMembers();
      for (const member of members) {
        const devices = await client.getStoredDevicesForUser(member.userId);
        for (const device of devices) {
          await client.setDeviceTrust(member.userId, device.deviceId, true, true);
        }
      }

      // Send encrypted message
      const response = await client.sendEvent(
        roomId,
        'm.room.message',
        {
          msgtype: 'm.text',
          body: content
        },
        txnId
      );

      return {
        eventId: response.event_id,
        content,
        sender: client.getUserId(),
        timestamp: new Date().getTime(),
        type: 'm.room.message'
      };
    } else {
      const response = await client.sendMessage(roomId, {
        msgtype: 'm.text',
        body: content
      });
      
      return {
        eventId: response.event_id,
        content,
        sender: client.getUserId(),
        timestamp: new Date().getTime(),
        type: 'm.room.message'
      };
    }
  } catch (error) {
    console.error('Detailed error in sendMessage:', {
      error: error.message,
      roomId,
      userId: client.getUserId(),
      stack: error.stack
    });
    throw error;
  }
};