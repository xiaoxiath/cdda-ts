export * from './types';
export * from './Terrain';
export * from './TerrainData';
export * from './TerrainLoader';

// Re-export TerrainId from coordinates for convenience
export type { TerrainId } from '../coordinates/types';

// Re-export common types for convenience
export type { ItemSpawn } from '../types/common';
