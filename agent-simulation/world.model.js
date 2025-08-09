const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true
  },
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  isHarvested: {
    type: Boolean,
    default: false
  },
  spawnedAt: {
    type: Date,
    default: Date.now
  }
});

const WorldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  width: {
    type: Number,
    required: true
  },
  height: {
    type: Number,
    required: true
  },
  resources: [ResourceSchema],
  turn: {
    type: Number,
    default: 0
  },
  isRunning: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
WorldSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('World', WorldSchema);