import { FieldTypeId } from '../coordinates/types';

/**
 * 时间相关类型（简化版，匹配 CDDA time_duration）
 */
export type TimeDuration = number; // 以 turn 为单位
export type TimePoint = number;    // 绝对时间点

/**
 * 场实例属性
 */
export interface FieldEntryProps {
  type: FieldTypeId;
  intensity: number;
  age: TimeDuration;
  decayTime: TimePoint;
  isAlive: boolean;
}

/**
 * 场衰减配置（从 field_type 传入）
 */
export interface FieldDecayConfig {
  halfLife: TimeDuration;
  linearHalfLife: boolean;
  acceleratedDecay: boolean;
  maxIntensity: number;
}

/**
 * 场实例
 * 匹配 CDDA field_entry
 */
export class FieldEntry {
  private readonly _props: FieldEntryProps;

  readonly type!: FieldTypeId;
  readonly intensity!: number;
  readonly age!: TimeDuration;
  readonly decayTime!: TimePoint;
  readonly isAlive!: boolean;

  constructor(props?: Partial<FieldEntryProps>) {
    const defaults: FieldEntryProps = {
      type: '' as FieldTypeId,
      intensity: 1,
      age: 0,
      decayTime: 0,
      isAlive: true,
    };

    this._props = { ...defaults, ...props };

    Object.defineProperty(this, 'type', { get: () => this._props.type, enumerable: true });
    Object.defineProperty(this, 'intensity', { get: () => this._props.intensity, enumerable: true });
    Object.defineProperty(this, 'age', { get: () => this._props.age, enumerable: true });
    Object.defineProperty(this, 'decayTime', { get: () => this._props.decayTime, enumerable: true });
    Object.defineProperty(this, 'isAlive', { get: () => this._props.isAlive, enumerable: true });

    Object.freeze(this);
  }

  /**
   * 创建修改后的副本
   */
  set<K extends keyof FieldEntryProps>(key: K, value: FieldEntryProps[K]): FieldEntry {
    return new FieldEntry({ ...this._props, [key]: value });
  }

  /**
   * 创建新实例
   */
  static create(type: FieldTypeId, intensity: number = 1): FieldEntry {
    return new FieldEntry({
      type,
      intensity,
      age: 0,
      decayTime: 0,
      isAlive: true,
    });
  }

  /**
   * 初始化衰减时间
   * 匹配 CDDA field_entry::initialize_decay()
   */
  initialize_decay(config: FieldDecayConfig, currentTurn: TimePoint = 0): FieldEntry {
    if (config.linearHalfLife) {
      // 线性衰减：decay_time = current_turn - age + half_life
      return this.set('decayTime', currentTurn - this.age + config.halfLife);
    } else {
      // 指数衰减：使用指数分布
      // decay_time = current_turn - age + random_exponential(1.0 / (ln(2) * half_life))
      const lambda = 1.0 / (Math.log(2) * config.halfLife);
      const randomDelay = this._exponentialRandom(lambda);
      return this.set('decayTime', currentTurn - this.age + randomDelay);
    }
  }

  /**
   * 执行衰减
   * 匹配 CDDA field_entry::do_decay()
   */
  do_decay(config: FieldDecayConfig, currentTurn: TimePoint = 0): FieldEntry {
    // 增加年龄 1 turn
    let newEntry = this.set('age', this.age + 1);

    // 如果半衰期大于 0 且年龄大于 0
    if (config.halfLife > 0 && newEntry.age > 0) {
      // 特殊处理火场
      if (newEntry.type === 'fd_fire') {
        return this._decayFire(newEntry, config);
      }

      // 如果 decay_time 未初始化，先初始化
      if (newEntry.decayTime === 0) {
        newEntry = newEntry.initialize_decay(config, currentTurn);
      }

      // 如果到了衰减时间，强度减 1，年龄重置为 0
      if (newEntry.decayTime <= currentTurn) {
        newEntry = newEntry.set('age', 0);
        newEntry = newEntry._modIntensity(-1, config.maxIntensity);
      }
    }

    return newEntry;
  }

  /**
   * 火场的特殊衰减逻辑
   * 匹配 CDDA field.cpp:98-103
   */
  private _decayFire(entry: FieldEntry, config: FieldDecayConfig): FieldEntry {
    // if (half_life < dice(2, age)) { intensity--; age = 0; }
    const diceRoll = Math.floor(Math.random() * config.halfLife) + Math.floor(Math.random() * config.halfLife) + 2;
    if (config.halfLife < diceRoll) {
      let newEntry = entry.set('age', 0);
      newEntry = newEntry._modIntensity(-1, config.maxIntensity);
      return newEntry;
    }
    return entry;
  }

  /**
   * 指数分布随机数生成
   * 使用逆变换采样法
   */
  private _exponentialRandom(lambda: number): number {
    const u = Math.random();
    return Math.floor(-Math.log(1 - u) / lambda);
  }

  /**
   * 修改强度（带边界检查）
   */
  private _modIntensity(mod: number, maxIntensity: number): FieldEntry {
    const newIntensity = Math.max(1, Math.min(maxIntensity, this.intensity + mod));
    const newAlive = newIntensity > 0;
    return this.set('intensity', newIntensity).set('isAlive', newAlive);
  }

  /**
   * 是否存活
   */
  checkAlive(): boolean {
    return this.isAlive && this.intensity > 0;
  }

  /**
   * 是否已过期
   * 当年龄达到或超过衰减时间时，场被认为已过期
   */
  isExpired(): boolean {
    return this.age >= this.decayTime && this.decayTime > 0;
  }

  /**
   * 是否年轻
   */
  isYoung(maxAge: number): boolean {
    return this.age < maxAge;
  }

  /**
   * 获取老化进度 (0-1)
   */
  getAgeProgress(): number {
    // 对于复杂的衰减算法，进度计算不太适用
    // 这里返回一个简单的值
    if (this.decayTime === 0) return 0;
    return Math.min(1, this.age / this.decayTime);
  }

  /**
   * 更新场（增加年龄）- 简化版，不包含衰减逻辑
   */
  update(deltaAge: number = 1): FieldEntry {
    const newAge = this.age + deltaAge;
    return this.set('age', newAge);
  }

  /**
   * 衰减强度
   */
  decayIntensity(maxIntensity?: number): FieldEntry {
    const maxInt = maxIntensity ?? 3;
    if (this.intensity <= 1) {
      return this.set('isAlive', false).set('intensity', 0);
    }
    return this.set('intensity', this.intensity - 1);
  }

  /**
   * 增加强度
   */
  increaseIntensity(amount: number = 1, maxIntensity: number = 3): FieldEntry {
    const newIntensity = Math.min(maxIntensity, this.intensity + amount);
    return this.set('intensity', newIntensity);
  }

  /**
   * 设置强度
   */
  setIntensity(intensity: number, maxIntensity: number = 3): FieldEntry {
    const newIntensity = Math.max(0, Math.min(maxIntensity, intensity));
    return this.set('intensity', newIntensity).set('isAlive', newIntensity > 0);
  }

  /**
   * 设置衰减时间
   */
  setDecayTime(decayTime: number): FieldEntry {
    return this.set('decayTime', decayTime);
  }

  /**
   * 杀死场
   */
  kill(): FieldEntry {
    return this.set('isAlive', false).set('intensity', 0);
  }

  /**
   * 复制场
   */
  clone(): FieldEntry {
    return new FieldEntry(this._props);
  }

  /**
   * 获取相对强度（归一化到 0-1）
   */
  getNormalizedIntensity(maxIntensity: number = 3): number {
    return this.intensity / maxIntensity;
  }

  /**
   * 比较强度
   */
  isStrongerThan(other: FieldEntry): boolean {
    return this.intensity > other.intensity;
  }

  /**
   * 是否达到最大强度
   */
  isAtMaxIntensity(maxIntensity: number = 3): boolean {
    return this.intensity >= maxIntensity;
  }

  /**
   * 获取显示字符串
   */
  getDisplayString(): string {
    return `${this.type}:${this.intensity}`;
  }

  /**
   * 转换为 JSON
   */
  toJSON(): { type: string; intensity: number; age: number; decayTime: number } {
    return {
      type: this.type,
      intensity: this.intensity,
      age: this.age,
      decayTime: this.decayTime,
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJSON(json: { type: string; intensity: number; age?: number; decayTime?: number }): FieldEntry {
    return new FieldEntry({
      type: json.type,
      intensity: json.intensity,
      age: json.age || 0,
      decayTime: json.decayTime || 0,
      isAlive: json.intensity > 0,
    });
  }
}
