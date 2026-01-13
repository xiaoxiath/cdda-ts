/**
 * Effect - 效果实例类
 *
 * 参考 Cataclysm-DDA 的 effect 结构
 * 表示角色身上的单个效果实例
 */

import { Map } from 'immutable';
import type {
  EffectTypeId,
  EffectIntensity,
  EffectProps,
  BodyPartIntensityMap,
} from './types';
import type { BodyPartId } from '../combat/types';
import type { EffectDefinition } from './EffectDefinition';

/**
 * 效果实例属性（内部）
 */
interface EffectPropsInternal {
  definition: EffectDefinition;
  startTime: number;
  duration: number;
  intensity: EffectIntensity;
  currentStacks: number;
  isActive: boolean;
  lastTickTime: number;
  // ========== 身体部位支持 ==========
  bpIntensity: BodyPartIntensityMap;
  // ========== 强度衰减 ==========
  currentDecay: number;
  lastDecayTime: number;
}

/**
 * 效果实例类
 *
 * 使用不可变数据结构
 */
export class Effect {
  readonly definition!: EffectDefinition;
  readonly startTime!: number;
  readonly duration!: number;
  readonly intensity!: EffectIntensity;
  readonly currentStacks!: number;
  readonly isActive!: boolean;
  readonly lastTickTime!: number;
  // ========== 身体部位支持 ==========
  readonly bpIntensity!: BodyPartIntensityMap;
  // ========== 强度衰减 ==========
  readonly currentDecay!: number;
  readonly lastDecayTime!: number;

  private constructor(props: EffectPropsInternal) {
    this.definition = props.definition;
    this.startTime = props.startTime;
    this.duration = props.duration;
    this.intensity = props.intensity;
    this.currentStacks = props.currentStacks;
    this.isActive = props.isActive;
    this.lastTickTime = props.lastTickTime;
    // ========== 身体部位支持 ==========
    this.bpIntensity = props.bpIntensity;
    // ========== 强度衰减 ==========
    this.currentDecay = props.currentDecay;
    this.lastDecayTime = props.lastDecayTime;

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建新效果实例
   */
  static create(definition: EffectDefinition, currentTime: number = Date.now()): Effect {
    const duration = definition.getDefaultDuration();
    return new Effect({
      definition,
      startTime: currentTime,
      duration,
      intensity: definition.intensity,
      currentStacks: 1,
      isActive: true,
      lastTickTime: currentTime,
      // ========== 身体部位支持 ==========
      bpIntensity: definition.bpAffected,
      // ========== 强度衰减 ==========
      currentDecay: 0,
      lastDecayTime: currentTime,
    });
  }

  /**
   * 创建指定持续时间的实例
   */
  static withDuration(
    definition: EffectDefinition,
    duration: number,
    currentTime: number = Date.now()
  ): Effect {
    return new Effect({
      definition,
      startTime: currentTime,
      duration,
      intensity: definition.intensity,
      currentStacks: 1,
      isActive: true,
      lastTickTime: currentTime,
      // ========== 身体部位支持 ==========
      bpIntensity: definition.bpAffected,
      // ========== 强度衰减 ==========
      currentDecay: 0,
      lastDecayTime: currentTime,
    });
  }

  /**
   * 创建指定强度的实例
   */
  static withIntensity(
    definition: EffectDefinition,
    intensity: EffectIntensity,
    currentTime: number = Date.now()
  ): Effect {
    const duration = definition.getDefaultDuration();
    return new Effect({
      definition,
      startTime: currentTime,
      duration,
      intensity,
      currentStacks: 1,
      isActive: true,
      lastTickTime: currentTime,
      // ========== 身体部位支持 ==========
      bpIntensity: definition.bpAffected,
      // ========== 强度衰减 ==========
      currentDecay: 0,
      lastDecayTime: currentTime,
    });
  }

  // ========== 状态查询 ==========

  /**
   * 获取结束时间
   */
  getEndTime(): number {
    if (this.definition.isPermanent()) {
      return Infinity;
    }
    return this.startTime + this.duration;
  }

  /**
   * 获取剩余时间（毫秒）
   */
  getRemainingTime(currentTime: number = Date.now()): number {
    if (this.definition.isPermanent()) {
      return Infinity;
    }
    const endTime = this.getEndTime();
    return Math.max(0, endTime - currentTime);
  }

  /**
   * 检查是否已过期
   */
  isExpired(currentTime: number = Date.now()): boolean {
    if (this.definition.isPermanent()) {
      return false;
    }
    return currentTime >= this.getEndTime();
  }

  /**
   * 检查是否需要周期更新
   */
  needsTick(currentTime: number = Date.now()): boolean {
    if (!this.isActive || !this.definition.isPeriodic()) {
      return false;
    }
    return currentTime - this.lastTickTime >= this.definition.tickInterval;
  }

  /**
   * 获取已过时间（毫秒）
   */
  getElapsedTime(currentTime: number = Date.now()): number {
    return currentTime - this.startTime;
  }

  /**
   * 获取进度百分比 (0-100)
   */
  getProgressPercent(currentTime: number = Date.now()): number {
    if (this.definition.isPermanent()) {
      return 100;
    }
    if (this.duration === 0) {
      return 100;
    }
    const elapsed = this.getElapsedTime(currentTime);
    return Math.min(100, Math.floor((elapsed / this.duration) * 100));
  }

  /**
   * 获取剩余时间描述
   */
  getRemainingTimeDescription(currentTime: number = Date.now()): string {
    const remaining = this.getRemainingTime(currentTime);
    if (remaining === Infinity) {
      return '永久';
    }
    if (remaining === 0) {
      return '即将结束';
    }
    const seconds = Math.ceil(remaining / 1000);
    if (seconds < 60) {
      return `${seconds} 秒`;
    }
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
      return `${minutes} 分钟`;
    }
    const hours = Math.ceil(minutes / 60);
    return `${hours} 小时`;
  }

  // ========== 修改方法 ==========

  /**
   * 停用效果
   */
  deactivate(): Effect {
    if (!this.isActive) {
      return this;
    }
    return new Effect({
      definition: this.definition,
      startTime: this.startTime,
      duration: this.duration,
      intensity: this.intensity,
      currentStacks: this.currentStacks,
      isActive: false,
      lastTickTime: this.lastTickTime,
      bpIntensity: this.bpIntensity,
      currentDecay: this.currentDecay,
      lastDecayTime: this.lastDecayTime,
    });
  }

  /**
   * 添加堆叠
   */
  addStack(currentTime: number = Date.now()): Effect {
    if (!this.definition.canStack()) {
      return this;
    }
    const newStacks = Math.min(this.currentStacks + 1, this.definition.maxStacks);
    if (newStacks === this.currentStacks) {
      return this;
    }
    return new Effect({
      definition: this.definition,
      startTime: this.startTime,
      duration: this.duration,
      intensity: this.intensity,
      currentStacks: newStacks,
      isActive: this.isActive,
      lastTickTime: this.lastTickTime,
      bpIntensity: this.bpIntensity,
      currentDecay: this.currentDecay,
      lastDecayTime: this.lastDecayTime,
    });
  }

  /**
   * 移除堆叠
   */
  removeStack(): Effect {
    if (this.currentStacks <= 1) {
      return this.deactivate();
    }
    return new Effect({
      definition: this.definition,
      startTime: this.startTime,
      duration: this.duration,
      intensity: this.intensity,
      currentStacks: this.currentStacks - 1,
      isActive: this.isActive,
      lastTickTime: this.lastTickTime,
      bpIntensity: this.bpIntensity,
      currentDecay: this.currentDecay,
      lastDecayTime: this.lastDecayTime,
    });
  }

  /**
   * 更新周期时间
   */
  updateTick(currentTime: number = Date.now()): Effect {
    return new Effect({
      definition: this.definition,
      startTime: this.startTime,
      duration: this.duration,
      intensity: this.intensity,
      currentStacks: this.currentStacks,
      isActive: this.isActive,
      lastTickTime: currentTime,
      bpIntensity: this.bpIntensity,
      currentDecay: this.currentDecay,
      lastDecayTime: this.lastDecayTime,
    });
  }

  /**
   * 延长持续时间
   */
  extendDuration(additionalTime: number): Effect {
    if (this.definition.isPermanent()) {
      return this;
    }
    return new Effect({
      definition: this.definition,
      startTime: this.startTime,
      duration: this.duration + additionalTime,
      intensity: this.intensity,
      currentStacks: this.currentStacks,
      isActive: this.isActive,
      lastTickTime: this.lastTickTime,
      bpIntensity: this.bpIntensity,
      currentDecay: this.currentDecay,
      lastDecayTime: this.lastDecayTime,
    });
  }

  /**
   * 设置强度
   */
  setIntensity(intensity: EffectIntensity): Effect {
    return new Effect({
      definition: this.definition,
      startTime: this.startTime,
      duration: this.duration,
      intensity,
      currentStacks: this.currentStacks,
      isActive: this.isActive,
      lastTickTime: this.lastTickTime,
      bpIntensity: this.bpIntensity,
      currentDecay: this.currentDecay,
      lastDecayTime: this.lastDecayTime,
    });
  }

  /**
   * 获取修饰符总值（考虑堆叠）
   */
  getModifierValue(target: string): number {
    const baseValue = this.definition.getModifierValue(target);
    return baseValue * this.currentStacks;
  }

  // ========== 身体部位方法 ==========

  /**
   * 获取指定身体部位的强度
   */
  getBodyPartIntensity(bodyPart: BodyPartId): number {
    return this.bpIntensity.get(bodyPart) ?? 0;
  }

  /**
   * 获取所有受影响的身体部位
   */
  getAffectedBodyParts(): BodyPartId[] {
    return this.bpIntensity.keySeq().toArray();
  }

  /**
   * 检查是否影响指定身体部位
   */
  affectsBodyPart(bodyPart: BodyPartId): boolean {
    return this.bpIntensity.has(bodyPart);
  }

  /**
   * 更新身体部位强度
   */
  updateBodyPartIntensity(bodyPart: BodyPartId, intensity: number): Effect {
    const newBpIntensity = this.bpIntensity.set(bodyPart, intensity);
    return new Effect({
      definition: this.definition,
      startTime: this.startTime,
      duration: this.duration,
      intensity: this.intensity,
      currentStacks: this.currentStacks,
      isActive: this.isActive,
      lastTickTime: this.lastTickTime,
      bpIntensity: newBpIntensity,
      currentDecay: this.currentDecay,
      lastDecayTime: this.lastDecayTime,
    });
  }

  // ========== 强度衰减方法 ==========

  /**
   * 应用强度衰减
   */
  applyIntensityDecay(currentTime: number = Date.now()): Effect {
    if (!this.definition.hasIntensityDecay()) {
      return this;
    }

    const elapsed = currentTime - this.lastDecayTime;
    if (elapsed < 60000) { // 每分钟更新一次
      return this;
    }

    const newIntensity = this.definition.getDecayedIntensity(currentTime - this.startTime);
    if (newIntensity === this.intensity) {
      return this;
    }

    return new Effect({
      definition: this.definition,
      startTime: this.startTime,
      duration: this.duration,
      intensity: newIntensity,
      currentStacks: this.currentStacks,
      isActive: this.isActive,
      lastTickTime: this.lastTickTime,
      bpIntensity: this.bpIntensity,
      currentDecay: this.currentDecay + 1,
      lastDecayTime: currentTime,
    });
  }

  /**
   * 检查强度是否应该衰减
   */
  shouldDecayIntensity(currentTime: number = Date.now()): boolean {
    if (!this.definition.hasIntensityDecay()) {
      return false;
    }
    return currentTime - this.lastDecayTime >= 60000;
  }

  // ========== 显示方法 ==========

  /**
   * 获取显示名称
   */
  getDisplayName(): string {
    const stackInfo = this.currentStacks > 1 ? ` (${this.currentStacks}x)` : '';
    return `${this.definition.name}${stackInfo}`;
  }

  /**
   * 获取显示信息
   */
  getDisplayInfo(currentTime: number = Date.now()): string {
    if (!this.isActive) {
      return `${this.definition.name} (已停用)`;
    }

    const remaining = this.getRemainingTimeDescription(currentTime);
    const intensity = this.definition.getIntensityDescription();
    const progress = this.getProgressPercent(currentTime);

    return `${this.getDisplayName()} - ${intensity} | 剩余: ${remaining} (${progress}%)`;
  }

  /**
   * 获取详细描述
   */
  getDetailedDescription(currentTime: number = Date.now()): string {
    const lines: string[] = [
      this.definition.name,
      `强度: ${this.definition.getIntensityDescription()}`,
      `类别: ${this.definition.category}`,
    ];

    if (this.definition.canStack()) {
      lines.push(`堆叠: ${this.currentStacks}/${this.definition.maxStacks}`);
    }

    if (!this.definition.isPermanent()) {
      lines.push(`剩余时间: ${this.getRemainingTimeDescription(currentTime)}`);
    }

    if (this.definition.modifiers.size > 0) {
      lines.push('效果:');
      for (const modifier of this.definition.modifiers) {
        const value = modifier.value * this.currentStacks;
        const sign = value >= 0 ? '+' : '';
        lines.push(`  ${modifier.target}: ${sign}${value}`);
      }
    }

    return lines.join('\n');
  }

  // ========== 转换方法 ==========

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      id: this.definition.id,
      startTime: this.startTime,
      duration: this.duration,
      intensity: this.intensity,
      currentStacks: this.currentStacks,
      isActive: this.isActive,
      // 身体部位支持
      bpIntensity: this.bpIntensity.toObject(),
      // 强度衰减
      currentDecay: this.currentDecay,
      lastDecayTime: this.lastDecayTime,
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>, definition: EffectDefinition): Effect {
    // 解析身体部位强度映射
    let bpIntensity = definition.bpAffected;
    if (json.bpIntensity && typeof json.bpIntensity === 'object') {
      bpIntensity = Map(Object.entries(json.bpIntensity).map(([k, v]) => [k as BodyPartId, v as number]));
    }

    return new Effect({
      definition,
      startTime: (json.startTime as number) ?? Date.now(),
      duration: (json.duration as number) ?? definition.getDefaultDuration(),
      intensity: (json.intensity as EffectIntensity) ?? definition.intensity,
      currentStacks: (json.currentStacks as number) ?? 1,
      isActive: (json.isActive as boolean) ?? true,
      lastTickTime: (json.startTime as number) ?? Date.now(),
      // 身体部位支持
      bpIntensity: bpIntensity as BodyPartIntensityMap,
      // 强度衰减
      currentDecay: (json.currentDecay as number) ?? 0,
      lastDecayTime: (json.lastDecayTime as number) ?? Date.now(),
    });
  }
}
