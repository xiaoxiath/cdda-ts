#!/usr/bin/env tsx
/**
 * Trap System Example
 *
 * This example demonstrates the trap system functionality including:
 * - Loading trap data from JSON
 * - Creating custom traps
 * - Detection and trigger mechanics
 * - Damage and effects
 * - Filtering and querying traps
 */

import { Trap } from './Trap';
import { TrapLoader } from './TrapLoader';
import { TrapAction, TrapFlags } from './types';
import { Map } from 'immutable';

// Example 1: Creating a simple trap
console.log('=== Example 1: Creating a Simple Trap ===\n');

const snareTrap = new Trap({
  id: 'tr_snare_light',
  name: 'snare trap',
  description: 'A simple snare trap that catches small game.',
  symbol: '^',
  color: 'light_green',
  visibility: 2,
  avoidance: 8,
  difficulty: 2,
  trapRadius: 0,
  benign: false,
  alwaysInvisible: false,
  triggerWeight: 1000,
  action: TrapAction.SNARE_LIGHT,
  flags: new TrapFlags(['HIDDEN']),
  fun: 0,
  complexity: 1,
});

console.log('Trap created:');
console.log(`  Name: ${snareTrap.name}`);
console.log(`  Description: ${snareTrap.description}`);
console.log(`  Action: ${snareTrap.getActionDescription()}`);
console.log(`  Visibility: ${snareTrap.visibility}`);
console.log(`  Difficulty: ${snareTrap.difficulty}`);
console.log();

// Example 2: Detection mechanics
console.log('=== Example 2: Detection Mechanics ===\n');

const characters = [
  { name: 'Novice', perception: 1, dodge: 3, weight: 60000, skills: Map({ traps: 1 }) },
  { name: 'Scout', perception: 3, dodge: 6, weight: 65000, skills: Map({ traps: 3 }) },
  { name: 'Expert', perception: 5, dodge: 10, weight: 70000, skills: Map({ traps: 8 }) },
];

for (const char of characters) {
  console.log(`${char.name} (perception: ${char.perception}):`);

  // Check detection
  const isVisible = snareTrap.isVisible(char.perception);
  console.log(`  Can see trap: ${isVisible}`);

  // Get discovery difficulty
  const discoveryDiff = snareTrap.getDiscoveryDifficulty(char.perception);
  console.log(`  Discovery difficulty: ${discoveryDiff}%`);

  // Check trigger
  const triggerChance = snareTrap.getTriggerChance(char.dodge);
  console.log(`  Trigger chance: ${(triggerChance * 100).toFixed(1)}%`);

  // Check if can disarm
  const canDisarm = snareTrap.canDisarm(char.skills);
  console.log(`  Can disarm: ${canDisarm}`);

  if (canDisarm) {
    const disarmDiff = snareTrap.getDisarmDifficulty(char.skills);
    console.log(`  Disarm difficulty: ${disarmDiff}%`);
  }

  console.log();
}

// Example 3: Triggering a trap
console.log('=== Example 3: Triggering a Trap ===\n');

const crossbowTrap = new Trap({
  id: 'tr_crossbow',
  name: 'crossbow trap',
  description: 'A modified crossbow that fires when triggered.',
  symbol: '}',
  color: 'brown',
  visibility: 2,
  avoidance: 15,
  difficulty: 6,
  trapRadius: 0,
  benign: false,
  alwaysInvisible: false,
  triggerWeight: 10000,
  action: TrapAction.CROSSBOW,
  flags: new TrapFlags(['HIDDEN', 'CONSUMED']),
  fun: 1,
  complexity: 5,
});

console.log(`Trap: ${crossbowTrap.name}`);
console.log(`Action: ${crossbowTrap.getActionDescription()}`);

// Simulate trigger
const characterWeight = 70000;
const characterDodge = 8;

console.log(`\nCharacter (weight: ${characterWeight}g, dodge: ${characterDodge}):`);

if (crossbowTrap.checkTrigger(characterWeight, characterDodge)) {
  console.log('  ⚠️  TRAP TRIGGERED!');

  const damage = crossbowTrap.getDamage(characterWeight);
  const penalty = crossbowTrap.getMovementPenalty();
  const lethal = crossbowTrap.isLethal();

  console.log(`  Damage: ${damage}`);
  console.log(`  Movement penalty: ${penalty} turns`);
  console.log(`  Lethal: ${lethal ? 'Yes' : 'No'}`);
  console.log(`  Requires ammunition: ${crossbowTrap.requiresAmmunition() ? 'Yes' : 'No'}`);
} else {
  console.log('  ✓ avoided the trap');
}

console.log();

// Example 4: Loading traps from JSON
console.log('=== Example 4: Loading Traps from JSON ===\n');

const jsonData: TrapJson[] = [
  {
    type: 'trap',
    id: 'tr_caltrops',
    name: 'caltrops',
    description: 'Sharp metal spikes that damage creatures that step on them.',
    symbol: '*',
    color: 'light_gray',
    visibility: 1,
    avoidance: 5,
    difficulty: 1,
    trap_radius: 0,
    benign: false,
    always_invisible: false,
    trigger_weight: 100,
    action: 'caltrops',
    flags: ['HIDDEN', 'TRIGGERED_BY_WALK'],
    fun: 0,
    complexity: 1,
  },
  {
    type: 'trap',
    id: 'tr_bubblewrap',
    name: 'bubble wrap',
    description: 'Just bubble wrap. Makes a loud popping noise when stepped on.',
    symbol: '=',
    color: 'pink',
    visibility: 0,
    avoidance: 0,
    difficulty: 0,
    trap_radius: 0,
    benign: true,
    always_invisible: false,
    trigger_weight: 500,
    action: 'bubble',
    flags: ['VISIBLE', 'BENIGN', 'LOUD', 'CAN_BE_AVOIDED'],
    fun: 3,
    complexity: 0,
  },
  {
    type: 'trap',
    id: 'tr_pit_spikes',
    name: 'spiked pit',
    description: 'A deep pit with sharp spikes at the bottom.',
    symbol: 'O',
    color: 'red',
    visibility: 1,
    avoidance: 25,
    difficulty: 3,
    trap_radius: 1,
    benign: false,
    always_invisible: false,
    trigger_weight: 5000,
    action: 'pit_spikes',
    flags: ['HIDDEN', 'DANGEROUS'],
    fun: 0,
    complexity: 4,
  },
];

const loader = new TrapLoader();
await loader.loadFromJson(jsonData);

console.log(`Loaded ${loader.getAll().length} traps:\n`);
for (const trap of loader.getAll()) {
  console.log(`  ${trap.name}`);
  console.log(`    ID: ${trap.id}`);
  console.log(`    Action: ${trap.getActionDescription()}`);
  console.log(`    Benign: ${trap.benign ? 'Yes' : 'No'}`);
  console.log(`    Lethal: ${trap.isLethal() ? 'Yes' : 'No'}`);
  console.log();
}

// Example 5: Filtering and querying
console.log('=== Example 5: Filtering and Querying Traps ===\n');

const data = loader.getData();

// Get statistics
const stats = loader.getStats();
console.log('Trap Statistics:');
console.log(`  Total: ${stats.total}`);
console.log(`  Visible: ${stats.visible}`);
console.log(`  Hidden: ${stats.hidden}`);
console.log(`  Benign: ${stats.benign}`);
console.log(`  Dangerous: ${stats.dangerous}`);
console.log(`  Lethal: ${stats.lethal}`);
console.log();

// Filter by danger level
console.log('Lethal traps:');
const lethalTraps = data.getLethalTraps();
if (lethalTraps.length === 0) {
  console.log('  None (in this dataset)');
} else {
  for (const trap of lethalTraps) {
    console.log(`  - ${trap.name} (damage: ${trap.getDamage(70000)})`);
  }
}
console.log();

// Sort by difficulty
console.log('Traps sorted by difficulty:');
const byDifficulty = data.sortByDifficulty();
for (const trap of byDifficulty) {
  console.log(`  ${trap.name}: difficulty ${trap.difficulty}`);
}
console.log();

// Example 6: Trap flags
console.log('=== Example 6: Trap Flags ===\n');

const flagExamples = [
  {
    name: 'Visible benign trap',
    flags: new TrapFlags(['VISIBLE', 'BENIGN']),
  },
  {
    name: 'Hidden dangerous trap',
    flags: new TrapFlags(['HIDDEN', 'DANGEROUS', 'LETHAL']),
  },
  {
    name: 'Consumed loud trap',
    flags: new TrapFlags(['CONSUMED', 'LOUD']),
  },
];

for (const example of flagExamples) {
  console.log(`${example.name}:`);
  console.log(`  isVisible(): ${example.flags.isVisible()}`);
  console.log(`  isHidden(): ${example.flags.isHidden()}`);
  console.log(`  isBenign(): ${example.flags.isBenign()}`);
  console.log(`  isDangerous(): ${example.flags.isDangerous()}`);
  console.log(`  isLethal(): ${example.flags.isLethal()}`);
  console.log(`  isConsumed(): ${example.flags.isConsumed()}`);
  console.log(`  isLoud(): ${example.flags.isLoud()}`);
  console.log();
}

// Example 7: Different trap actions
console.log('=== Example 7: Different Trap Actions ===\n');

const trapActions = [
  TrapAction.SNARE_LIGHT,
  TrapAction.SNARE_HEAVY,
  TrapAction.CALTROPS,
  TrapAction.CROSSBOW,
  TrapAction.SHOTGUN,
  TrapAction.PIT_SPIKES,
  TrapAction.PIT_GAS,
  TrapAction.SINKHOLE,
  TrapAction.BUBBLE,
  TrapAction.TELEPORT,
];

const testWeight = 70000;

for (const action of trapActions) {
  const trap = new Trap({
    id: 'tr_test',
    name: `test ${action}`,
    description: 'Test trap',
    symbol: '^',
    color: 'red',
    visibility: 3,
    avoidance: 10,
    difficulty: 5,
    trapRadius: 0,
    benign: false,
    alwaysInvisible: false,
    triggerWeight: 5000,
    action: action,
    flags: new TrapFlags(['HIDDEN']),
    fun: 1,
    complexity: 3,
  });

  const damage = trap.getDamage(testWeight);
  const penalty = trap.getMovementPenalty();
  const lethal = trap.isLethal();

  console.log(`${trap.getActionDescription().padEnd(20)} | Damage: ${damage.toString().padStart(3)} | Penalty: ${penalty.toString().padStart(3)} | Lethal: ${lethal ? 'Yes' : 'No'}`);
}

console.log();

// Example 8: Advanced filtering
console.log('=== Example 8: Advanced Filtering ===\n');

// Add more traps for filtering
const moreTraps: TrapJson[] = [
  {
    type: 'trap',
    id: 'tr_tripwire',
    name: 'tripwire',
    description: 'A nearly invisible wire that trips creatures.',
    symbol: '.',
    color: 'light_gray',
    visibility: 4,
    avoidance: 10,
    difficulty: 4,
    trap_radius: 0,
    benign: false,
    always_invisible: false,
    trigger_weight: 5000,
    action: 'tripwire',
    flags: ['HIDDEN', 'TRIGGERED_BY_WALK'],
    fun: 0,
    complexity: 2,
  },
  {
    type: 'trap',
    id: 'tr_hole',
    name: 'hole',
    description: 'A hole in the ground.',
    symbol: 'O',
    color: 'dark_gray',
    visibility: 1,
    avoidance: 15,
    difficulty: 0,
    trap_radius: 0,
    benign: false,
    always_invisible: false,
    trigger_weight: 1000,
    action: 'hole',
    flags: ['VISIBLE', 'CAN_BE_AVOIDED'],
    fun: 0,
    complexity: 1,
  },
];

await loader.loadFromJson(moreTraps);

console.log('Beginner-friendly traps (difficulty <= 2):');
const beginnerTraps = loader.getData().getBeginnerTraps(2);
for (const trap of beginnerTraps) {
  console.log(`  ${trap.name} (difficulty: ${trap.difficulty}, complexity: ${trap.complexity})`);
}
console.log();

console.log('Traps requiring ammunition:');
const ammoTraps = loader.getData().getTrapsRequiringAmmunition();
if (ammoTraps.length === 0) {
  console.log('  None (in this dataset)');
} else {
  for (const trap of ammoTraps) {
    console.log(`  ${trap.name} (${trap.getActionDescription()})`);
  }
}
console.log();

// Example 9: Display info
console.log('=== Example 9: Display Information ===\n');

const hiddenTrap = new Trap({
  id: 'tr_hidden',
  name: 'hidden spike trap',
  description: 'A hidden trap with sharp spikes.',
  symbol: '*',
  color: 'red',
  visibility: 5,
  avoidance: 12,
  difficulty: 4,
  trapRadius: 0,
  benign: false,
  alwaysInvisible: false,
  triggerWeight: 3000,
  action: TrapAction.CALTROPS,
  flags: new TrapFlags(['HIDDEN']),
  fun: 1,
  complexity: 2,
});

console.log('When trap is HIDDEN (not detected):');
const hiddenInfo = hiddenTrap.getDisplayInfo(false);
console.log(`  Symbol: '${hiddenInfo.symbol}'`);
console.log(`  Color: ${hiddenInfo.color}`);
console.log(`  Name: ${hiddenInfo.name}`);
console.log();

console.log('When trap is VISIBLE (detected):');
const visibleInfo = hiddenTrap.getDisplayInfo(true);
console.log(`  Symbol: '${visibleInfo.symbol}'`);
console.log(`  Color: ${visibleInfo.color}`);
console.log(`  Name: ${visibleInfo.name}`);
console.log();

// Example 10: Complete scenario
console.log('=== Example 10: Complete Scenario ===\n');

console.log('Scenario: Character explores a dungeon room\n');

const dungeonTrap = new Trap({
  id: 'tr_pit',
  name: 'pit',
  description: 'A deep pit dug into the ground.',
  symbol: 'O',
  color: 'black',
  visibility: 0,
  avoidance: 20,
  difficulty: 1,
  trapRadius: 1,
  benign: false,
  alwaysInvisible: false,
  triggerWeight: 5000,
  action: TrapAction.PIT,
  flags: new TrapFlags(['HIDDEN', 'CAN_BE_AVOIDED']),
  fun: 0,
  complexity: 3,
});

const adventurer = {
  name: 'Adventurer',
  perception: 4,
  dodge: 7,
  weight: 75000,
  skills: Map({ traps: 4, mechanics: 2 }),
};

console.log(`Character: ${adventurer.name}`);
console.log(`  Perception: ${adventurer.perception}`);
console.log(`  Dodge: ${adventurer.dodge}`);
console.log(`  Weight: ${adventurer.weight}g`);
console.log(`  Traps skill: ${adventurer.skills.get('traps')}`);
console.log();

console.log(`Trap: ${dungeonTrap.name}`);
console.log(`  Visibility: ${dungeonTrap.visibility}`);
console.log(`  Avoidance: ${dungeonTrap.avoidance}`);
console.log(`  Difficulty: ${dungeonTrap.difficulty}`);
console.log(`  Radius: ${dungeonTrap.trapRadius} tiles`);
console.log();

// Step 1: Detection
console.log('Step 1: Attempting to detect trap...');
const detected = dungeonTrap.isVisible(adventurer.perception);
if (detected) {
  console.log(`  ✓ ${adventurer.name} notices the ${dungeonTrap.name}!`);
} else {
  console.log(`  ✗ ${adventurer.name} does not notice anything.`);
}
console.log();

// Step 2: Trigger check
console.log('Step 2: Character walks forward...');
if (dungeonTrap.checkTrigger(adventurer.weight, adventurer.dodge)) {
  console.log(`  ⚠️  ${adventurer.name} falls into the ${dungeonTrap.name}!`);

  const damage = dungeonTrap.getDamage(adventurer.weight);
  const penalty = dungeonTrap.getMovementPenalty();

  console.log(`  Damage taken: ${damage}`);
  console.log(`  Movement penalty: ${penalty} turns (must climb out)`);
  console.log(`  Is lethal: ${dungeonTrap.isLethal() ? 'Yes' : 'No'}`);
} else {
  console.log(`  ✓ ${adventurer.name} avoids the trap!`);
}
console.log();

// Step 3: Disarm attempt
console.log('Step 3: Attempting to disarm trap...');
const canDisarm = dungeonTrap.canDisarm(adventurer.skills);
if (canDisarm) {
  const disarmDiff = dungeonTrap.getDisarmDifficulty(adventurer.skills);
  console.log(`  ✓ ${adventurer.name} can disarm the trap`);
  console.log(`  Disarm difficulty: ${disarmDiff}%`);

  // Simulate disarm roll (80% success rate for this example)
  const disarmRoll = Math.random() * 100;
  const disarmed = disarmRoll > disarmDiff;
  console.log(`  Disarm roll: ${disarmRoll.toFixed(1)}%`);
  console.log(`  Result: ${disarmed ? 'SUCCESS - Trap disarmed!' : 'FAILURE - Trap still active'}`);
} else {
  console.log(`  ✗ ${adventurer.name} lacks the skill to disarm this trap`);
}

console.log();
console.log('=== Examples Complete ===');
