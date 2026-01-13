/**
 * EffectManager - 效果管理器
 *
 * 管理角色所有的效果状态，提供添加、移除、更新等功能
 */

import { Map, List } from 'immutable';
import type { EffectTypeId, BodyPartIntensityMap } from './types';
import { EffectModifierType } from './types';
import type { BodyPartId } from '../combat/types';
import type { EffectDefinition } from './EffectDefinition';
import { Effect } from './Effect';

/**
 * EffectManager 属性接口
 */
export interface EffectManagerProps {
  /** 所有活跃效果实例 */
  effects: Map<EffectTypeId, Effect>;
  /** 效果定义映射 */
  definitions: Map<EffectTypeId, EffectDefinition>;
}

/**
 * 效果管理器类
 *
 * 使用不可变数据结构
 */
export class EffectManager {
  readonly effects!: Map<EffectTypeId, Effect>;
  readonly definitions!: Map<EffectTypeId, EffectDefinition>;

  private constructor(props: EffectManagerProps) {
    this.effects = props.effects;
    this.definitions = props.definitions;

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建效果管理器
   */
  static create(definitions: EffectDefinition[]): EffectManager {
    const defMap = Map(definitions.map(d => [d.id, d] as [EffectTypeId, EffectDefinition]));

    return new EffectManager({
      effects: Map<EffectTypeId, Effect>(),
      definitions: defMap,
    });
  }

  /**
   * 从预定义效果创建
   */
  static createDefault(): EffectManager {
    const { EffectDefinitions } = require('./EffectDefinition');
    const defs = Object.values(EffectDefinitions) as EffectDefinition[];
    return EffectManager.create(defs);
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: {
    effects: Array<Record<string, any>>;
    definitions: Array<Record<string, any>>;
  }): EffectManager {
    const { EffectDefinition } = require('./EffectDefinition');
    const definitions = json.definitions.map(d => EffectDefinition.fromJson(d));
    const defMap = Map(definitions.map(d => [d.id, d] as [EffectTypeId, EffectDefinition]));

    const effects = Map<EffectTypeId, Effect>(
      json.effects.map(e => {
        const def = defMap.get(e.id as EffectTypeId);
        if (!def) {
          throw new Error(`Unknown effect ID: ${e.id}`);
        }
        return [e.id as EffectTypeId, Effect.fromJson(e, def)];
      })
    );

    return new EffectManager({
      effects,
      definitions: defMap,
    });
  }

  // ========== 效果查询 ==========

  /**
   * 获取效果
   */
  getEffect(id: EffectTypeId): Effect | undefined {
    return this.effects.get(id);
  }

  /**
   * 检查是否有效果
   */
  hasEffect(id: EffectTypeId): boolean {
    const effect = this.effects.get(id);
    return effect !== undefined && effect.isActive;
  }

  /**
   * 获取所有效果
   */
  getAllEffects(): Map<EffectTypeId, Effect> {
    return this.effects;
  }

  /**
   * 获取活跃效果
   */
  getActiveEffects(): List<Effect> {
    return List(this.effects.valueSeq().filter(e => e.isActive));
  }

  /**
   * 按类别获取效果
   */
  getEffectsByCategory(category: string): List<Effect> {
    return List(
      this.effects.valueSeq().filter(e => e.definition.category === category && e.isActive)
    );
  }

  /**
   * 获取增益效果
   */
  getBuffs(): List<Effect> {
    return List(this.effects.valueSeq().filter(e => e.isActive && e.definition.isBuff()));
  }

  /**
   * 获取减益效果
   */
  getDebuffs(): List<Effect> {
    return List(this.effects.valueSeq().filter(e => e.isActive && e.definition.isDebuff()));
  }

  /**
   * 获取效果数量
   */
  getEffectCount(): number {
    return this.effects.valueSeq().filter(e => e.isActive).count();
  }

  /**
   * 检查是否有特定类别的效果
   */
  hasEffectCategory(category: string): boolean {
    return this.effects.valueSeq().some(e => e.isActive && e.definition.category === category);
  }

  // ========== 身体部位效果查询 ==========

  /**
   * 获取影响指定身体部位的效果列表
   */
  getEffectsForBodyPart(bodyPart: BodyPartId): List<Effect> {
    return List(this.effects.valueSeq().filter(e => e.isActive && e.affectsBodyPart(bodyPart)));
  }

  /**
   * 获取指定身体部位的总强度
   */
  getBodyPartIntensity(bodyPart: BodyPartId): number {
    return this.effects.valueSeq()
      .filter(e => e.isActive)
      .reduce((sum, e) => sum + e.getBodyPartIntensity(bodyPart), 0);
  }

  /**
   * 检查指定身体部位是否有特定效果
   */
  bodyPartHasEffect(bodyPart: BodyPartId, effectId: EffectTypeId): boolean {
    const effect = this.effects.get(effectId);
    return effect !== undefined && effect.isActive && effect.affectsBodyPart(bodyPart);
  }

  // ========== 效果应用 ==========

  /**
   * 应用效果
   */
  applyEffect(
    id: EffectTypeId,
    currentTime: number = Date.now()
  ): EffectManager {
    const definition = this.definitions.get(id);
    if (!definition) {
      return this;
    }

    const existing = this.effects.get(id);

    // 如果已存在且可堆叠，增加堆叠
    if (existing && existing.isActive && definition.canStack()) {
      return new EffectManager({
        effects: this.effects.set(id, existing.addStack(currentTime)),
        definitions: this.definitions,
      });
    }

    // 否则创建新效果
    const newEffect = Effect.create(definition, currentTime);
    return new EffectManager({
      effects: this.effects.set(id, newEffect),
      definitions: this.definitions,
    });
  }

  /**
   * 应用指定持续时间的效果
   */
  applyEffectWithDuration(
    id: EffectTypeId,
    duration: number,
    currentTime: number = Date.now()
  ): EffectManager {
    const definition = this.definitions.get(id);
    if (!definition) {
      return this;
    }

    const existing = this.effects.get(id);

    // 如果已存在且可堆叠，增加堆叠并延长持续时间
    if (existing && existing.isActive && definition.canStack()) {
      return new EffectManager({
        effects: this.effects.set(id, existing.addStack(currentTime).extendDuration(duration)),
        definitions: this.definitions,
      });
    }

    const newEffect = Effect.withDuration(definition, duration, currentTime);
    return new EffectManager({
      effects: this.effects.set(id, newEffect),
      definitions: this.definitions,
    });
  }

  /**
   * 移除效果
   */
  removeEffect(id: EffectTypeId): EffectManager {
    const existing = this.effects.get(id);
    if (!existing) {
      return this;
    }

    // 如果可堆叠且有多个堆叠，减少堆叠
    if (existing.definition.canStack() && existing.currentStacks > 1) {
      return new EffectManager({
        effects: this.effects.set(id, existing.removeStack()),
        definitions: this.definitions,
      });
    }

    // 否则移除效果
    return new EffectManager({
      effects: this.effects.remove(id),
      definitions: this.definitions,
    });
  }

  /**
   * 移除所有效果
   */
  removeAllEffects(): EffectManager {
    return new EffectManager({
      effects: Map<EffectTypeId, Effect>(),
      definitions: this.definitions,
    });
  }

  /**
   * 移除指定类别的效果
   */
  removeEffectsByCategory(category: string): EffectManager {
    let newEffects = this.effects;

    for (const [id, effect] of this.effects.entries()) {
      if (effect.definition.category === category) {
        newEffects = newEffects.remove(id);
      }
    }

    return new EffectManager({
      effects: newEffects,
      definitions: this.definitions,
    });
  }

  /**
   * 移除所有增益
   */
  removeBuffs(): EffectManager {
    let newEffects = this.effects;

    for (const [id, effect] of this.effects.entries()) {
      if (effect.definition.isBuff()) {
        newEffects = newEffects.remove(id);
      }
    }

    return new EffectManager({
      effects: newEffects,
      definitions: this.definitions,
    });
  }

  /**
   * 移除所有减益
   */
  removeDebuffs(): EffectManager {
    let newEffects = this.effects;

    for (const [id, effect] of this.effects.entries()) {
      if (effect.definition.isDebuff()) {
        newEffects = newEffects.remove(id);
      }
    }

    return new EffectManager({
      effects: newEffects,
      definitions: this.definitions,
    });
  }

  // ========== 效果更新 ==========

  /**
   * 更新所有效果（处理过期和周期效果）
   */
  update(currentTime: number = Date.now()): EffectManager {
    let newEffects = this.effects;
    const messages: string[] = [];

    for (const [id, effect] of this.effects.entries()) {
      if (!effect.isActive) {
        newEffects = newEffects.remove(id);
        continue;
      }

      // 检查是否过期
      if (effect.isExpired(currentTime)) {
        if (effect.definition.messageEnd) {
          messages.push(effect.definition.messageEnd);
        }
        newEffects = newEffects.remove(id);
        continue;
      }

      let updatedEffect = effect;

      // 处理强度衰减
      if (effect.shouldDecayIntensity(currentTime)) {
        updatedEffect = updatedEffect.applyIntensityDecay(currentTime);
      }

      // 处理强度变化触发器
      const trigger = effect.definition.getActiveTrigger(effect.getElapsedTime(currentTime));
      if (trigger) {
        updatedEffect = updatedEffect.setIntensity(trigger.targetIntensity);
        if (trigger.message) {
          messages.push(trigger.message);
        }
      }

      // 处理周期效果
      if (updatedEffect.needsTick(currentTime)) {
        updatedEffect = updatedEffect.updateTick(currentTime);
      }

      newEffects = newEffects.set(id, updatedEffect);
    }

    return new EffectManager({
      effects: newEffects,
      definitions: this.definitions,
    });
  }

  // ========== 修饰符计算 ==========

  /**
   * 获取指定目标的修饰符总值
   */
  getModifierValue(target: string): number {
    let total = 0;

    for (const effect of this.effects.valueSeq()) {
      if (effect.isActive) {
        total += effect.getModifierValue(target);
      }
    }

    return total;
  }

  /**
   * 获取速度修正
   */
  getSpeedModifier(): number {
    let addModifier = 0;
    let multiplyModifier = 0;

    for (const effect of this.effects.valueSeq()) {
      if (!effect.isActive) continue;

      for (const modifier of effect.definition.modifiers) {
        if (modifier.target === 'all' || modifier.target === 'speed') {
          if (modifier.type === EffectModifierType.SPEED_ADD) {
            addModifier += modifier.value * effect.currentStacks;
          } else if (modifier.type === EffectModifierType.SPEED_MULTIPLY) {
            multiplyModifier += modifier.value * effect.currentStacks;
          }
        }
      }
    }

    return addModifier * (1 + multiplyModifier);
  }

  /**
   * 获取伤害修正
   */
  getDamageModifier(damageType: string): number {
    let addModifier = 0;
    let multiplyModifier = 0;

    for (const effect of this.effects.valueSeq()) {
      if (!effect.isActive) continue;

      for (const modifier of effect.definition.modifiers) {
        if (modifier.target === 'all' || modifier.target === damageType) {
          if (modifier.type === EffectModifierType.DAMAGE_ADD) {
            addModifier += modifier.value * effect.currentStacks;
          } else if (modifier.type === EffectModifierType.DAMAGE_MULTIPLY) {
            multiplyModifier += modifier.value * effect.currentStacks;
          }
        }
      }
    }

    return addModifier * (1 + multiplyModifier);
  }

  // ========== 显示方法 ==========

  /**
   * 获取效果列表字符串
   */
  getEffectListString(currentTime: number = Date.now()): string {
    const lines: string[] = [];

    // 先显示增益
    const buffs = this.getBuffs();
    if (buffs.size > 0) {
      lines.push('\n=== 增益效果 ===');
      for (const effect of buffs) {
        lines.push(`  ${effect.getDisplayInfo(currentTime)}`);
      }
    }

    // 再显示减益
    const debuffs = this.getDebuffs();
    if (debuffs.size > 0) {
      lines.push('\n=== 减益效果 ===');
      for (const effect of debuffs) {
        lines.push(`  ${effect.getDisplayInfo(currentTime)}`);
      }
    }

    if (lines.length === 0) {
      return '没有活跃效果';
    }

    return lines.join('\n');
  }

  /**
   * 获取详细效果列表
   */
  getDetailedEffectListString(currentTime: number = Date.now()): string {
    const lines: string[] = [];

    for (const effect of this.effects.valueSeq()) {
      if (!effect.isActive) continue;
      lines.push('\n---');
      lines.push(effect.getDetailedDescription(currentTime));
    }

    if (lines.length === 0) {
      return '没有活跃效果';
    }

    return lines.join('\n');
  }

  // ========== 统计信息 ==========

  /**
   * 获取总堆叠数
   */
  getTotalStacks(): number {
    return this.effects.valueSeq()
      .filter(e => e.isActive)
      .reduce((sum, e) => sum + e.currentStacks, 0);
  }

  /**
   * 获取最强效果（按堆叠数）
   */
  getStrongestEffect(): Effect | null {
    let strongest: Effect | null = null;
    let maxStacks = -1;

    for (const effect of this.effects.valueSeq()) {
      if (effect.isActive && effect.currentStacks > maxStacks) {
        strongest = effect;
        maxStacks = effect.currentStacks;
      }
    }

    return strongest;
  }

  // ========== 转换方法 ==========

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      effects: this.effects.valueSeq().map(e => e.toJson()).toArray(),
      definitions: this.definitions.valueSeq().map(d => d.toJson()).toArray(),
    };
  }
}
