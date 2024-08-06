const express = require('express');
const router = express.Router();
const User = require('../models/users');


router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
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
    //   const { username, email, password } = req.body;
    //   const hashedPassword = await bcrypt.hash(password, 10);
    //   const user = new User({ username, email, password: hashedPassword });
      const user = new User(req.body);
      await user.save();
      res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
      next(error);
    }
});

module.exports = router;
