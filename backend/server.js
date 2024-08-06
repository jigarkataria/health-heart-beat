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

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // uuid();
    const fileInfo = await uploadFile(req.file);
    res.json({ message: 'File uploaded successfully', fileInfo });
  } catch (error) {
    console.log(error,'error')
    res.status(500).json({ error: 'Error uploading file' });
  }
});

// uiid
app.get('/files/:fileName', async (req, res) => {
  try {
    const fileUrl = await getFileUrl(req.params.fileName);
    res.sendFile(fileUrl, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).send('Failed to send file');
      }
    });
    // res.json({ fileUrl });
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving file' });
  }
});
app.use(errorHandler);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
