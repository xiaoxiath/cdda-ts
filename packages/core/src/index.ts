export * from './types';
export * from './coordinates';
export * from './terrain';
export * from './furniture';
export * from './field';
export * from './trap';
export * from './map';
export * from './creature';
export * from './game';
export * from './world';
export * from './overmap';

// 以下模块有类型名称冲突，需要选择性导出
export type {
  RecipeId,
  RecipeCategory,
  CraftingType,
} from './crafting';
export { Recipe, CraftingManager, Recipes } from './crafting';

export type { SkillId, SkillLevel } from './skill';
export { Skill, SkillManager } from './skill';

export type {
  ItemGroupId,
  ItemTypeId,
} from './item';
export { Item, Inventory } from './item';

export type {
  EquipmentSlotId,
  EquipmentSlotType,
} from './equipment';
export { Equipment } from './equipment';

export type {
  DamageTypeId,
  DamageType,
  BodyPartId as DamageBodyPartId,
} from './damage';
export { DamageInstance } from './damage';

export type {
  EffectTypeId,
} from './effect';
export { Effect, EffectManager } from './effect';

// mapgen 模块包含 Node.js 特定代码（fs/promises），不在此导出
// 需要使用 mapgen 的请直接导入: import { ... } from '@cataclym-web/core/mapgen'

// CLI 模块包含 Node.js 特定代码，不在此导出
// 需要使用 CLI 的请直接导入: import { ... } from '@cataclym-web/core/cli'

