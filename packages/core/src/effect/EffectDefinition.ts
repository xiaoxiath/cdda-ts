/**
 * EffectDefinition - 效果定义类
 *
 * 参考 Cataclysm-DDA 的 effect_type 结构
 * 定义效果的静态属性
 */

import { List, Map } from 'immutable';
import type { EffectTypeId, BodyPartIntensityMap } from './types';
import type { BodyPartId } from '../combat/types';
import {
  EffectCategory,
  EffectIntensity,
  EffectDurationType,
  EffectApplyMode,
  EffectModifierType,
  IntensityDecayType,
} from './types';
import type {
  EffectDefinitionProps,
  EffectModifier,
  IntensityChangeTrigger,
} from './types';

/**
 * EffectDefinition - 效果定义类
 *
 * 使用不可变数据结构
 */
export class EffectDefinition {
  readonly id!: EffectTypeId;
  readonly name!: string;
  readonly description!: string;
  readonly category!: EffectCategory;
  readonly intensity!: EffectIntensity;
  readonly durationType!: EffectDurationType;
  readonly applyMode!: EffectApplyMode;
  readonly cancelable!: boolean;
  readonly stackable!: boolean;
  readonly maxStacks!: number;
  readonly modifiers!: List<EffectModifier>;
  readonly tickInterval!: number;
  readonly resistances!: List<EffectTypeId>;
  readonly visible!: boolean;
  readonly messageStart!: string;
  readonly messageEnd!: string;
  readonly messageTick!: string;
  // ========== 身体部位支持 ==========
  readonly bpAffected!: BodyPartIntensityMap;
  readonly isLocal!: boolean;
  // ========== 强度衰减 ==========
  readonly intDecay!: IntensityDecayType;
  readonly intDecayRate!: number;
  readonly intChangeTriggers!: List<IntensityChangeTrigger>;
  // ========== 效果交互 ==========
  readonly reducesDuration!: Map<EffectTypeId, number>;
  readonly effectImmunities!: List<EffectTypeId>;
  // ========== Kill 机制 ==========
  readonly canKill!: boolean;
  readonly killMessage!: string;

  private constructor(props: EffectDefinitionProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description ?? '';
    this.category = props.category;
    this.intensity = props.intensity ?? EffectIntensity.MODERATE;
    this.durationType = props.durationType ?? EffectDurationType.MEDIUM;
    this.applyMode = props.applyMode ?? EffectApplyMode.IMMEDIATE;
    this.cancelable = props.cancelable ?? true;
    this.stackable = props.stackable ?? false;
    this.maxStacks = props.maxStacks ?? 1;
    this.modifiers = List(props.modifiers ?? []);
    this.tickInterval = props.tickInterval ?? 1000;
    this.resistances = List(props.resistances ?? []);
    this.visible = props.visible ?? true;
    this.messageStart = props.messageStart ?? '';
    this.messageEnd = props.messageEnd ?? '';
    this.messageTick = props.messageTick ?? '';
    // ========== 身体部位支持 ==========
    this.bpAffected = props.bpAffected ?? Map<BodyPartId, number>();
    this.isLocal = props.isLocal ?? false;
    // ========== 强度衰减 ==========
    this.intDecay = props.intDecay ?? IntensityDecayType.NONE;
    this.intDecayRate = props.intDecayRate ?? 0;
    this.intChangeTriggers = List(props.intChangeTriggers ?? []);
    // ========== 效果交互 ==========
    this.reducesDuration = props.reducesDuration ?? Map<EffectTypeId, number>();
    this.effectImmunities = List(props.effectImmunities ?? []);
    // ========== Kill 机制 ==========
    this.canKill = props.canKill ?? false;
    this.killMessage = props.killMessage ?? '';

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建效果定义
   */
  static create(props: EffectDefinitionProps): EffectDefinition {
    return new EffectDefinition(props);
  }

  /**
   * 创建增益效果
   */
  static buff(
    id: EffectTypeId,
    name: string,
    description: string = '',
    modifiers?: EffectModifier[]
  ): EffectDefinition {
    return new EffectDefinition({
      id,
      name,
      description: description ?? '',
      category: EffectCategory.BUFF,
      intensity: EffectIntensity.MINOR,
      modifiers,
    });
  }

  /**
   * 创建减益效果
   */
  static debuff(
    id: EffectTypeId,
    name: string,
    description: string = '',
    modifiers?: EffectModifier[]
  ): EffectDefinition {
    return new EffectDefinition({
      id,
      name,
      description: description ?? '',
      category: EffectCategory.DEBUFF,
      intensity: EffectIntensity.MODERATE,
      modifiers,
    });
  }

  /**
   * 创建中毒效果
   */
  static poison(
    id: EffectTypeId,
    name: string,
    description: string = '你中毒了！',
    damagePerTick: number = 1
  ): EffectDefinition {
    return new EffectDefinition({
      id,
      name,
      description: description ?? '你中毒了！',
      category: EffectCategory.POISON,
      intensity: EffectIntensity.MODERATE,
      applyMode: EffectApplyMode.PERIODIC,
      tickInterval: 5000,
      stackable: true,
      maxStacks: 5,
      modifiers: [
        { type: EffectModifierType.STAT_ADD, target: 'health', value: -damagePerTick },
      ],
    });
  }

  /**
   * 创建再生效果
   */
  static regen(
    id: EffectTypeId,
    name: string,
    description: string = '伤口正在愈合...',
    healPerTick: number = 1
  ): EffectDefinition {
    return new EffectDefinition({
      id,
      name,
      description: description ?? '伤口正在愈合...',
      category: EffectCategory.REGEN,
      intensity: EffectIntensity.MINOR,
      applyMode: EffectApplyMode.PERIODIC,
      tickInterval: 3000,
      modifiers: [
        { type: EffectModifierType.STAT_ADD, target: 'health', value: healPerTick },
      ],
    });
  }

  /**
   * 创建眩晕效果
   */
  static stun(
    id: EffectTypeId,
    name: string,
    description: string = '你头晕目眩，无法行动！'
  ): EffectDefinition {
    return new EffectDefinition({
      id,
      name,
      description: description ?? '你头晕目眩，无法行动！',
      category: EffectCategory.STUN,
      intensity: EffectIntensity.SEVERE,
      cancelable: false,
    });
  }

  /**
   * 创建疲劳效果
   */
  static fatigue(
    id: EffectTypeId,
    name: string,
    description: string = '你感到非常疲惫',
    speedPenalty: number = 0.1
  ): EffectDefinition {
    return new EffectDefinition({
      id,
      name,
      description: description ?? '你感到非常疲惫',
      category: EffectCategory.FATIGUE,
      intensity: EffectIntensity.MODERATE,
      stackable: true,
      maxStacks: 3,
      modifiers: [
        { type: EffectModifierType.SPEED_MULTIPLY, target: 'all', value: -speedPenalty },
      ],
    });
  }

  /**
   * 创建局部效果（影响特定身体部位）
   */
  static local(
    id: EffectTypeId,
    name: string,
    description: string,
    category: EffectCategory,
    bpAffected: BodyPartIntensityMap
  ): EffectDefinition {
    return new EffectDefinition({
      id,
      name,
      description,
      category,
      intensity: EffectIntensity.MODERATE,
      bpAffected,
      isLocal: true,
    });
  }

  /**
   * 创建身体部位疼痛效果
   */
  static bodyPartPain(
    id: EffectTypeId,
    bodyPart: BodyPartId,
    painLevel: number = 1
  ): EffectDefinition {
    const bpMap = Map<BodyPartId, number>([[bodyPart, painLevel]]);
    return new EffectDefinition({
      id,
      name: `${bodyPart} 疼痛`,
      description: `你的 ${bodyPart} 感到疼痛`,
      category: EffectCategory.PAIN,
      intensity: EffectIntensity.MODERATE,
      bpAffected: bpMap,
      isLocal: true,
      modifiers: [
        { type: EffectModifierType.STAT_MULTIPLY, target: 'pain', value: painLevel },
      ],
    });
  }

  // ========== 类型检查方法 ==========

  /**
   * 是否为增益效果
   */
  isBuff(): boolean {
    return this.category === EffectCategory.BUFF || this.category === EffectCategory.REGEN || this.category === EffectCategory.HEAL;
  }

  /**
   * 是否为减益效果
   */
  isDebuff(): boolean {
    return this.category === EffectCategory.DEBUFF ||
           this.category === EffectCategory.POISON ||
           this.category === EffectCategory.DISEASE ||
           this.category === EffectCategory.STUN ||
           this.category === EffectCategory.FATIGUE;
  }

  /**
   * 是否可堆叠
   */
  canStack(): boolean {
    return this.stackable;
  }

  /**
   * 是否可取消
   */
  canCancel(): boolean {
    return this.cancelable;
  }

  /**
   * 是否为周期性效果
   */
  isPeriodic(): boolean {
    return this.applyMode === EffectApplyMode.PERIODIC;
  }

  /**
   * 是否为永久效果
   */
  isPermanent(): boolean {
    return this.durationType === EffectDurationType.PERMANENT;
  }

  // ========== 计算方法 ==========

  /**
   * 获取默认持续时间（毫秒）
   */
  getDefaultDuration(): number {
    switch (this.durationType) {
      case EffectDurationType.INSTANT:
        return 0;
      case EffectDurationType.SHORT:
        return 10000; // 10 秒
      case EffectDurationType.MEDIUM:
        return 60000; // 1 分钟
      case EffectDurationType.LONG:
        return 300000; // 5 分钟
      case EffectDurationType.PERMANENT:
        return Infinity;
      default:
        return 60000;
    }
  }

  /**
   * 计算修饰符总值
   */
  getModifierValue(target: string): number {
    return this.modifiers
      .filter(m => m.target === target)
      .reduce((sum, m) => sum + m.value, 0);
  }

  /**
   * 检查是否抵抗某效果
   */
  hasResistance(effectId: EffectTypeId): boolean {
    return this.resistances.includes(effectId);
  }

  // ========== 身体部位方法 ==========

  /**
   * 是否为局部效果
   */
  isLocalEffect(): boolean {
    return this.isLocal;
  }

  /**
   * 获取受影响的身体部位列表
   */
  getAffectedBodyParts(): List<BodyPartId> {
    return List(this.bpAffected.keys());
  }

  /**
   * 检查是否影响指定身体部位
   */
  affectsBodyPart(bodyPart: BodyPartId): boolean {
    return this.bpAffected.has(bodyPart);
  }

  /**
   * 获取身体部位强度
   */
  getBodyPartIntensity(bodyPart: BodyPartId): number {
    return this.bpAffected.get(bodyPart) ?? 0;
  }

  // ========== 强度衰减方法 ==========

  /**
   * 是否有强度衰减
   */
  hasIntensityDecay(): boolean {
    return this.intDecay !== IntensityDecayType.NONE;
  }

  /**
   * 获取衰减后的强度
   */
  getDecayedIntensity(elapsedTime: number): EffectIntensity {
    if (!this.hasIntensityDecay()) {
      return this.intensity;
    }

    const decayMinutes = elapsedTime / 60000;
    const decayedValue = this.intDecayRate * decayMinutes;

    // 根据衰减类型计算
    switch (this.intDecay) {
      case IntensityDecayType.LINEAR:
        return this.calculateLinearDecay(decayedValue);
      case IntensityDecayType.EXPONENTIAL:
        return this.calculateExponentialDecay(decayMinutes);
      case IntensityDecayType.STEP:
        return this.calculateStepDecay(decayMinutes);
      default:
        return this.intensity;
    }
  }

  private calculateLinearDecay(decayedValue: number): EffectIntensity {
    const intensityValues = {
      [EffectIntensity.DEADLY]: 4,
      [EffectIntensity.SEVERE]: 3,
      [EffectIntensity.MODERATE]: 2,
      [EffectIntensity.MINOR]: 1,
    };
    const current = intensityValues[this.intensity] - Math.floor(decayedValue);
    if (current <= 1) return EffectIntensity.MINOR;
    if (current >= 4) return EffectIntensity.DEADLY;
    return Object.entries(intensityValues).find(([_, v]) => v === current)?.[0] as EffectIntensity
      ?? EffectIntensity.MINOR;
  }

  private calculateExponentialDecay(minutes: number): EffectIntensity {
    const halfLife = 5; // 5 分钟半衰期
    const factor = Math.pow(0.5, minutes / halfLife);
    if (factor < 0.25) return EffectIntensity.MINOR;
    if (factor < 0.5) return EffectIntensity.MODERATE;
    return EffectIntensity.SEVERE;
  }

  private calculateStepDecay(minutes: number): EffectIntensity {
    const stepMinutes = 10;
    const steps = Math.floor(minutes / stepMinutes);
    const intensities: EffectIntensity[] = [
      EffectIntensity.DEADLY,
      EffectIntensity.SEVERE,
      EffectIntensity.MODERATE,
      EffectIntensity.MINOR,
    ];
    const currentIndex = intensities.indexOf(this.intensity);
    const newIndex = Math.min(currentIndex + steps, intensities.length - 1);
    return intensities[newIndex];
  }

  /**
   * 获取当前的强度变化触发器
   */
  getActiveTrigger(elapsedTime: number): IntensityChangeTrigger | null {
    for (const trigger of this.intChangeTriggers) {
      if (elapsedTime >= trigger.triggerTime) {
        return trigger;
      }
    }
    return null;
  }

  // ========== 效果交互方法 ==========

  /**
   * 获取对指定效果的持续时间减少量
   */
  getDurationReduction(effectId: EffectTypeId): number {
    return this.reducesDuration.get(effectId) ?? 0;
  }

  /**
   * 检查是否免疫指定效果
   */
  isImmuneTo(effectId: EffectTypeId): boolean {
    return this.effectImmunities.includes(effectId);
  }

  // ========== Kill 机制方法 ==========

  /**
   * 是否可以导致死亡
   */
  canCauseDeath(): boolean {
    return this.canKill;
  }

  // ========== 显示方法 ==========

  /**
   * 获取显示名称
   */
  getDisplayName(): string {
    return this.name;
  }

  /**
   * 获取显示描述
   */
  getDisplayDescription(): string {
    return this.description;
  }

  /**
   * 获取开始消息
   */
  getStartMessage(): string {
    return this.messageStart || this.description;
  }

  /**
   * 获取结束消息
   */
  getEndMessage(): string {
    return this.messageEnd || `${this.name} 效果结束了。`;
  }

  /**
   * 获取周期消息
   */
  getTickMessage(): string {
    return this.messageTick || '';
  }

  /**
   * 获取强度描述
   */
  getIntensityDescription(): string {
    switch (this.intensity) {
      case EffectIntensity.MINOR:
        return '轻微';
      case EffectIntensity.MODERATE:
        return '中等';
      case EffectIntensity.SEVERE:
        return '严重';
      case EffectIntensity.DEADLY:
        return '致命';
      default:
        return '未知';
    }
  }

  /**
   * 获取持续时间描述
   */
  getDurationDescription(): string {
    switch (this.durationType) {
      case EffectDurationType.INSTANT:
        return '瞬间';
      case EffectDurationType.SHORT:
        return '短时间';
      case EffectDurationType.MEDIUM:
        return '中等';
      case EffectDurationType.LONG:
        return '长时间';
      case EffectDurationType.PERMANENT:
        return '永久';
      default:
        return '未知';
    }
  }

  // ========== 转换方法 ==========

  /**
   * 转换为 JSON
   */
  toJson(): EffectDefinitionProps {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      intensity: this.intensity,
      durationType: this.durationType,
      applyMode: this.applyMode,
      cancelable: this.cancelable,
      stackable: this.stackable,
      maxStacks: this.maxStacks,
      modifiers: this.modifiers.toArray(),
      tickInterval: this.tickInterval,
      resistances: this.resistances.toArray(),
      visible: this.visible,
      messageStart: this.messageStart,
      messageEnd: this.messageEnd,
      messageTick: this.messageTick,
      // 身体部位支持
      bpAffected: this.bpAffected,
      isLocal: this.isLocal,
      // 强度衰减
      intDecay: this.intDecay,
      intDecayRate: this.intDecayRate,
      intChangeTriggers: this.intChangeTriggers.toArray(),
      // 效果交互
      reducesDuration: this.reducesDuration,
      effectImmunities: this.effectImmunities.toArray(),
      // Kill 机制
      canKill: this.canKill,
      killMessage: this.killMessage,
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>): EffectDefinition {
    // 解析身体部位映射
    let bpAffected = Map<BodyPartId, number>();
    if (json.bp_affected) {
      if (typeof json.bp_affected === 'object') {
        bpAffected = Map(Object.entries(json.bp_affected).map(([k, v]) => [k as BodyPartId, v as number]));
      }
    }

    // 解析持续时间减少映射
    let reducesDuration = Map<EffectTypeId, number>();
    if (json.reduces_duration) {
      if (typeof json.reduces_duration === 'object') {
        reducesDuration = Map(Object.entries(json.reduces_duration).map(([k, v]) => [k as EffectTypeId, v as number]));
      }
    }

    return new EffectDefinition({
      id: json.id as EffectTypeId,
      name: json.name as string,
      description: (json.description as string | undefined) ?? '',
      category: json.category as EffectCategory,
      intensity: (json.intensity as EffectIntensity | undefined) ?? EffectIntensity.MODERATE,
      durationType: (json.duration_type as EffectDurationType | undefined) ?? EffectDurationType.MEDIUM,
      applyMode: (json.apply_mode as EffectApplyMode | undefined) ?? EffectApplyMode.IMMEDIATE,
      cancelable: (json.cancelable as boolean | undefined) ?? true,
      stackable: (json.stackable as boolean | undefined) ?? false,
      maxStacks: (json.max_stacks as number | undefined) ?? 1,
      modifiers: json.modifiers as EffectModifier[] | undefined,
      tickInterval: (json.tick_interval as number | undefined) ?? 1000,
      resistances: json.resistances as EffectTypeId[] | undefined,
      visible: (json.visible as boolean | undefined) ?? true,
      messageStart: (json.message_start as string | undefined) ?? '',
      messageEnd: (json.message_end as string | undefined) ?? '',
      messageTick: (json.message_tick as string | undefined) ?? '',
      // 身体部位支持
      bpAffected,
      isLocal: (json.is_local as boolean | undefined) ?? false,
      // 强度衰减
      intDecay: (json.int_decay as IntensityDecayType | undefined) ?? IntensityDecayType.NONE,
      intDecayRate: (json.int_decay_rate as number | undefined) ?? 0,
      intChangeTriggers: json.int_change_triggers as IntensityChangeTrigger[] | undefined,
      // 效果交互
      reducesDuration,
      effectImmunities: json.effect_immunities as EffectTypeId[] | undefined,
      // Kill 机制
      canKill: (json.can_kill as boolean | undefined) ?? false,
      killMessage: (json.kill_message as string | undefined) ?? '',
    });
  }
}

// ============================================================================
// 预定义效果常量
// ============================================================================

/**
 * 预定义效果定义
 */
export const EffectDefinitions = {
  // 中毒效果
  POISON_WEAK: EffectDefinition.poison('poison_weak' as any, '轻度中毒', '你感到轻微不适', 1),
  POISON_MODERATE: EffectDefinition.poison('poison_moderate' as any, '中毒', '你中毒了！', 2),
  POISON_SEVERE: EffectDefinition.poison('poison_severe' as any, '严重中毒', '你的视线开始模糊...', 5),

  // 再生效果
  REGEN_WEAK: EffectDefinition.regen('regen_weak' as any, '轻微再生', '伤口正在缓慢愈合...', 1),
  REGEN_STRONG: EffectDefinition.regen('regen_strong' as any, '强力再生', '伤口正在快速愈合！', 3),

  // 眩晕效果
  STUNNED: EffectDefinition.stun('stunned' as any, '眩晕', '你头晕目眩，无法行动！'),

  // 疲劳效果
  FATIGUE_TIRED: EffectDefinition.fatigue('fatigue_tired' as any, '疲倦', '你感到有些疲倦', 0.05),
  FATIGUE_EXHAUSTED: EffectDefinition.fatigue('fatigue_exhausted' as any, '精疲力竭', '你几乎要昏倒了', 0.2),

  // 增益效果
  STIMULANT: EffectDefinition.buff('stimulant' as any, '兴奋剂', '你感到精力充沛', [
    { type: EffectModifierType.SPEED_ADD, target: 'all', value: 20 },
    { type: EffectModifierType.STAT_ADD, target: 'strength', value: 2 },
  ]),

  ADRENALINE: EffectDefinition.buff('adrenaline' as any, '肾上腺素', '肾上腺素激增！', [
    { type: EffectModifierType.SPEED_ADD, target: 'all', value: 30 },
    { type: EffectModifierType.STAT_MULTIPLY, target: 'pain', value: -50 },
  ]),

  // 疾病效果
  COLD: EffectDefinition.debuff('cold' as any, '感冒', '你感冒了，感到浑身不适', [
    { type: EffectModifierType.SPEED_MULTIPLY, target: 'all', value: -0.1 },
  ]),

  FLU: EffectDefinition.debuff('flu' as any, '流感', '你得了流感，非常虚弱', [
    { type: EffectModifierType.SPEED_MULTIPLY, target: 'all', value: -0.2 },
    { type: EffectModifierType.STAT_ADD, target: 'stamina', value: -20 },
  ]),
};
