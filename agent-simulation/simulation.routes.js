const express = require('express');
const router = express.Router();
const simulationService = require('./simulation.service');

// Initialize a new simulation
router.post('/init', async (req, res) => {
  try {
    const { name, width, height, agentCount } = req.body;
    const world = await simulationService.initWorld(name, width, height, agentCount);
    res.status(201).json(world);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the simulation
router.post('/start', async (req, res) => {
  try {
    await simulationService.start();
    res.json({ message: 'Simulation started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop the simulation
router.post('/stop', async (req, res) => {
  try {
    await simulationService.stop();
    res.json({ message: 'Simulation stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current simulation state
router.get('/state', async (req, res) => {
  try {
    // In a real implementation, you would fetch the current state
    res.json({
      world: simulationService.world,
      agents: simulationService.agents
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;