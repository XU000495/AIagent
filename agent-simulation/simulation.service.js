const OpenAI = require('openai');
const Agent = require('./agent.model');
const World = require('./world.model');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class SimulationService {
  constructor() {
    this.world = null;
    this.agents = [];
    this.resources = [];
    this.isRunning = false;
    this.resourceTypes = ['Wheat', 'Stone', 'Wood'];
    this.liveData = {
      temperature: 20, // Default temperature in Tokyo
      ethPrice: 2000  // Default ETH price
    };
    this.dataUpdateInterval = null;
  }

  // Initialize a new simulation world
  async initWorld(name, width = 20, height = 20, agentCount = 5) {
    // Create world
    this.world = new World({
      name,
      width,
      height,
      resources: [],
      turn: 0,
      isRunning: true
    });
    await this.world.save();

    // Create initial agents
    for (let i = 0; i < agentCount; i++) {
      const agent = new Agent({
        name: `Agent-${i}`,
        x: Math.floor(Math.random() * width),
        y: Math.floor(Math.random() * height),
        inventory: {},
        maxLifespan: 50,
        currentLifespan: 0
      });
      await agent.save();
      this.agents.push(agent);
    }

    return this.world;
  }

  // Spawn new resources
  async spawnResources(count = 3) {
    if (!this.world) return;

    // Adjust spawn count based on live data
    // Warmer temperatures increase Wheat spawns
    let adjustedCount = count;
    if (this.liveData.temperature > 25) {
      adjustedCount += 2;
    } else if (this.liveData.temperature < 10) {
      adjustedCount -= 1;
    }

    // ETH price affects resource amounts
    let resourceAmountMultiplier = 1;
    if (this.liveData.ethPrice > 3000) {
      resourceAmountMultiplier = 1.5;
    } else if (this.liveData.ethPrice < 1000) {
      resourceAmountMultiplier = 0.75;
    }

    for (let i = 0; i < adjustedCount; i++) {
      // Temperature influences resource type
      let resourceType;
      if (this.liveData.temperature > 25) {
        // Hot weather favors Wheat
        resourceType = ['Wheat', 'Wheat', 'Stone', 'Wood'][Math.floor(Math.random() * 4)];
      } else if (this.liveData.temperature < 10) {
        // Cold weather favors Stone
        resourceType = ['Stone', 'Stone', 'Wheat', 'Wood'][Math.floor(Math.random() * 4)];
      } else {
        resourceType = this.resourceTypes[Math.floor(Math.random() * this.resourceTypes.length)];
      }

      const x = Math.floor(Math.random() * this.world.width);
      const y = Math.floor(Math.random() * this.world.height);
      const amount = Math.max(1, Math.floor((Math.random() * 5 + 1) * resourceAmountMultiplier));

      this.world.resources.push({
        type: resourceType,
        x,
        y,
        amount
      });
    }

    await this.world.save();
    return this.world.resources;
  }

  // Process a single turn of the simulation
  async processTurn() {
    if (!this.world || !this.isRunning) return;

    // Increment turn counter
    this.world.turn++;

    // Spawn new resources each turn
    await this.spawnResources();

    // Process each agent's actions
    for (const agent of this.agents) {
      if (!agent.isAlive) continue;

      // Agent ages each turn
      agent.currentLifespan++;

      // Check if agent has reached max lifespan
      if (agent.currentLifespan >= agent.maxLifespan) {
        agent.isAlive = false;
        await agent.save();
        continue;
      }

      // Agent must consume 1 Wheat per turn
      const wheatCount = agent.inventory.get('Wheat') || 0;
      if (wheatCount < 1) {
        agent.isAlive = false;
        await agent.save();
        continue;
      }

      // Consume Wheat
      agent.inventory.set('Wheat', wheatCount - 1);

      // Get agent's current view
      const view = this.getAgentView(agent.x, agent.y);

      // Build prompt for AI
      const prompt = this.buildAIPrompt(agent, view);

      // Get AI decision
      const action = await this.getAIDecision(prompt);

      // Execute action
      await this.executeAction(agent, action);

      await agent.save();
    }

    await this.world.save();
    return this.world;
  }

  // Get agent's view of the world
  getAgentView(x, y, radius = 2) {
    if (!this.world) return {};

    const view = {
      agents: [],
      resources: []
    };

    // Find agents in view
    for (const agent of this.agents) {
      if (agent.isAlive && Math.abs(agent.x - x) <= radius && Math.abs(agent.y - y) <= radius) {
        view.agents.push({
          name: agent.name,
          x: agent.x - x,
          y: agent.y - y,
          inventory: Object.fromEntries(agent.inventory)
        });
      }
    }

    // Find resources in view
    for (const resource of this.world.resources) {
      if (!resource.isHarvested && Math.abs(resource.x - x) <= radius && Math.abs(resource.y - y) <= radius) {
        view.resources.push({
          type: resource.type,
          x: resource.x - x,
          y: resource.y - y,
          amount: resource.amount
        });
      }
    }

    return view;
  }

  // Build prompt for AI
  buildAIPrompt(agent, view) {
    return `
      You are an autonomous agent in a simulation world. Your goal is to survive as long as possible.

      Your current state:
      - Name: ${agent.name}
      - Position: (${agent.x}, ${agent.y})
      - Inventory: ${JSON.stringify(Object.fromEntries(agent.inventory))}
      - Remaining lifespan: ${agent.maxLifespan - agent.currentLifespan}

      What you can see (relative to your position):
      - Agents: ${JSON.stringify(view.agents)}
      - Resources: ${JSON.stringify(view.resources)}

      Rules:
      - You must consume 1 Wheat each turn to survive.
      - You have a maximum lifespan of ${agent.maxLifespan} turns.
      - You can move to adjacent cells (up, down, left, right).
      - You can harvest resources at your current position.
      - You can craft items if you have the required resources.
      - You can trade with nearby agents.

      Choose one action: MOVE, HARVEST, CRAFT, or TRADE.
      Respond with a JSON object containing your action and any necessary details.
      Example for MOVE: {"action": "MOVE", "direction": "up"}
      Example for HARVEST: {"action": "HARVEST"}
      Example for CRAFT: {"action": "CRAFT", "item": "Axe", "materials": {"Stone": 2}}
      Example for TRADE: {"action": "TRADE", "agent": "Agent-1", "offer": {"Wheat": 2}, "request": {"Stone": 1}}
    `;
  }

  // Get AI decision
  async getAIDecision(prompt) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "system",
          content: "You are an autonomous agent in a simulation. Respond with a valid JSON action."
        }, {
          role: "user",
          content: prompt
        }],
        max_tokens: 100,
        temperature: 0.7
      });

      const action = JSON.parse(response.choices[0].message.content);
      return action;
    } catch (error) {
      console.error('Error getting AI decision:', error);
      // Default to move action if AI fails
      return { action: 'MOVE', direction: 'up' };
    }
  }

  // Execute agent action
  async executeAction(agent, action) {
    switch (action.action) {
      case 'MOVE':
        this.moveAgent(agent, action.direction);
        agent.lastAction = `Moved ${action.direction}`;
        break;
      case 'HARVEST':
        await this.harvestResource(agent);
        agent.lastAction = 'Harvested resources';
        break;
      case 'CRAFT':
        this.craftItem(agent, action.item, action.materials);
        agent.lastAction = `Crafted ${action.item}`;
        break;
      case 'TRADE':
        await this.tradeWithAgent(agent, action.agent, action.offer, action.request);
        agent.lastAction = `Traded with ${action.agent}`;
        break;
      default:
        agent.lastAction = 'Invalid action';
    }
  }

  // Move agent
  moveAgent(agent, direction) {
    switch (direction) {
      case 'up':
        agent.y = Math.max(0, agent.y - 1);
        break;
      case 'down':
        agent.y = Math.min(this.world.height - 1, agent.y + 1);
        break;
      case 'left':
        agent.x = Math.max(0, agent.x - 1);
        break;
      case 'right':
        agent.x = Math.min(this.world.width - 1, agent.x + 1);
        break;
    }
  }

  // Harvest resource
  async harvestResource(agent) {
    for (let i = 0; i < this.world.resources.length; i++) {
      const resource = this.world.resources[i];
      if (!resource.isHarvested && resource.x === agent.x && resource.y === agent.y) {
        // Add resource to agent's inventory
        const currentCount = agent.inventory.get(resource.type) || 0;
        agent.inventory.set(resource.type, currentCount + resource.amount);

        // Mark resource as harvested
        resource.isHarvested = true;
        await this.world.save();
        break;
      }
    }
  }

  // Craft item
  craftItem(agent, item, materials) {
    // Check if agent has required materials
    let hasMaterials = true;
    for (const [material, amount] of Object.entries(materials)) {
      if ((agent.inventory.get(material) || 0) < amount) {
        hasMaterials = false;
        break;
      }
    }

    if (!hasMaterials) return;

    // Remove materials from inventory
    for (const [material, amount] of Object.entries(materials)) {
      agent.inventory.set(material, agent.inventory.get(material) - amount);
    }

    // Add crafted item to inventory
    const currentCount = agent.inventory.get(item) || 0;
    agent.inventory.set(item, currentCount + 1);
  }

  // Trade with another agent
  async tradeWithAgent(agent, targetAgentName, offer, request) {
    const targetAgent = this.agents.find(a => a.name === targetAgentName && a.isAlive);
    if (!targetAgent) return;

    // Check if both agents have required resources
    let agentHasOffer = true;
    for (const [resource, amount] of Object.entries(offer)) {
      if ((agent.inventory.get(resource) || 0) < amount) {
        agentHasOffer = false;
        break;
      }
    }

    let targetHasRequest = true;
    for (const [resource, amount] of Object.entries(request)) {
      if ((targetAgent.inventory.get(resource) || 0) < amount) {
        targetHasRequest = false;
        break;
      }
    }

    if (!agentHasOffer || !targetHasRequest) return;

    // Execute trade
    for (const [resource, amount] of Object.entries(offer)) {
      agent.inventory.set(resource, agent.inventory.get(resource) - amount);
      const targetCount = targetAgent.inventory.get(resource) || 0;
      targetAgent.inventory.set(resource, targetCount + amount);
    }

    for (const [resource, amount] of Object.entries(request)) {
      targetAgent.inventory.set(resource, targetAgent.inventory.get(resource) - amount);
      const agentCount = agent.inventory.get(resource) || 0;
      agent.inventory.set(resource, agentCount + amount);
    }

    await targetAgent.save();
  }

  // Fetch live data from APIs
  async fetchLiveData() {
    try {
      // Fetch weather data (Tokyo temperature)
      const weatherResponse = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
          q: 'Tokyo,JP',
          appid: 'YOUR_OPENWEATHER_API_KEY',
          units: 'metric'
        }
      });
      this.liveData.temperature = weatherResponse.data.main.temp;

      // Fetch ETH price
      const ethResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
          ids: 'ethereum',
          vs_currencies: 'usd'
        }
      });
      this.liveData.ethPrice = ethResponse.data.ethereum.usd;

      console.log('Live data updated:', this.liveData);
    } catch (error) {
      console.error('Error fetching live data:', error);
    }
  }

  // Start the simulation
  async start() {
    this.isRunning = true;
    if (this.world) {
      this.world.isRunning = true;
      await this.world.save();
    }

    // Fetch initial live data
    await this.fetchLiveData();

    // Set up periodic data updates (every 5 minutes)
    this.dataUpdateInterval = setInterval(() => this.fetchLiveData(), 5 * 60 * 1000);

    // Run simulation loop
    this.simulationLoop();
  }

  // Stop the simulation
  async stop() {
    this.isRunning = false;
    if (this.world) {
      this.world.isRunning = false;
      await this.world.save();
    }

    // Clear data update interval
    if (this.dataUpdateInterval) {
      clearInterval(this.dataUpdateInterval);
      this.dataUpdateInterval = null;
    }
  }

  // Simulation loop
  async simulationLoop() {
    while (this.isRunning) {
      await this.processTurn();
      // Wait for 1 second before next turn
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

module.exports = new SimulationService();