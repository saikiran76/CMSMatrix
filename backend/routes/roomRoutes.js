import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getRoomMessages, getRoomSummary, getCustomerDetails, sendMessage, calculateMessagePriority } from '../services/matrixService.js';

const router = express.Router();

// Debug middleware to log Matrix client state
const logMatrixState = (req, res, next) => {
  const client = req.app.locals.matrixClient;
  console.log('Matrix Client State:', {
    initialized: !!client,
    syncState: client?.getSyncState(),
    accessToken: !!client?.getAccessToken(),
    userId: client?.getUserId()
  });
  next();
};

router.use(logMatrixState);

// Get all rooms
router.get('/', authenticateToken, async (req, res) => {
  try {
    const client = req.app.locals.matrixClient;
    
    if (!client) {
      throw new Error('Matrix client not initialized');
    }

    console.log('Fetching rooms...');
    const syncState = client.getSyncState();
    console.log('Current sync state:', syncState);

    // Enhanced sync check with timeout
    if (!client.isInitialSyncComplete()) {
      console.log('Waiting for initial sync...');
      await Promise.race([
        new Promise(resolve => {
          client.once('sync', (state) => {
            console.log('Sync state changed to:', state);
            if (state === 'PREPARED') resolve();
          });
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sync timeout')), 10000)
        )
      ]);
    }

    const rooms = client.getRooms();
    console.log(`Found ${rooms.length} rooms`);

    const roomList = rooms.map(room => {
      const timeline = room.timeline || [];
      const lastEvent = timeline[timeline.length - 1];
      
      return {
        id: room.roomId,
        name: room.name || 'Unnamed Room',
        lastMessage: lastEvent?.getContent()?.body || '',
        status: room.getJoinedMemberCount() > 1 ? 'active' : 'inactive',
        assignee: '@ksk76:matrix.org',
        lastActive: lastEvent?.getDate() || new Date(),
        isActive: room.getJoinedMemberCount() > 1,
        memberCount: room.getJoinedMemberCount()
      };
    });

    res.json(roomList);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// Get messages for a specific room
router.get('/:roomId/messages', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;
    const client = req.app.locals.matrixClient;

    console.log('Fetching messages for room:', roomId);
    console.log('Matrix client state:', client?.getSyncState());

    if (!client) {
      throw new Error('Matrix client not initialized');
    }

    const decodedRoomId = decodeURIComponent(roomId);
    const messages = await getRoomMessages(client, decodedRoomId, parseInt(limit));
    
    console.log(`Returning ${messages.length} messages for room ${roomId}`);
    
    res.json({
      messages,
      roomId: decodedRoomId,
      nextToken: before
    });
  } catch (error) {
    console.error('Error fetching room messages:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      error: error.message 
    });
  }
});

// Get customer details with enhanced error handling
router.get('/:roomId/customer', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const client = req.app.locals.matrixClient;
    
    console.log(`Fetching customer details for room ${roomId}`);

    if (!client) {
      throw new Error('Matrix client not initialized');
    }

    const room = client.getRoom(roomId);
    if (!room) {
      console.log(`Room ${roomId} not found`);
      return res.status(404).json({ error: 'Room not found' });
    }

    const members = room.getJoinedMembers();
    console.log(`Found ${members.length} members in room`);

    const customer = members.find(member => 
      member.userId !== client.getUserId() && 
      !member.userId.includes(':bot.')
    );

    if (!customer) {
      console.log('No customer found in room');
      return res.status(404).json({ error: 'No customer found in room' });
    }

    const customerDetails = {
      userId: customer.userId,
      displayName: customer.name || customer.userId,
      avatarUrl: customer.avatarUrl,
      joinedAt: room.getMember(customer.userId)?.events?.member?.getDate(),
      notes: '',
      tags: [],
      customFields: {}
    };

    console.log('Customer details:', customerDetails);
    res.json(customerDetails);
  } catch (error) {
    console.error('Error fetching customer details:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// Get room summary
router.get('/:roomId/summary', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const client = req.app.locals.matrixClient;

    console.log('Fetching summary for room:', roomId);
    console.log('Matrix client status:', client ? 'initialized' : 'not initialized');

    if (!client) {
      throw new Error('Matrix client not initialized');
    }

    // Decode the room ID
    const decodedRoomId = decodeURIComponent(roomId);
    console.log('Decoded room ID:', decodedRoomId);

    // Get room summary
    const summary = await getRoomSummary(client, decodedRoomId);
    console.log('Summary generated successfully');

    res.json(summary);
  } catch (error) {
    console.error('Detailed error in room summary route:', {
      message: error.message,
      stack: error.stack,
      roomId: req.params.roomId
    });

    res.status(500).json({ 
      error: 'Failed to fetch room summary',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add a debug endpoint
router.get('/debug/client', authenticateToken, (req, res) => {
  const client = req.app.locals.matrixClient;
  res.json({
    clientInitialized: !!client,
    syncState: client?.getSyncState(),
    userId: client?.getUserId(),
    roomCount: client?.getRooms()?.length || 0,
    accessTokenPresent: !!client?.getAccessToken()
  });
});

router.post('/:roomId/messages', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;
    const client = req.app.locals.matrixClient;

    if (!client) {
      throw new Error('Matrix client not initialized');
    }

    const message = await sendMessage(client, decodeURIComponent(roomId), content);
    
    // Calculate priority for the new message
    const messageWithPriority = {
      ...message,
      priority: calculateMessagePriority(message, client.getRoom(roomId))
    };

    res.json(messageWithPriority);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;