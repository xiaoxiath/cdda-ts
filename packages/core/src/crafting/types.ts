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
  // Proficiency 相关
  requiredProficiencies?: { proficiencyId: string; level: number }[];
  proficienciesGained?: { proficiencyId: string; experience: number }[];
}

// ============================================================================
// Proficiency 系统类型
// ============================================================================

/**
 * 熟练度 ID
 */
export type ProficiencyId = string & { readonly __brand: unique symbol };

/**
 * 创建熟练度 ID
 */
export function createProficiencyId(id: string): ProficiencyId {
  return id as ProficiencyId;
}

/**
 * 熟练度等级
 */
export type ProficiencyLevel = number;

/**
 * 熟练度经验值
 */
export type ProficiencyExperience = number;

/**
 * 熟练度定义属性
 */
export interface ProficiencyDefinitionProps {
  id: ProficiencyId;
  name: string;
  description?: string;
  category: string;
  /** 难度倍率 */
  difficultyMultiplier: number;
  /** 相关的配方类别 */
  relatedCategories: RecipeCategory[];
  /** 最大等级 */
  maxLevel: ProficiencyLevel;
}

/**
 * 熟练度实例数据
 */
export interface ProficiencyData {
  /** 熟练度定义 */
  definition: any; // ProficiencyDefinition - 前向声明避免循环引用
  /** 当前等级 */
  level: ProficiencyLevel;
  /** 当前经验 */
  experience: ProficiencyExperience;
  /** 是否已解锁 */
  isUnlocked: boolean;
}

/**
 * 熟练度对制作的影响
 */
export interface ProficiencyCraftingBonus {
  /** 制作速度倍率 */
  speedMultiplier: number;
  /** 成功率加值 */
  successRateBonus: number;
  /** 批量大小修正 */
  batchSizeModifier: number;
}

// ============================================================================
// Quality 系统类型
// ============================================================================

/**
 * 质量 ID
 */
export type QualityId = string & { readonly __brand: unique symbol };

/**
 * 创建质量 ID
 */
export function createQualityId(id: string): QualityId {
  return id as QualityId;
}

/**
 * 质量等级 (0-5)
 */
export type QualityLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * 质量等级枚举
 */
export enum QualityLevelEnum {
  AWFUL = 0,        // 极差
  BAD = 1,          // 差
  POOR = 2,         // 较差
  NORMAL = 3,       // 普通
  GOOD = 4,         // 良好
  EXCELLENT = 5,    // 优秀
}

/**
 * 质量要求
 */
export interface QualityRequirement {
  /** 质量 ID */
  qualityId: QualityId;
  /** 最低质量等级 */
  minLevel: QualityLevel;
  /** 是否必须包含此质量 */
  required?: boolean;
}

/**
 * 质量匹配结果
 */
export interface QualityMatchResult {
  /** 是否匹配 */
  matches: boolean;
  /** 匹配的质量 ID */
  matchedQualities: QualityId[];
  /** 缺少的必需质量 */
  missingRequired: QualityRequirement[];
  /** 质量等级不足 */
  insufficientLevel: Array<{ qualityId: QualityId; required: QualityLevel; has: QualityLevel }>;
}

/**
 * 质量定义属性
 */
export interface QualityDefinitionProps {
  id: QualityId;
  name: string;
  description?: string;
  /** 相关工具 */
  relatedTools?: string[];
  /** 相关物品类型 */
  relatedItemTypes?: string[];
  /** 默认质量等级 */
  defaultLevel?: QualityLevel;
}

/**
 * 质量实例数据
 */
export interface QualityData {
  /** 质量 ID */
  qualityId: QualityId;
  /** 质量等级 */
  level: QualityLevel;
}

// ============================================================================
// 批量优化系统类型
// ============================================================================

/**
 * 批量优化参数
 */
export interface BatchOptimizationParams {
  /** 基础批量大小 */
  baseBatchSize: number;
  /** 技能等级 */
  skillLevel: number;
  /** 熟练度等级 */
  proficiencyLevel?: number;
  /** 难度倍率 */
  difficultyMultiplier: number;
  /** 最大批次限制 */
  maxBatchLimit?: number;
}

/**
 * 批量优化结果
 */
export interface BatchOptimizationResult {
  /** 优化的批量大小 */
  batchSize: number;
  /** 效率评分 (0-1) */
  efficiency: number;
  /** 预计时间节省百分比 */
  timeSavedPercent: number;
  /** Logistic 函数参数 */
  logisticParams: {
    /** 中心点 (x 坐标) */
    center: number;
    /** 增长率 */
    growthRate: number;
    /** 最大值 */
    maxValue: number;
  };
}

// ============================================================================
// 高级配方功能类型
// ============================================================================

/**
 * 配方过滤器条件
 */
export interface RecipeFilter {
  /** 配方类别 */
  categories?: RecipeCategory[];
  /** 制作类型 */
  types?: CraftingType[];
  /** 所需技能 ID */
  requiredSkills?: string[];
  /** 所需工具 ID */
  requiredTools?: string[];
  /** 是否显示已锁定的配方 */
  showLocked?: boolean;
  /** 是否显示已学会的配方 */
  showLearned?: boolean;
  /** 搜索关键词 */
  searchQuery?: string;
  /** 最低难度 */
  minDifficulty?: number;
  /** 最高难度 */
  maxDifficulty?: number;
}

/**
 * 配方排序方式
 */
export enum RecipeSortBy {
  NAME = 'name',           // 按名称
  CATEGORY = 'category',   // 按类别
  DIFFICULTY = 'difficulty', // 按难度
  TIME = 'time',           // 按时间
  SKILL = 'skill',         // 按技能要求
}

/**
 * 配方排序顺序
 */
export enum RecipeSortOrder {
  ASC = 'asc',     // 升序
  DESC = 'desc',   // 降序
}

/**
 * 配方排序参数
 */
export interface RecipeSort {
  /** 排序方式 */
  sortBy: RecipeSortBy;
  /** 排序顺序 */
  sortOrder: RecipeSortOrder;
}

/**
 * 配方助手建议
 */
export interface RecipeAssistantAdvice {
  /** 配方 */
  recipe: any; // Recipe
  /** 可制作性评分 (0-1) */
  craftabilityScore: number;
  /** 缺少的材料 */
  missingMaterials: string[];
  /** 缺少的工具 */
  missingTools: string[];
  /** 技能差距 */
  skillGap: number;
  /** 优化建议 */
  suggestions: string[];
}

/**
 * 配方重复信息
 */
export interface RecipeDuplicateInfo {
  /** 是否为重复配方 */
  isDuplicate: boolean;
  /** 主配方 ID */
  primaryRecipeId: string;
  /** 重复配方 IDs */
  duplicateRecipeIds: string[];
  /** 重复原因 */
  duplicateReason: 'identical' | 'similar' | 'upgrade';
}
