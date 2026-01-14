/**
 * Body System - 身体部位系统
 *
 * 提供身体部位相关的类型定义和工具函数
 */

// 子身体部位系统
export { SubBodyPart } from './SubBodyPart';
export type { SubBodyPartId, BodyPartRelation, BodyPartProps } from './SubBodyPart';

// 身体部位类型定义
export * from './BodyPartTypes';

// 身体部位类
export { BodyPart } from './BodyPart';

// 身体部位管理器
export { BodyPartManager } from './BodyPartManager';
