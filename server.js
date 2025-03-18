const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Images only!');
    }
  }
});

// MongoDB Schema for tattoo data
const tattooSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  timeInMinutes: {
    type: Number,
    required: true
  },
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Tattoo = mongoose.model('Tattoo', tattooSchema);

// API endpoints
app.post('/api/tattoos', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const { price, timeInMinutes, tags } = req.body;
    
    if (!price || !timeInMinutes) {
      return res.status(400).json({ error: 'Price and time are required' });
    }

    const newTattoo = new Tattoo({
      imageUrl: `/uploads/${req.file.filename}`,
      price: parseFloat(price),
      timeInMinutes: parseInt(timeInMinutes),
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    });

    await newTattoo.save();
    res.status(201).json({ success: true, tattoo: newTattoo });
  } catch (error) {
    console.error('Error saving tattoo data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/tattoos', async (req, res) => {
  try {
    const tattoos = await Tattoo.find().sort({ createdAt: -1 });
    res.json(tattoos);
  } catch (error) {
    console.error('Error fetching tattoo data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Connect to MongoDB (local for development, can be changed to Atlas for production)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tattoo-data')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });