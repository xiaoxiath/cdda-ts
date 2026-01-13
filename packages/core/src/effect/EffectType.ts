/**
 * EffectType - 效果类型定义
 *
 * 参考 Cataclysm-DDA 的 effect_type 结构
 * 定义效果类型的静态属性和行为
 */

import { Set, Map, List } from 'immutable';
import type {
  EffectTypeId,
  EffectModifier,
} from './types';
import {
  EffectCategory,
  EffectIntensity,
  EffectDurationType,
  EffectApplyMode,
  createEffectTypeId,
  EffectDefinitionProps,
  EffectJsonObject,
} from './types';

// ============================================================================
// EffectType 类
// ============================================================================

/**
 * EffectType - 效果类型类
 *
 * 定义效果的静态属性，使用不可变数据结构
 */
export class EffectType {
  // ============ 基础属性 ============

  /** 类型 ID */
  readonly id: EffectTypeId;

  /** 名称 */
  readonly name: string;

  /** 描述 */
  readonly description: string;

  /** 分类 */
  readonly category: EffectCategory;

  /** 强度等级 */
  readonly intensity: EffectIntensity;

  /** 持续时间类型 */
  readonly durationType: EffectDurationType;

  /** 应用模式 */
  readonly applyMode: EffectApplyMode;

  // ============ 行为属性 ============

  /** 是否可取消 */
  readonly cancelable: boolean;

  /** 是否可堆叠 */
  readonly stackable: boolean;

  /** 最大堆叠次数 */
  readonly maxStacks: number;

  /** 属性修饰符 */
  readonly modifiers: List<EffectModifier>;

  /** 周期性效果间隔（毫秒） */
  readonly tickInterval: number;

  /** 免疫效果类型 */
  readonly resistances: List<EffectTypeId>;

  /** 是否可见 */
  readonly visible: boolean;

  // ============ 消息模板 ============

  /** 开始消息 */
  readonly messageStart: string | undefined;

  /** 结束消息 */
  readonly messageEnd: string | undefined;

  /** 周期消息 */
  readonly messageTick: string | undefined;

  // ============ 构造函数 ============

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
    this.messageStart = props.messageStart;
    this.messageEnd = props.messageEnd;
    this.messageTick = props.messageTick;
  }

  // ============ 工厂方法 ============

  /**
   * 创建效果类型
   */
  static create(props: EffectDefinitionProps): EffectType {
    return new EffectType(props);
  }

  /**
   * 从另一个 EffectType 复制创建
   */
  static copyFrom(
    other: EffectType,
    overrides: Partial<EffectDefinitionProps>
  ): EffectType {
    return EffectType.create({
      id: other.id,
      name: other.name,
      description: other.description,
      category: other.category,
      intensity: other.intensity,
      durationType: other.durationType,
      applyMode: other.applyMode,
      cancelable: other.cancelable,
      stackable: other.stackable,
      maxStacks: other.maxStacks,
      modifiers: other.modifiers.toArray(),
      tickInterval: other.tickInterval,
      resistances: other.resistances.toArray(),
      visible: other.visible,
      messageStart: other.messageStart,
      messageEnd: other.messageEnd,
      messageTick: other.messageTick,
      ...overrides,
    });
  }

  // ============ 类型检查方法 ============

  /**
   * 是否为增益效果
   */
  isBuff(): boolean {
    return this.category === EffectCategory.BUFF ||
           this.category === EffectCategory.REGEN ||
           this.category === EffectCategory.HEAL;
  }

  /**
   * 是否为减益效果
   */
  isDebuff(): boolean {
    return this.category === EffectCategory.DEBUFF ||
           this.category === EffectCategory.POISON ||
           this.category === EffectCategory.DISEASE ||
           this.category === EffectCategory.STUN ||
           this.category === EffectCategory.BLEED;
  }

  /**
   * 是否为永久效果
   */
  isPermanent(): boolean {
    return this.durationType === EffectDurationType.PERMANENT;
  }

  /**
   * 是否为即时效果
   */
  isInstant(): boolean {
    return this.durationType === EffectDurationType.INSTANT;
  }

  /**
   * 是否为周期性效果
   */
  isPeriodic(): boolean {
    return this.applyMode === EffectApplyMode.PERIODIC;
  }

  /**
   * 是否可堆叠
   */
  isStackable(): boolean {
    return this.stackable;
  }

  /**
   * 是否可见
   */
  isVisible(): boolean {
    return this.visible;
  }

  // ============ 修饰符相关 ============

  /**
   * 获取指定类型的修饰符
   */
  getModifiers(target: string): List<EffectModifier> {
    return this.modifiers.filter(m => m.target === target);
  }

  /**
   * 获取所有属性修饰符值
   */
  getModifierValue(target: string): number {
    return this.modifiers
      .filter(m => m.target === target)
      .reduce((sum, m) => sum + m.value, 0);
  }

  /**
   * 是否有指定修饰符
   */
  hasModifier(target: string): boolean {
    return this.modifiers.some(m => m.target === target);
  }

  // ============ 免疫检查 ============

  /**
   * 检查是否免疫指定效果
   */
  hasResistance(effectId: EffectTypeId): boolean {
    return this.resistances.contains(effectId);
  }

  /**
   * 添加免疫效果
   */
  addResistance(effectId: EffectTypeId): EffectType {
    return EffectType.copyFrom(this, {
      resistances: [...this.resistances.toArray(), effectId],
    });
  }

  // ============ 工具方法 ============

  /**
   * 获取显示名称
   */
  getDisplayName(): string {
    return this.name;
  }

  /**
   * 获取描述
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * 获取开始消息
   */
  getStartMessage(): string {
    return this.messageStart ?? `你受到 ${this.name} 效果影响。`;
  }

  /**
   * 获取结束消息
   */
  getEndMessage(): string {
    return this.messageEnd ?? `${this.name} 效果结束。`;
  }

  /**
   * 获取周期消息
   */
  getTickMessage(): string {
    return this.messageTick ?? '';
  }

  /**
   * 获取默认持续时间（毫秒）
   */
  getDefaultDuration(): number {
    switch (this.durationType) {
      case EffectDurationType.INSTANT:
        return 0;
      case EffectDurationType.SHORT:
        return 10000; // 10秒
      case EffectDurationType.MEDIUM:
        return 60000; // 1分钟
      case EffectDurationType.LONG:
        return 300000; // 5分钟
      case EffectDurationType.PERMANENT:
        return Infinity;
      default:
        return 60000;
    }
  }

  // ============ 序列化 ============

  /**
   * 转换为 JSON
   */
  toJson(): EffectJsonObject {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      intensity: this.intensity,
      duration_type: this.durationType,
      apply_mode: this.applyMode,
      cancelable: this.cancelable,
      stackable: this.stackable,
      max_stacks: this.maxStacks,
      modifiers: this.modifiers.toArray(),
      tick_interval: this.tickInterval,
      resistances: this.resistances.toArray(),
      visible: this.visible,
      message_start: this.messageStart,
      message_end: this.messageEnd,
      message_tick: this.messageTick,
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: EffectJsonObject): EffectType {
    return EffectType.create({
      id: createEffectTypeId(json.id),
      name: json.name,
      description: json.description ?? '',
      category: json.category as EffectCategory,
      intensity: json.intensity as EffectIntensity,
      durationType: json.duration_type as EffectDurationType,
      applyMode: json.apply_mode as EffectApplyMode,
      cancelable: json.cancelable,
      stackable: json.stackable,
      maxStacks: json.max_stacks,
      modifiers: json.modifiers ?? [],
      tickInterval: json.tick_interval ?? 1000,
      resistances: (json.resistances ?? []).map(id => createEffectTypeId(id)),
      visible: json.visible ?? true,
      messageStart: json.message_start,
      messageEnd: json.message_end,
      messageTick: json.message_tick,
    });
  }
}

// ============================================================================
// 预定义效果类型常量
// ============================================================================

/**
 * 预定义效果类型
 */
export const EffectTypes = {
  /** 中毒 */
  POISON: EffectType.create({
    id: createEffectTypeId('poison'),
    name: '中毒',
    description: '受到毒素影响，持续受到伤害',
    category: EffectCategory.POISON,
    intensity: EffectIntensity.MODERATE,
    durationType: EffectDurationType.MEDIUM,
    applyMode: EffectApplyMode.PERIODIC,
    cancelable: true,
    stackable: true,
    maxStacks: 5,
    modifiers: [
      { type: 'damage_add' as any, target: 'health', value: -1 },
    ],
    tickInterval: 5000,
    visible: true,
    messageStart: '你感到一阵恶心...',
    messageEnd: '毒素终于消退了。',
    messageTick: '你感到疼痛...',
  }),

  /** 再生 */
  REGEN: EffectType.create({
    id: createEffectTypeId('regen'),
    name: '再生',
    description: '快速恢复生命值',
    category: EffectCategory.REGEN,
    intensity: EffectIntensity.MODERATE,
    durationType: EffectDurationType.MEDIUM,
    applyMode: EffectApplyMode.PERIODIC,
    cancelable: true,
    stackable: false,
    maxStacks: 1,
    modifiers: [
      { type: 'heal_add' as any, target: 'health', value: 2 },
    ],
    tickInterval: 3000,
    visible: true,
    messageStart: '你的伤口开始愈合。',
    messageEnd: '再生效果结束了。',
    messageTick: '你感到温暖...',
  }),

  /** 加速 */
  SPEED_BOOST: EffectType.create({
    id: createEffectTypeId('speed_boost'),
    name: '加速',
    description: '移动速度增加',
    category: EffectCategory.BUFF,
    intensity: EffectIntensity.MODERATE,
    durationType: EffectDurationType.MEDIUM,
    applyMode: EffectApplyMode.IMMEDIATE,
    cancelable: true,
    stackable: false,
    maxStacks: 1,
    modifiers: [
      { type: 'speed_multiply' as any, target: 'speed', value: 1.5 },
    ],
    tickInterval: 1000,
    visible: true,
    messageStart: '你感到身体变轻了！',
    messageEnd: '加速效果消退了。',
  }),

  /** 眩晕 */
  STUNNED: EffectType.create({
    id: createEffectTypeId('stunned'),
    name: '眩晕',
    description: '无法行动',
    category: EffectCategory.STUN,
    intensity: EffectIntensity.SEVERE,
    durationType: EffectDurationType.SHORT,
    applyMode: EffectApplyMode.IMMEDIATE,
    cancelable: false,
    stackable: false,
    maxStacks: 1,
    modifiers: [
      { type: 'action_block' as any, target: 'action', value: 1 },
    ],
    tickInterval: 1000,
    visible: true,
    messageStart: '你感到头晕目眩！',
    messageEnd: '你恢复了清醒。',
  }),

  /** 出血 */
  BLEEDING: EffectType.create({
    id: createEffectTypeId('bleeding'),
    name: '出血',
    description: '持续失血',
    category: EffectCategory.BLEED,
    intensity: EffectIntensity.MODERATE,
    durationType: EffectDurationType.MEDIUM,
    applyMode: EffectApplyMode.PERIODIC,
    cancelable: true,
    stackable: true,
    maxStacks: 3,
    modifiers: [
      { type: 'damage_add' as any, target: 'health', value: -2 },
    ],
    tickInterval: 5000,
    visible: true,
    messageStart: '你开始出血！',
    messageEnd: '出血止住了。',
    messageTick: '你的血液在流失...',
  }),

  /** 夜视 */
  NIGHT_VISION: EffectType.create({
    id: createEffectTypeId('night_vision'),
    name: '夜视',
    description: '在黑暗中也能看见',
    category: EffectCategory.BUFF,
    intensity: EffectIntensity.MINOR,
    durationType: EffectDurationType.LONG,
    applyMode: EffectApplyMode.IMMEDIATE,
    cancelable: true,
    stackable: false,
    maxStacks: 1,
    modifiers: [
      { type: 'vision_add' as any, target: 'vision_range', value: 5 },
    ],
    tickInterval: 1000,
    visible: true,
    messageStart: '你的眼睛适应了黑暗。',
    messageEnd: '夜视效果消退了。',
  }),

  /** 疲劳 */
  FATIGUE: EffectType.create({
    id: createEffectTypeId('fatigue'),
    name: '疲劳',
    description: '体力恢复减慢',
    category: EffectCategory.FATIGUE,
    intensity: EffectIntensity.MODERATE,
    durationType: EffectDurationType.LONG,
    applyMode: EffectApplyMode.IMMEDIATE,
    cancelable: true,
    stackable: true,
    maxStacks: 5,
    modifiers: [
      { type: 'stamina_regen_multiply' as any, target: 'stamina_regen', value: 0.5 },
    ],
    tickInterval: 1000,
    visible: true,
    messageStart: '你感到疲惫...',
    messageEnd: '疲劳消退了。',
  }),
};
