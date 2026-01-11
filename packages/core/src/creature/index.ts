/**
 * Creature Module - 角色系统
 *
 * 导出角色系统的所有核心类和类型
 */

// 类型定义
export * from './types';

// 核心类
export { Creature } from './Creature';
export { Avatar } from './Avatar';
export { NPC } from './NPC';

// 加载器和管理器
export { NPCClassLoader, NPCManager } from './NPCClassLoader';
export type { NPCClass, NPCData } from './NPC';
