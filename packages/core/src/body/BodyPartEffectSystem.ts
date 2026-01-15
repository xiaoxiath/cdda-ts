/**
 * BodyPartEffectSystem - 身体部位状态效果系统
 *
 * 管理身体部位状态对角色能力的动态影响
 * 提供状态效果的查询、计算和组合功能
 */

import { BodyPartId, BodyPartType } from '../creature/types';
import { BodyPartManager } from './BodyPartManager';
import { BodyPartStatus } from './BodyPartTypes';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 能力类型
 */
export enum AbilityType {
  /** 力量 */
  STRENGTH = 'strength',
  /** 敏捷 */
  DEXTERITY = 'dexterity',
  /** 智力 */
  INTELLIGENCE = 'intelligence',
  /** 感知 */
  PERCEPTION = 'perception',
  /** 移动速度 */
  MOVE_SPEED = 'move_speed',
  /** 近战伤害 */
  MELEE_DAMAGE = 'melee_damage',
  /** 远程伤害 */
  RANGED_DAMAGE = 'ranged_damage',
  /** 负重能力 */
  CARRY_CAPACITY = 'carry_capacity',
  /** 精细操作 */
  FINE_MANIPULATION = 'fine_manipulation',
  /** 语音 */
  SPEECH = 'speech',
  /** 听觉 */
  HEARING = 'hearing',
}

/**
 * 能力修饰符
 */
export interface AbilityModifier {
  readonly ability: AbilityType;
  readonly type: 'add' | 'multiply' | 'subtract';
  readonly value: number;
  readonly source: string; // 来源描述，如 '左臂骨折'
}

/**
 * 能力影响结果
 */
export interface AbilityImpact {
  readonly ability: AbilityType;
  readonly baseValue: number;
  readonly modifiers: readonly AbilityModifier[];
  readonly finalValue: number;
  readonly totalPenalty: number; // 总惩罚（正数表示减少）
}

/**
 * 行为限制
 */
export enum ActionRestriction {
  /** 无法移动 */
  CANNOT_MOVE = 'cannot_move',
  /** 无法使用双手 */
  CANNOT_USE_BOTH_HANDS = 'cannot_use_both_hands',
  /** 无法使用左手 */
  CANNOT_USE_LEFT_HAND = 'cannot_use_left_hand',
  /** 无法使用右手 */
  CANNOT_USE_RIGHT_HAND = 'cannot_use_right_hand',
  /** 无法使用双手 */
  CANNOT_USE_EITHER_HAND = 'cannot_use_either_hand',
  /** 无法说话 */
  CANNOT_SPEAK = 'cannot_speak',
  /** 无法进行精细操作 */
  CANNOT_FINE_MANIPULATION = 'cannot_fine_manipulation',
  /** 无法施法 */
  CANNOT_CAST_SPELLS = 'cannot_cast_spells',
  /** 跌倒在地 */
  PRONE = 'prone',
}

/**
 * 状态效果摘要
 */
export interface StatusEffectSummary {
  readonly status: BodyPartStatus;
  readonly count: number;
  readonly parts: readonly BodyPartId[];
  readonly primaryEffects: string[];
}

/**
 * 整体能力评估
 */
export interface OverallAbilityAssessment {
  readonly strength: AbilityImpact;
  readonly dexterity: AbilityImpact;
  readonly intelligence: AbilityImpact;
  readonly perception: AbilityImpact;
  readonly moveSpeed: AbilityImpact;
  readonly meleeDamage: AbilityImpact;
  readonly rangedDamage: AbilityImpact;
  readonly carryCapacity: AbilityImpact;
  readonly restrictions: readonly ActionRestriction[];
  readonly statusSummary: readonly StatusEffectSummary[];
}

// ============================================================================
// 状态效果配置
// ============================================================================

/**
 * 状态效果配置
 */
interface StatusEffectConfig {
  readonly status: BodyPartStatus;
  readonly primaryEffects: string[];
  readonly abilityModifiers: Partial<Record<AbilityType, number>>;
  readonly restrictions?: ActionRestriction[];
}

/**
 * 状态效果映射表
 */
const STATUS_EFFECT_MAP: Record<BodyPartStatus, StatusEffectConfig> = {
  [BodyPartStatus.HEALTHY]: {
    status: BodyPartStatus.HEALTHY,
    primaryEffects: ['无影响'],
    abilityModifiers: {},
  },
  [BodyPartStatus.BRUISED]: {
    status: BodyPartStatus.BRUISED,
    primaryEffects: ['轻微疼痛'],
    abilityModifiers: {
      [AbilityType.DEXTERITY]: -0.05,
    },
  },
  [BodyPartStatus.CUT]: {
    status: BodyPartStatus.CUT,
    primaryEffects: ['出血', '疼痛'],
    abilityModifiers: {
      [AbilityType.DEXTERITY]: -0.1,
      [AbilityType.STRENGTH]: -0.05,
    },
  },
  [BodyPartStatus.BROKEN]: {
    status: BodyPartStatus.BROKEN,
    primaryEffects: ['无法承受重量', '剧烈疼痛'],
    abilityModifiers: {
      [AbilityType.STRENGTH]: -0.5,
      [AbilityType.DEXTERITY]: -0.3,
    },
    restrictions: [ActionRestriction.PRONE],
  },
  [BodyPartStatus.DISLOCATED]: {
    status: BodyPartStatus.DISLOCATED,
    primaryEffects: ['关节脱位', '疼痛'],
    abilityModifiers: {
      [AbilityType.DEXTERITY]: -0.4,
      [AbilityType.STRENGTH]: -0.3,
    },
  },
  [BodyPartStatus.CRIPPLED]: {
    status: BodyPartStatus.CRIPPLED,
    primaryEffects: ['功能丧失'],
    abilityModifiers: {
      [AbilityType.STRENGTH]: -0.7,
      [AbilityType.DEXTERITY]: -0.5,
      [AbilityType.MOVE_SPEED]: -0.3,
    },
    restrictions: [ActionRestriction.PRONE],
  },
  [BodyPartStatus.AMPUTATED]: {
    status: BodyPartStatus.AMPUTATED,
    primaryEffects: ['部位缺失', '永久丧失'],
    abilityModifiers: {
      [AbilityType.STRENGTH]: -0.8,
      [AbilityType.DEXTERITY]: -0.6,
      [AbilityType.MOVE_SPEED]: -0.4,
      [AbilityType.FINE_MANIPULATION]: -0.5,
    },
    restrictions: [
      ActionRestriction.CANNOT_USE_BOTH_HANDS,
      ActionRestriction.PRONE,
    ],
  },
  [BodyPartStatus.DESTROYED]: {
    status: BodyPartStatus.DESTROYED,
    primaryEffects: ['部位毁坏', '功能完全丧失'],
    abilityModifiers: {
      [AbilityType.STRENGTH]: -1.0,
      [AbilityType.DEXTERITY]: -1.0,
      [AbilityType.MOVE_SPEED]: -0.5,
    },
  },
  [BodyPartStatus.INFECTED]: {
    status: BodyPartStatus.INFECTED,
    primaryEffects: ['感染', '持续恶化', '发烧'],
    abilityModifiers: {
      [AbilityType.STRENGTH]: -0.2,
      [AbilityType.DEXTERITY]: -0.15,
      [AbilityType.PERCEPTION]: -0.1,
    },
  },
  [BodyPartStatus.BANDAGED]: {
    status: BodyPartStatus.BANDAGED,
    primaryEffects: ['已包扎', '出血减缓'],
    abilityModifiers: {
      [AbilityType.DEXTERITY]: -0.05,
    },
  },
  [BodyPartStatus.PARALYZED]: {
    status: BodyPartStatus.PARALYZED,
    primaryEffects: ['瘫痪', '无法移动'],
    abilityModifiers: {
      [AbilityType.STRENGTH]: -1.0,
      [AbilityType.DEXTERITY]: -1.0,
      [AbilityType.MOVE_SPEED]: -1.0,
    },
    restrictions: [ActionRestriction.CANNOT_MOVE, ActionRestriction.PRONE],
  },
  [BodyPartStatus.BLISTERS]: {
    status: BodyPartStatus.BLISTERS,
    primaryEffects: ['水泡', '轻微疼痛'],
    abilityModifiers: {
      [AbilityType.DEXTERITY]: -0.1,
    },
  },
  [BodyPartStatus.BITE]: {
    status: BodyPartStatus.BITE,
    primaryEffects: ['咬伤', '出血风险'],
    abilityModifiers: {
      [AbilityType.DEXTERITY]: -0.15,
      [AbilityType.STRENGTH]: -0.1,
    },
  },
  [BodyPartStatus.SCRATCH]: {
    status: BodyPartStatus.SCRATCH,
    primaryEffects: ['抓伤', '轻微出血'],
    abilityModifiers: {},
  },
  [BodyPartStatus.BURN]: {
    status: BodyPartStatus.BURN,
    primaryEffects: ['烧伤', '剧烈疼痛'],
    abilityModifiers: {
      [AbilityType.DEXTERITY]: -0.3,
      [AbilityType.STRENGTH]: -0.2,
      [AbilityType.PERCEPTION]: -0.15,
    },
  },
  [BodyPartStatus.FROSTBITE]: {
    status: BodyPartStatus.FROSTBITE,
    primaryEffects: ['冻伤', '麻木'],
    abilityModifiers: {
      [AbilityType.DEXTERITY]: -0.4,
      [AbilityType.STRENGTH]: -0.3,
      [AbilityType.FINE_MANIPULATION]: -0.5,
    },
  },
  [BodyPartStatus.GRAZE]: {
    status: BodyPartStatus.GRAZE,
    primaryEffects: ['擦伤', '轻微疼痛'],
    abilityModifiers: {},
  },
  [BodyPartStatus.HURT]: {
    status: BodyPartStatus.HURT,
    primaryEffects: ['受伤', '疼痛'],
    abilityModifiers: {
      [AbilityType.DEXTERITY]: -0.1,
      [AbilityType.STRENGTH]: -0.05,
    },
  },
  [BodyPartStatus.BADLY_HURT]: {
    status: BodyPartStatus.BADLY_HURT,
    primaryEffects: ['重伤', '大量出血'],
    abilityModifiers: {
      [AbilityType.STRENGTH]: -0.25,
      [AbilityType.DEXTERITY]: -0.2,
    },
  },
  [BodyPartStatus.HEALING]: {
    status: BodyPartStatus.HEALING,
    primaryEffects: ['恢复中'],
    abilityModifiers: {},
  },
  [BodyPartStatus.BITED]: {
    status: BodyPartStatus.BITED,
    primaryEffects: ['咬伤', '出血风险'],
    abilityModifiers: {
      [AbilityType.DEXTERITY]: -0.15,
      [AbilityType.STRENGTH]: -0.1,
    },
  },
  [BodyPartStatus.CRUSHED]: {
    status: BodyPartStatus.CRUSHED,
    primaryEffects: ['粉碎', '剧烈疼痛', '永久残疾风险'],
    abilityModifiers: {
      [AbilityType.STRENGTH]: -0.8,
      [AbilityType.DEXTERITY]: -0.6,
      [AbilityType.MOVE_SPEED]: -0.4,
    },
    restrictions: [ActionRestriction.PRONE],
  },
  [BodyPartStatus.GANGRENOUS]: {
    status: BodyPartStatus.GANGRENOUS,
    primaryEffects: ['坏疽', '致命感染', '组织坏死'],
    abilityModifiers: {
      [AbilityType.STRENGTH]: -0.5,
      [AbilityType.DEXTERITY]: -0.4,
      [AbilityType.PERCEPTION]: -0.3,
    },
  },
  [BodyPartStatus.SCARRED]: {
    status: BodyPartStatus.SCARRED,
    primaryEffects: ['疤痕', '轻微功能影响'],
    abilityModifiers: {
      [AbilityType.DEXTERITY]: -0.05,
    },
  },
  [BodyPartStatus.NUMB]: {
    status: BodyPartStatus.NUMB,
    primaryEffects: ['麻木', '失去感觉'],
    abilityModifiers: {
      [AbilityType.DEXTERITY]: -0.2,
      [AbilityType.FINE_MANIPULATION]: -0.3,
    },
  },
  [BodyPartStatus.REMOVED]: {
    status: BodyPartStatus.REMOVED,
    primaryEffects: ['手术移除', '永久缺失'],
    abilityModifiers: {
      [AbilityType.STRENGTH]: -0.3,
      [AbilityType.DEXTERITY]: -0.2,
    },
  },
  [BodyPartStatus.SPLINTED]: {
    status: BodyPartStatus.SPLINTED,
    primaryEffects: ['已固定', '恢复中'],
    abilityModifiers: {
      [AbilityType.DEXTERITY]: -0.15,
      [AbilityType.STRENGTH]: -0.1,
    },
  },
  [BodyPartStatus.CASTED]: {
    status: BodyPartStatus.CASTED,
    primaryEffects: ['打石膏', '完全固定'],
    abilityModifiers: {
      [AbilityType.DEXTERITY]: -0.3,
      [AbilityType.STRENGTH]: -0.2,
      [AbilityType.MOVE_SPEED]: -0.1,
    },
    restrictions: [ActionRestriction.CANNOT_USE_BOTH_HANDS],
  },
  [BodyPartStatus.TREATED]: {
    status: BodyPartStatus.TREATED,
    primaryEffects: ['已治疗', '恢复加速'],
    abilityModifiers: {},
  },
  [BodyPartStatus.RECOVERING]: {
    status: BodyPartStatus.RECOVERING,
    primaryEffects: ['康复中', '功能逐渐恢复'],
    abilityModifiers: {
      [AbilityType.DEXTERITY]: -0.1,
      [AbilityType.STRENGTH]: -0.05,
    },
  },
};

// ============================================================================
// BodyPartEffectSystem 类
// ============================================================================

/**
 * 身体部位状态效果系统
 *
 * 计算身体部位状态对角色能力的影响
 */
export class BodyPartEffectSystem {
  /**
   * 评估整体能力影响
   */
  static assessOverallAbilities(
    bodyPartManager: BodyPartManager,
    baseStats: {
      strength: number;
      dexterity: number;
      intelligence: number;
      perception: number;
    }
  ): OverallAbilityAssessment {
    const strength = this.calculateAbilityImpact(
      bodyPartManager,
      AbilityType.STRENGTH,
      baseStats.strength
    );
    const dexterity = this.calculateAbilityImpact(
      bodyPartManager,
      AbilityType.DEXTERITY,
      baseStats.dexterity
    );
    const intelligence = this.calculateAbilityImpact(
      bodyPartManager,
      AbilityType.INTELLIGENCE,
      baseStats.intelligence
    );
    const perception = this.calculateAbilityImpact(
      bodyPartManager,
      AbilityType.PERCEPTION,
      baseStats.perception
    );
    const moveSpeed = this.calculateAbilityImpact(
      bodyPartManager,
      AbilityType.MOVE_SPEED,
      100 // 基准 100%
    );
    const meleeDamage = this.calculateAbilityImpact(
      bodyPartManager,
      AbilityType.MELEE_DAMAGE,
      100 // 基准 100%
    );
    const rangedDamage = this.calculateAbilityImpact(
      bodyPartManager,
      AbilityType.RANGED_DAMAGE,
      100 // 基准 100%
    );
    const carryCapacity = this.calculateAbilityImpact(
      bodyPartManager,
      AbilityType.CARRY_CAPACITY,
      100 // 基准 100%
    );

    const restrictions = this.collectRestrictions(bodyPartManager);
    const statusSummary = this.summarizeStatusEffects(bodyPartManager);

    return {
      strength,
      dexterity,
      intelligence,
      perception,
      moveSpeed,
      meleeDamage,
      rangedDamage,
      carryCapacity,
      restrictions,
      statusSummary,
    };
  }

  /**
   * 计算单个能力的影响
   */
  static calculateAbilityImpact(
    bodyPartManager: BodyPartManager,
    ability: AbilityType,
    baseValue: number
  ): AbilityImpact {
    const modifiers = this.collectAbilityModifiers(bodyPartManager, ability);

    let finalValue = baseValue;
    for (const modifier of modifiers) {
      switch (modifier.type) {
        case 'add':
          finalValue += modifier.value;
          break;
        case 'subtract':
          finalValue -= modifier.value;
          break;
        case 'multiply':
          finalValue *= modifier.value;
          break;
      }
    }

    // 确保非负
    finalValue = Math.max(0, finalValue);

    const totalPenalty = baseValue - finalValue;

    return {
      ability,
      baseValue,
      modifiers,
      finalValue,
      totalPenalty: Math.max(0, totalPenalty),
    };
  }

  /**
   * 收集所有能力修饰符
   */
  private static collectAbilityModifiers(
    bodyPartManager: BodyPartManager,
    ability: AbilityType
  ): AbilityModifier[] {
    const modifiers: AbilityModifier[] = [];
    const parts = bodyPartManager.getAllParts();

    for (const part of parts.values()) {
      // 获取部位的效率
      const efficiency = part.getEfficiency();

      // 根据部位类型和状态添加修饰符
      const partModifiers = this.getPartAbilityModifiers(part, ability, efficiency);
      modifiers.push(...partModifiers);
    }

    // 添加整体影响
    const overallImpact = bodyPartManager.getOverallImpact();
    const overallModifiers = this.getOverallAbilityModifiers(overallImpact, ability);
    modifiers.push(...overallModifiers);

    return modifiers;
  }

  /**
   * 获取部位的能力修饰符
   */
  private static getPartAbilityModifiers(
    part: any,
    ability: AbilityType,
    efficiency: number
  ): AbilityModifier[] {
    const modifiers: AbilityModifier[] = [];

    // 获取状态效果配置
    const statusConfig = STATUS_EFFECT_MAP[part.status as BodyPartStatus];
    if (!statusConfig) {
      return modifiers;
    }

    // 获取状态配置中的修饰符
    const statusModifier = statusConfig.abilityModifiers[ability];
    if (statusModifier !== undefined) {
      // 始终应用状态修饰符，根据效率调整
      // 基础修饰符值 * (效率 + (1-效率)/2) = 状态影响的 50% 到 100%
      const efficiencyFactor = 0.5 + efficiency * 0.5;
      const modifierValue = Math.abs(statusModifier) * efficiencyFactor;

      modifiers.push({
        ability,
        type: statusModifier < 0 ? 'subtract' : 'add',
        value: modifierValue,
        source: `${part.name} (${part.status})`,
      });
    }

    // 根据部位类型添加特殊修饰符
    const typeSpecificModifiers = this.getTypeSpecificModifiers(part, ability, efficiency);
    modifiers.push(...typeSpecificModifiers);

    return modifiers;
  }

  /**
   * 获取部位类型特定的修饰符
   */
  private static getTypeSpecificModifiers(
    part: any,
    ability: AbilityType,
    efficiency: number
  ): AbilityModifier[] {
    const modifiers: AbilityModifier[] = [];
    const partType = part.type;
    const penalty = 1 - efficiency;

    // 手臂影响力量和精细操作
    if (partType === BodyPartType.ARM || partType === BodyPartType.HAND) {
      if (ability === AbilityType.STRENGTH && penalty > 0) {
        modifiers.push({
          ability: AbilityType.STRENGTH,
          type: 'subtract',
          value: penalty * 0.3, // 手臂影响 30% 力量
          source: `${part.name} 效率降低`,
        });
      }
      if (ability === AbilityType.FINE_MANIPULATION && penalty > 0) {
        modifiers.push({
          ability: AbilityType.FINE_MANIPULATION,
          type: 'subtract',
          value: penalty * 0.5,
          source: `${part.name} 受伤`,
        });
      }
    }

    // 腿部影响移动速度
    if (partType === BodyPartType.LEG || partType === BodyPartType.FOOT) {
      if (ability === AbilityType.MOVE_SPEED && penalty > 0) {
        modifiers.push({
          ability: AbilityType.MOVE_SPEED,
          type: 'multiply',
          value: 1 - penalty * 0.5, // 腿部影响移动速度
          source: `${part.name} 受伤`,
        });
      }
    }

    // 头部/传感器影响感知
    if (partType === BodyPartType.HEAD || partType === BodyPartType.SENSOR) {
      if (ability === AbilityType.PERCEPTION && penalty > 0) {
        modifiers.push({
          ability: AbilityType.PERCEPTION,
          type: 'subtract',
          value: penalty * 0.4,
          source: `${part.name} 受伤`,
        });
      }
    }

    // 躯干影响负重和战斗能力
    if (partType === BodyPartType.TORSO) {
      if (ability === AbilityType.CARRY_CAPACITY && penalty > 0) {
        modifiers.push({
          ability: AbilityType.CARRY_CAPACITY,
          type: 'multiply',
          value: 1 - penalty * 0.3,
          source: `${part.name} 受伤`,
        });
      }
      if (ability === AbilityType.MELEE_DAMAGE && penalty > 0) {
        modifiers.push({
          ability: AbilityType.MELEE_DAMAGE,
          type: 'subtract',
          value: penalty * 0.2,
          source: `${part.name} 受伤`,
        });
      }
    }

    return modifiers;
  }

  /**
   * 获取整体能力修饰符
   */
  private static getOverallAbilityModifiers(
    impact: any,
    ability: AbilityType
  ): AbilityModifier[] {
    const modifiers: AbilityModifier[] = [];

    // 根据整体影响添加修饰符
    switch (ability) {
      case AbilityType.MOVE_SPEED:
        if (impact.speedModifier < 1) {
          modifiers.push({
            ability: AbilityType.MOVE_SPEED,
            type: 'multiply',
            value: impact.speedModifier,
            source: '整体移动影响',
          });
        }
        break;
      case AbilityType.DEXTERITY:
        if (impact.dexterityModifier < 1) {
          modifiers.push({
            ability: AbilityType.DEXTERITY,
            type: 'multiply',
            value: impact.dexterityModifier,
            source: '整体敏捷影响',
          });
        }
        break;
      case AbilityType.PERCEPTION:
        if (impact.perceptionModifier < 1) {
          modifiers.push({
            ability: AbilityType.PERCEPTION,
            type: 'multiply',
            value: impact.perceptionModifier,
            source: '整体感知影响',
          });
        }
        break;
      case AbilityType.CARRY_CAPACITY:
        if (impact.carryModifier < 1) {
          modifiers.push({
            ability: AbilityType.CARRY_CAPACITY,
            type: 'multiply',
            value: impact.carryModifier,
            source: '整体负重影响',
          });
        }
        break;
      case AbilityType.MELEE_DAMAGE:
      case AbilityType.RANGED_DAMAGE:
        if (impact.combatModifier < 1) {
          modifiers.push({
            ability,
            type: 'multiply',
            value: impact.combatModifier,
            source: '整体战斗影响',
          });
        }
        break;
    }

    return modifiers;
  }

  /**
   * 收集所有行为限制
   */
  static collectRestrictions(bodyPartManager: BodyPartManager): ActionRestriction[] {
    const restrictions: ActionRestriction[] = [];
    const impact = bodyPartManager.getOverallImpact();
    const parts = bodyPartManager.getAllParts();

    // 从整体影响中收集限制
    if (!impact.canMove) {
      restrictions.push(ActionRestriction.CANNOT_MOVE);
    }
    if (!impact.canUseBothHands) {
      restrictions.push(ActionRestriction.CANNOT_USE_BOTH_HANDS);
    }
    if (!impact.canDoFineWork) {
      restrictions.push(ActionRestriction.CANNOT_FINE_MANIPULATION);
    }

    // 从各个部位的状态中收集限制
    for (const part of parts.values()) {
      const statusConfig = STATUS_EFFECT_MAP[part.status];
      if (statusConfig?.restrictions) {
        restrictions.push(...statusConfig.restrictions);
      }

      // 检查双手状态
      if (part.type === BodyPartType.HAND || part.type === BodyPartType.ARM) {
        if (!part.isFunctional()) {
          if (part.id === BodyPartId.ARM_L || part.id === BodyPartId.HAND_L) {
            restrictions.push(ActionRestriction.CANNOT_USE_LEFT_HAND);
          } else if (part.id === BodyPartId.ARM_R || part.id === BodyPartId.HAND_R) {
            restrictions.push(ActionRestriction.CANNOT_USE_RIGHT_HAND);
          }
        }
      }

      // 检查嘴巴状态（影响语音）
      if (part.type === BodyPartType.MOUTH && !part.isFunctional()) {
        restrictions.push(ActionRestriction.CANNOT_SPEAK);
      }
    }

    // 检查双腿是否都无法功能（导致无法移动）
    const leftLeg = bodyPartManager.getPart(BodyPartId.LEG_L);
    const rightLeg = bodyPartManager.getPart(BodyPartId.LEG_R);
    const leftLegFunctional = leftLeg?.isFunctional() ?? true;
    const rightLegFunctional = rightLeg?.isFunctional() ?? true;

    if (!leftLegFunctional && !rightLegFunctional) {
      restrictions.push(ActionRestriction.CANNOT_MOVE);
    }

    // 去重
    return Array.from(new Set(restrictions));
  }

  /**
   * 汇总状态效果
   */
  static summarizeStatusEffects(bodyPartManager: BodyPartManager): StatusEffectSummary[] {
    const summaryMap = new Map<BodyPartStatus, {
      count: number;
      parts: BodyPartId[];
    }>();

    const parts = bodyPartManager.getAllParts();
    for (const part of parts.values()) {
      let entry = summaryMap.get(part.status);
      if (!entry) {
        entry = { count: 0, parts: [] };
        summaryMap.set(part.status, entry);
      }
      entry.count++;
      entry.parts.push(part.id);
    }

    return Array.from(summaryMap.entries()).map(([status, data]) => {
      const config = STATUS_EFFECT_MAP[status];
      return {
        status,
        count: data.count,
        parts: data.parts,
        primaryEffects: config?.primaryEffects || [],
      };
    }).sort((a, b) => b.count - a.count); // 按数量降序排序
  }

  /**
   * 检查是否可以执行某个动作
   */
  static canPerformAction(
    bodyPartManager: BodyPartManager,
    restriction: ActionRestriction
  ): boolean {
    const restrictions = this.collectRestrictions(bodyPartManager);
    return !restrictions.includes(restriction);
  }

  /**
   * 获取能力描述文本
   */
  static getAbilityDescription(impact: AbilityImpact): string {
    const penalty = impact.totalPenalty;
    const percent = (penalty / impact.baseValue) * 100;

    if (percent <= 0) {
      return '正常';
    } else if (percent < 10) {
      return '轻微影响';
    } else if (percent < 25) {
      return '中度影响';
    } else if (percent < 50) {
      return '严重影响';
    } else {
      return '极度影响';
    }
  }
}
