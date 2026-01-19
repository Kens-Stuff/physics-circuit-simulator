class SimulationStrategy {
  //because this is sort of the 'abstract' super strategy, update only throws an error.
  update(entities, deltaTime) {
    throw new Error('Must implement update method');
  }
}

//TODO: make gravity an aspect of the simulation that can be turned on or off.
class PhysicsSimulationStrategy extends SimulationStrategy {
  constructor() {
    super();
    this.gravity = 98;// 10x earth gravity, as position is calculated on pixel sized transformations.
    console.log("Physics Simulator Strategy constructor");
  }

  // Determines if two entities are colliding
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
    const tangibleA = entityA.getComponent('tangible');
    const tangibleB = entityB.getComponent('tangible');

    // Calculate restitution (bounciness) - 1.0 = perfectly elastic
    // eventually add capacity to calculate based on entities involved.
    const restitution = 1.0;
    
    const physicsA = entityA.getComponent('physics');
    const physicsB = entityB.getComponent('physics');
   
    // Calculate collision normal (direction from A to B)
    const dx = transformB.x - transformA.x;
    const dy = transformB.y - transformA.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Avoid division by zero
    if (distance === 0) return;

    // Normalize the collision normal.
    const nx = dx / distance;
    const ny = dy / distance;

    // Separate the objects (push them apart)
    const overlap = (tangibleA.radius + tangibleB.radius) - distance;
    const separationX = nx * overlap * 0.5;
    const separationY = ny * overlap * 0.5;

    //UP to this point, it hasn't mattered if one of the objects is immobile.
    //now it matters.
    //an immobile object has no physics component, and so has no velocity to change.
    // it also should not be transformed during seperation.
    //so, do I have everything that would use that check seperately? do I have there be one check?
    //do I migrate to another helper function?
    //ok. the way this is called from update,
    //entity A would always have a physics component.
    //and that's the one that is causing potential problems.
    //so really I only need to check if B has a physics component.
    //BUT THAT MAY NOT ALWAYS BE THE CASE
    //but for now, going to check once.
    if(!entityB.hasComponent('physics')) {
      //TODO: I broke it i broke it i broke it.
      // I don't know what happened. it thinks collisions happen continuously, and actual collisions aren't doing anything anymore.
      // AND THAT'S NOT EVEN COLLISIONS WITH A PIN!! THATS BALL ON BALL COLLISIONS.
      //
      //somebodies missing something, or maybe both are?
      //so entity B must be a pin, not a ball, at least right now those are the only options.
      
      console.log("collision with an imobile entity");
      //since b can't move, A must move twice as far.
      transformA.x -= separationX * 2;
      transformA.y -= separationY * 2;

      //calculate relative velocity. its, just the velocities of A, so normalize that.
      const velocityAlongNormal = (0 - physicsA.vx) * nx + (0 - physicsA.vy) * ny;

      // Don't resolve if velocities are separating
      if (velocityAlongNormal > 0) return;

      // Calculate impulse scalar
      const impulse = -(1 + restitution) * velocityAlongNormal;
      //impulse scalar not needed, as entityB is fixed. all impulse is absorbed by A.
      /*const totalMass = physicsA.mass + physicsB.mass;
      const impulseScalar = impulse / totalMass;*/

      // Apply impulse to velocities
      const impulseX = impulse * nx;
      const impulseY = impulse * ny;

      physicsA.vx -= impulseX; // * physicsB.mass; //entity B has no mass for how it changes the impulse to A. for how it gets moved its more like it has infinite mass.
      physicsA.vy -= impulseY; // * physicsB.mass;

    } else {
      console.log("collision between two mobile entities");
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

      // object collisions 
      // TODO: I don't know whats happening, collisions are broken.
      if (entity.hasComponent('tangible')) {
        entities.forEach(e => {
          if(!(entity.id === e.id) || !e.hasComponent('tangible')) {
            return;
          }
          if(this.collides(entity, e)) {
            //handle collision.
            console.log("collision detected");
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
      if (transform.x >= 800) {
        transform.x = 800;
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
  constructor(){
    super();
    console.log("circuit simulator constructor");
  }

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

export {SimulationStrategy, PhysicsSimulationStrategy, CircuitSimulationStrategy};