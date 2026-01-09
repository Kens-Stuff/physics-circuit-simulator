import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus } from 'lucide-react';
import {BasicPhysicsSetup, PhysicsLevels, BasicCircuitSetup, CircuitLevels} from './levels.js';
import {Entity, EntityFactory} from './factory.js';
import {SimulationStrategy, PhysicsSimulationStrategy, CircuitSimulationStrategy} from './strats.js';

// ============================================================================
// DOMAIN LAYER - Core Business Logic
// ============================================================================

// ENTITY-COMPONENT PATTERN: Base entity that can have different components
//ENTITY AND COMPONENT DEFINITIONS LOCATED IN 'factory.js'

// STRATEGY PATTERN: Different simulation strategies
// RELOCATED TO 'strats.js'

// ============================================================================
// APPLICATION LAYER - Orchestration and Control
// ============================================================================

// REPOSITORY PATTERN: Manages entity persistence and retrieval
class EntityRepository {
  constructor() {
    console.log("creating entity repository");
    this.entities = new Map();
    this.nextId = 1;
  }

  create(type) {
    const entity = new Entity(this.nextId++, type);
    this.entities.set(entity.id, entity);
    return entity;
  }

  findById(id) {
    return this.entities.get(id);
  }

  findByType(type) {
    return Array.from(this.entities.values()).filter(e => e.type === type);
  }

  getAll() {
    return Array.from(this.entities.values());
  }

  remove(id) {
    this.entities.delete(id);
  }

  clear() {
    this.entities.clear();
    this.nextId = 1;
  }
}

// OBSERVER PATTERN: Simulation engine notifies observers of state changes
class SimulationEngine {
  constructor(strategy) {
    console.log("constructing Simulation Engine. Strategy: " + strategy);
    this.strategy = strategy;
    this.repository = new EntityRepository();
    this.observers = [];
    this.isRunning = false;
    this.lastTime = Date.now();
  }

  // STRATEGY PATTERN: Set simulation strategy dynamically
  setStrategy(strategy) {
    this.strategy = strategy;
  }

  // OBSERVER PATTERN: Register observers
  addObserver(observer) {
    this.observers.push(observer);
  }

  // OBSERVER PATTERN: Notify all observers
  notifyObservers() {
    this.observers.forEach(observer => observer.update(this));
  }

  update() {
    if (!this.isRunning) return;

    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Use strategy to update simulation
    this.strategy.update(this.repository.getAll(), deltaTime);

    // Notify observers of changes
    this.notifyObservers();
  }

  start() {
    this.isRunning = true;
    this.lastTime = Date.now();
    console.log("Simulation started");
  }

  pause() {
    this.isRunning = false;
    console.log("simulation paused");
  }

  reset() {
    this.pause();
    this.repository.clear();
    this.notifyObservers();
    console.log("Simulation reset");
  }
}

// Factory functions to create common entities
//FACTORY NOW LOCATED IN 'factory.js'

// Initialization pre-sets. Strategy Pattern.
// PRE-SETS NOW LOCATED IN 'levels.js'

// ============================================================================
// PRESENTATION LAYER - UI Components
// ============================================================================

// Renderer component - OBSERVER PATTERN: observes simulation state
class CanvasRenderer {
  constructor(canvas) {
    console.log("creating a canvas");
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  // OBSERVER PATTERN: Update method called by simulation engine
  update(engine) {
    this.clear();
    this.render(engine.repository.getAll());
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    //console.log("canvas has been cleared");
  }

  render(entities) {
    entities.forEach(entity => {
      if (!entity.hasComponent('transform') || !entity.hasComponent('render')) {
        return;
      }

      const transform = entity.getComponent('transform');
      const render = entity.getComponent('render');

      this.ctx.fillStyle = render.color;
      this.ctx.strokeStyle = render.color;
      this.ctx.lineWidth = 3;

      if (render.shape === 'circle') {
        this.ctx.beginPath();
        this.ctx.arc(transform.x, transform.y, render.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (render.shape === 'rect') {
        this.ctx.fillRect(
          transform.x - render.size / 2,
          transform.y - render.size / 2,
          render.size,
          render.size
        );
        
        // Draw circuit values if available
        if (entity.hasComponent('circuit')) {
          const circuit = entity.getComponent('circuit');
          this.ctx.fillStyle = '#fff';
          this.ctx.font = '10px monospace';
          this.ctx.textAlign = 'center';
          
          if (circuit.componentType === 'resistor') {
            this.ctx.fillText(`${circuit.value}Ω`, transform.x, transform.y);
            this.ctx.fillText(`${circuit.voltage.toFixed(1)}V`, transform.x, transform.y + 12);
          } else if (circuit.componentType === 'battery') {
            this.ctx.fillText(`${circuit.value}V`, transform.x, transform.y);
          }
          
          this.ctx.fillText(`${circuit.current.toFixed(2)}A`, transform.x, transform.y - 25);
        }
      } else if (render.shape === 'line') {
        const con = entity.getComponent('wire');

        this.ctx.beginPath();

        this.ctx.moveTo(con.startx, con.starty);
        this.ctx.lineTo(con.endx, con.endy);

        this.ctx.stroke();

      }
    });
  }
}

// Main React component
export default function PhysicsCircuitSimulator() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const rendererRef = useRef(null);
  const animationRef = useRef(null);
  const setupRef = useRef(null);

  //State Variables
  const [mode, setMode] = useState('physics'); // 'physics' or 'circuit', physics is default.
  const [isRunning, setIsRunning] = useState(false);
  const [entityCount, setEntityCount] = useState(0);
  const [backgroundColor, setBackgroundColor] = useState('#111827');
  const [levelOptions, setLevelOptions] = useState(mode === 'physics' ? PhysicsLevels : CircuitLevels);
  const [currLevel, setCurrLevel] = useState(1);

  // Initialize simulation engine
  useEffect(() => {
    const canvas = canvasRef.current;
    const strategy = mode === 'physics' 
      ? new PhysicsSimulationStrategy()
      : new CircuitSimulationStrategy();
    
    engineRef.current = new SimulationEngine(strategy);
    rendererRef.current = new CanvasRenderer(canvas);
    
    // OBSERVER PATTERN: Register renderer as observer
    engineRef.current.addObserver(rendererRef.current);
    
    // Get setup object
    // TODO: improved modularity by sending mode to a factory that will return the right LevelSetup
    setupRef.current = mode === 'physics'
      ? new BasicPhysicsSetup()
      : new BasicCircuitSetup();

    // Add initial entities, using strategy pattern
    setupRef.current.initialize(engineRef.current.repository);
    
    setEntityCount(engineRef.current.repository.getAll().length);
    rendererRef.current.render(engineRef.current.repository.getAll());

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mode]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (engineRef.current) {
        engineRef.current.update();
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    if (isRunning) {
      engineRef.current?.start();
      animate();
    } else {
      engineRef.current?.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning]);

  const handleTogglePlay = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    engineRef.current?.reset();
    
    // Re-add initial entities
    // Get setup object
    setupRef.current = mode === 'physics'
      ? new BasicPhysicsSetup()
      : new BasicCircuitSetup();
    
    // Add initial entities, using strategy pattern
    setupRef.current.initialize(engineRef.current.repository);

    setEntityCount(engineRef.current.repository.getAll().length);
    rendererRef.current?.render(engineRef.current.repository.getAll());
  };

  const handleAddEntity = () => {
    if (!engineRef.current) return;
    
    if (mode === 'physics') {
      EntityFactory.createPhysicsObject(engineRef.current.repository, Math.random() * 600 + 100, 50, Math.random() * 2 + 0.5);
    } else {
      const x = Math.random() * 400 + 200;
      EntityFactory.createCircuitResistor(engineRef.current.repository, x, 300, Math.random() * 200 + 50);
    }
    
    setEntityCount(engineRef.current.repository.getAll().length);
    if (!isRunning) {
      rendererRef.current?.render(engineRef.current.repository.getAll());
    }
  };

  const handleModeChange = (newMode) => {
    setIsRunning(false);
    setMode(newMode);
    setLevelOptions(newMode === 'physics' ? PhysicsLevels : CircuitLevels)
    handleReset();
  };

  const handleLevelChange = (event) => {
    setCurrLevel(event.target.value);
  }

  // Inline styles
  const styles = {
    container: {
      width: '100%',
      height: '100vh',
      backgroundColor: backgroundColor,  // ← THIS IS THE COLOR!
      color: 'white',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: {
      marginBottom: '16px'
    },
    title: {
      fontSize: '30px',
      fontWeight: 'bold',
      marginBottom: '8px'
    },
    subtitle: {
      color: '#9ca3af',
      fontSize: '14px'
    },
    controls: {
      display: 'flex',
      gap: '16px',
      marginBottom: '16px',
      flexWrap: 'wrap'
    },
    buttonGroup: {
      display: 'flex',
      gap: '8px'
    },
    button: {
      padding: '8px 16px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '500'
    },
    primaryButton: {
      backgroundColor: '#2563eb',
      color: 'white'
    },
    secondaryButton: {
      backgroundColor: '#374151',
      color: 'white'
    },
    successButton: {
      backgroundColor: '#16a34a',
      color: 'white'
    },
    activeButton: {
      backgroundColor: '#7c3aed',
      color: 'white'
    },
    infoPanel: {
      marginBottom: '16px',
      padding: '12px',
      backgroundColor: '#1f2937',
      borderRadius: '4px',
      fontSize: '14px'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px'
    },
    infoLabel: {
      color: '#cad1dbff'
    },
    infoValue: {
      fontWeight: '600'
    },
    canvasContainer: {
      flex: 1,
      backgroundColor: '#555b64ff',
      borderRadius: '4px',
      overflow: 'hidden'
    },
    canvas: {
      width: '50%',
      height: '100%'
    },
    footer: {
      marginTop: '16px',
      padding: '16px',
      backgroundColor: '#1f2937',
      borderRadius: '4px',
      fontSize: '12px'
    },
    footerTitle: {
      fontWeight: '600',
      marginBottom: '8px'
    },
    colorPicker: {
      marginTop: '16px',
      padding: '12px',
      backgroundColor: '#1f2937',
      borderRadius: '4px'
    },
    colorInput: {
      width: '60px',
      height: '30px',
      border: 'none',
      cursor: 'pointer',
      marginLeft: '10px'
    }
  };

  return (
 <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Physics & Circuit Simulator</h1>
      </div>

      <div style={styles.controls}>
        <div style={styles.buttonGroup}>
          <button
            onClick={() => handleModeChange('physics')}
            style={{...styles.button, ...(mode === 'physics' ? styles.activeButton : styles.secondaryButton)}}
          >
            Physics Mode
          </button>
          <button
            onClick={() => handleModeChange('circuit')}
            style={{...styles.button, ...(mode === 'circuit' ? styles.activeButton : styles.secondaryButton)}}
          >
            Circuit Mode
          </button>
          <select value={currLevel} onChange={handleLevelChange}>
            {levelOptions.map((l) => <option>{l}</option>)}
          </select>
        </div>
      </div>

      <div style={styles.controls}>
        <div style={styles.buttonGroup}>
          <button
            onClick={handleTogglePlay}
            style={{...styles.button, ...styles.primaryButton}}
          >
            {isRunning ? <Pause size={18} /> : <Play size={18} />}
            {isRunning ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={handleReset}
            style={{...styles.button, ...styles.secondaryButton}}
          >
            <RotateCcw size={18} />
            Reset
          </button>
          <button
            onClick={handleAddEntity}
            style={{...styles.button, ...styles.successButton}}
          >
            <Plus size={18} />
            Add {mode === 'physics' ? 'Object' : 'Resistor'}
          </button>
        </div>

        
      </div>

      <div style={styles.infoPanel}>
        <div style={styles.infoGrid}>
          <div>
            <span style={styles.infoLabel}>Mode: </span>
            <span style={styles.infoValue}>
              {mode === 'physics' ? 'Physics Simulation' : 'Circuit Analysis'}
            </span>
          </div>
          <div>
            <span style={styles.infoLabel}>Status: </span>
            <span style={styles.infoValue}>{isRunning ? 'Running' : 'Paused'}</span>
          </div>
          <div>
            <span style={styles.infoLabel}>Entities: </span>
            <span style={styles.infoValue}>{entityCount}</span>
          </div>
        </div>
      </div>

      {/* Color Picker - Try this!
      <div style={styles.colorPicker}>
        <span style={styles.infoLabel}>Background Color: </span>
        <input
          type="color"
          value={styles.container.backgroundColor}
          onChange={(e) => setBackgroundColor(e.target.value)}
          style={styles.colorInput}
        />
        <span style={{marginLeft: '10px', fontSize: '12px'}}>{backgroundColor}</span>
        <div style={{marginTop: '8px', fontSize: '11px', color: '#9ca3af'}}>
          Quick colors: 
          <button onClick={() => setBackgroundColor('#1e3a8a')} style={{marginLeft: '8px', padding: '4px 8px', backgroundColor: '#1e3a8a', color: '#9ca3af', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>Blue</button>
          <button onClick={() => setBackgroundColor('#581c87')} style={{marginLeft: '4px', padding: '4px 8px', backgroundColor: '#581c87', color: '#9ca3af', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>Purple</button>
          <button onClick={() => setBackgroundColor('#14532d')} style={{marginLeft: '4px', padding: '4px 8px', backgroundColor: '#14532d', color: '#9ca3af', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>Green</button>
          <button onClick={() => setBackgroundColor('#7f1d1d')} style={{marginLeft: '4px', padding: '4px 8px', backgroundColor: '#7f1d1d', color: '#9ca3af', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>Red</button>
          <button onClick={() => setBackgroundColor('#111827')} style={{marginLeft: '4px', padding: '4px 8px', backgroundColor: '#111827', color: '#9ca3af', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>Default</button>
        </div>
      </div> */}

      <div style={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          style={styles.canvas}
          width={800}
          height={600}
        />
      </div>

      <div style={styles.footer}>
        <h3 style={styles.footerTitle}>Architectural Patterns Used:</h3>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', color: '#d1d5db'}}>
          <div><span style={{color: '#3b82f6'}}>Entity-Component:</span> Flexible object composition</div>
          <div><span style={{color: '#22c55e'}}>Strategy:</span> Swappable simulation algorithms</div>
          <div><span style={{color: '#a855f7'}}>Observer:</span> Renderer watches simulation changes</div>
          <div><span style={{color: '#eab308'}}>Repository:</span> Entity storage and retrieval</div>
        </div>
      </div>
    </div>
  );
}