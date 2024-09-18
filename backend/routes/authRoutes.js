const express = require('express');
const router = express.Router();
const User = require('../models/users');
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middlewares/authenticateToken'); // Import the error handler
const crypto = require('crypto');
const twilio = require('twilio');

// Your Twilio credentials
const accountSid = decrypt(process.env.accountSid,process.env.JWT_SECRET); 
const authToken = decrypt(process.env.authToken,process.env.JWT_SECRET)
const client = new twilio(accountSid, authToken);

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
      if(req.body.password) {
        const { password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
       req.body.password = hashedPassword;
       const user = new User(req.body);
       await user.save();
       res.status(201).json({ message: 'User registered successfully.' });
      } else {
       const user = new User(req.body);
       await user.save();
       res.status(201).json({ message: 'User registered successfully.' });
      }
    } catch (error) {
      next(error);
    }
});

router.post('/updateUser', async (req, res, next) => {
  try {
    const { password } = req.body;
    if(password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      req.body.password = hashedPassword;
    }
    const user = await User.findOneAndUpdate({email : req.body.email}, req.body)
    res.status(201).json({ message: 'User updated successfully.' });
  } catch (error) {
    next(error);
  }
});

// Generate a random OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

// Optional: Generate a unique token (for added security)
const generateToken = () => {
  return crypto.randomBytes(20).toString('hex'); // Token
};

// Simple encryption function
function encrypt(text, secretKey) {
  const algorithm = 'aes-256-cbc';
  const iv = crypto.randomBytes(16); // Generate random IV

  // Ensure the key is 32 bytes (256 bits) for AES-256
  const key = crypto.createHash('sha256').update(secretKey).digest('base64').substr(0, 32);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Return IV and encrypted data as hex string
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Simple decryption function
function decrypt(encryptedText, secretKey) {
  const algorithm = 'aes-256-cbc';
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts[0], 'hex');
  const encryptedData = Buffer.from(textParts[1], 'hex');

  // Ensure the key is 32 bytes (256 bits) for AES-256
  const key = crypto.createHash('sha256').update(secretKey).digest('base64').substr(0, 32);

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}
router.post('/request-reset-password', async (req, res) => {
  const { mobile_number } = req.body;
  
  const user = await User.findOne({ mobile_number });
  if (!user) return res.status(404).json({ message: 'User not found' });
let sid = "AC321377ebe85c017c168bd2a8e82201b8";
let secret = "21bc82d7034b986140efad9b32ea8c71"
  const otp = generateOTP();

  // Store OTP in user’s record with expiration
  user.resetOTP = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes
  await user.save();

  // Send OTP via SMS
  await client.messages.create({
    body: `Your password reset OTP is: ${otp}`,
    from: '+16017930493',
    to: `+91${user?.mobile_number}`
  });

  res.status(200).json({ message: 'OTP sent' });
});

const saveNewPassword = async (userId, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update user's password in the database
  await User.findByIdAndUpdate(userId, {
    password: hashedPassword
  });
};

router.post('/reset-password', async (req, res) => {
  const { mobile_number, otp, newPassword } = req.body;

  const user = await User.findOne({ mobile_number });
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Check if OTP is valid and not expired
  if (user.resetOTP !== otp || Date.now() > user.otpExpires) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  // Hash and save the new password
  await saveNewPassword(user._id, newPassword);

  // Clear the OTP
  user.resetOTP = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.status(200).json({ message: 'Password reset successfully' });
});

module.exports = router;
