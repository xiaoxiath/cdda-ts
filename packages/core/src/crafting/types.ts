/**
 * Crafting System - 制作系统类型定义
 *
 * 参考 Cataclysm-DDA 的 recipe.h 和制作相关结构
 */

import type { Map } from 'immutable';

// ============================================================================
// 基础类型定义
// ============================================================================

/**
 * 配方 ID
 */
export type RecipeId = string & { readonly __brand: unique symbol };

/**
 * 创建配方 ID
 */
export function createRecipeId(id: string): RecipeId {
  return id as RecipeId;
}

// ============================================================================
// 制作类型枚举
// ============================================================================

/**
 * 制作类型
 */
export enum CraftingType {
  /** 混合 */
  MIX = 'MIX',
  /** 煮沸 */
  BOIL = 'BOIL',
  /** 烹饪 */
  COOK = 'COOK',
  /** 组装/拆解 */
  DISASSEMBLY = 'DISASSEMBLY',
  /** 建筑 */
  CONSTRUCTION = 'CONSTRUCTION',
  /** 化学反应 */
  CHEMISTRY = 'CHEMISTRY',
  /** 绑定/捆绑 */
  BIND = 'BIND',
  /** 磨制 */
  GRIND = 'GRIND',
  /** 锤打 */
  HAMMER = 'HAMMER',
  /** 缝纫 */
  SEW = 'SEW',
  /** 木工 */
  WOODWORKING = 'WOODWORKING',
  /** 铁匠 */
  BLACKSMITHING = 'BLACKSMITHING',
  /** 电子 */
  ELECTRONICS = 'ELECTRONICS',
}

/**
 * 配方类别
 */
export enum RecipeCategory {
  /** 食物 */
  FOOD = 'FOOD',
  /** 药品 */
  MED = 'MED',
  /** 弹药 */
  AMMO = 'AMMO',
  /** 装备 */
  GEAR = 'GEAR',
  /** 工具 */
  TOOL = 'TOOL',
  /** 武器 */
  WEAPON = 'WEAPON',
  /** 材料 */
  MATERIAL = 'MATERIAL',
  /** 建筑 */
  BUILDING = 'BUILDING',
  /** 化学 */
  CHEMISTRY = 'CHEMISTRY',
  /** 电子 */
  ELECTRONICS = 'ELECTRONICS',
  /** 其他 */
  OTHER = 'OTHER',
}

// ============================================================================
// 制作数据接口
// ============================================================================

/**
 * 配方材料要求
 */
export interface RecipeRequirement {
  /** 材料 ID */
  id: string;
  /** 数量 */
  count: number;
  /** 是否可替换 */
  substitutable?: boolean;
  /** 替换材料列表 */
  substitutions?: string[];
}

/**
 * 配方技能要求
 */
export interface RecipeSkillRequirement {
  /** 技能 ID */
  skillId: string;
  /** 最低等级 */
  level: number;
  /** 倍率（影响成功率/制作时间） */
  multiplier?: number;
}

/**
 * 配方工具要求
 */
export interface RecipeToolRequirement {
  /** 工具 ID */
  toolId: string;
  /** 最小质量 */
  minQuality?: number;
  /** 最大质量 */
  maxQuality?: number;
  /** 是否消耗 */
  consume?: boolean;
  /** 是否需要热量 */
  heatRequired?: boolean;
}

/**
 * 配方时间要求
 */
export interface RecipeTimeRequirement {
  /** 基础时间（秒） */
  baseTime: number;
  /** 时间计算方式 */
  timeType: 'FIXED' | 'SKILL_BASED' | 'QUANTITY_BASED';
}

/**
 * 配方结果
 */
export interface RecipeResult {
  /** 结果物品 ID */
  itemId: string;
  /** 数量 */
  quantity: number;
  /** 数量计算方式 */
  quantityType?: 'FIXED' | 'RANDOM' | 'SKILL_BASED';
  /** 概率（0-1，用于随机结果） */
  probability?: number;
  /** 副产物 */
  byproducts?: RecipeResult[];
}

/**
 * 制作检查结果
 */
export interface CraftingCheckResult {
  /** 是否可以制作 */
  canCraft: boolean;
  /** 缺少的材料 */
  missingMaterials: Array<{ id: string; required: number; have: number }>;
  /** 缺少的工具 */
  missingTools: string[];
  /** 技能不足 */
  insufficientSkills: Array<{ skillId: string; required: number; have: number }>;
  /** 估计时间（秒） */
  estimatedTime: number;
  /** 成功概率（0-1） */
  successProbability: number;
}

/**
 * 制作结果
 */
export interface CraftingResult {
  /** 是否成功 */
  success: boolean;
  /** 产生的物品 */
  producedItems: Array<{ itemId: string; quantity: number }>;
  /** 消耗的材料 */
  consumedMaterials: Array<{ id: string; quantity: number }>;
  /** 消耗的工具 */
  consumedTools: Array<{ toolId: string; quantity: number }>;
  /** 获得的经验 */
  experienceGained: Map<string, number>;
  /** 制作耗时（秒） */
  timeSpent: number;
}

// ============================================================================
// 配方定义接口
// ============================================================================

/**
 * 配方定义属性
 */
export interface RecipeDefinitionProps {
  id: RecipeId;
  name: string;
  description?: string;
  category: RecipeCategory;
  type: CraftingType;

  // 材料要求
  materials: RecipeRequirement[];

  // 工具要求
  tools?: RecipeToolRequirement[];

  // 技能要求
  skills?: RecipeSkillRequirement[];

  // 结果
  results: RecipeResult[];

  // 时间要求
  time: RecipeTimeRequirement;

  // 配方属性
  autolearn?: boolean;
  learnable?: boolean;
  reversible?: boolean;
  batchSize?: number;

  // 位置要求
  locationRequirements?: string[];

  // 条件检查
  flags?: string[];
  requiredFlags?: string[];

  // 难度
  difficulty?: number;

  // 相关技能（用于经验）
  relatedSkills?: string[];
}

/**
 * 配方 JSON 对象
 */
export interface RecipeJsonObject {
  id: string;
  name: string;
  description?: string;
  category: string;
  type: string;
  materials: Array<{ id: string; count: number; substitutable?: boolean }>;
  tools?: Array<{ toolId: string; minQuality?: number; consume?: boolean }>;
  skills?: Array<{ skillId: string; level: number }>;
  results: Array<{ itemId: string; quantity: number }>;
  time: { baseTime: number; timeType: string };
  autolearn?: boolean;
  reversible?: boolean;
  difficulty?: number;
  relatedSkills?: string[];
}
