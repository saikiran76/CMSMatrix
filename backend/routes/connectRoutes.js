// backend/routes/connectRoutes.js
import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import Account from '../models/Account.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  initiateWhatsAppConnection,
  checkWhatsAppConnectionStatus,
  finalizeWhatsAppConnection
} from '../services/whatsappService.js';
import {
  initiateTelegramConnection,
  finalizeTelegramConnection,
  initializeTelegramBotForUser
} from '../services/telegramService.js';

// import { initiateSlackConnection } from '../services/slackService.js';
import ChannelMapping from '../models/ChannelMapping.js';

const router = express.Router();
router.use(authenticateToken);

// Initiate platform connection
router.post('/:platform/initiate', async (req, res) => {
  const { platform } = req.params;
  const userId = req.user.id;

  if (platform === 'whatsapp') {
    const result = await initiateWhatsAppConnection();
    console.log("whatsapp connect request result:", result);
    return res.json(result);
  } else if (platform === 'telegram') {
    // instructions: 'Please enter your Telegram Bot Token from @BotFather'
    return res.json({ status: 'pending', requiresToken: true, instructions: 'Enter your Telegram Bot Token' });
  } else if (platform === 'slack') {
    // Slack OAuth init
    const state = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '10m' });
    const redirect_uri = process.env.SLACK_REDIRECT_URI;
    const url = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=channels:history,channels:read,chat:write,groups:history,groups:read,im:history,im:read,users:read&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}`;
    return res.json({ status: 'redirect', url });
  }
  return res.status(400).json({ error: 'Unsupported platform' });
});


router.post('/:platform/finalize', async (req, res) => {
  const { platform } = req.params;
  const userId = req.user._id; // Ensure this is populated correctly
  console.log('Finalize request for user:', userId, 'Platform:', platform);

  // if (platform === 'whatsapp') {
  //   try {
  //     const credentials = await finalizeWhatsAppConnection();
  //     console.log('WhatsApp credentials:', credentials);

  //     let account = await Account.findOne({ userId, platform });
  //     if (!account) {
  //       console.log(`Creating new account for user: ${userId}, platform: ${platform}`);
  //       account = new Account({
  //         userId,
  //         platform,
  //         credentials,
  //         connectedAt: new Date(),
  //       });
  //     } else {
  //       console.log(`Updating existing account for user: ${userId}, platform: ${platform}`);
  //       account.credentials = credentials;
  //       account.connectedAt = new Date();
  //     }

  //     await account.save();
  //     console.log('Account saved successfully:', account);
  //     return res.json({ status: 'connected' });
  //   } catch (err) {
  //     console.error('Error finalizing connection:', err);
  //     return res.status(500).json({ error: err.message });
  //   }
  // }
  if(platform === 'whatsapp') {
    try {
      const credentials = await finalizeWhatsAppConnection();
      
      // Use findOneAndUpdate with upsert
      const account = await Account.findOneAndUpdate(
        { userId, platform: 'whatsapp' },
        {
          userId,
          platform: 'whatsapp',
          credentials,
          connectedAt: new Date()
        },
        { upsert: true, new: true }
      );

      console.log('WhatsApp account saved:', {
        id: account._id,
        userId: account.userId,
        platform: account.platform
      });

      return res.json({
        status: 'connected',
        account: {
          platform: 'whatsapp',
          connectedAt: account.connectedAt
        }
      });
    } catch (error) {
      console.error('Error saving WhatsApp account:', error);
      return res.status(500).json({error: 'Failed to save WhatsApp account'});
    }
  }
  else if (platform === 'telegram') {
    const { botToken } = req.body;
    const result = await finalizeTelegramConnection(botToken);
    if (result.status === 'connected') {
      let acc = await Account.findOne({ userId, platform: 'telegram' });
      if (!acc) acc = new Account({ userId, platform: 'telegram', credentials: { botToken: result.botToken } });
      else acc.credentials.botToken = result.botToken;
      await acc.save();

      // Force restart to avoid conflicts:
      await initializeTelegramBotForUser(userId, true);

      return res.json({ status: 'connected' });
    }
    return res.json(result);
  }
  return res.status(400).json({ error: 'Unsupported platform finalize' });
});

router.get('/:platform/status', async (req, res) => {
  const { platform } = req.params;
  const userId = req.user.id;

  if (platform === 'whatsapp') {
    const status = await checkWhatsAppConnectionStatus();
    if (status === 'connected') {
      const credentials = await finalizeWhatsAppConnection();
      let acc = await Account.findOne({ userId, platform: 'whatsapp' });
      if (!acc) {
        acc = new Account({ userId, platform: 'whatsapp', credentials });
      } else {
        acc.credentials = credentials;
      }
      await acc.save();
      return res.json({ status: 'connected' });
    }
    return res.json({ status: 'pending' });
  } else if (platform === 'telegram') {
    // For Telegram, if account with botToken exists => connected
    const acc = await Account.findOne({ userId, platform: 'telegram' }).lean();
    return res.json({ status: acc && acc.credentials.botToken ? 'connected' : 'pending' });
  } else if (platform === 'slack') {
    // If Slack account with token exists => connected
    const acc = await Account.findOne({ userId, platform: 'slack' }).lean();
    return res.json({ status: acc && acc.credentials.access_token ? 'connected' : 'pending' });
  }

  return res.status(400).json({ error: 'Unsupported platform' });
});

// Slack OAuth callback
router.get('/slack/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send('Missing code or state');

  try {
    const decoded = jwt.verify(state, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const tokenRes = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: process.env.SLACK_REDIRECT_URI
      }
    });

    if (!tokenRes.data.ok) {
      console.error('Slack OAuth failed:', tokenRes.data.error);
      return res.status(500).send('Slack OAuth failed');
    }

    let account = await Account.findOne({ userId, platform: 'slack' });
    const credentials = {
      access_token: tokenRes.data.access_token,
      team_id: tokenRes.data.team.id,
      team_name: tokenRes.data.team.name,
      authed_user: tokenRes.data.authed_user.id
    };
    if (account) {
      account.credentials = credentials;
      await account.save();
    } else {
      account = new Account({ userId, platform: 'slack', credentials });
      await account.save();
    }

    // Redirect to the dashboard now that Slack is connected
    res.redirect('http://localhost:5173/dashboard');
  } catch (error) {
    console.error('Slack OAuth callback error:', error);
    res.status(500).send('Slack OAuth failed');
  }
});

export default router;
