import { FieldTypeId } from '../coordinates/types';

/**
 * 场实例属性
 */
export interface FieldEntryProps {
  type: FieldTypeId;
  intensity: number;
  age: number;
  decayTime: number;
  isAlive: boolean;
}

/**
 * 场实例
 *
 * 表示地图上某个位置的场实例
 */
export class FieldEntry {
  private readonly _props: FieldEntryProps;

  readonly type!: FieldTypeId;
  readonly intensity!: number;
  readonly age!: number;
  readonly decayTime!: number;
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

    // Define getters for all properties
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
   * 是否存活
   */
  checkAlive(): boolean {
    return this.isAlive && this.intensity > 0;
  }

  /**
   * 是否已过期
   */
  isExpired(): boolean {
    return this.decayTime > 0 && this.age >= this.decayTime;
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
    if (this.decayTime === 0) return 0;
    return Math.min(1, this.age / this.decayTime);
  }

  /**
   * 更新场（增加年龄）
   */
  update(deltaAge: number = 1): FieldEntry {
    const newAge = this.age + deltaAge;
    return this.set('age', newAge);
  }

  /**
   * 衰减强度
   */
  decayIntensity(): FieldEntry {
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
  setIntensity(intensity: number): FieldEntry {
    return this.set('intensity', Math.max(0, intensity));
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
