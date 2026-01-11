/**
 * Common Types
 *
 * Shared type definitions used across multiple modules.
 */

/**
 * Item spawn configuration
 * Used for specifying items that can spawn from terrain, furniture, etc.
 */
export interface ItemSpawn {
  /** Item group ID or item ID */
  item: string;
  /** Count range [min, max] */
  count?: [number, number];
  /** Spawn chance (0-100) */
  chance?: number;
}
