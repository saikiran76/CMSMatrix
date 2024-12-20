import { Telegraf } from 'telegraf';
import Message from '../models/Message.js';
import Account from '../models/Account.js';
import ChannelMapping from '../models/ChannelMapping.js';
import { applyRulesToMessage } from './rulesService.js';

import { ioEmitter } from '../utils/emitter.js'; // a shared emitter for sockets


let bot = null;
let telegramContacts = {};

// Telegram requires setting a webhook:
// export async function initializeTelegramBotForUser(userId) {
//   const acct = await Account.findOne({userId, platform:'telegram'}).lean();
//   if(!acct || !acct.credentials.botToken) return null;

//   if (!bot) {
//     bot = new Telegraf(acct.credentials.botToken);
//     bot.catch((err, ctx)=>{
//       console.error('Telegram error:', err);
//       ctx.reply('An error occurred');
//     });

//     bot.on('text', async (ctx) => {
//       try {
//         const sender = ctx.from.id.toString();
//         const senderName = (ctx.from.first_name || '')+(ctx.from.last_name?` ${ctx.from.last_name}`:'');
//         if(senderName.trim()) telegramContacts[sender]=senderName.trim();
//         const content=ctx.message.text;
//         const timestamp=new Date((ctx.message.date||Math.floor(Date.now()/1000))*1000);
//         const roomId=ctx.chat.id.toString();

//         const userId=await getUserIdForPlatformRoom('telegram', roomId);
//         let newMsg={
//           content, sender, senderName:senderName||sender,
//           timestamp, priority:'medium', platform:'telegram', roomId
//         };
//         if(userId) {
//           newMsg=await applyRulesToMessage(newMsg,userId);
//         }
//         const saved=await Message.create(newMsg);
//         ioEmitter.emit('new_message', saved.toObject());
//       } catch (error) {
//         console.error('Telegram message processing error:', error);
//       }
//     });

//     await bot.launch();
//     console.log('Telegram bot connected for user', userId);
//   }
//   return bot;
// }
const botsByUser={};
export async function initializeTelegramBotForUser(userId, forceRestart=false) {
  if(botsByUser[userId]) {
    if(forceRestart) {
      await botsByUser[userId].stop();
      delete botsByUser[userId];
    } else {
      return botsByUser[userId];
    }
  }

  const acct=await Account.findOne({userId,platform:'telegram'}).lean();
  if(!acct||!acct.credentials.botToken) {
    console.error('No telegram account to initialize bot');
    return null;
  }

  const bot=new Telegraf(acct.credentials.botToken);
  await bot.telegram.setWebhook(''); // Clear any previous webhook to avoid conflicts
  // Optional: set a new webhook or use polling only once here
  bot.catch((err)=>console.error('Telegram error:', err));
  bot.on('text',async(ctx)=>{ /* message logic */ });
  
  // Start polling updates:
  await bot.launch();
  botsByUser[userId]=bot;
  console.log('Telegram bot launched for user', userId);
  return bot;
}
export async function initiateTelegramConnection() {
  return { 
    status: 'pending', 
    requiresToken: true,
    instructions: 'Enter Telegram Bot Token from @BotFather'
  };
}

export async function finalizeTelegramConnection(botToken) {
  try {
    // Test bot token
    const testBot=new Telegraf(botToken);
    const botInfo=await testBot.telegram.getMe();

    // Now create a new bot instance
    const bot=new Telegraf(botToken);
    bot.catch((err)=>console.error('Telegram error:',err));
    bot.on('text', async (ctx)=>{
      try {
        const sender=ctx.from.id.toString();
        const senderName=((ctx.from.first_name||'')+(ctx.from.last_name?' '+ctx.from.last_name:'')).trim()||sender;
        telegramContacts[sender]=senderName;
        const content=ctx.message.text;
        const timestamp=new Date((ctx.message.date||Math.floor(Date.now()/1000))*1000);
        const roomId=ctx.chat.id.toString();

        let newMsg={
          content,
          sender,
          senderName,
          timestamp,
          priority:'medium',
          platform:'telegram',
          roomId
        };

        const userId=await getUserIdForPlatformRoom('telegram',roomId);
        if(userId) {
          newMsg=await applyRulesToMessage(newMsg,userId);
        }

        await Message.create(newMsg);
      } catch(error) {
        console.error('Telegram message processing error:',error);
      }
    });

    await bot.launch();
    // No blocking calls, return connected immediately
    console.log('Telegram bot connected successfully');
    return {
      status:'connected',
      botInfo,
      botToken
    };
  } catch(err) {
    console.error('Telegram finalize error:',err);
    return {
      error: err.message.includes('unauthorized')?
        'Invalid bot token':
        'Failed to connect to Telegram'
    };
  }
}

export function getTelegramContacts() {
  return telegramContacts; 
}

async function getUserIdForPlatformRoom(platform,roomId) {
  let mapping=await ChannelMapping.findOne({platform,roomId}).lean();
  if(mapping) return mapping.userId;

  const anyAcc=await Account.findOne({platform:'telegram'}).lean();
  if(!anyAcc) {
    console.warn('No telegram account found, cannot map user for',platform,roomId);
    return null;
  }
  await ChannelMapping.create({platform,roomId,userId:anyAcc.userId});
  return anyAcc.userId;
}


// export async function sendTelegramMessage(chatId, content) {
//   if(!bot) {
//     console.error('Cannot send Telegram message, bot not initialized');
//     return;
//   }
//   try {
//     await bot.telegram.sendMessage(chatId, content);
//     console.log(`Auto-responded on Telegram to ${chatId}: ${content}`);
//   } catch (err) {
//     console.error('Telegram send message error:', err);
//   }
// }

export async function sendTelegramMessage(chatId, userId, content) {
  const bot=botsByUser[userId];
  if(!bot) {
    console.error('No telegram bot for this user, cannot send message');
    return;
  }
  await bot.telegram.sendMessage(chatId, content);
}
