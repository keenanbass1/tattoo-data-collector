const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
};

// Validate Cloudinary credentials
if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
  console.error('⚠️ Missing Cloudinary credentials in environment variables!');
  console.error('Please ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set.');
} else {
  console.log('Cloudinary configuration found with cloud name:', cloudinaryConfig.cloud_name);
}

cloudinary.config(cloudinaryConfig);

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

// Set up multer for file uploads - use memory storage for Cloudinary
const storage = multer.memoryStorage();

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
  timeInHours: {
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
    // Log request information including user agent
    console.log('Request received from:', req.headers['user-agent']);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const { price, timeInHours, tags } = req.body;
    
    // Convert and validate timeInHours
    let parsedTimeInHours;
    try {
      parsedTimeInHours = parseFloat(timeInHours);
      if (isNaN(parsedTimeInHours)) {
        return res.status(400).json({ error: 'Time must be a valid number' });
      }
    } catch (parseError) {
      console.error('Error parsing timeInHours:', timeInHours, parseError);
      return res.status(400).json({ error: 'Invalid time format' });
    }
    
    console.log('Parsed timeInHours:', parsedTimeInHours);
    
    if (!price || !timeInHours) {
      return res.status(400).json({ error: 'Price and time are required' });
    }
    
    // Upload to Cloudinary
    const fileBuffer = req.file.buffer;
    const fileType = req.file.mimetype;
    
    // Convert buffer to data URI
    const dataURI = `data:${fileType};base64,${fileBuffer.toString('base64')}`;
    
    try {
      console.log('Starting Cloudinary upload, file size:', fileBuffer.length, 'bytes');
      // Upload to Cloudinary
      const cloudinaryResult = await cloudinary.uploader.upload(dataURI, {
        folder: 'tattoo-data', // Creates a folder in your Cloudinary account
        resource_type: 'image'
      });
      console.log('Cloudinary upload successful, URL:', cloudinaryResult.secure_url);
      
      const newTattoo = new Tattoo({
        imageUrl: cloudinaryResult.secure_url, // Use the Cloudinary URL
        price: parseFloat(price),
        timeInHours: parsedTimeInHours, // Use the validated value
        tags: tags ? tags.split(',').map(tag => tag.trim()) : []
      });

      await newTattoo.save();
      console.log('Tattoo saved to database with ID:', newTattoo._id);
      res.status(201).json({ success: true, tattoo: newTattoo });
    } catch (cloudinaryError) {
      console.error('Error during upload or database save:', cloudinaryError);
      return res.status(500).json({ error: 'Failed to process upload', details: cloudinaryError.message });
    }
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
          <p><strong>Storage Provider:</strong> Cloudinary</p>
          <p>Your images are stored securely on Cloudinary's cloud storage.</p>
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
              serverInfoDiv.innerHTML = \`
                <p><strong>Environment:</strong> \${data.serverInfo.environment}</p>
                <p><strong>Storage:</strong> \${data.serverInfo.storage}</p>
                <p><strong>Total files:</strong> \${data.serverInfo.totalFiles}</p>
              \`;
              
              // Display files
              const fileGrid = document.getElementById('fileGrid');
              if (data.files.length === 0) {
                fileGrid.innerHTML = '<p>No files found on the server.</p>';
                return;
              }
              
              fileGrid.innerHTML = data.files.map(file => \`
                <div class="image-item">
                  <span class="badge">Cloudinary</span>
                  <a href="\${file.path}" target="_blank">
                    <img src="\${file.path}" alt="\${file.name}" onerror="this.src='/placeholder.png'; this.onerror=null;">
                    <div class="image-name">\${file.name}</div>
                  </a>
                  <div class="image-info">
                    <small>Created: \${new Date(file.created).toLocaleDateString()}</small>
                  </div>
                </div>
              \`).join('');
              
              // Display missing files
              const missingFilesDiv = document.getElementById('missingFiles');
              if (data.missingFiles.length === 0) {
                missingFilesDiv.innerHTML = '<p>No missing files with Cloudinary storage.</p>';
              } else {
                missingFilesDiv.innerHTML = data.missingFiles.map(file => \`
                  <div class="missing-file">
                    <p><strong>Filename:</strong> \${file.filename}</p>
                    <p><strong>URL in database:</strong> \${file.url}</p>
                    <p><strong>Record ID:</strong> \${file.id}</p>
                  </div>
                \`).join('');
              }
            } catch (error) {
              console.error('Error loading server files:', error);
              document.getElementById('fileGrid').innerHTML = \`
                <div class="error">
                  <p>Error loading files: \${error.message}</p>
                </div>
              \`;
            }
          }
          
          // Load data when page loads
          document.addEventListener('DOMContentLoaded', loadServerFiles);
        </script>
      </body>
    </html>
  `);
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

// API endpoint to list files from Cloudinary
app.get('/api/server-files', async (req, res) => {
  try {
    // Get MongoDB records
    const tattoos = await Tattoo.find();
    
    // Create a representation of files from Cloudinary URLs
    const files = tattoos.map(tattoo => {
      // Extract the filename from the Cloudinary URL
      const urlParts = tattoo.imageUrl.split('/');
      const filenameWithExtension = urlParts[urlParts.length - 1];
      const publicId = filenameWithExtension.split('.')[0];
      
      return {
        name: filenameWithExtension,
        path: tattoo.imageUrl, // Cloudinary URL
        size: 'Stored on Cloudinary',
        created: tattoo.createdAt,
        used: true,
        tattooId: tattoo._id
      };
    });
    
    res.json({
      serverInfo: {
        environment: process.env.NODE_ENV || 'development',
        storage: 'Cloudinary',
        totalFiles: files.length
      },
      files: files,
      missingFiles: [] // No missing files with Cloudinary
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
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