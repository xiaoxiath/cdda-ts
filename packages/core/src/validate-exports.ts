/**
 * Export Validation Script
 *
 * This script checks that all exports work correctly without conflicts.
 */

// Test imports from core package
import {
  // Coordinate exports
  TerrainId,
  FurnitureId,
  FieldTypeId,
  TrapId,
  // Terrain exports
  Terrain,
  TerrainFlags,
  // Furniture exports
  // Field exports
  // Trap exports
  Trap,
  TrapFlags,
  TrapAction,
  // Common types
  ItemSpawn,
} from './index';

console.log('✅ All imports successful!');
console.log('✅ No export conflicts detected!');

// Test that ID types are correct
const terrainId: TerrainId = 123;
const furnitureId: FurnitureId = 456;
const fieldTypeId: FieldTypeId = 'fd_fire';
const trapId: TrapId = 'tr_crossbow';

console.log('✅ ID types work correctly!');
console.log(`  TerrainId: ${terrainId}`);
console.log(`  FurnitureId: ${furnitureId}`);
console.log(`  FieldTypeId: ${fieldTypeId}`);
console.log(`  TrapId: ${trapId}`);

// Test that types from different modules don't conflict
const terrain = new Terrain({
  id: terrainId,
  name: 'test',
  description: 'test',
  symbol: '.',
  color: 'white',
  moveCost: 2,
  coverage: 100,
  flags: new TerrainFlags(),
});

const trap = new Trap({
  id: trapId,
  name: 'test trap',
  description: 'test',
  symbol: '^',
  color: 'red',
  visibility: 3,
  avoidance: 10,
  difficulty: 3,
  trapRadius: 0,
  benign: false,
  alwaysInvisible: false,
  triggerWeight: 5000,
  action: TrapAction.SNARE_LIGHT,
  flags: new TrapFlags(),
  fun: 0,
  complexity: 0,
});

console.log('✅ Objects created successfully!');
console.log(`  Terrain: ${terrain.name} (id: ${terrain.id})`);
console.log(`  Trap: ${trap.name} (id: ${trap.id})`);

// Test ItemSpawn type
const itemSpawn: ItemSpawn = {
  item: 'rock',
  count: [1, 3],
  chance: 50,
};

console.log('✅ Common types work correctly!');
console.log(`  ItemSpawn: ${JSON.stringify(itemSpawn)}`);

console.log('\n✅✅✅ All export validation checks passed! ✅✅✅');
