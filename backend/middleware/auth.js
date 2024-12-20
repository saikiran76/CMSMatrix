// backend/middleware/auth.js
import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });

  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { _id: decoded.id, email: decoded.email, role: decoded.role };
    console.log('Authenticated user:', req.user); // Add this line
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};


