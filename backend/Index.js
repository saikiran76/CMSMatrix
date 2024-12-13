import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import { initializeMatrixClient } from './services/matrixService.js';
import { initializeSlackClient } from './services/slackService.js';

import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import slackRoutes from './routes/slackRoutes.js'
import { errorHandler } from './middleware/errorHandler.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// app.use(cors({
//   origin: ['http://localhost:5173', 'https://cms-matrix.vercel.app'],
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
//   exposedHeaders: ['Set-Cookie'],
//   preflightContinue: false,
//   optionsSuccessStatus: 204
// }));
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'https://cms-matrix.vercel.app', 'https://cmsmatrix.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json());
app.use(cookieParser());

// Debug middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI.replace(
      '<db_password>',
      process.env.MONGODB_PASSWORD
    );
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Initialize Matrix client
const initializeMatrix = async () => {
  try {
    const client = await initializeMatrixClient();
    app.locals.matrixClient = client;
    console.log('Matrix client initialized successfully');
  } catch (error) {
    console.error('Matrix client initialization error:', error);
    process.exit(1);
  }
};

const initializeSlack = async () => {
  const client = await initializeSlackClient();
  app.locals.slackClient = client;
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1,
    matrixClient: !!app.locals.matrixClient
  });
});

// Handle preflight requests
app.options('*', (req, res) => {
  res.status(204).end();
});

app.options('*', cors());
// Routes
app.use('/auth', authRoutes);
app.use('/rooms', roomRoutes);
app.use('/admin', adminRoutes);
app.use('/slack', slackRoutes);

// Error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDB();
    await initializeMatrix();
    await initializeSlack()
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('MongoDB connected');
      console.log('Matrix client initialized');
      console.log('Slack client initialized');
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

startServer();