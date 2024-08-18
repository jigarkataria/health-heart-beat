const express = require('express');
const router = express.Router();
const User = require('../models/users');
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middlewares/authenticateToken'); // Import the error handler


router.post('/login', async (req, res, next) => {
  try {
    const { mobile_number, password } = req.body;
    const user = await User.findOne({ mobile_number });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    next(error);
  }
});

router.post('/signup', async (req, res, next) => {
    try {
       const { username, email, password } = req.body;
       const hashedPassword = await bcrypt.hash(password, 10);
    //   const user = new User({ username, email, password: hashedPassword });
      req.body.password = hashedPassword;
      const user = new User(req.body);
      await user.save();
      res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
      next(error);
    }
});

router.post('/updateUser', authenticateToken, async (req, res, next) => {
  try {
    const objectId = req.user.id;
    const user = await User.findByIdAndUpdate(objectId, req.body)
    res.status(201).json({ message: 'User updated successfully.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
