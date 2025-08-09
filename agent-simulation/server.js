const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  console.error('********************************************************************************');
  console.error('* MongoDB is not running or not installed. Please install MongoDB and start it, *');
  console.error('* or use a MongoDB Atlas cloud database.                                      *');
  console.error('*                                                                              *');
  console.error('* To install MongoDB locally:                                                  *');
  console.error('* 1. Download and install MongoDB from https://www.mongodb.com/try/download    *');
  console.error('* 2. Start the MongoDB service                                                 *');
  console.error('* 3. Run the application again                                                 *');
  console.error('********************************************************************************');
});

// Basic route
app.get('/', (req, res) => {
  res.send('Agent Simulation API is running');
});

// API routes
app.use('/api/simulation', require('./simulation.routes'));

// Serve static files
app.use(express.static(__dirname));

// Catch-all route for frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});