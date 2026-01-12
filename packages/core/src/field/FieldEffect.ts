import { EffectTypeId } from '../effect/types';
import { BodyPartId } from '../creature/types';
import { TimeDuration, TimePoint } from './FieldEntry';

/**
 * 场免疫数据
 * 匹配 CDDA field_immunity_data
 */
export interface FieldImmunityData {
  /** 需要穿的装备 */
  requiredGear?: string[];
  /** 免疫的生物特征 */
  immunityFlags?: string[];
  /** 需要的最低属性 */
  minStats?: Record<string, number>;
}

/**
 * 场效果
 * 匹配 CDDA field_type.h::field_effect
 */
export interface FieldEffectProps {
  /** 效果类型 ID */
  effectId: EffectTypeId;
  /** 影响的身体部位 */
  bodyPart: BodyPartId;
  /** 最小持续时间（turn） */
  minDuration: TimeDuration;
  /** 最大持续时间（turn） */
  maxDuration: TimeDuration;
  /** 强度等级 */
  intensity: number;
  /** 免疫数据 */
  immunityData?: FieldImmunityData;
  /** 是否是环境效果 */
  isEnvironmental: boolean;
  /** 在载具中是否免疫 */
  immuneInVehicle: boolean;
  /** 在载具内部是否免疫 */
  immuneInsideVehicle: boolean;
  /** 在载具外部是否免疫 */
  immuneOutsideVehicle: boolean;
  /** 在载具中的触发概率 (0-100) */
  chanceInVehicle: number;
  /** 在载具内部的触发概率 (0-100) */
  chanceInsideVehicle: number;
  /** 在载具外部的触发概率 (0-100) */
  chanceOutsideVehicle: number;
  /** 消息类型 */
  messageType: 'neutral' | 'good' | 'bad' | 'mixed';
  /** 给玩家的消息 */
  message: string;
  /** 给 NPC 的消息 */
  messageNpc: string;
}

/**
 * 场效果类
 * 定义场对生物产生的效果
 */
export class FieldEffect {
  private readonly _props: FieldEffectProps;

  readonly effectId!: EffectTypeId;
  readonly bodyPart!: BodyPartId;
  readonly minDuration!: TimeDuration;
  readonly maxDuration!: TimeDuration;
  readonly intensity!: number;
  readonly immunityData?: FieldImmunityData;
  readonly isEnvironmental!: boolean;
  readonly immuneInVehicle!: boolean;
  readonly immuneInsideVehicle!: boolean;
  readonly immuneOutsideVehicle!: boolean;
  readonly chanceInVehicle!: number;
  readonly chanceInsideVehicle!: number;
  readonly chanceOutsideVehicle!: number;
  readonly messageType!: 'neutral' | 'good' | 'bad' | 'mixed';
  readonly message!: string;
  readonly messageNpc!: string;

  constructor(props?: Partial<FieldEffectProps>) {
    const defaults: FieldEffectProps = {
      effectId: '' as EffectTypeId,
      bodyPart: 0, // BodyPartId.TORSO
      minDuration: 0,
      maxDuration: 0,
      intensity: 1,
      isEnvironmental: true,
      immuneInVehicle: false,
      immuneInsideVehicle: false,
      immuneOutsideVehicle: false,
      chanceInVehicle: 100,
      chanceInsideVehicle: 100,
      chanceOutsideVehicle: 100,
      messageType: 'neutral',
      message: '',
      messageNpc: '',
    };

    this._props = { ...defaults, ...props };

    Object.defineProperty(this, 'effectId', { get: () => this._props.effectId, enumerable: true });
    Object.defineProperty(this, 'bodyPart', { get: () => this._props.bodyPart, enumerable: true });
    Object.defineProperty(this, 'minDuration', { get: () => this._props.minDuration, enumerable: true });
    Object.defineProperty(this, 'maxDuration', { get: () => this._props.maxDuration, enumerable: true });
    Object.defineProperty(this, 'intensity', { get: () => this._props.intensity, enumerable: true });
    Object.defineProperty(this, 'immunityData', { get: () => this._props.immunityData, enumerable: true });
    Object.defineProperty(this, 'isEnvironmental', { get: () => this._props.isEnvironmental, enumerable: true });
    Object.defineProperty(this, 'immuneInVehicle', { get: () => this._props.immuneInVehicle, enumerable: true });
    Object.defineProperty(this, 'immuneInsideVehicle', { get: () => this._props.immuneInsideVehicle, enumerable: true });
    Object.defineProperty(this, 'immuneOutsideVehicle', { get: () => this._props.immuneOutsideVehicle, enumerable: true });
    Object.defineProperty(this, 'chanceInVehicle', { get: () => this._props.chanceInVehicle, enumerable: true });
    Object.defineProperty(this, 'chanceInsideVehicle', { get: () => this._props.chanceInsideVehicle, enumerable: true });
    Object.defineProperty(this, 'chanceOutsideVehicle', { get: () => this._props.chanceOutsideVehicle, enumerable: true });
    Object.defineProperty(this, 'messageType', { get: () => this._props.messageType, enumerable: true });
    Object.defineProperty(this, 'message', { get: () => this._props.message, enumerable: true });
    Object.defineProperty(this, 'messageNpc', { get: () => this._props.messageNpc, enumerable: true });

    Object.freeze(this);
  }

  /**
   * 创建修改后的副本
   */
  set<K extends keyof FieldEffectProps>(key: K, value: FieldEffectProps[K]): FieldEffect {
    return new FieldEffect({ ...this._props, [key]: value });
  }

  /**
   * 获取持续时间（随机范围）
   * 匹配 CDDA field_effect::get_duration()
   */
  getDuration(): TimeDuration {
    if (this.minDuration === this.maxDuration) {
      return this.minDuration;
    }
    const range = this.maxDuration - this.minDuration;
    return this.minDuration + Math.floor(Math.random() * (range + 1));
  }

  /**
   * 获取消息
   * 匹配 CDDA field_effect::get_message()
   */
  getMessage(): string {
    return this.message;
  }

  /**
   * 获取 NPC 消息
   * 匹配 CDDA field_effect::get_message_npc()
   */
  getMessageNpc(): string {
    return this.messageNpc;
  }

  /**
   * 检查在指定位置是否应该触发效果
   * @param inVehicle 是否在载具中
   * @param insideVehicle 是否在载具内部
   * @returns 是否触发效果
   */
  shouldTrigger(inVehicle: boolean = false, insideVehicle: boolean = false): boolean {
    // 检查免疫
    if (inVehicle && this.immuneInVehicle) {
      return false;
    }
    if (inVehicle && insideVehicle && this.immuneInsideVehicle) {
      return false;
    }
    if (inVehicle && !insideVehicle && this.immuneOutsideVehicle) {
      return false;
    }

    // 计算触发概率
    let chance = 100;
    if (inVehicle) {
      if (insideVehicle) {
        chance = this.chanceInsideVehicle;
      } else {
        chance = this.chanceOutsideVehicle;
      }
    } else {
      chance = this.chanceInVehicle;
    }

    return Math.random() * 100 < chance;
  }

  /**
   * 是否是环境效果
   */
  isEnvEffect(): boolean {
    return this.isEnvironmental;
  }

  /**
   * 获取消息类型
   */
  getMessageType(): 'neutral' | 'good' | 'bad' | 'mixed' {
    return this.messageType;
  }

  /**
   * 获取效果强度
   */
  getIntensity(): number {
    return this.intensity;
  }

  /**
   * 获取目标身体部位
   */
  getBodyPart(): BodyPartId {
    return this.bodyPart;
  }

  /**
   * 创建副本
   */
  clone(): FieldEffect {
    return new FieldEffect(this._props);
  }

  /**
   * 转换为 JSON
   */
  toJSON(): FieldEffectProps {
    return { ...this._props };
  }

  /**
   * 从 JSON 创建
   */
  static fromJSON(json: FieldEffectProps): FieldEffect {
    return new FieldEffect(json);
  }
}

/**
 * 场效果列表
 * 一个场类型可以产生多个效果
 */
export class FieldEffectList {
  private _effects: readonly FieldEffect[];

  constructor(effects: FieldEffect[] = []) {
    this._effects = Object.freeze([...effects]);
  }

  /**
   * 获取所有效果
   */
  getAll(): readonly FieldEffect[] {
    return this._effects;
  }

  /**
   * 获取环境效果
   */
  getEnvironmentalEffects(): FieldEffect[] {
    return this._effects.filter(e => e.isEnvironmental);
  }

  /**
   * 获取非环境效果
   */
  getNonEnvironmentalEffects(): FieldEffect[] {
    return this._effects.filter(e => !e.isEnvironmental);
  }

  /**
   * 获取指定身体部位的效果
   */
  getEffectsForBodyPart(bodyPart: BodyPartId): FieldEffect[] {
    return this._effects.filter(e => e.bodyPart === bodyPart);
  }

  /**
   * 添加效果
   */
  add(effect: FieldEffect): FieldEffectList {
    return new FieldEffectList([...this._effects, effect]);
  }

  /**
   * 检查是否有任何效果
   */
  hasEffects(): boolean {
    return this._effects.length > 0;
  }

  /**
   * 获取效果数量
   */
  size(): number {
    return this._effects.length;
  }

  /**
   * 转换为数组
   */
  toArray(): FieldEffect[] {
    return [...this._effects];
  }

  /**
   * 从 JSON 创建
   */
  static fromJSON(jsonArray: FieldEffectProps[]): FieldEffectList {
    const effects = jsonArray.map(json => FieldEffect.fromJSON(json));
    return new FieldEffectList(effects);
  }
}
