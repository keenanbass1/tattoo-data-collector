const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000; // Changed to match .env

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory...');
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit to match client-side iOS check
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

// Simple uploads browser
app.get('/uploads-browser', (req, res) => {
  try {
    const files = fs.readdirSync(path.join(__dirname, 'uploads'))
      .filter(file => !file.startsWith('.'));
    
    res.send(`
      <html>
        <head>
          <title>Uploads Browser</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
            .image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
            .image-item { border: 1px solid #ddd; border-radius: 5px; overflow: hidden; }
            .image-item img { width: 100%; height: 200px; object-fit: cover; }
            .image-name { padding: 10px; text-align: center; overflow: hidden; text-overflow: ellipsis; }
          </style>
        </head>
        <body>
          <h1>Uploads Browser</h1>
          <div class="image-grid">
            ${files.map(file => `
              <div class="image-item">
                <a href="/uploads/${file}" target="_blank">
                  <img src="/uploads/${file}" alt="${file}">
                  <div class="image-name">${file}</div>
                </a>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Error handler for 404 (Not Found)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.status(404).sendFile(path.join(__dirname, 'public', 'error.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
  
  res.status(500).sendFile(path.join(__dirname, 'public', 'error.html'));
});

// Start the server first, then connect to MongoDB
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Connect to MongoDB after server has started with retry logic
  const connectWithRetry = (retryCount = 0, maxRetries = 5) => {
    const retryDelay = Math.min(Math.pow(2, retryCount) * 1000, 30000); // Exponential backoff with max 30s delay
    
    console.log(`Attempting to connect to MongoDB (attempt ${retryCount + 1} of ${maxRetries + 1})`);
    
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tattoo-data', {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s default
      family: 4 // Force IPv4
    })
    .then(() => {
      console.log('Connected to MongoDB successfully');
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
      
      if (retryCount < maxRetries) {
        console.log(`Retrying connection in ${retryDelay}ms...`);
        setTimeout(() => connectWithRetry(retryCount + 1, maxRetries), retryDelay);
      } else {
        console.error('Maximum retry attempts reached. Please check your MongoDB connection.');
      }
    });
  };
  
  connectWithRetry();
});