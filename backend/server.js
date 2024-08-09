const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./models/users'); // Mongoose model users
const app = express();
const { uploadFile, getFileUrl } = require('./storageService');
const upload = multer({ storage: multer.memoryStorage() });
require('dotenv').config();
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middlewares/errorHandler'); // Import the error handler
const authenticateToken = require('./middlewares/authenticateToken'); // Import the error handler
const File = require('./models/document');
const { v4: uuidv4 } = require('uuid');
const path = require('path');


app.use(cors());
app.use(bodyParser.json());
try {
  mongoose.connect('mongodb+srv://jigar:Kataria1994@cluster0.baahd3n.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });

  const db = mongoose.connection;
  db.on("error", console.error.bind(console, "connection error: "));
  db.once("open", function () {
    console.log("Connected successfully");
  });
} catch (error) {
  console.log("could not connect");
}

// health check
app.get('/', async (req, res) => {
  try {
    console.log("process.env.JWT_SECRET",process.env.JWT_SECRET)
    res.json({ message : "OK" });
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving file' });
  }
});

app.use('/api/auth', authRoutes);


// app.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ error: 'Invalid credentials' });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ error: 'Invalid credentials' });
//     }
//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
//     res.json({ token });
//   } catch (error) {
//     if (error?.name === 'ValidationError') {
//       // Handle validation errors
//       res.status(422).json({ error: 'Error logging in', message: error.errors });
//     } else {
//       console.error('Error during login:', error);
//       res.status(400).send({ error: error.message });
//     }
//   }
// });

// app.post('/signup', async (req, res) => {
//   try {
//     const { username, email, password } = req.body;
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const user = new User({ username, email, password: hashedPassword });
//     await user.save();
//     res.status(201).json({ message: 'User registered successfully.' });
//   } catch (error) {
//     console.log(error,'error')
//     if (error.name === 'ValidationError') {
//       // Handle validation errors
//       res.status(422).json({ error: 'Error registering user', message: error.errors });
//       console.error('Validation Error:', error.errors);
//     } else {
//       console.error('Error during signup:', error);
//       res.status(400).send({ error: error.message });
//     }
//   }
// });

app.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    // uuid();
    const fileName = Date.now() + path.extname(req.file.originalname);

    const fileInfo = await uploadFile(req.file,fileName);
    const file = req.file;
    const document = new File({
      user_id: req.user.id,
      original_file_name: file.originalname,
      file_type: file.mimetype,
      file_size: file.size,
      upload_date: new Date(),
      storage_type: fileInfo.storageType,
      storage_path: fileInfo.path,
      s3_url: fileInfo.url,
      file_name: fileName
    });

    await document.save();
    res.status(201).json({ message: 'File uploaded successfully.', document_id: document._id });
  } catch (error) {
    console.log(error,'error')
    res.status(500).json({ error: 'Error uploading file' });
  }
});

// uiid
app.get('/file', authenticateToken, async (req, res) => {
  try {
    const fileUrl = await getFileUrl(req.query.fileName);
    res.sendFile(fileUrl, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).send('Failed to send file');
      }
    });
    // res.json({ fileUrl });
  } catch (error) {
    console.log('Error in /file',error);
    res.status(500).json({ error: 'Error retrieving file' });
  }
});

// uiid
app.get('/getallfile', authenticateToken, async (req, res) => {
  try {
    console.log(req.user,'-- req user ---')
    const allFiles = await File.find({user_id:req.user.id})
    res.json({ allFiles });
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving file' });
  }
});
app.use(errorHandler);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
