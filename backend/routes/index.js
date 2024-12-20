import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import searchRoutes from './searchRoutes.js';
import roomRoutes from './roomRoutes.js';
import slackRoutes from './slackRoutes.js'
import discordRoutes from './discordRoutes.js'
export const initializeRoutes = (app) => {
  app.use('/auth', authRoutes);
  app.use('/admin', adminRoutes);
  app.use('/search', searchRoutes);
  app.use('/rooms', roomRoutes);
  app.use('/slack', slackRoutes)
  app.use('/discord', discordRoutes)
};