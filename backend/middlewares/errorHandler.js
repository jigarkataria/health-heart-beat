const mongoose = require('mongoose');

function errorHandler(err, req, res, next) {
  if (err instanceof mongoose.Error.ValidationError) {
    // Handle Mongoose validation errors
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ errors });
  }

  if (err.code && err.code === 11000) {
    // Handle MongoDB duplicate key error
    const field = Object.keys(err.keyPattern)[0];
    const value = err.keyValue[field];
    const message = `Duplicate key error: ${field} '${value}' already exists.`;
    return res.status(409).json({ error: message });
  }

  // Handle other errors
  console.error(err.stack);
  res.status(500).json({ error: 'An unexpected error occurred.' });
}

module.exports = errorHandler;