// import express from 'express';
// import https from 'https';
// import fs from 'fs';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import mongoose from 'mongoose';
// import cookieParser from 'cookie-parser';
// import { initializeMatrixClient } from './services/matrixService.js';
// import { initializeSlackClient } from './services/slackService.js';
// import authRoutes from './routes/authRoutes.js';
// import roomRoutes from './routes/roomRoutes.js';
// import adminRoutes from './routes/adminRoutes.js';
// import slackRoutes from './routes/slackRoutes.js';
// import { errorHandler } from './middleware/errorHandler.js';
// import platformRoutes from './routes/platformRoutes.js'
// import connectRoutes from './routes/connectRoutes.js';
// import accountsRoutes from './routes/accountsRoutes.js';
// import contactsRoutes from './routes/contactRoutes.js'

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3001;

// // CORS configuration
// app.use(cors({
//   origin: ['http://localhost:5173', 'http://localhost:5174', 'https://cms-matrix.vercel.app', 'https://cmsmatrix.onrender.com'],
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
//   exposedHeaders: ['Set-Cookie'],
//   preflightContinue: false,
//   optionsSuccessStatus: 204
// }));

// // SSL options
// const options = {
//   key: fs.readFileSync('server.key'), // Path to private key
//   cert: fs.readFileSync('server.cert'), // Path to public certificate
// };

// app.use(express.json());
// app.use(cookieParser());

// // Debug logger
// app.use((req, res, next) => {
//   console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
//   next();
// });

// // Connect to MongoDB
// const connectDB = async () => {
//   try {
//     const mongoURI = process.env.MONGODB_URI.replace('<db_password>', process.env.MONGODB_PASSWORD);
//     await mongoose.connect(mongoURI);
//     console.log('MongoDB connected successfully');
//   } catch (error) {
//     console.error('MongoDB connection error:', error);
//     process.exit(1);
//   }
// };

// // Health check
// app.get('/health', (req, res) => {
//   res.json({
//     status: 'ok',
//     mongodb: mongoose.connection.readyState === 1,
//     matrixClient: !!app.locals.matrixClient
//   });
// });

// // Preflight requests
// app.options('*', (req, res) => {
//   res.status(204).end();
// });
// app.options('*', cors());

// // Routes
// app.use('/auth', authRoutes);
// app.use('/rooms', roomRoutes);
// app.use('/admin', adminRoutes);
// app.use('/slack', slackRoutes);
// app.use('/platforms', platformRoutes);
// app.use('/connect', connectRoutes);
// app.use('/accounts', accountsRoutes);
// app.use('/accounts/contacts', contactsRoutes);

// // Error handling
// app.use(errorHandler);

// // Start server
// const startServer = async () => {
//   try {
//     await connectDB();
//     // Initialize Matrix client
//     // const matrixClient = await initializeMatrixClient();
//     // app.locals.matrixClient = matrixClient;
//     // console.log('Matrix client initialized successfully');

//     // Initialize Slack environment check
//     initializeSlackClient();
//     console.log('Slack client initialized');

//     https.createServer(options, app).listen(PORT, () => {
//       console.log(`Server running on port ${PORT}`);
//     });
//   } catch (error) {
//     console.error('Server startup error:', error);
//     process.exit(1);
//   }
// };

// process.on('uncaughtException', (error) => {
//   console.error('Uncaught Exception:', error);
//   process.exit(1);
// });

// process.on('unhandledRejection', (error) => {
//   console.error('Unhandled Rejection:', error);
//   process.exit(1);
// });

// startServer();


// backend/index.js
import express from 'express';
import cors from 'cors';
import http from 'http';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import accountsRoutes from './routes/accountsRoutes.js';
import contactsRoutes from './routes/contactRoutes.js';
import connectRoutes from './routes/connectRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import platformRoutes from './routes/platformRoutes.js'
import { initializeWhatsAppClient, onWhatsAppMessage } from './services/whatsappService.js';
import { finalizeTelegramConnection } from './services/telegramService.js';
import { initializeTelegramBotForUser } from './services/telegramService.js';
import { ioEmitter } from './utils/emitter.js';
// If Slack is used, ensure it's initialized properly too.

dotenv.config();

const app = express();
app.use(cors({
  origin: 'http://localhost:5173', // Allow frontend dev server
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI.replace('<db_password>', process.env.MONGODB_PASSWORD);
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

await connectDB();

app.use('/auth', authRoutes);
app.use('/accounts', accountsRoutes);
app.use('/accounts/contacts', contactsRoutes);
app.use('/platforms', platformRoutes)
app.use('/connect', connectRoutes);
app.use('/report', reportRoutes);
app.use('/ai', aiRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', credentials: true }
});

app.locals.io = io; // accessible in services if needed

// Initialize WhatsApp client
try {
  await initializeWhatsAppClient();
  console.log('WhatsApp client initialized');
} catch (err) {
  console.error('WhatsApp client init error:', err);
  process.exit(1);
}

// try{
//   await initializeTelegramBotForUser(userId);
  
// } catch (err) {
//   console.error("Telegram bot user error: ", err)
// }
// If Slack or other platforms need initialization, do it here.
// If Slack fails, handle gracefully without crashing.

// onWhatsAppMessage((newMessage) => {
//   // Broadcast new message safely
//   try {
//     io.emit('new_message', newMessage);
//   } catch (err) {
//     console.error('Error emitting new_message event:', err);
//     // Do not crash or disconnect, just log the error
//   }
// });

ioEmitter.on('new_message',(msg)=>{
  io.emit('new_message',msg);
});

io.on('connection', (socket) => {
  console.log('Client connected via WebSocket');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (HTTP)`);
});
