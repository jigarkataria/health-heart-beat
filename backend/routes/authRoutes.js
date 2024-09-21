const express = require('express');
const router = express.Router();
const User = require('../models/users');
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middlewares/authenticateToken'); // Import the error handler
const crypto = require('crypto');
const twilio = require('twilio');
const axios = require('axios');

// Your Twilio credentials
const accountSid = decrypt(process.env.accountSid, process.env.JWT_SECRET);
const authToken = decrypt(process.env.authToken, process.env.JWT_SECRET)
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
    if (req.body.password) {
      const { password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      req.body.password = hashedPassword;
      const user = new User(req.body);
      await user.save();
      res.status(201).json({ message: 'User registered successfully.' });
    } else {
      const user = new User(req.body);

      if (req?.body?.aadhaarNumber) {
        let aadhaarResponse = await sendOtpAadhaar(req?.body?.mobile_number, req?.body?.aadhaarNumber)
        // console.log(aadhaarResponse?.data, '--- response ----');
        if (aadhaarResponse?.data?.data?.message == "OTP sent successfully") {
          user.reference_id = aadhaarResponse?.data?.data?.reference_id;
          await user.save();
          res.status(201).json({ message: aadhaarResponse?.data?.data?.message });
        } else {
          await user.save();
          res.status(422).json({ message: aadhaarResponse?.data?.data?.message });
        }

      } else {
        await user.save();
        res.status(201).json({ message: 'User registered successfully.' });
      }
    }
  } catch (error) {
    next(error);
  }
});

router.post('/updateUser', async (req, res, next) => {
  try {
    const { password } = req.body;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      req.body.password = hashedPassword;
    }
    const user = await User.findOneAndUpdate({ email: req.body.email }, req.body)
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
  const { mobile_number, newPassword } = req.body;
  const user = await User.findOne({ mobile_number });
  if (!user) return res.status(404).json({ message: 'User not found' });


  // Hash and save the new password
  await saveNewPassword(user._id, newPassword);

  res.status(200).json({ message: 'Password reset successfully' });
});

router.post('/check-otp', async (req, res) => {
  const { mobile_number, otp } = req.body;

  const user = await User.findOne({ mobile_number });
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Check if OTP is valid and not expired
  if (user.resetOTP !== otp || Date.now() > user.otpExpires) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  // Clear the OTP
  user.resetOTP = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.status(200).json({ message: 'OTP checked successfully' });
})

async function getAuthToken() {
  try {
    const response = await axios.post('https://api.sandbox.co.in/authenticate', null, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'key_live_b8P6Xan5P9Id2VzLdSijJLA97ZBIh7S1',
        'x-api-secret': 'secret_live_BPyibwBEJTWyls0eqh26EzfcBOmvoWm2',
        'x-api-version': '2.0'
      },
    });

    // The token is usually in the `access_token` field of the response
    const token = response.data.access_token;
    // console.log('Access Token:', token);
    return token;

  } catch (error) {
    console.error('Error fetching the authorization token:', error.response ? error.response.data : error.message);
  }
}

async function sendOtpAadhaar(mobile_number, aadhaar_number) {
  try {
    const token = await getAuthToken();
    console.log(token, ' token otp')
  
    const response = await axios.post('https://api.sandbox.co.in/kyc/aadhaar/okyc/otp', {
      'consent': 'Y',
      'reason': 'Testing new applicationnnnn',
      'aadhaar_number': aadhaar_number,
      "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp.request"
    }, {
      headers: {
        'authorization': token,
        'x-api-key': 'key_live_b8P6Xan5P9Id2VzLdSijJLA97ZBIh7S1',
        'x-api-version': '2.0',
        'Content-Type': 'application/json'
      },
    });
  
    return response;
  } catch( error ) {
    res.status(500).send({error})
  }
 
}

router.post('/verify-aadhaar-otp', async (req, res) => {
  try {
    const { mobile_number, otp } = req.body;
    const user = await User.findOne({ mobile_number });
    const token = await getAuthToken();

    const response = await axios.post('https://api.sandbox.co.in/kyc/aadhaar/okyc/otp/verify', {
      '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.request',
      reference_id: user?.reference_id,
      otp: otp
    }, {
      headers: {
        'authorization': token,
        'x-api-key': 'key_live_b8P6Xan5P9Id2VzLdSijJLA97ZBIh7S1',
        'x-api-version': '2.0',
        'Content-Type': 'application/json'
      },
    });
    // console.log(response, '--response ---')
    if (response?.data?.data?.message === 'Aadhaar Card Exists') {
      // console.log(response?.data?.data?.mobile_hash, '--esponse?.data?.data?.mobile_hash--')
      await User.findOneAndUpdate({ email: user.mobile_number }, { mobile_hash: response?.data?.data?.mobile_hash })
    }
    res.send({ message: response?.data?.data?.message })
  } catch (error) {
    res.status(500).send({error})
  }

})
module.exports = router;
