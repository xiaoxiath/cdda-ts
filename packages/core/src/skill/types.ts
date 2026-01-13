/**
 * 技能系统类型定义
 *
 * 参考 Cataclysm-DDA 的 skill.h
 */

/**
 * 技能 ID
 */
export type SkillId = string & { readonly __brand: unique symbol };

/**
 * 创建技能 ID
 */
export function createSkillId(id: string): SkillId {
  return id as SkillId;
}

// ============================================================================
// 技能相关枚举
// ============================================================================

/**
 * 技能类别
 */
export enum SkillCategory {
  COMBAT = 'COMBAT',           // 战斗技能
  CRAFTING = 'CRAFTING',       // 制作技能
  SURVIVAL = 'SURVIVAL',       // 生存技能
  SOCIAL = 'SOCIAL',           // 社交技能
  MEDICAL = 'MEDICAL',         // 医疗技能
  VEHICLE = 'VEHICLE',         // 载具技能
  ACADEMIC = 'ACADEMIC',       // 学术技能
  WEAPON = 'WEAPON',           // 武器技能
  GENERAL = 'GENERAL',         // 通用技能
}

/**
 * 练习方式
 */
export enum PracticeType {
  PRACTICE = 'PRACTICE',       // 练习获得
  READ = 'READ',               // 阅读获得
  EAT = 'EAT',                 // 食物获得
  TEACH = 'TEACH',             // 教学获得
  QUEST = 'QUEST',             // 任务获得
}

// ============================================================================
// 技能等级相关类型
// ============================================================================

/**
 * 技能等级 (0-10, 实际可以更高)
 */
export type SkillLevel = number;

/**
 * 技能经验值
 */
export type SkillExperience = number;

/**
 * 技能练习数据
 */
export interface SkillPracticeData {
  /** 练习次数 */
  practiceCount: number;
  /** 上次练习时间 */
  lastPracticed: number;
  /** 是否正在消退 */
  isDecaying: boolean;
}

// ============================================================================
// 技能定义接口
// ============================================================================

/**
 * 技能定义属性
 */
export interface SkillDefinitionProps {
  id: SkillId;
  name: string;
  description: string;
  category: SkillCategory;
  /** 难度倍率 (1.0 = 标准, >1.0 = 更难) */
  difficultyMultiplier: number;
  /** 是否为隐藏技能 */
  isHidden: boolean;
  /** 相关的物品类型 ID */
  relatedItemTypes?: string[];
  /** 前置技能 */
  prerequisites?: SkillPrerequisite[];
}

/**
 * 技能前置条件
 */
export interface SkillPrerequisite {
  skillId: SkillId;
  requiredLevel: SkillLevel;
}

// ============================================================================
// 技能实例接口
// ============================================================================

/**
 * 技能实例属性
 */
export interface SkillProps {
  /** 技能定义 */
  definition: any; // SkillDefinition - 前向声明避免循环引用
  /** 当前等级 */
  level: SkillLevel;
  /** 当前经验值 (0-100) */
  experience: SkillExperience;
  /** 练习数据 */
  practiceData: SkillPracticeData;
  /** 是否已解锁 */
  isUnlocked: boolean;
}

/**
 * 技能升级结果
 */
export interface SkillLevelUpResult {
  /** 是否升级 */
  leveledUp: boolean;
  /** 新等级 */
  newLevel: SkillLevel;
  /** 经验值变化 */
  experienceGained: number;
  /** 剩余经验 */
  remainingExperience: number;
}

/**
 * 技能练习结果
 */
export interface SkillPracticeResult {
  /** 获得的经验 */
  experienceGained: number;
  /** 是否升级 */
  leveledUp: boolean;
  /** 新等级 */
  newLevel?: SkillLevel;
}

// ============================================================================
// 技能数据接口 (用于 JSON 加载)
// ============================================================================

/**
 * 技能 JSON 对象
 */
export interface SkillJsonObject {
  id: string;
  name: string;
  description?: string;
  category?: string;
  difficulty_multiplier?: number;
  is_hidden?: boolean;
  related_items?: string[];
  prerequisites?: Array<{ skill_id: string; level: number }>;
}
