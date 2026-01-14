import {Entity, EntityFactory} from './factory.js';

// Initialization pre-sets. Strategy Pattern.
// These only declare the starter entities.
// TODO: create controls and multiple setups for different 'levels' or lessons.
class LevelSetup {
  initialize() {
    throw new Error('Must implement initialize method');
  }
}

const PhysicsLevels = [1, 2];

class BasicPhysicsSetup extends LevelSetup {
  initialize(repo) {
    console.log("Creating starter entities for basic physics");
    EntityFactory.createPhysicsObject(repo, 200, 50, 1);
    EntityFactory.createPhysicsObject(repo, 400, 100, 2);
  }
}

const CircuitLevels = [1];

class BasicCircuitSetup extends LevelSetup {
  initialize(repo) {
    console.log("Creating starter entities for basic circuit");
    EntityFactory.createCircuitBattery(repo, 50, 300, 9);
    EntityFactory.createCircuitResistor(repo, 150, 300, 100);
    EntityFactory.createCircuitResistor(repo, 250, 300, 200);
      
    let a = null;
    let b = null;

    repo.findByType("circuit").forEach(entity => {
      b = entity;
      if (a != null) {
        EntityFactory.createCircuitWire(repo, a, b);
      }
      a = b;
    })
  }
}

export {BasicPhysicsSetup, PhysicsLevels, BasicCircuitSetup, CircuitLevels};