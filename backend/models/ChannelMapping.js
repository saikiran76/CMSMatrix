import mongoose from 'mongoose';

const channelMappingSchema = new mongoose.Schema({
  platform: { type:String, enum:['slack','whatsapp','telegram'], required:true },
  roomId: { type:String, required:true }, // Slack channelId, WhatsApp chatId, Telegram chatId
  team_id: { type:String }, // For Slack
  userId: { type: mongoose.Schema.Types.ObjectId, ref:'User', required:true }
});

channelMappingSchema.index({platform:1,roomId:1},{unique:true});

export default mongoose.model('ChannelMapping', channelMappingSchema);
