//Entity definitions
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

  hasAll(names) {
    for(const n in names) {
      if(!this.hasComponent(n)){
        return false;
      }
    }
    return true;
  }

}

// Components for Entity-Component Pattern
class TransformComponent {
  constructor(x, y, rotation = 0) {
    //console.log("creating a transform component");
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
    //console.log("creating a physics component");
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
    //console.log("creating a render component");
    this.shape = shape; // 'circle', 'rect', 'line'
    this.color = color;
    this.size = size;
  }
}

class CircuitComponent {
  constructor(componentType, value) {
    console.log("Creating a " + componentType);
    this.componentType = componentType; // 'resistor', 'battery'
    this.value = value; // resistance in ohms, voltage in volts
    this.current = 0;
    this.voltage = 0;
    this.connections = [];
  }
}

class CircuitWireComponent {
  constructor(start, end) {
    console.log("creating a wire component");
    this.startx = start.getComponent('transform').x;
    this.starty = start.getComponent('transform').y;
    this.endx = end.getComponent('transform').x;
    this.endy = end.getComponent('transform').y;
  }
}


// Factory functions to create common entities
class EntityFactory {
  static createPhysicsObject(repo, x, y, mass = 1, type = "Ball") {
    if(type === "Ball") {
      return repo.create('physics')
        .addComponent('transform', new TransformComponent(x, y))
        .addComponent('physics', new PhysicsComponent(mass))
        .addComponent('render', new RenderComponent('circle', '#3b82f6', 20))
        .addComponent('tangible', new PhysicsCollisionComponent(20))
        .addComponent('draggable', new MobileByUserComponent(false));
    }
    else if(type === "Pin") {
      return repo.create('physics')
        .addComponent('transform', new TransformComponent(x, y))
        .addComponent('render', new RenderComponent('circle', '#3b82f6', 10))
        .addComponent('tangible', new PhysicsCollisionComponent(10))
        .addComponent('draggable', new MobileByUserComponent(false));
    }
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

   static createCircuitWire(repo, start, end) {
    return repo.create('circuit')
      .addComponent('transform', new TransformComponent(50, 50))
      .addComponent('render', new RenderComponent('line', '#7fe0dcff', 5))
      .addComponent('wire', new CircuitWireComponent(start, end));
  }



}

const PhysicsObjs = ["Ball", "Pin"];

const CircuitObjs = ["Battery", "Wire", "Resistor", "Switch"];

export {Entity, EntityFactory, PhysicsObjs, CircuitObjs};