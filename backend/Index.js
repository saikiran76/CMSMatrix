import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import { initializeMatrixClient } from './services/matrixService.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'https://cms-matrix.vercel.app'],
  credentials: true
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1,
    matrixClient: !!app.locals.matrixClient
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/rooms', roomRoutes);
app.use('/admin', adminRoutes);

// Error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDB();
    await initializeMatrix();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('MongoDB connected');
      console.log('Matrix client initialized');
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