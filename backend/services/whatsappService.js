import pkg from '@whiskeysockets/baileys';
const { makeWASocket, DisconnectReason, makeInMemoryStore } = pkg;
import { useMultiFileAuthState } from '@whiskeysockets/baileys'
import QRCode from 'qrcode';


import Message from '../models/Message.js';
import Account from '../models/Account.js';
import { applyRulesToMessage } from './rulesService.js';
import ChannelMapping from '../models/ChannelMapping.js';

let socket;
let currentQr = null;
let connected = false;
let messageCallback = null;

const store = makeInMemoryStore({});
const { state, saveCreds } = await useMultiFileAuthState(process.env.WHATSAPP_SESSION_FILE || './auth_info');

// export async function initializeWhatsAppClient() {
//   const { state, saveCreds } = await useMultiFileAuthState(process.env.WHATSAPP_SESSION_FILE || './auth_info');
//   const socket = makeWASocket({
//     auth: state,
//     printQRInTerminal: false,
//     store: store
//   });

//   store.bind(socket.ev);
//   socket.ev.on('creds.update', saveCreds);

//   socket.ev.on('connection.update', async (update) => {
//     const { connection, lastDisconnect, qr } = update;
    
//     if (qr) {
//       currentQr = qr;
//     }
//     if (connection === 'open') {
//       connected = true;
//       currentQr = null;
//       console.log('WhatsApp client connected and ready');

//       try {
//         const accounts = await Account.find({ platform: 'whatsapp' });
//         for (const account of accounts) {
//           account.credentials = await finalizeWhatsAppConnection();
//           await account.save();
//         }
//       } catch (err) {
//         console.error('Error updating WhatsApp accounts:', err);
//       }
      
//       // Save session details to the database
//       const credentials = await saveCreds();
//       await Account.updateOne(
//         { platform: 'whatsapp', userId: req.user.id },
//         { $set: { credentials, connectedAt: new Date() } },
//         { upsert: true }
//       );
//     } else if (connection === 'close') {
//       connected = false;
//       const code = lastDisconnect?.error?.output?.statusCode;
//       if (code !== DisconnectReason.loggedOut) {
//         console.warn('Reconnecting to WhatsApp...');
//         initializeWhatsAppClient();
//       }
//     }
//   });
  

//   socket.ev.on('messages.upsert', async (m) => {
//     if (m.type === 'notify') {
//       for (const msg of m.messages) {
//         if (!msg.message) continue;
//         const content = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
//         if (!content.trim()) continue;

//         const sender = msg.key.participant || msg.key.remoteJid;
//         const timestamp = new Date((msg.messageTimestamp || 0) * 1000);
//         const roomId = msg.key.remoteJid;

//         let senderName = sender;
//         try {
//           const contacts = store.contacts;
//           if (contacts && contacts[sender]) {
//             senderName = contacts[sender].name || contacts[sender].notify || sender;
//           } else {
//             console.warn(`WhatsApp: No contact info for ${sender}, fallback to JID`);
//           }
//         } catch (error) {
//           console.error('Error accessing WhatsApp contacts:', error);
//           senderName = sender;
//         }

//         const userId = await getUserIdForPlatformRoom('whatsapp', roomId);

//         if (!userId) {
//           console.warn(`No user found for WhatsApp room ${roomId}`);
//           continue;
//         }

//         if(userId){
//           let newMsg = {
//             content,
//             sender,
//             senderName,
//             timestamp,
//             priority: 'medium',
//             platform: 'whatsapp',
//             roomId
//           };

//           try {
//             newMsg = await applyRulesToMessage(newMsg, userId);
//             const savedMsg = await Message.create(newMsg);
//             if (messageCallback) {
//               messageCallback(savedMsg.toObject());
//             }
//           } catch (err) {
//             console.error('Error processing WhatsApp message:', err);
//           }
//         }
        
//         // try {
//         //   const savedMsg = await Message.create(newMsg);
//         //   if (messageCallback) {
//         //     try {
//         //       messageCallback(savedMsg.toObject());
//         //     } catch (err) {
//         //       console.error('Error in messageCallback:', err);
//         //     }
//         //   }
//         // } catch (err) {
//         //   console.error('Error saving WhatsApp message:', err);
//         // }
//       }
//     }
//   });

//   console.log('WhatsApp client initialized successfully');
// }
export async function initializeWhatsAppClient() {
  const { state, saveCreds } = await useMultiFileAuthState(process.env.WHATSAPP_SESSION_FILE || './auth_info');
  const socket = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    store: store,
  });

  store.bind(socket.ev);
  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQr = qr;
    }
    if (connection === 'open') {
      connected = true;
      currentQr = null;
      console.log('WhatsApp client connected and ready');

      try {
        // Fetch the user account(s) dynamically
        const accounts = await Account.find({ platform: 'whatsapp' });
        if (accounts.length === 0) {
          console.warn('No WhatsApp accounts found. Skipping credential update.');
          return;
        }

        for (const account of accounts) {
          const credentials = await saveCreds();
          account.credentials = credentials;
          account.connectedAt = new Date();
          await account.save();
        }
      } catch (err) {
        console.error('Error updating WhatsApp account:', err);
      }
    } else if (connection === 'close') {
      connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.warn('Reconnecting to WhatsApp...');
        initializeWhatsAppClient();
      }
    }
  });

  console.log('WhatsApp client initialized successfully');
}

export function onWhatsAppMessage(callback) {
  messageCallback = callback;
}

export async function initiateWhatsAppConnection() {
  if(connected) {
    return {status:'connected'};
  }
  if(!socket) await initializeWhatsAppClient();
  if(currentQr) {
    const qrImage = await QRCode.toDataURL(currentQr);
    return {status:'pending', qrCode:qrImage};
  } else if(connected) {
    return {status:'connected'};
  }
  return {status:'pending'};
}

async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(process.env.WHATSAPP_SESSION_DIR||'./auth_info');
  socket=makeWASocket({auth:state,printQRInTerminal:false});
  socket.ev.on('connection.update', (update)=>{
    const {connection,qr}=update;
    if(qr) currentQr=qr;
    if(connection==='open') {
      connected=true;
      currentQr=null;
    }
  });
  socket.ev.on('creds.update', saveCreds);
}

export async function checkWhatsAppConnectionStatus() {
  return connected ? 'connected' : 'pending';
}

export async function finalizeWhatsAppConnection() {
  return {
    sessionFile: process.env.WHATSAPP_SESSION_FILE || './auth_info/multi_state.json',
    connected: true,
    connectedAt: new Date(),
    phoneNumber: socket?.user?.id // Store connected phone number 
  };
}

export async function getAllWhatsAppContacts() {
  const contacts = store.contacts || {};
  const result = {};
  for (const [jid, contact] of Object.entries(contacts)) {
    const name = contact.name || contact.notify || jid;
    result[jid] = name;
  }
  return result;
}

// export async function getUserIdForPlatformRoom(platform, roomId) {
//   let mapping = await ChannelMapping.findOne({platform, roomId}).lean();
//   if (mapping) return mapping.userId;

//   // If not found, attempt to find an Account for this platform.
//   // For MVP, pick first account of that platform as owner:
//   const anyAccount = await Account.findOne({platform}).lean();
//   if (!anyAccount) {
//     console.warn(`No account found for ${platform}, cannot map user`);
//     // Create a dummy user or fail?
//     return null; // If truly no user found, message can still be saved. 
//   }
  
//   // Create a mapping entry now:
//   await ChannelMapping.create({platform, roomId, userId:anyAccount.userId});
//   return anyAccount.userId;
// }

async function getUserIdForPlatformRoom(platform,roomId) {
  let mapping=await ChannelMapping.findOne({platform,roomId}).lean();
  if(mapping) return mapping.userId;

  const anyAcc=await Account.findOne({platform}).lean();
  if(!anyAcc) {
    console.warn('No account found for',platform,'cannot map user');
    return null;
  }
  await ChannelMapping.create({platform,roomId,userId:anyAcc.userId});
  return anyAcc.userId;
}


export async function sendWhatsAppMessage(roomId, content) {
  if (!connected) {
    console.error('Cannot send WhatsApp message, client not connected');
    return;
  }
  try {
    await socket.sendMessage(roomId, { text: content });
    console.log(`Auto-responded on WhatsApp to ${roomId}: ${content}`);
  } catch (err) {
    console.error('WhatsApp send message error:', err);
  }
}
