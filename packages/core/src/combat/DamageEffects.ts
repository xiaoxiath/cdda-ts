/**
 * DamageEffects - 伤害效果系统
 *
 * 参考 Cataclysm-DDA 的 effect 和伤害相关状态效果
 * 处理伤害带来的各种持续效果和状态异常
 */

import { List, Map } from 'immutable';
import type {
  DamageTypeId,
  EffectTypeId,
  BodyPartId,
  Multiplier,
} from './types';
import { createEffectTypeId, createBodyPartId } from './types';

// ============================================================================
// 伤害效果类型
// ============================================================================

/**
 * 伤害效果类型枚举
 */
export enum DamageEffectType {
  // 物理/直接效果
  BLEEDING = 'BLEEDING',         // 流血
  BRUISING = 'BRUISING',         // 瘀伤
  WOUNDED = 'WOUNDED',           // 创伤
  BROKEN = 'BROKEN',             // 骨折
  CUT = 'CUT',                   // 切割
  BITE = 'BITE',                 // 咬伤

  // 元素效果
  BURNING = 'BURNING',           // 燃烧
  FROZEN = 'FROZEN',             // 冻结
  SHOCKED = 'SHOCKED',           // 电击
  ACID_BURN = 'ACID_BURN',       // 酸灼

  // 状态异常
  POISONED = 'POISONED',         // 中毒
  INFECTED = 'INFECTED',         // 感染
  RADIATION = 'RADIATION',       // 辐射
  BLINDED = 'BLINDED',           // 致盲
  DEAFENED = 'DEAFENED',         // 失聪
  STUNNED = 'STUNNED',           // 眩晕
  KNOCKED_DOWN = 'KNOCKED_DOWN', // 倒地

  // 移动/行动受限
  IMMOBILIZED = 'IMMOBILIZED',   // 无法移动
  DISARMED = 'DISARMED',         // 缴械
  SLOWED = 'SLOWED',             // 减速
  HASTED = 'HASTED',             // 加速

  // 心理效果
  AFRAID = 'AFRAID',             // 恐惧
  ENRAGED = 'ENRAGED',           // 激怒
  PACIFIED = 'PACIFIED',         // 平静
  STIMULATED = 'STIMULATED',     // 兴奋

  // 特殊效果
  ON_FIRE = 'ON_FIRE',           // 着火
  WET = 'WET',                   // 湿润
  COVERED = 'COVERED',           // 覆盖（如泥浆、血液）
}

// ============================================================================
// 效果强度等级
// ============================================================================

/**
 * 效果强度
 */
export enum EffectIntensity {
  NONE = 0,      // 无效果
  LIGHT = 1,     // 轻度
  MODERATE = 2,  // 中度
  SEVERE = 3,    // 重度
  CRITICAL = 4,  // 危急
}

// ============================================================================
// 伤害效果数据
// ============================================================================

/**
 * 效果应用条件
 */
export interface EffectCondition {
  /** 伤害类型 */
  damageType?: DamageTypeId;
  /** 最小伤害阈值 */
  minDamage?: number;
  /** 最大伤害阈值 */
  maxDamage?: number;
  /** 命中部位 */
  targetBodyPart?: BodyPartId;
  /** 条件函数 */
  customCondition?: (context: DamageEffectContext) => boolean;
}

/**
 * 效果持续时间
 */
export interface EffectDuration {
  /** 基础持续时间（回合数） */
  baseDuration: number;
  /** 随强度变化的额外时间 */
  durationPerIntensity: number;
  /** 最大持续时间 */
  maxDuration?: number;
}

/**
 * 伤害效果定义
 */
export interface DamageEffectDef {
  /** 效果ID */
  id: EffectTypeId;
  /** 效果类型 */
  type: DamageEffectType;
  /** 效果名称 */
  name: string;
  /** 效果描述 */
  description: string;
  /** 应用条件 */
  condition: EffectCondition;
  /** 持续时间 */
  duration: EffectDuration;
  /** 每回合伤害 */
  damagePerTurn?: number;
  /** 属性惩罚 */
  statPenalties?: Map<string, number>;
  /** 是否可叠加 */
  stackable: boolean;
  /** 是否可移除 */
  removable: boolean;
}

/**
 * 伤害效果上下文
 */
export interface DamageEffectContext {
  /** 伤害类型 */
  damageType: DamageTypeId;
  /** 造成伤害量 */
  damageAmount: number;
  /** 命中部位 */
  bodyPart: BodyPartId | null;
  /** 是否暴击 */
  critical: boolean;
  /** 伤害源 */
  source?: any;
  /** 伤害目标 */
  target?: any;
}

/**
 * 活跃效果状态
 */
export interface ActiveEffect {
  /** 效果定义 */
  def: DamageEffectDef;
  /** 当前强度 */
  intensity: EffectIntensity;
  /** 剩余持续时间 */
  remainingDuration: number;
  /** 应用部位 */
  bodyPart: BodyPartId | null;
  /** 叠加层数 */
  stacks: number;
}

// ============================================================================
// DamageEffectsRegistry 类
// ============================================================================

/**
 * DamageEffectsRegistry - 伤害效果注册表
 *
 * 管理所有伤害效果的定义
 */
export class DamageEffectsRegistry {
  private static effects: Map<EffectTypeId, DamageEffectDef> = Map();

  /**
   * 注册效果
   */
  static register(effect: DamageEffectDef): void {
    DamageEffectsRegistry.effects = DamageEffectsRegistry.effects.set(effect.id, effect);
  }

  /**
   * 获取效果定义
   */
  static get(id: EffectTypeId): DamageEffectDef | undefined {
    return DamageEffectsRegistry.effects.get(id);
  }

  /**
   * 获取所有效果
   */
  static getAll(): Map<EffectTypeId, DamageEffectDef> {
    return DamageEffectsRegistry.effects;
  }

  /**
   * 检查效果是否应该触发
   */
  static shouldTrigger(
    effect: DamageEffectDef,
    context: DamageEffectContext
  ): boolean {
    const { condition } = effect;

    // 检查伤害类型
    if (condition.damageType && context.damageType !== condition.damageType) {
      return false;
    }

    // 检查伤害阈值
    if (condition.minDamage !== undefined && context.damageAmount < condition.minDamage) {
      return false;
    }
    if (condition.maxDamage !== undefined && context.damageAmount > condition.maxDamage) {
      return false;
    }

    // 检查命中部位
    if (condition.targetBodyPart && context.bodyPart !== condition.targetBodyPart) {
      return false;
    }

    // 检查自定义条件
    if (condition.customCondition && !condition.customCondition(context)) {
      return false;
    }

    return true;
  }

  /**
   * 计算效果持续时间
   */
  static calculateDuration(
    effect: DamageEffectDef,
    intensity: EffectIntensity
  ): number {
    const base = effect.duration.baseDuration;
    const perIntensity = effect.duration.durationPerIntensity;
    let duration = base + (intensity * perIntensity);

    if (effect.duration.maxDuration) {
      duration = Math.min(duration, effect.duration.maxDuration);
    }

    return Math.max(1, Math.floor(duration));
  }
}

// ============================================================================
// DamageEffectsManager 类
// ============================================================================

/**
 * DamageEffectsManager - 伤害效果管理器
 *
 * 管理生物身上的活跃伤害效果
 */
export class DamageEffectsManager {
  private readonly activeEffects: List<ActiveEffect>;

  constructor(activeEffects: List<ActiveEffect> = List()) {
    this.activeEffects = activeEffects;
  }

  /**
   * 创建空管理器
   */
  static create(): DamageEffectsManager {
    return new DamageEffectsManager(List());
  }

  /**
   * 应用效果
   */
  applyEffect(
    effectDef: DamageEffectDef,
    intensity: EffectIntensity,
    bodyPart: BodyPartId | null = null
  ): DamageEffectsManager {
    const duration = DamageEffectsRegistry.calculateDuration(effectDef, intensity);

    const newEffect: ActiveEffect = {
      def: effectDef,
      intensity,
      remainingDuration: duration,
      bodyPart,
      stacks: 1,
    };

    // 如果效果可叠加，查找现有效果
    if (effectDef.stackable) {
      const existingIndex = this.activeEffects.findIndex(
        e => e.def.id === effectDef.id && e.bodyPart === bodyPart
      );

      if (existingIndex >= 0) {
        const existing = this.activeEffects.get(existingIndex)!;
        const stacked = {
          ...existing,
          stacks: existing.stacks + 1,
          intensity: Math.max(existing.intensity, intensity),
          remainingDuration: Math.max(existing.remainingDuration, duration),
        };
        return new DamageEffectsManager(
          this.activeEffects.set(existingIndex, stacked)
        );
      }
    }

    return new DamageEffectsManager(this.activeEffects.push(newEffect));
  }

  /**
   * 移除效果
   */
  removeEffect(effectId: EffectTypeId): DamageEffectsManager {
    return new DamageEffectsManager(
      this.activeEffects.filter(e => e.def.id !== effectId)
    );
  }

  /**
   * 处理回合更新
   */
  processTurn(): { manager: DamageEffectsManager; damage: number; effectsToRemove: EffectTypeId[] } {
    const effectsToRemove: EffectTypeId[] = [];
    let totalDamage = 0;
    const updatedEffects: ActiveEffect[] = [];

    for (const effect of this.activeEffects) {
      const newDuration = effect.remainingDuration - 1;

      // 计算持续伤害
      if (effect.def.damagePerTurn) {
        const damage = effect.def.damagePerTurn * effect.stacks * (effect.intensity + 1);
        totalDamage += damage;
      }

      if (newDuration <= 0) {
        effectsToRemove.push(effect.def.id);
      } else {
        updatedEffects.push({ ...effect, remainingDuration: newDuration });
      }
    }

    return {
      manager: new DamageEffectsManager(List(updatedEffects)),
      damage: totalDamage,
      effectsToRemove,
    };
  }

  /**
   * 获取指定部位的效果
   */
  getEffectsForBodyPart(bodyPart: BodyPartId): List<ActiveEffect> {
    return List(this.activeEffects.filter(e => e.bodyPart === bodyPart));
  }

  /**
   * 获取指定类型的所有效果
   */
  getEffectsByType(type: DamageEffectType): List<ActiveEffect> {
    return List(this.activeEffects.filter(e => e.def.type === type));
  }

  /**
   * 检查是否有指定效果
   */
  hasEffect(effectId: EffectTypeId): boolean {
    return this.activeEffects.some(e => e.def.id === effectId);
  }

  /**
   * 检查部位是否被致残
   */
  isBodyPartDisabled(bodyPart: BodyPartId): boolean {
    const effects = this.getEffectsForBodyPart(bodyPart);
    return effects.some(e =>
      e.def.type === DamageEffectType.BROKEN ||
      e.def.type === DamageEffectType.WOUNDED && e.intensity >= EffectIntensity.SEVERE
    );
  }

  /**
   * 获取所有活跃效果
   */
  getAllEffects(): List<ActiveEffect> {
    return this.activeEffects;
  }

  /**
   * 计算总属性惩罚
   */
  getTotalStatPenalty(stat: string): number {
    let total = 0;
    for (const effect of this.activeEffects) {
      if (effect.def.statPenalties) {
        total += effect.def.statPenalties.get(stat) ?? 0;
      }
    }
    return total;
  }
}

// ============================================================================
// 内置伤害效果定义
// ============================================================================

/**
 * 流血效果
 */
export const BLEEDING_EFFECT: DamageEffectDef = {
  id: createEffectTypeId('bleeding'),
  type: DamageEffectType.BLEEDING,
  name: '流血',
  description: '每回合失去HP',
  condition: {
    damageType: 'CUT' as DamageTypeId,
    minDamage: 5,
  },
  duration: {
    baseDuration: 5,
    durationPerIntensity: 3,
  },
  damagePerTurn: 1,
  statPenalties: Map({ str: -1, dex: -1 }),
  stackable: true,
  removable: true,
};

/**
 * 燃烧效果
 */
export const BURNING_EFFECT: DamageEffectDef = {
  id: createEffectTypeId('burning'),
  type: DamageEffectType.BURNING,
  name: '燃烧',
  description: '持续受到火焰伤害',
  condition: {
    damageType: 'HEAT' as DamageTypeId,
    minDamage: 10,
  },
  duration: {
    baseDuration: 3,
    durationPerIntensity: 2,
    maxDuration: 10,
  },
  damagePerTurn: 3,
  statPenalties: Map({ str: -2, dex: -2 }),
  stackable: false,
  removable: true,
};

/**
 * 中毒效果
 */
export const POISONED_EFFECT: DamageEffectDef = {
  id: createEffectTypeId('poisoned'),
  type: DamageEffectType.POISONED,
  name: '中毒',
  description: '持续受到毒素伤害',
  condition: {
    damageType: 'BIOLOGICAL' as DamageTypeId,
    minDamage: 3,
  },
  duration: {
    baseDuration: 10,
    durationPerIntensity: 5,
  },
  damagePerTurn: 2,
  statPenalties: Map({ str: -2, per: -1 }),
  stackable: true,
  removable: true,
};

/**
 * 眩晕效果
 */
export const STUNNED_EFFECT: DamageEffectDef = {
  id: createEffectTypeId('stunned'),
  type: DamageEffectType.STUNNED,
  name: '眩晕',
  description: '无法行动',
  condition: {
    minDamage: 15,
    customCondition: (ctx) => ctx.critical || ctx.damageAmount > 20,
  },
  duration: {
    baseDuration: 1,
    durationPerIntensity: 1,
    maxDuration: 3,
  },
  statPenalties: Map({ dex: -5 }),
  stackable: false,
  removable: false,
};

/**
 * 倒地效果
 */
export const KNOCKED_DOWN_EFFECT: DamageEffectDef = {
  id: createEffectTypeId('knocked_down'),
  type: DamageEffectType.KNOCKED_DOWN,
  name: '倒地',
  description: '倒在地上，需要时间起身',
  condition: {
    minDamage: 20,
    customCondition: (ctx) => ctx.damageAmount > 25,
  },
  duration: {
    baseDuration: 2,
    durationPerIntensity: 1,
  },
  statPenalties: Map({ dex: -3 }),
  stackable: false,
  removable: false,
};

/**
 * 骨折效果
 */
export const BROKEN_EFFECT: DamageEffectDef = {
  id: createEffectTypeId('broken'),
  type: DamageEffectType.BROKEN,
  name: '骨折',
  description: '部位无法使用',
  condition: {
    damageType: 'BASH' as DamageTypeId,
    minDamage: 20,
  },
  duration: {
    baseDuration: 50,
    durationPerIntensity: 20,
  },
  statPenalties: Map({ str: -3, dex: -3 }),
  stackable: false,
  removable: false,
};

/**
 * 冻结效果
 */
export const FROZEN_EFFECT: DamageEffectDef = {
  id: createEffectTypeId('frozen'),
  type: DamageEffectType.FROZEN,
  name: '冻结',
  description: '无法移动，持续受到寒冷伤害',
  condition: {
    damageType: 'COLD' as DamageTypeId,
    minDamage: 15,
  },
  duration: {
    baseDuration: 3,
    durationPerIntensity: 2,
  },
  damagePerTurn: 1,
  statPenalties: Map({ str: -3, dex: -3 }),
  stackable: false,
  removable: true,
};

/**
 * 感染效果
 */
export const INFECTED_EFFECT: DamageEffectDef = {
  id: createEffectTypeId('infected'),
  type: DamageEffectType.INFECTED,
  name: '感染',
  description: '伤口感染，持续伤害',
  condition: {
    minDamage: 10,
    customCondition: (ctx) => ctx.damageType === 'CUT' || ctx.damageType === 'STAB',
  },
  duration: {
    baseDuration: 20,
    durationPerIntensity: 10,
  },
  damagePerTurn: 1,
  statPenalties: Map({ str: -1, per: -1 }),
  stackable: false,
  removable: true,
};

/**
 * 初始化内置效果
 */
export function initializeBuiltinEffects(): void {
  DamageEffectsRegistry.register(BLEEDING_EFFECT);
  DamageEffectsRegistry.register(BURNING_EFFECT);
  DamageEffectsRegistry.register(POISONED_EFFECT);
  DamageEffectsRegistry.register(STUNNED_EFFECT);
  DamageEffectsRegistry.register(KNOCKED_DOWN_EFFECT);
  DamageEffectsRegistry.register(BROKEN_EFFECT);
  DamageEffectsRegistry.register(FROZEN_EFFECT);
  DamageEffectsRegistry.register(INFECTED_EFFECT);
}
