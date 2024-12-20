// backend/models/Message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  sender: { type: String, required: true },
  senderName: { type: String, required: false },
  timestamp: { type: Date, default: Date.now },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  platform: { type: String, enum: ['matrix', 'slack', 'whatsapp', 'telegram'], required: true },
  roomId: { type: String, required: true }
});

// Index for faster retrieval by platform/roomId
messageSchema.index({ platform: 1, roomId: 1, timestamp: -1 });

export default mongoose.model('Message', messageSchema);
