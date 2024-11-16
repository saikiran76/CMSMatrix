import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import searchRoutes from './searchRoutes.js';
import roomRoutes from './roomRoutes.js';

export const initializeRoutes = (app) => {
  app.use('/auth', authRoutes);
  app.use('/admin', adminRoutes);
  app.use('/search', searchRoutes);
  app.use('/rooms', roomRoutes);
};