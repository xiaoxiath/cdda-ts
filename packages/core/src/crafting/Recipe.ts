/**
 * Recipe - 配方类
 *
 * 参考 Cataclysm-DDA 的 recipe 结构
 * 定义单个制作配方的属性和要求
 */

import { List, Map, Set } from 'immutable';
import type {
  RecipeId,
  RecipeDefinitionProps,
  RecipeRequirement,
  RecipeSkillRequirement,
  RecipeToolRequirement,
  RecipeTimeRequirement,
  RecipeResult,
  RecipeJsonObject,
  CraftingCheckResult,
} from './types';
import { RecipeCategory, CraftingType } from './types';

/**
 * Recipe - 配方类
 *
 * 定义制作配方的所有静态属性
 */
export class Recipe {
  readonly id!: RecipeId;
  readonly name!: string;
  readonly description!: string;
  readonly category!: RecipeCategory;
  readonly type!: CraftingType;
  readonly materials!: List<RecipeRequirement>;
  readonly tools!: List<RecipeToolRequirement>;
  readonly skills!: List<RecipeSkillRequirement>;
  readonly results!: List<RecipeResult>;
  readonly time!: RecipeTimeRequirement;
  readonly autolearn!: boolean;
  readonly learnable!: boolean;
  readonly reversible!: boolean;
  readonly batchSize!: number;
  readonly difficulty!: number;
  readonly relatedSkills!: List<string>;

  private constructor(props: RecipeDefinitionProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description ?? '';
    this.category = props.category;
    this.type = props.type;
    this.materials = List(props.materials);
    this.tools = List(props.tools ?? []);
    this.skills = List(props.skills ?? []);
    this.results = List(props.results);
    this.time = props.time;
    this.autolearn = props.autolearn ?? false;
    this.learnable = props.learnable ?? true;
    this.reversible = props.reversible ?? false;
    this.batchSize = props.batchSize ?? 1;
    this.difficulty = props.difficulty ?? 0;
    this.relatedSkills = List(props.relatedSkills ?? []);

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建配方
   */
  static create(props: RecipeDefinitionProps): Recipe {
    return new Recipe(props);
  }

  /**
   * 创建简单配方
   */
  static simple(
    id: RecipeId,
    name: string,
    category: RecipeCategory,
    materials: Array<{ id: string; count: number }>,
    resultItemId: string,
    resultCount: number = 1
  ): Recipe {
    return Recipe.create({
      id,
      name,
      category,
      type: CraftingType.MIX,
      materials: materials.map(m => ({ ...m, substitutable: false })),
      results: [
        {
          itemId: resultItemId,
          quantity: resultCount,
          quantityType: 'FIXED',
        },
      ],
      time: {
        baseTime: 10,
        timeType: 'FIXED',
      },
    });
  }

  /**
   * 创建烹饪配方
   */
  static cooking(
    id: RecipeId,
    name: string,
    materials: Array<{ id: string; count: number }>,
    resultItemId: string,
    resultCount: number = 1,
    requiredSkill?: { skillId: string; level: number }
  ): Recipe {
    return Recipe.create({
      id,
      name,
      category: RecipeCategory.FOOD,
      type: CraftingType.COOK,
      materials: materials.map(m => ({ ...m, substitutable: false })),
      skills: requiredSkill ? [requiredSkill] : [],
      results: [
        {
          itemId: resultItemId,
          quantity: resultCount,
          quantityType: 'FIXED',
        },
      ],
      time: {
        baseTime: 15,
        timeType: 'FIXED',
      },
      relatedSkills: requiredSkill ? [requiredSkill.skillId] : [],
    });
  }

  /**
   * 创建缝纫配方
   */
  static sewing(
    id: RecipeId,
    name: string,
    materials: Array<{ id: string; count: number }>,
    resultItemId: string,
    resultCount: number = 1
  ): Recipe {
    return Recipe.create({
      id,
      name,
      category: RecipeCategory.GEAR,
      type: CraftingType.SEW,
      materials: materials.map(m => ({ ...m, substitutable: true })),
      tools: [{ toolId: 'needle', minQuality: 0 }],
      skills: [{ skillId: 'tailor', level: 1, multiplier: 1.0 }],
      results: [
        {
          itemId: resultItemId,
          quantity: resultCount,
          quantityType: 'FIXED',
        },
      ],
      time: {
        baseTime: 20,
        timeType: 'SKILL_BASED',
      },
      relatedSkills: ['tailor'],
    });
  }

  // ========== 查询方法 ==========

  /**
   * 是否为食物配方
   */
  isFoodRecipe(): boolean {
    return this.category === RecipeCategory.FOOD;
  }

  /**
   * 是否为弹药配方
   */
  isAmmoRecipe(): boolean {
    return this.category === RecipeCategory.AMMO;
  }

  /**
   * 是否为装备配方
   */
  isGearRecipe(): boolean {
    return this.category === RecipeCategory.GEAR;
  }

  /**
   * 是否可学习
   */
  isLearnable(): boolean {
    return this.learnable;
  }

  /**
   * 是否可自动学习
   */
  isAutoLearn(): boolean {
    return this.autolearn;
  }

  /**
   * 是否可逆向
   */
  isReversible(): boolean {
    return this.reversible;
  }

  /**
   * 是否需要技能
   */
  requiresSkill(): boolean {
    return this.skills.size > 0;
  }

  /**
   * 是否需要工具
   */
  requiresTool(): boolean {
    return this.tools.size > 0;
  }

  // ========== 计算方法 ==========

  /**
   * 计算制作时间
   */
  calculateTime(skillLevels: Map<string, number> = Map()): number {
    const baseTime = this.time.baseTime;

    switch (this.time.timeType) {
      case 'FIXED':
        return baseTime;

      case 'SKILL_BASED':
        // 技能越高，时间越短
        if (this.skills.size === 0) return baseTime;

        let highestBonus = 0;
        for (const skillReq of this.skills) {
          const level = skillLevels.get(skillReq.skillId) || 0;
          if (level >= skillReq.level) {
            const bonus = (level - skillReq.level + 1) * 0.1;
            highestBonus = Math.max(highestBonus, bonus);
          }
        }
        return Math.max(baseTime * (1 - highestBonus), baseTime * 0.2);

      case 'QUANTITY_BASED':
        // 根据批量大小调整
        return baseTime * this.batchSize;

      default:
        return baseTime;
    }
  }

  /**
   * 计算成功概率
   */
  calculateSuccessProbability(skillLevels: Map<string, number> = Map()): number {
    // 基础成功率基于难度
    let baseProbability = 1.0 - (this.difficulty * 0.05);
    baseProbability = Math.max(0.1, Math.min(1.0, baseProbability));

    // 技能加成
    for (const skillReq of this.skills) {
      const level = skillLevels.get(skillReq.skillId) || 0;
      if (level < skillReq.level) {
        // 技能不足，降低成功率
        const shortfall = skillReq.level - level;
        baseProbability -= shortfall * 0.15;
      } else {
        // 技能充足，提高成功率
        const bonus = (level - skillReq.level + 1) * 0.05;
        baseProbability += bonus;
      }
    }

    return Math.max(0.05, Math.min(1.0, baseProbability));
  }

  /**
   * 计算获得的经验
   */
  calculateExperienceGain(success: boolean = true): Map<string, number> {
    if (!success || this.relatedSkills.isEmpty()) {
      return Map();
    }

    const baseExp = 10 + this.difficulty * 5;
    let expMap = Map<string, number>();

    for (const skillId of this.relatedSkills) {
      expMap = expMap.set(skillId, baseExp);
    }

    return expMap;
  }

  /**
   * 检查是否可以制作
   */
  canCraft(
    availableMaterials: Map<string, number>,
    availableTools: Set<string> = Set(),
    skillLevels: Map<string, number> = Map()
  ): CraftingCheckResult {
    const missingMaterials: Array<{ id: string; required: number; have: number }> = [];
    const missingTools: string[] = [];
    const insufficientSkills: Array<{ skillId: string; required: number; have: number }> = [];

    // 检查材料
    for (const material of this.materials) {
      const have = availableMaterials.get(material.id) || 0;
      if (have < material.count) {
        missingMaterials.push({
          id: material.id,
          required: material.count,
          have,
        });
      }
    }

    // 检查工具
    for (const tool of this.tools) {
      if (!availableTools.has(tool.toolId)) {
        missingTools.push(tool.toolId);
      }
    }

    // 检查技能
    for (const skill of this.skills) {
      const level = skillLevels.get(skill.skillId) || 0;
      if (level < skill.level) {
        insufficientSkills.push({
          skillId: skill.skillId,
          required: skill.level,
          have: level,
        });
      }
    }

    const canCraft = missingMaterials.length === 0 &&
                    missingTools.length === 0 &&
                    insufficientSkills.length === 0;

    return {
      canCraft,
      missingMaterials,
      missingTools,
      insufficientSkills,
      estimatedTime: this.calculateTime(skillLevels),
      successProbability: this.calculateSuccessProbability(skillLevels),
    };
  }

  // ========== 显示方法 ==========

  /**
   * 获取显示名称
   */
  getDisplayName(): string {
    return `${this.name} (${this.getResultDescription()})`;
  }

  /**
   * 获取结果描述
   */
  getResultDescription(): string {
    const results = this.results.toArray();
    if (results.length === 0) return '无产物';

    const mainResult = results[0];
    if (results.length === 1) {
      return `${mainResult.itemId} x${mainResult.quantity}`;
    }

    return `${results.length} 种产物`;
  }

  /**
   * 获取材料描述
   */
  getMaterialsDescription(): string {
    const parts: string[] = [];

    for (const material of this.materials) {
      const subText = material.substitutable ? ' (可替换)' : '';
      parts.push(`${material.id} x${material.count}${subText}`);
    }

    return parts.join(', ') || '无材料';
  }

  /**
   * 获取技能要求描述
   */
  getSkillsDescription(): string {
    if (this.skills.isEmpty()) return '无技能要求';

    const parts: string[] = [];
    for (const skill of this.skills) {
      parts.push(`${skill.skillId} Lv.${skill.level}`);
    }

    return parts.join(', ');
  }

  /**
   * 获取时间描述
   */
  getTimeDescription(): string {
    const time = this.calculateTime();
    return `${time} 秒`;
  }

  /**
   * 获取完整描述
   */
  getFullDescription(): string {
    const lines: string[] = [
      `=== ${this.name} ===`,
      this.description,
      '',
      `类别: ${this.category}`,
      `类型: ${this.type}`,
      '',
      `材料: ${this.getMaterialsDescription()}`,
      `技能: ${this.getSkillsDescription()}`,
      `时间: ${this.getTimeDescription()}`,
      `难度: ${this.difficulty}`,
      '',
      `产物: ${this.getResultDescription()}`,
    ];

    return lines.join('\n');
  }

  // ========== 序列化 ==========

  /**
   * 转换为 JSON
   */
  toJson(): RecipeJsonObject {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      type: this.type,
      materials: this.materials.toArray(),
      tools: this.tools.toArray(),
      skills: this.skills.toArray(),
      results: this.results.toArray(),
      time: this.time,
      autolearn: this.autolearn,
      reversible: this.reversible,
      difficulty: this.difficulty,
      relatedSkills: this.relatedSkills.toArray(),
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: RecipeJsonObject): Recipe {
    return Recipe.create({
      id: json.id as RecipeId,
      name: json.name,
      description: json.description,
      category: json.category as RecipeCategory,
      type: json.type as CraftingType,
      materials: json.materials as RecipeRequirement[],
      tools: json.tools as RecipeToolRequirement[],
      skills: json.skills as RecipeSkillRequirement[],
      results: json.results as RecipeResult[],
      time: json.time as RecipeTimeRequirement,
      autolearn: json.autolearn,
      reversible: json.reversible,
      difficulty: json.difficulty,
      relatedSkills: json.relatedSkills,
    });
  }
}

// ============================================================================
// 预定义配方常量
// ============================================================================

/**
 * 预定义配方
 */
export const Recipes = {
  // 简单食物
  COOKED_MEAT: Recipe.simple(
    'cooked_meat' as any,
    '烤肉',
    RecipeCategory.FOOD,
    [{ id: 'meat', count: 1 }],
    'cooked_meat',
    1
  ),

  // 缝纫
  BANDANA: Recipe.sewing(
    'bandana' as any,
    '头巾',
    [{ id: 'rag', count: 2 }],
    'bandana',
    1
  ),

  RAGS: Recipe.sewing(
    'rags' as any,
    '破布',
    [{ id: 'cotton', count: 1 }],
    'rag',
    2
  ),

  // 工具
  STONE_KNIFE: Recipe.create({
    id: 'stone_knife' as any,
    name: '石刀',
    description: '简单的石制刀具',
    category: RecipeCategory.TOOL,
    type: CraftingType.CONSTRUCTION,
    materials: [
      { id: 'stone', count: 2, substitutable: false },
    ],
    tools: [],
    results: [
      {
        itemId: 'stone_knife',
        quantity: 1,
        quantityType: 'FIXED',
      },
    ],
    time: {
      baseTime: 5,
      timeType: 'FIXED',
    },
    difficulty: 0,
  }),
};
