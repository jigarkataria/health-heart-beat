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
  mongoose.connect('mongodb+srv://jigar:Kataria1994@cluster0.baahd3n.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });

  const db = mongoose.connection;
  db.on("error", console.error.bind(console, "connection error: "));
  db.once("open", function () {
    console.log("Connected successfully");
  });
} catch (error) {
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

      // Custom validation functions
      function isValidDate(dateString) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        return regex.test(dateString) && new Date(dateString).toISOString().slice(0, 10) === dateString;
      }

      function isValidDay(day) {
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return daysOfWeek.includes(day);
      }

      function isValidTime(time) {
        // Implement your logic to validate time format (8.00-9.00 and equal distance) here
        // For simplicity, let's assume any time input is valid for now
        return true;
      }


      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const [date, time, heartRate, day] = row.values.slice(1);
          // Validate heart rate (add your validation logic here)
          if (heartRate >= 60 && heartRate <= 100) {
            data.push({ date, time, heartRate, day });
          }
        }
      });
    }
    const validatedData = data.filter((record) => {
      const { date, day, time, heartRate } = record;
      return isValidDate(date) && isValidDay(day) && isValidTime(time) && isValidHeartRate(heartRate);
    });

    // Store data in the database
    const response = await Heartbeat.insertMany(validatedData);
    res.status(200).send(response);
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
      // { $match: { day: day } },
      {
        $group: {
          _id: { "day": "$day" },
          averageHeartRate: { $avg: '$heartRate' },
        },
      },
    ]);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

// Reset route
app.delete('/reset', async (req, res) => {
  try {
    await Heartbeat.deleteMany({});
    res.status(200).send('All data deleted successfully.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
