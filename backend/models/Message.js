import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  sender: { type: String, required: true },
  senderName: { type: String, required: false }, // Optional if you store display names
  timestamp: { type: Date, default: Date.now },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  platform: { type: String, enum: ['matrix', 'slack'], required: true }, // Identify source platform
  roomId: { type: String, required: true } // This could be Matrix roomId or Slack channelId
});

export default mongoose.model('Message', messageSchema);
