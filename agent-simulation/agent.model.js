const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  inventory: {
    type: Map,
    of: Number,
    default: {}
  },
  maxLifespan: {
    type: Number,
    required: true
  },
  currentLifespan: {
    type: Number,
    required: true
  },
  isAlive: {
    type: Boolean,
    default: true
  },
  lastAction: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Agent', AgentSchema);