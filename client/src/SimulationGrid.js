import React, { useEffect, useState } from 'react';
import './SimulationGrid.css';

function SimulationGrid() {
  const [simulationState, setSimulationState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  // Fetch simulation state periodically
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(fetchSimulationState, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const fetchSimulationState = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/simulation/state');
      const data = await response.json();
      setSimulationState(data);
    } catch (error) {
      console.error('Error fetching simulation state:', error);
    }
  };

  const startSimulation = async () => {
    try {
      await fetch('http://localhost:5000/api/simulation/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'TestWorld', width: 20, height: 20, agentCount: 5 })
      });
      await fetch('http://localhost:5000/api/simulation/start', {
        method: 'POST'
      });
      setIsRunning(true);
    } catch (error) {
      console.error('Error starting simulation:', error);
    }
  };

  const stopSimulation = async () => {
    try {
      await fetch('http://localhost:5000/api/simulation/stop', {
        method: 'POST'
      });
      setIsRunning(false);
    } catch (error) {
      console.error('Error stopping simulation:', error);
    }
  };

  const getResourceColor = (resourceType) => {
    switch(resourceType) {
      case 'Wheat':
        return '#FFC107';
      case 'Stone':
        return '#9E9E9E';
      case 'Wood':
        return '#8BC34A';
      default:
        return '#FFFFFF';
    }
  };

  // Render grid if simulation state is available
  if (!simulationState || !simulationState.world) {
    return (
      <div className="simulation-container">
        <button onClick={startSimulation} disabled={isRunning}>
          Start Simulation
        </button>
        <button onClick={stopSimulation} disabled={!isRunning}>
          Stop Simulation
        </button>
        <p>Simulation not running</p>
      </div>
    );
  }

  const { world, agents } = simulationState;

  return (
    <div className="simulation-container">
      <button onClick={startSimulation} disabled={isRunning}>
        Start Simulation
      </button>
      <button onClick={stopSimulation} disabled={!isRunning}>
        Stop Simulation
      </button>
      <p>Turn: {world.turn}</p>
      <div className="grid-container">
        {Array.from({ length: world.height }).map((_, y) => (
          <div key={y} className="grid-row">
            {Array.from({ length: world.width }).map((_, x) => {
              // Check if there's an agent at this position
              const agentAtPosition = agents.find(agent => agent.x === x && agent.y === y && agent.isAlive);
              // Check if there's a resource at this position
              const resourceAtPosition = world.resources.find(resource => resource.x === x && resource.y === y && !resource.isHarvested);

              return (
                <div key={`${x}-${y}`} className="grid-cell">
                  {agentAtPosition && <div className="agent">A</div>}
                  {resourceAtPosition && (
                    <div className="resource" style={{ backgroundColor: getResourceColor(resourceAtPosition.type) }}>
                      {resourceAtPosition.type.charAt(0)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SimulationGrid;