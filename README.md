# Agent Simulation System

## Installation Instructions

1. Open Command Prompt (not PowerShell) and navigate to this project directory:
   ```
   cd "YOUR_DOWNLOAD_REPOSITORY\agent-simulation"
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a .env file with the following variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   OPENAI_API_KEY=your_openai_api_key
   WEATHER_API_KEY=your_openweathermap_api_key
   ```

## Running the Application

1. Start the server:
   ```
   npm start
   ```

2. Open your browser and navigate to http://localhost:3000 to view the simulation.

## Project Structure

- `server.js`: Main entry point for the application
- `simulation.service.js`: Core simulation logic
- `simulation.routes.js`: API endpoints for the simulation
- `agent.model.js`: Mongoose schema for agents
- `world.model.js`: Mongoose schema for the world and resources
- `index.html`: Frontend interface for the simulation
