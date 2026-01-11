/**
 * Trap System
 *
 * Comprehensive trap mechanics including detection, triggering, damage, and disarm.
 */

export { Trap } from './Trap';
export { TrapData } from './TrapData';
export { TrapParser, TrapJson } from './TrapParser';
export { TrapLoader } from './TrapLoader';
export { TrapAction, TrapFlag, TrapFlags } from './types';

// Re-export TrapId from coordinates for convenience
export type { TrapId } from '../coordinates/types';
