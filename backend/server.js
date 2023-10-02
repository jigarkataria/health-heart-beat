const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());
try {
  mongoose.connect( 'mongodb+srv://jigar:Kataria1994@cluster0.baahd3n.mongodb.net/?retryWrites=true&w=majority', {useNewUrlParser: true, useUnifiedTopology: true});    

  const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
  console.log("Connected successfully");
});
  }catch (error) { 
  console.log("could not connect");    
  }

const Heartbeat = mongoose.model('Heartbeat', {
  date: Date,
  time: String,
  heartRate: Number,
  day: String,
});

// Multer setup for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
});

// Upload endpoint
app.post('/upload', upload.array('files', 3), async (req, res) => {
  try {
    const data = [];

    for (const file of req.files) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer);
      const worksheet = workbook.worksheets[0];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const [date, time, heartRate, day] = row.values;
          // Validate heart rate (add your validation logic here)
          if (heartRate >= 60 && heartRate <= 100) {
            data.push({ date, time, heartRate, day });
          }
        }
      });
    }

    // Store data in the database
    await Heartbeat.insertMany(data);
    res.status(200).send('Data uploaded successfully.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Averaging function
app.get('/average/:day', async (req, res) => {
  const { day } = req.params;
  try {
    const result = await Heartbeat.aggregate([
      { $match: { day: day } },
      {
        $group: {
          _id: null,
          averageHeartRate: { $avg: '$heartRate' },
        },
      },
    ]);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
