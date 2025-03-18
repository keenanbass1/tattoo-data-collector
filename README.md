# Tattoo Data Collector

A web application for tattoo artists to collect data on tattoos, including images, prices, and time taken. This data can later be used for AI model training to estimate tattoo quotes.

## Features

- Upload tattoo images from phone or computer
- Record price and time data for each tattoo
- Add tags to categorize tattoos
- View all collected tattoo data
- MongoDB storage

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your MongoDB Atlas connection string
4. Run the application: `npm start`

## Technologies Used

- Node.js
- Express
- MongoDB/Mongoose
- Multer for file uploads
<<<<<<< HEAD
- Store data in MongoDB for future AI training

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- MongoDB (local installation or MongoDB Atlas account)

### Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

4. Configure your database:
   - For local MongoDB: Make sure MongoDB is running on your machine
   - For MongoDB Atlas: Update the `.env` file with your connection string

5. Start the server:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

6. Open your browser and navigate to `http://localhost:3000`

## Accessing from Your Phone

To access the app from your phone while developing:

1. Connect your phone to the same WiFi network as your computer
2. Find your computer's local IP address
3. On your phone, navigate to `http://[YOUR_COMPUTER_IP]:3000`

## Data Export

The data is stored in MongoDB in a format ready for AI training. You can export the data using MongoDB's export tools or create a custom export script.

## License

MIT
=======

## Deployment

This project can be deployed on Render.com using the provided render.yaml configuration.

## Environment Variables

- `PORT`: The port the server will run on (default: 3000)
- `MONGODB_URI`: Your MongoDB connection string
>>>>>>> 18af69c0790b37744a73cde7c69ea9912a233da9
