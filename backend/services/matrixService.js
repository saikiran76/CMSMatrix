import sdk from 'matrix-js-sdk';

let matrixClient = null;

export const initializeMatrixClient = async () => {
  try {
    if (matrixClient) {
      return matrixClient;
    }

    console.log('Initializing Matrix client...');
    
    matrixClient = sdk.createClient({
      baseUrl: "https://matrix.org",
      accessToken: process.env.MATRIX_ACCESS_TOKEN,
      userId: process.env.MATRIX_USER_ID,
      useAuthorizationHeader: true,
      timeoutMs: 60000, // Increase timeout to 60 seconds
    });

    // Start client with limited sync
    await matrixClient.startClient({
      initialSyncLimit: 10,
      lazyLoadMembers: true,
    });

    // Wait for initial sync with timeout
    await Promise.race([
      new Promise((resolve) => {
        matrixClient.once('sync', (state) => {
          if (state === 'PREPARED') {
            console.log('Matrix client sync completed');
            resolve();
          }
        });
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Matrix sync timeout')), 30000)
      )
    ]);

    return matrixClient;
  } catch (error) {
    console.error('Matrix client initialization failed:', error);
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

    return messages.reverse();
  } catch (error) {
    console.error('Error fetching room messages:', error);
    throw new Error(`Failed to fetch room messages: ${error.message}`);
  }
};

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
function extractKeyTopics(messages) {
  // Simple keyword extraction (you might want to use a more sophisticated approach)
  const commonWords = new Set(['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have']);
  const words = messages
    .map(event => event.getContent().body.toLowerCase().split(/\W+/))
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