export * from './types';
export * from './Furniture';
export * from './FurnitureData';
export * from './FurnitureParser';
export * from './FurnitureLoader';

// Re-export FurnitureId from coordinates for convenience
export type { FurnitureId } from '../coordinates/types';

// Re-export common types for convenience
export type { ItemSpawn } from '../types/common';
