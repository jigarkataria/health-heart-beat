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

// router.post('/signup', async (req, res, next) => {
//   try {
//     if (req.body.password) {
//       const { password } = req.body;
//       const hashedPassword = await bcrypt.hash(password, 10);
//       req.body.password = hashedPassword;
//       const user = new User(req.body);
//       await user.save();
//       res.status(201).json({ message: 'User registered successfully.' });
//     } else {
//       const user = new User(req.body);

//       if (req?.body?.aadhaarNumber) {
//         let aadhaarResponse = await sendOtpAadhaar(req?.body?.mobile_number, req?.body?.aadhaarNumber)
//         // console.log(aadhaarResponse?.data, '--- response ----');
//         if (aadhaarResponse?.data?.data?.message == "OTP sent successfully") {
//           user.reference_id = aadhaarResponse?.data?.data?.reference_id;
//           await user.save();
//           res.status(201).json({ message: aadhaarResponse?.data?.data?.message });
//         } else {
//           await user.save();
//           res.status(422).json({ message: aadhaarResponse?.data?.data?.message });
//         }

//       } else {
//         await user.save();
//         res.status(201).json({ message: 'User registered successfully.' });
//       }
//     }
//   } catch (error) {
//     next(error);
//   }
// });


router.post('/signup', async (req, res, next) => {
  try {
    const { email, mobile_number, aadhaarNumber } = req.body;

    // Check for missing required fields
    if (!email || !mobile_number || !aadhaarNumber) {
      return res.status(400).json({ error: 'Email, mobile number and aadhaarNumber are required.' });
    }

    // Check if the user is already registered by email or mobile number
    const existingUser = await User.findOne({
      $or: [{ email }, { mobile_number }, { aadhaarNumber }]
    }).sort({ _id: -1 });

    if (existingUser) {
      return res.status(409).json({ error: 'User already registered with this email or mobile number.' });
    }

    // Create a new user instance
    const user = new User(req.body);

    // If Aadhaar number is provided, send OTP for Aadhaar verification
    if (aadhaarNumber) {
      let aadhaarResponse;
      try {
        aadhaarResponse = await sendOtpAadhaar(mobile_number, aadhaarNumber);
      } catch (aadhaarError) {
        console.log(aadhaarError, '--aadhaar Error')
        return res.status(502).json({ error: 'Failed to connect to Aadhaar service. Please try again later.' });
      }
      console.log(aadhaarResponse?.message, '------aadhaarResponse--------')
      if (aadhaarResponse.message === 'OTP sent successfully.') {
        user.reference_id = aadhaarResponse?.data?.data?.reference_id;
        await user.save();
        return res.status(201).json({ message: 'User registered successfully. Aadhaar OTP sent.' });
      } else {
        return res.status(422).json({ error: `Aadhaar verification failed: ${aadhaarResponse?.data?.data?.message || aadhaarResponse?.message}` });
      }
    }

    // Save user without Aadhaar verification
    await user.save();
    return res.status(201).json({ message: 'User registered successfully.' });

  } catch (error) {
    console.log(error)
    // Handle validation or other errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
});


router.post('/updateUser', async (req, res, next) => {
  try {
    const { password } = req.body;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      req.body.password = hashedPassword;
      req.body.status = 'REGISTERED'
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
    return res.status(400).json({ message: 'Invalid or expired OTP', error: 'Invalid or expired OTP' });
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
    return ('Error fetching the authorization token:', error.response ? error.response.data : error.message);
  }
}

// async function sendOtpAadhaar(mobile_number, aadhaar_number) {
//   try {
//     const token = await getAuthToken();
//     console.log(token, ' token otp')

//     const response = await axios.post('https://api.sandbox.co.in/kyc/aadhaar/okyc/otp', {
//       'consent': 'Y',
//       'reason': 'Testing new applicationnnnn',
//       'aadhaar_number': aadhaar_number,
//       "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp.request"
//     }, {
//       headers: {
//         'authorization': token,
//         'x-api-key': 'key_live_b8P6Xan5P9Id2VzLdSijJLA97ZBIh7S1',
//         'x-api-version': '2.0',
//         'Content-Type': 'application/json'
//       },
//     });

//     return response;
//   } catch( error ) {
//     res.status(500).send({error})
//   }

// }

async function sendOtpAadhaar(mobile, aadhaar_number) {
  try {
    // Check if mobile number or aadhaar number is missing
    if (!aadhaar_number) {
      return ({ message: 'Aadhaar number is required.' });
    }

    // Check if Aadhaar number is valid (e.g., 12 digits)
    // if (!/^\d{12}$/.test(aadhaar_number)) {
    //   return ({ message: 'Invalid Aadhaar number format. Aadhaar number must be 12 digits.' });
    // }

    // Retrieve authorization token
    let token;
    try {
      token = await getAuthToken();
    } catch (authError) {
      return ({ message: 'Failed to retrieve authorization token.', error: authError.message });
    }

    // Proceed to send OTP to Aadhaar API
    let response;
    try {
      response = await axios.post('https://api.sandbox.co.in/kyc/aadhaar/okyc/otp', {
        'consent': 'Y',
        'reason': 'Testing new application',
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
    } catch (apiError) {
      // Handle errors from the Aadhaar API
      if (apiError.response) {
        // API responded but with an error status (4xx or 5xx)
        return ({
          message: `Aadhaar API Error: ${apiError.response.data.message || 'Unknown error'}`,
          error: apiError.response.data
        });
      } else if (apiError.request) {
        // Request was made but no response was received
        return json({ message: 'No response from Aadhaar API. Please try again later.', error: 'No response from Aadhaar API. Please try again later.' });
      } else {
        // Something happened in setting up the request
        return json({ message: 'Error setting up the request.', error: apiError.message });
      }
    }

    // Check the response from the Aadhaar API
    const { data } = response;
    if (data && data.data && data.data.message === 'OTP sent successfully') {
      return ({ message: 'OTP sent successfully.', reference_id: data.data.reference_id });
    } else {
      // If OTP was not sent successfully
      return ({ message: 'Failed to send OTP. Please check the details and try again.' });
    }

  } catch (error) {
    // Catch any unexpected errors
    return ({ message: error.message, error: error.message });
  }
}


// router.post('/verify-aadhaar-otp', async (req, res) => {
//   try {
//     const { mobile_number, otp } = req.body;
//     const user = await User.findOne({ mobile_number });
//     const token = await getAuthToken();

//     const response = await axios.post('https://api.sandbox.co.in/kyc/aadhaar/okyc/otp/verify', {
//       '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.request',
//       reference_id: user?.reference_id,
//       otp: otp
//     }, {
//       headers: {
//         'authorization': token,
//         'x-api-key': 'key_live_b8P6Xan5P9Id2VzLdSijJLA97ZBIh7S1',
//         'x-api-version': '2.0',
//         'Content-Type': 'application/json'
//       },
//     });
//     // console.log(response, '--response ---')
//     if (response?.data?.data?.message === 'Aadhaar Card Exists') {
//       // console.log(response?.data?.data?.mobile_hash, '--esponse?.data?.data?.mobile_hash--')
//       await User.findOneAndUpdate({ email: user.mobile_number }, { mobile_hash: response?.data?.data?.mobile_hash })
//       res.send({ message: response?.data?.data?.message })
//     } else {
//       res.status(422).send({ error: { message: response?.data?.data?.message } })
//     }

//   } catch (error) {
//     res.status(500).send({ error })
//   }

// })

router.post('/verify-aadhaar-otp', async (req, res) => {
  try {
    const { mobile_number, otp } = req.body;
    const user = await User.findOne({ mobile_number });
    // Check if mobile number or aadhaar number is missing
    if (!mobile_number || !aadhaar_number) {
      return res.status(400).json({ error: 'Mobile number and Aadhaar number are required.' });
    }

    // Check if Aadhaar number is valid (e.g., 12 digits)
    if (!/^\d{12}$/.test(aadhaar_number)) {
      return res.status(400).json({ error: 'Invalid Aadhaar number format. Aadhaar number must be 12 digits.' });
    }

    // Retrieve authorization token
    let token;
    try {
      token = await getAuthToken();
    } catch (authError) {
      return res.status(500).json({ message: 'Failed to retrieve authorization token.', error: "Something went wrong please try again." });
    }

    // Proceed to send OTP to Aadhaar API
    let response;
    try {
      response = await axios.post('https://api.sandbox.co.in/kyc/aadhaar/okyc/otp', {
        'consent': 'Y',
        'reason': 'Testing new application',
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
    } catch (apiError) {
      // Handle errors from the Aadhaar API
      if (apiError.response) {
        // API responded but with an error status (4xx or 5xx)
        return res.status(apiError.response.status).json({
          message: `Aadhaar API Error: ${apiError.response.data.message || 'Unknown error'}`,
          error:  "Please try again later." 
        });
      } else if (apiError.request) {
        // Request was made but no response was received
        return res.status(502).json({ error: 'No response from Aadhaar API. Please try again later.' });
      } else {
        // Something happened in setting up the request
        return res.status(500).json({ message: `Error setting up the request ${apiError.message}`, error: "Please try again later." });
      }
    }

    // Check the response from the Aadhaar API
    const { data } = response;
    if (data && data.data && data.data.message === 'OTP sent successfully') {
      return res.status(200).json({ message: 'OTP sent successfully.', reference_id: data.data.reference_id });
    } else {
      // If OTP was not sent successfully
      return res.status(422).json({ error: 'Failed to send OTP. Please check the details and try again.' });
    }

  } catch (error) {
    // Catch any unexpected errors
    return res.status(500).json({ message: 'An unexpected error occurred.', error: error.message });
  }
})
module.exports = router;
