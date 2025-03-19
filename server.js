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
  res.send(`
    <html>
      <head>
        <title>Uploads Browser</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
          .image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
          .image-item { border: 1px solid #ddd; border-radius: 5px; overflow: hidden; position: relative; }
          .image-item img { width: 100%; height: 200px; object-fit: cover; }
          .image-name { padding: 10px; text-align: center; overflow: hidden; text-overflow: ellipsis; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .btn { background: #4285f4; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; border: none; cursor: pointer; }
          .info { margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
          .loading { text-align: center; padding: 50px; font-size: 20px; }
          .error { background: #ffebee; color: #c62828; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .badge { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
          .tabs { display: flex; border-bottom: 1px solid #ddd; margin-bottom: 20px; }
          .tab { padding: 10px 20px; cursor: pointer; }
          .tab.active { border-bottom: 2px solid #4285f4; font-weight: bold; }
          .tab-content { display: none; }
          .tab-content.active { display: block; }
          .missing-file { background: #fff3e0; padding: 10px; margin-bottom: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Uploads Browser</h1>
          <div>
            <a href="/download-data" class="btn">Download JSON Data</a>
          </div>
        </div>
        
        <div class="tabs">
          <div class="tab active" data-tab="files">Files</div>
          <div class="tab" data-tab="diagnostics">Diagnostics</div>
          <div class="tab" data-tab="missing">Missing Files</div>
        </div>
        
        <div id="files" class="tab-content active">
          <div class="info">
            <p>Loading file information from the server...</p>
          </div>
          <div id="fileGrid" class="image-grid">
            <div class="loading">Loading...</div>
          </div>
        </div>
        
        <div id="diagnostics" class="tab-content">
          <h2>Server Information</h2>
          <div id="serverInfo" class="info">
            <div class="loading">Loading server info...</div>
          </div>
        </div>
        
        <div id="missing" class="tab-content">
          <h2>Missing Files</h2>
          <p>These are files referenced in the database but not found on disk:</p>
          <div id="missingFiles">
            <div class="loading">Checking for missing files...</div>
          </div>
        </div>
        
        <script>
          // Tab switching functionality
          document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
              // Update active tab
              document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
              tab.classList.add('active');
              
              // Show corresponding content
              const tabName = tab.getAttribute('data-tab');
              document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
              });
              document.getElementById(tabName).classList.add('active');
            });
          });
          
          // Load file data from API
          async function loadServerFiles() {
            try {
              const response = await fetch('/api/server-files');
              const data = await response.json();
              
              if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch server files');
              }
              
              // Update server info
              const serverInfoDiv = document.getElementById('serverInfo');
              serverInfoDiv.innerHTML = `
                <p><strong>Environment:</strong> ${data.serverInfo.environment}</p>
                <p><strong>Uploads path:</strong> ${data.serverInfo.uploadsPath}</p>
                <p><strong>Total files:</strong> ${data.serverInfo.totalFiles}</p>
              `;
              
              // Display files
              const fileGrid = document.getElementById('fileGrid');
              if (data.files.length === 0) {
                fileGrid.innerHTML = '<p>No files found on the server.</p>';
                return;
              }
              
              fileGrid.innerHTML = data.files.map(file => `
                <div class="image-item">
                  ${file.used ? '<span class="badge">In use</span>' : ''}
                  <a href="${file.path}" target="_blank">
                    <img src="${file.path}" alt="${file.name}" onerror="this.src='/placeholder.png'; this.onerror=null;">
                    <div class="image-name">${file.name}</div>
                  </a>
                  <div class="image-info">
                    <small>Size: ${formatSize(file.size)}</small>
                  </div>
                </div>
              `).join('');
              
              // Display missing files
              const missingFilesDiv = document.getElementById('missingFiles');
              if (data.missingFiles.length === 0) {
                missingFilesDiv.innerHTML = '<p>No missing files found - all database records have corresponding files.</p>';
              } else {
                missingFilesDiv.innerHTML = data.missingFiles.map(file => `
                  <div class="missing-file">
                    <p><strong>Filename:</strong> ${file.filename}</p>
                    <p><strong>URL in database:</strong> ${file.url}</p>
                    <p><strong>Record ID:</strong> ${file.id}</p>
                  </div>
                `).join('');
              }
            } catch (error) {
              console.error('Error loading server files:', error);
              document.getElementById('fileGrid').innerHTML = `
                <div class="error">
                  <p>Error loading files: ${error.message}</p>
                </div>
              `;
            }
          }
          
          function formatSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
          }
          
          // Load data when page loads
          document.addEventListener('DOMContentLoaded', loadServerFiles);
        </script>
      </body>
    </html>
  `);
});

// API endpoint to list actual server files
app.get('/api/server-files', async (req, res) => {
  try {
    const uploadsPath = path.join(__dirname, 'uploads');
    console.log(`Reading server files from: ${uploadsPath}`);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
      console.log(`Created directory: ${uploadsPath}`);
    }
    
    // Read the directory
    const allFiles = fs.readdirSync(uploadsPath);
    
    // Filter and get file details
    const files = allFiles
      .filter(file => !file.startsWith('.') && !file.endsWith('.gitkeep'))
      .map(file => {
        const filePath = path.join(uploadsPath, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: `/uploads/${file}`,
          size: stats.size,
          created: stats.birthtime
        };
      });
    
    // Get MongoDB records
    const tattoos = await Tattoo.find();
    const usedFiles = new Set();
    
    tattoos.forEach(tattoo => {
      const filename = tattoo.imageUrl.split('/').pop();
      usedFiles.add(filename);
    });
    
    // Mark files as used or unused
    const enhancedFiles = files.map(file => ({
      ...file,
      used: usedFiles.has(file.name)
    }));
    
    // Find orphaned references (files in DB but not on disk)
    const missingFiles = [];
    tattoos.forEach(tattoo => {
      const filename = tattoo.imageUrl.split('/').pop();
      if (!allFiles.includes(filename)) {
        missingFiles.push({
          id: tattoo._id,
          url: tattoo.imageUrl,
          filename
        });
      }
    });
    
    res.json({
      serverInfo: {
        environment: process.env.NODE_ENV || 'development',
        uploadsPath,
        totalFiles: files.length
      },
      files: enhancedFiles,
      missingFiles
    });
  } catch (error) {
    console.error('Error listing server files:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// Data download endpoint
app.get('/download-data', async (req, res) => {
  try {
    // Get all tattoo data from MongoDB
    const tattoos = await Tattoo.find().sort({ createdAt: -1 });
    
    // Create a JSON file with the data
    const dataJson = JSON.stringify(tattoos, null, 2);
    
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename=tattoo-data-${new Date().toISOString().slice(0,10)}.json`);
    res.setHeader('Content-Type', 'application/json');
    
    // Send the file
    res.send(dataJson);
  } catch (error) {
    console.error('Error creating data download:', error);
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