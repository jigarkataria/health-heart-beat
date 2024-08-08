const jwt = require('jsonwebtoken');

// JWT Middleware
const authenticateToken = (req, res, next) => {
  // Get token from the Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user; // Store the user information in request
    next(); // Proceed to the next middleware or route handler
  });
};

module.exports = authenticateToken;
