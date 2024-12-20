import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Account from '../models/Account.js';
import Message from '../models/Message.js';
import { getConsolidatedMessages } from '../services/consolidationService.js';
import { getAllWhatsAppContacts } from '../services/whatsappService.js';
import { getTelegramContacts } from '../services/telegramService.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  const userId = req.user._id;

  console.log(`Finalize request for user: ${userId}`);

  try {
    const accounts = await Account.find({ userId }).lean();
    console.log('Accounts fetched from DB:', accounts);

    res.json({ accounts });
  } catch (err) {
    console.error('Error fetching accounts:', err);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});


router.get('/inbox', async (req,res)=>{
  const messages = await getConsolidatedMessages(req.user.id);
  res.json({messages});
});

// Add new endpoint
// router.get('/contacts', authenticateToken, async (req, res) => {
//   try {
//     const contacts = {};
    
//     // Fetch WhatsApp contacts
//     if (req.app.locals.whatsappClient) {
//       const whatsappContacts = await getContactName();
//       Object.assign(contacts, whatsappContacts);
//     }
    
//     // Add Telegram contacts
//     if (req.app.locals.telegramBot) {
//       const telegramContacts = await req.app.locals.telegramBot.getContacts();
//       telegramContacts.forEach(contact => {
//         contacts[contact.id] = contact.first_name + 
//           (contact.last_name ? ` ${contact.last_name}` : '');
//       });
//     }
    
//     res.json({ contacts });
//   } catch (err) {
//     console.error('Error fetching contacts:', err);
//     res.status(500).json({ error: 'Failed to fetch contacts' });
//   }
// });

router.get('/contacts', async (req,res)=>{
  const accounts = await Account.find({ userId:req.user.id }).lean();
  const connectedPlatforms = accounts.map(a=>a.platform);
  let contacts = {};
  if (connectedPlatforms.includes('whatsapp')) {
    const waContacts = await getAllWhatsAppContacts();
    contacts = {...contacts, ...waContacts};
  }
  if (connectedPlatforms.includes('telegram')) {
    const tgContacts = getTelegramContacts();
    contacts = {...contacts, ...tgContacts};
  }
  // Slack contacts may require an API call if needed
  res.json({contacts});
});

export default router;
