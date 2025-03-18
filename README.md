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

## Deployment

This project can be deployed on Render.com using the provided render.yaml configuration.

## Environment Variables

- `PORT`: The port the server will run on (default: 3000)
- `MONGODB_URI`: Your MongoDB connection string