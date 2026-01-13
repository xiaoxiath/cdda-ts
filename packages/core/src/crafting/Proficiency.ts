/**
 * Proficiency - 熟练度系统
 *
 * 参考 Cataclysm-DDA 的 proficiency 系统
 * 熟练度是 CDDA 中最重要的系统之一，影响制作速度、成功率和批量大小
 */

import type {
  ProficiencyId,
  ProficiencyLevel,
  ProficiencyExperience,
  ProficiencyDefinitionProps,
  ProficiencyData,
  ProficiencyCraftingBonus,
} from './types';
import { RecipeCategory } from './types';

// ============================================================================
// ProficiencyDefinition - 熟练度定义类
// ============================================================================

/**
 * ProficiencyDefinition - 熟练度定义类
 *
 * 定义熟练度的静态属性
 */
export class ProficiencyDefinition {
  readonly id!: ProficiencyId;
  readonly name!: string;
  readonly description!: string;
  readonly category!: string;
  readonly difficultyMultiplier!: number;
  readonly relatedCategories!: RecipeCategory[];
  readonly maxLevel!: ProficiencyLevel;

  private constructor(props: ProficiencyDefinitionProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description ?? '';
    this.category = props.category;
    this.difficultyMultiplier = props.difficultyMultiplier;
    this.relatedCategories = props.relatedCategories;
    this.maxLevel = props.maxLevel;

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建熟练度定义
   */
  static create(props: ProficiencyDefinitionProps): ProficiencyDefinition {
    return new ProficiencyDefinition(props);
  }

  /**
   * 创建简单的熟练度定义
   */
  static simple(
    id: ProficiencyId,
    name: string,
    category: string,
    relatedCategories: RecipeCategory[],
    maxLevel: ProficiencyLevel = 5
  ): ProficiencyDefinition {
    return ProficiencyDefinition.create({
      id,
      name,
      category,
      difficultyMultiplier: 1.0,
      relatedCategories,
      maxLevel,
    });
  }

  /**
   * 创建困难熟练度定义
   */
  static difficult(
    id: ProficiencyId,
    name: string,
    category: string,
    relatedCategories: RecipeCategory[],
    maxLevel: ProficiencyLevel = 5
  ): ProficiencyDefinition {
    return ProficiencyDefinition.create({
      id,
      name,
      category,
      difficultyMultiplier: 1.5,
      relatedCategories,
      maxLevel,
    });
  }

  // ========== 计算方法 ==========

  /**
   * 计算升级所需经验
   *
   * @param currentLevel 当前等级
   * @returns 所需经验值
   */
  getExperienceForLevel(currentLevel: ProficiencyLevel): ProficiencyExperience {
    if (currentLevel >= this.maxLevel) {
      return Infinity;
    }

    // 基础公式：100 * (level + 1) * difficultyMultiplier
    const baseExperience = 100 * (currentLevel + 1);
    return Math.floor(baseExperience * this.difficultyMultiplier);
  }

  /**
   * 计算制作速度倍率
   *
   * @param level 熟练度等级
   * @returns 速度倍率 (0.5 - 1.5)
   */
  getSpeedMultiplier(level: ProficiencyLevel): number {
    // 每级提高 10% 速度
    const bonus = level * 0.1;
    return Math.min(1.5, Math.max(0.5, 1.0 - bonus));
  }

  /**
   * 计算成功率加值
   *
   * @param level 熟练度等级
   * @returns 成功率加值 (0 - 0.5)
   */
  getSuccessRateBonus(level: ProficiencyLevel): number {
    // 每级提高 5% 成功率
    return Math.min(0.5, level * 0.05);
  }

  /**
   * 计算批量大小修正
   *
   * @param level 熟练度等级
   * @returns 批量大小修正值 (0 - 5)
   */
  getBatchSizeModifier(level: ProficiencyLevel): number {
    // 每级增加 1 个批量位
    return Math.min(5, level);
  }

  /**
   * 计算完整的制作加成
   *
   * @param level 熟练度等级
   * @returns 制作加成
   */
  getCraftingBonus(level: ProficiencyLevel): ProficiencyCraftingBonus {
    return {
      speedMultiplier: this.getSpeedMultiplier(level),
      successRateBonus: this.getSuccessRateBonus(level),
      batchSizeModifier: this.getBatchSizeModifier(level),
    };
  }

  /**
   * 检查是否与配方类别相关
   *
   * @param category 配方类别
   * @returns 是否相关
   */
  isRelatedToCategory(category: RecipeCategory): boolean {
    return this.relatedCategories.includes(category);
  }

  // ========== 显示方法 ==========

  /**
   * 获取显示名称
   */
  getDisplayName(): string {
    return `${this.name} (${this.category})`;
  }

  /**
   * 获取显示描述
   */
  getDisplayDescription(): string {
    const lines = [
      `=== ${this.name} ===`,
      this.description,
      '',
      `类别: ${this.category}`,
      `难度倍率: ${this.difficultyMultiplier}x`,
      `最大等级: ${this.maxLevel}`,
      '',
      `相关类别: ${this.relatedCategories.join(', ')}`,
    ];

    return lines.join('\n');
  }

  /**
   * 获取等级描述
   *
   * @param level 当前等级
   * @returns 等级描述
   */
  getLevelDescription(level: ProficiencyLevel): string {
    const bonus = this.getCraftingBonus(level);
    const lines = [
      `等级: ${level}/${this.maxLevel}`,
      `速度倍率: ${(bonus.speedMultiplier * 100).toFixed(0)}%`,
      `成功率加值: +${(bonus.successRateBonus * 100).toFixed(0)}%`,
      `批量加成: +${bonus.batchSizeModifier}`,
    ];

    return lines.join('\n');
  }
}

// ============================================================================
// Proficiency - 熟练度实例类
// ============================================================================

/**
 * Proficiency - 熟练度实例类
 *
 * 使用不可变数据结构
 */
export class Proficiency {
  readonly definition!: ProficiencyDefinition;
  readonly level!: ProficiencyLevel;
  readonly experience!: ProficiencyExperience;
  readonly isUnlocked!: boolean;

  private constructor(props: ProficiencyData) {
    this.definition = props.definition;
    this.level = props.level;
    this.experience = props.experience;
    this.isUnlocked = props.isUnlocked;

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建熟练度实例
   */
  static create(props: ProficiencyData): Proficiency {
    return new Proficiency(props);
  }

  /**
   * 创建新的熟练度实例
   */
  static new(definition: ProficiencyDefinition): Proficiency {
    return Proficiency.create({
      definition,
      level: 0,
      experience: 0,
      isUnlocked: false,
    });
  }

  /**
   * 创建已解锁的熟练度实例
   */
  static unlocked(definition: ProficiencyDefinition, startLevel: ProficiencyLevel = 0): Proficiency {
    return Proficiency.create({
      definition,
      level: startLevel,
      experience: 0,
      isUnlocked: true,
    });
  }

  // ========== 状态操作 ==========

  /**
   * 解锁熟练度
   */
  unlock(): Proficiency {
    if (this.isUnlocked) {
      return this;
    }

    return Proficiency.create({
      ...this,
      isUnlocked: true,
    });
  }

  /**
   * 增加经验
   *
   * @param experience 经验值
   * @returns 更新后的熟练度
   */
  gainExperience(experience: ProficiencyExperience): Proficiency {
    if (!this.isUnlocked) {
      return this;
    }

    let newLevel = this.level;
    let newExperience = this.experience + experience;

    // 检查是否升级
    while (newLevel < this.definition.maxLevel) {
      const requiredExp = this.definition.getExperienceForLevel(newLevel);
      if (newExperience >= requiredExp) {
        newExperience -= requiredExp;
        newLevel++;
      } else {
        break;
      }
    }

    // 确保经验不超过当前等级所需
    if (newLevel >= this.definition.maxLevel) {
      newExperience = 0;
    }

    return Proficiency.create({
      ...this,
      level: newLevel,
      experience: newExperience,
    });
  }

  /**
   * 设置等级
   *
   * @param level 新等级
   * @returns 更新后的熟练度
   */
  setLevel(level: ProficiencyLevel): Proficiency {
    const clampedLevel = Math.max(0, Math.min(this.definition.maxLevel, level));
    return Proficiency.create({
      ...this,
      level: clampedLevel,
      experience: 0,
    });
  }

  /**
   * 重置经验
   */
  resetExperience(): Proficiency {
    return Proficiency.create({
      ...this,
      experience: 0,
    });
  }

  // ========== 查询方法 ==========

  /**
   * 获取下一等级所需经验
   */
  getExperienceToNextLevel(): ProficiencyExperience {
    if (this.level >= this.definition.maxLevel) {
      return 0;
    }

    const required = this.definition.getExperienceForLevel(this.level);
    return Math.max(0, required - this.experience);
  }

  /**
   * 是否已达到最大等级
   */
  isMaxLevel(): boolean {
    return this.level >= this.definition.maxLevel;
  }

  /**
   * 获取进度百分比
   */
  getProgressPercentage(): number {
    if (this.level >= this.definition.maxLevel) {
      return 100;
    }

    const required = this.definition.getExperienceForLevel(this.level);
    return Math.min(100, Math.floor((this.experience / required) * 100));
  }

  /**
   * 获取制作加成
   */
  getCraftingBonus(): ProficiencyCraftingBonus {
    return this.definition.getCraftingBonus(this.level);
  }

  // ========== 显示方法 ==========

  /**
   * 获取显示名称
   */
  getDisplayName(): string {
    if (!this.isUnlocked) {
      return `??? (未知熟练度)`;
    }
    return `${this.definition.name} Lv.${this.level}`;
  }

  /**
   * 获取显示描述
   */
  getDisplayDescription(): string {
    if (!this.isUnlocked) {
      return '这是一个隐藏熟练度，需要特定条件才能解锁。';
    }

    const lines = [
      this.definition.getDisplayName(),
      '',
      this.definition.getLevelDescription(this.level),
      '',
      `经验: ${this.experience}/${this.definition.getExperienceForLevel(this.level)}`,
      `进度: ${this.getProgressPercentage()}%`,
    ];

    return lines.join('\n');
  }

  /**
   * 获取简短描述
   */
  getShortDescription(): string {
    if (!this.isUnlocked) {
      return '???';
    }
    return `${this.definition.name} (${this.level}/${this.definition.maxLevel})`;
  }
}

// ============================================================================
// ProficiencyDefinitions - 预定义熟练度定义
// ============================================================================

/**
 * 预定义熟练度定义
 */
export const ProficiencyDefinitions = {
  // 烹饪相关
  COOKING: ProficiencyDefinition.simple(
    'prof_cooking' as any,
    '烹饪',
    'food',
    [RecipeCategory.FOOD],
    5
  ),

  BAKING: ProficiencyDefinition.simple(
    'prof_baking' as any,
    '烘焙',
    'food',
    [RecipeCategory.FOOD],
    5
  ),

  BUTCHERY: ProficiencyDefinition.simple(
    'prof_butchery' as any,
    '屠宰',
    'food',
    [RecipeCategory.FOOD],
    3
  ),

  // 缝纫相关
  TAILORING: ProficiencyDefinition.simple(
    'prof_tailoring' as any,
    '裁缝',
    'clothing',
    [RecipeCategory.GEAR],
    5
  ),

  LEATHERWORKING: ProficiencyDefinition.simple(
    'prof_leatherworking' as any,
    '皮革加工',
    'clothing',
    [RecipeCategory.GEAR],
    4
  ),

  // 建筑相关
  CARPENTRY: ProficiencyDefinition.simple(
    'prof_carpentry' as any,
    '木工',
    'construction',
    [RecipeCategory.BUILDING],
    5
  ),

  MASONRY: ProficiencyDefinition.difficult(
    'prof_masonry' as any,
    '石工',
    'construction',
    [RecipeCategory.BUILDING],
    4
  ),

  // 金属加工
  METALWORKING: ProficiencyDefinition.difficult(
    'prof_metalworking' as any,
    '金属加工',
    'metal',
    [RecipeCategory.TOOL, RecipeCategory.WEAPON],
    5
  ),

  BLACKSMITHING: ProficiencyDefinition.difficult(
    'prof_blacksmithing' as any,
    '铁匠',
    'metal',
    [RecipeCategory.TOOL, RecipeCategory.WEAPON],
    5
  ),

  // 电子相关
  ELECTRONICS: ProficiencyDefinition.difficult(
    'prof_electronics' as any,
    '电子',
    'electronics',
    [RecipeCategory.ELECTRONICS],
    5
  ),

  // 化学相关
  CHEMISTRY: ProficiencyDefinition.difficult(
    'prof_chemistry' as any,
    '化学',
    'science',
    [RecipeCategory.CHEMISTRY],
    5
  ),

  // 医疗相关
  FIRST_AID: ProficiencyDefinition.simple(
    'prof_first_aid' as any,
    '急救',
    'medical',
    [RecipeCategory.MED],
    3
  ),

  // 弹药制造
  AMMO: ProficiencyDefinition.simple(
    'prof_ammo' as any,
    '弹药制造',
    'ammunition',
    [RecipeCategory.AMMO],
    5
  ),

  // 陷阱
  TRAPS: ProficiencyDefinition.simple(
    'prof_traps' as any,
    '陷阱',
    'traps',
    [RecipeCategory.OTHER],
    4
  ),
};
