/**
 * SkillDefinition - 技能定义类
 *
 * 参考 Cataclysm-DDA 的 skill_type 结构
 * 定义技能的静态属性
 */

import { Set, List } from 'immutable';
import type {
  SkillId,
} from './types';
import { SkillCategory } from './types';
import type { SkillDefinitionProps, SkillPrerequisite } from './types';

/**
 * SkillDefinition - 技能定义类
 *
 * 使用不可变数据结构
 */
export class SkillDefinition {
  readonly id!: SkillId;
  readonly name!: string;
  readonly description!: string;
  readonly category!: SkillCategory;
  readonly difficultyMultiplier!: number;
  readonly isHidden!: boolean;
  readonly relatedItemTypes!: Set<string>;
  readonly prerequisites!: List<SkillPrerequisite>;
  readonly rustRate!: number;
  readonly defaultRustResist!: number;

  private constructor(props: SkillDefinitionProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description ?? '';
    this.category = props.category;
    this.difficultyMultiplier = props.difficultyMultiplier ?? 1.0;
    this.isHidden = props.isHidden ?? false;
    this.relatedItemTypes = Set(props.relatedItemTypes ?? []);
    this.prerequisites = List(props.prerequisites ?? []);
    this.rustRate = props.rustRate ?? 1.0;
    this.defaultRustResist = props.defaultRustResist ?? 0;

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建技能定义
   */
  static general(
    id: SkillId,
    name: string,
    description: string = '',
    category: SkillCategory,
    difficultyMultiplier: number = 1.0,
    isHidden: boolean = false
  ): SkillDefinition {
    return new SkillDefinition({
      id,
      name,
      description: description ?? '',
      category,
      difficultyMultiplier,
      isHidden,
    });
  }

  /**
   * 创建战斗技能
   */
  static combat(
    id: SkillId,
    name: string,
    description: string = '',
    difficultyMultiplier: number = 1.0
  ): SkillDefinition {
    return new SkillDefinition({
      id,
      name,
      description: description ?? '',
      category: SkillCategory.COMBAT,
      difficultyMultiplier,
      isHidden: false,
    });
  }

  /**
   * 创建制作技能
   */
  static crafting(
    id: SkillId,
    name: string,
    description: string = '',
    difficultyMultiplier: number = 1.0,
    relatedItemTypes?: string[]
  ): SkillDefinition {
    return new SkillDefinition({
      id,
      name,
      description: description ?? '',
      category: SkillCategory.CRAFTING,
      difficultyMultiplier,
      isHidden: false,
      relatedItemTypes,
    });
  }

  /**
   * 创建生存技能
   */
  static survival(
    id: SkillId,
    name: string,
    description: string = '',
    difficultyMultiplier: number = 1.0
  ): SkillDefinition {
    return new SkillDefinition({
      id,
      name,
      description: description ?? '',
      category: SkillCategory.SURVIVAL,
      difficultyMultiplier,
      isHidden: false,
    });
  }

  // ========== 类型检查方法 ==========

  /**
   * 是否为战斗技能
   */
  isCombatSkill(): boolean {
    return this.category === 'COMBAT';
  }

  /**
   * 是否为制作技能
   */
  isCraftingSkill(): boolean {
    return this.category === 'CRAFTING';
  }

  /**
   * 是否为生存技能
   */
  isSurvivalSkill(): boolean {
    return this.category === 'SURVIVAL';
  }

  /**
   * 是否为武器技能
   */
  isWeaponSkill(): boolean {
    return this.category === 'WEAPON';
  }

  /**
   * 是否有前置条件
   */
  hasPrerequisites(): boolean {
    return this.prerequisites.size > 0;
  }

  // ========== 计算方法 ==========

  /**
   * 计算升级所需经验
   *
   * @param currentLevel 当前等级
   * @returns 所需经验值 (0-100)
   */
  getExperienceForLevel(currentLevel: number): number {
    // 基础公式：需要 100 经验
    // 难度倍率会影响所需经验
    const baseExperience = 100;
    return Math.floor(baseExperience * this.difficultyMultiplier);
  }

  /**
   * 计算练习时获得的经验倍率
   *
   * @param level 当前技能等级
   * @returns 经验倍率
   */
  getExperienceMultiplier(level: number): number {
    // 等级越高，练习效率越低
    // 基础效率：100%
    // 每级降低 10%，最低 20%
    const baseMultiplier = 1.0;
    const levelPenalty = Math.min(level * 0.1, 0.8);
    return Math.max(0.2, baseMultiplier - levelPenalty) / this.difficultyMultiplier;
  }

  /**
   * 检查前置条件是否满足
   *
   * @param skillLevels 当前技能等级映射
   * @returns 是否满足前置条件
   */
  checkPrerequisites(skillLevels: Map<SkillId, number>): boolean {
    for (const prereq of this.prerequisites) {
      const currentLevel = skillLevels.get(prereq.skillId) ?? 0;
      if (currentLevel < prereq.requiredLevel) {
        return false;
      }
    }
    return true;
  }

  // ========== 工具方法 ==========

  /**
   * 获取显示名称
   */
  getDisplayName(): string {
    return this.isHidden ? `??? (未知技能)` : this.name;
  }

  /**
   * 获取显示描述
   */
  getDisplayDescription(): string {
    if (this.isHidden) {
      return '这是一个隐藏技能，需要特定条件才能解锁。';
    }
    return this.description;
  }

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      difficulty_multiplier: this.difficultyMultiplier,
      is_hidden: this.isHidden,
      related_items: this.relatedItemTypes.toArray(),
      prerequisites: this.prerequisites.toArray(),
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>): SkillDefinition {
    return new SkillDefinition({
      id: json.id as SkillId,
      name: json.name as string,
      description: (json.description as string | undefined) ?? '',
      category: json.category as SkillCategory,
      difficultyMultiplier: (json.difficulty_multiplier as number | undefined) ?? 1.0,
      isHidden: (json.is_hidden as boolean | undefined) ?? false,
      relatedItemTypes: json.related_items as string[] | undefined,
      prerequisites: json.prerequisites as SkillPrerequisite[] | undefined,
    });
  }
}

// ============================================================================
// 预定义技能常量
// ============================================================================

/**
 * 预定义技能定义
 */
export const SkillDefinitions = {
  // 近战技能
  MELEE: SkillDefinition.combat('melee' as any, '近战', '近战格斗技能', 1.0),
  BASHING: SkillDefinition.combat('bashing' as any, '钝击', '钝击武器技能', 1.0),
  CUTTING: SkillDefinition.combat('cutting' as any, '切割', '切割武器技能', 1.0),
  STABBING: SkillDefinition.combat('stabbing' as any, '刺击', '刺击武器技能', 1.0),
  UNARMED: SkillDefinition.combat('unarmed' as any, '徒手', '徒手格斗技能', 1.2),

  // 远程技能
  MARKSMANSHIP: SkillDefinition.combat('marksmanship' as any, '射击', '枪械射击技能', 1.0),
  ARCHERY: SkillDefinition.combat('archery' as any, '弓箭', '弓箭技能', 1.1),
  THROW: SkillDefinition.combat('throw' as any, '投掷', '投掷物品技能', 1.0),

  // 生存技能
  SURVIVAL: SkillDefinition.survival('survival' as any, '生存', '野外生存技能', 1.0),
  TRAPS: SkillDefinition.survival('traps' as any, '陷阱', '设置和解除陷阱', 1.1),
  DODGE: SkillDefinition.survival('dodge' as any, '闪避', '闪避攻击', 1.1),
  FIRST_AID: SkillDefinition.survival('firstaid' as any, '急救', '医疗急救技能', 1.2),

  // 制作技能
  COOKING: SkillDefinition.crafting('cooking' as any, '烹饪', '食物制作', 1.0, ['food', 'hotplate']),
 TAILOR: SkillDefinition.crafting('tailor' as any, '裁缝', '衣物制作', 1.0, ['needle', 'thread']),
  ELECTRONICS: SkillDefinition.crafting('electronics' as any, '电子', '电子设备制作', 1.3, ['soldering_iron']),
  MECHANICS: SkillDefinition.crafting('mechanics' as any, '机械', '机械维修', 1.2, ['wrench', 'screwdriver']),
  CONSTRUCTION: SkillDefinition.crafting('construction' as any, '建造', '建筑技能', 1.1),

  // 社交技能
  SPEECH: SkillDefinition.general('speech' as any, '说服', '说服和谈判技能', SkillCategory.SOCIAL),
  BARTER: SkillDefinition.general('barter' as any, '交易', '讨价还价技能', SkillCategory.SOCIAL),

  // 学术技能
  COMPUTER: SkillDefinition.general('computer' as any, '计算机', '使用计算机的技能', SkillCategory.ACADEMIC, 1.1),
};
