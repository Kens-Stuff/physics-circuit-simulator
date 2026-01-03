import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus } from 'lucide-react';

// ============================================================================
// DOMAIN LAYER - Core Business Logic
// ============================================================================

// ENTITY-COMPONENT PATTERN: Base entity that can have different components
class Entity {
  constructor(id, type) {
    console.log("Entity Constructor for a " + type);
    this.id = id;
    this.type = type;
    this.components = new Map();
  }

  addComponent(name, component) {
    this.components.set(name, component);
    return this;
  }

  getComponent(name) {
    return this.components.get(name);
  }

  hasComponent(name) {
    return this.components.has(name);
  }
}

// Components for Entity-Component Pattern
class TransformComponent {
  constructor(x, y, rotation = 0) {
    console.log("creating a transform component");
    this.x = x;
    this.y = y;
    this.rotation = rotation;
  }
}

class MobileByUserComponent {
  constructor(selected = false) {
    this.selected = false;
  }
}

class PhysicsComponent {
  constructor(mass, vx = -50, vy = 0) {
    console.log("creating a physics component");
    this.mass = mass;
    this.vx = vx;
    this.vy = vy;
    this.fx = 0;
    this.fy = 0;
  }
}

class PhysicsCollisionComponent{
  constructor(radius){
    this.radius = radius;
  }
}

class RenderComponent {
  constructor(shape, color, size) {
    console.log("creating a render component");
    this.shape = shape; // 'circle', 'rect', 'line'
    this.color = color;
    this.size = size;
  }
}

class CircuitComponent {
  constructor(componentType, value) {
    console.log("Creating a circuit component");
    this.componentType = componentType; // 'resistor', 'battery', 'wire'
    this.value = value; // resistance in ohms, voltage in volts
    this.current = 0;
    this.voltage = 0;
    this.connections = [];
  }
}

// STRATEGY PATTERN: Different simulation strategies
class SimulationStrategy {
  //because this is sort of the 'abstract' super strategy, update only throws an error.
  update(entities, deltaTime) {
    throw new Error('Must implement update method');
  }
}

class PhysicsSimulationStrategy extends SimulationStrategy {
  constructor() {
    super();
    this.gravity = 98;// 10x earth gravity, as position is calculated on pixel sized transformations.
  }

  collides(entityA, entityB) {
    const transformA = entityA.getComponent('transform');
    const transformB = entityB.getComponent('transform');
    const tangibleA = entityA.getComponent('tangible');
    const tangibleB = entityB.getComponent('tangible');

    // Calculate distance between centers
    const dx = transformB.x - transformA.x;
    const dy = transformB.y - transformA.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if distance is less than sum of radii
    return distance < (tangibleA.radius + tangibleB.radius);
  }

  // Collision response
  resolveCollision(entityA, entityB) {
    const transformA = entityA.getComponent('transform');
    const transformB = entityB.getComponent('transform');
    const physicsA = entityA.getComponent('physics');
    const physicsB = entityB.getComponent('physics');
    const tangibleA = entityA.getComponent('tangible');
    const tangibleB = entityB.getComponent('tangible');

    // Calculate collision normal (direction from A to B)
    const dx = transformB.x - transformA.x;
    const dy = transformB.y - transformA.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Avoid division by zero
    if (distance === 0) return;

    // Normalize the collision normal
    const nx = dx / distance;
    const ny = dy / distance;

    // Separate the objects (push them apart)
    const overlap = (tangibleA.radius + tangibleB.radius) - distance;
    const separationX = nx * overlap * 0.5;
    const separationY = ny * overlap * 0.5;

    transformA.x -= separationX;
    transformA.y -= separationY;
    transformB.x += separationX;
    transformB.y += separationY;

    // Calculate relative velocity
    const relativeVelocityX = physicsB.vx - physicsA.vx;
    const relativeVelocityY = physicsB.vy - physicsA.vy;

    // Calculate relative velocity along collision normal
    const velocityAlongNormal = relativeVelocityX * nx + relativeVelocityY * ny;

    // Don't resolve if velocities are separating
    if (velocityAlongNormal > 0) return;

    // Calculate restitution (bounciness) - 1.0 = perfectly elastic
    const restitution = 1.0;

    // Calculate impulse scalar
    const impulse = -(1 + restitution) * velocityAlongNormal;
    const totalMass = physicsA.mass + physicsB.mass;
    const impulseScalar = impulse / totalMass;

    // Apply impulse to velocities
    const impulseX = impulseScalar * nx;
    const impulseY = impulseScalar * ny;

    physicsA.vx -= impulseX * physicsB.mass;
    physicsA.vy -= impulseY * physicsB.mass;
    physicsB.vx += impulseX * physicsA.mass;
    physicsB.vy += impulseY * physicsA.mass;
  }

  update(entities, deltaTime) {
    entities.forEach(entity => {
      if (!entity.hasComponent('physics') || !entity.hasComponent('transform')) {
        return;
      }

      const physics = entity.getComponent('physics');
      const transform = entity.getComponent('transform');

      // Apply gravity
      physics.fy += physics.mass * this.gravity;

      // Update velocity
      physics.vx += (physics.fx / physics.mass) * deltaTime;
      physics.vy += (physics.fy / physics.mass) * deltaTime;

      // Update position
      transform.x += physics.vx * deltaTime
      transform.y += physics.vy * deltaTime;

      // Simplified object collisions
      if (entity.hasComponent('tangible')) {
        entities.forEach(e => {
          if(entity.id === e.id) {
            return;
          }
          if(this.collides(entity, e)) {
            //handle collision.
            this.resolveCollision(entity, e);
          }
        })
      }

      // Simple ground collision
      if (transform.y >= 550) {
        transform.y = 550;
        physics.vy *= -1; // Bounce with energy loss
      }
      // Simple wall collision
      if (transform.x >= 500) {
        transform.x = 500;
        physics.vx *= -1; //Bounce off wall with no energy loss
      }
      if (transform.x <= 10) {
        transform.x = 10;
        physics.vx *= -1;
      }

      // Reset forces
      physics.fx = 0;
      physics.fy = 0;
    });
  }
}

class CircuitSimulationStrategy extends SimulationStrategy {
  update(entities, deltaTime) {
    // Simple series circuit solver using Ohm's Law
    let totalVoltage = 0;
    let totalResistance = 0;

    entities.forEach(entity => {
      if (!entity.hasComponent('circuit')) return;
      
      const circuit = entity.getComponent('circuit');
      
      if (circuit.componentType === 'battery') {
        totalVoltage += circuit.value;
      } else if (circuit.componentType === 'resistor') {
        totalResistance += circuit.value;
      }
    });

    // Calculate current: I = V / R
    const current = totalResistance > 0 ? totalVoltage / totalResistance : 0;

    // Update each component
    entities.forEach(entity => {
      if (!entity.hasComponent('circuit')) return;
      
      const circuit = entity.getComponent('circuit');
      circuit.current = current;
      
      if (circuit.componentType === 'resistor') {
        // V = I * R
        circuit.voltage = current * circuit.value;
      }
    });
  }
}

// ============================================================================
// APPLICATION LAYER - Orchestration and Control
// ============================================================================

// REPOSITORY PATTERN: Manages entity persistence and retrieval
class EntityRepository {
  constructor() {
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
  }

  pause() {
    this.isRunning = false;
  }

  reset() {
    this.pause();
    this.repository.clear();
    this.notifyObservers();
  }
}

// Factory functions to create common entities
class EntityFactory {
  static createPhysicsObject(repo, x, y, mass = 1) {
    return repo.create('physics')
      .addComponent('transform', new TransformComponent(x, y))
      .addComponent('physics', new PhysicsComponent(mass))
      .addComponent('render', new RenderComponent('circle', '#3b82f6', 20))
      .addComponent('tangible', new PhysicsCollisionComponent(20))
      .addComponent('draggable', new MobileByUserComponent(false));
  }

  static createCircuitResistor(repo, x, y, resistance) {
    return repo.create('circuit')
      .addComponent('transform', new TransformComponent(x, y))
      .addComponent('circuit', new CircuitComponent('resistor', resistance))
      .addComponent('render', new RenderComponent('rect', '#ef4444', 40));
  }

  static createCircuitBattery(repo, x, y, voltage) {
    return repo.create('circuit')
      .addComponent('transform', new TransformComponent(x, y))
      .addComponent('circuit', new CircuitComponent('battery', voltage))
      .addComponent('render', new RenderComponent('rect', '#22c55e', 40));
  }
}

// ============================================================================
// PRESENTATION LAYER - UI Components
// ============================================================================

// Renderer component - OBSERVER PATTERN: observes simulation state
class CanvasRenderer {
  constructor(canvas) {
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

  //State Variables
  const [mode, setMode] = useState('physics'); // 'physics' or 'circuit'
  const [isRunning, setIsRunning] = useState(false);
  const [entityCount, setEntityCount] = useState(0);
  const [backgroundColor, setBackgroundColor] = useState('#111827');


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
    
    // Add initial entities
    if (mode === 'physics') {
      EntityFactory.createPhysicsObject(engineRef.current.repository, 200, 50, 1);
      EntityFactory.createPhysicsObject(engineRef.current.repository, 400, 100, 2);
    } else {
      EntityFactory.createCircuitBattery(engineRef.current.repository, 150, 300, 9);
      EntityFactory.createCircuitResistor(engineRef.current.repository, 300, 300, 100);
      EntityFactory.createCircuitResistor(engineRef.current.repository, 450, 300, 200);
    }
    
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
    if (mode === 'physics') {
      EntityFactory.createPhysicsObject(engineRef.current.repository, 200, 50, 1);
      EntityFactory.createPhysicsObject(engineRef.current.repository, 400, 100, 2);
    } else {
      EntityFactory.createCircuitBattery(engineRef.current.repository, 150, 300, 9);
      EntityFactory.createCircuitResistor(engineRef.current.repository, 300, 300, 100);
      EntityFactory.createCircuitResistor(engineRef.current.repository, 450, 300, 200);
    }
    
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
    handleReset();
    setIsRunning(false);
    setMode(newMode);
  };

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