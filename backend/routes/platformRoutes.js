// backend/routes/platformsRoutes.js
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Account from '../models/Account.js';
const router = Router();

router.use(authenticateToken);

const supportedPlatforms=[
  {id:'whatsapp',name:'WhatsApp',icon: 'https://cdn-icons-png.flaticon.com/512/3670/3670051.png'},
  {id:'telegram',name:'Telegram',icon:'https://image.similarpng.com/very-thumbnail/2021/10/Telegram-icon-on-transparent-background-PNG.png'},
  {id:'slack',name:'Slack',icon:'https://static-00.iconduck.com/assets.00/slack-icon-2048x2048-5nfqoyso.png'}
];

router.get('/', async (req,res)=>{
  const userId=req.user.id;
  const accounts=await Account.find({userId}).lean();
  const connected=accounts.map(a=>a.platform);
  const platforms=supportedPlatforms.map(p=>({
    ...p,
    connected: connected.includes(p.id)
  }));
  res.json({ platforms });
});



export default router;
