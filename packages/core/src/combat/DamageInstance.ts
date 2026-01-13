/**
 * DamageInstance - 伤害实例类
 *
 * 参考 Cataclysm-DDA 的 damage_instance 结构
 * 表示一组可以同时造成的伤害
 */

import { List } from 'immutable';
import type {
  DamageTypeId,
  DamageAmount,
  ResistanceAmount,
  Multiplier,
  EffectTypeId,
} from './types';
import type { ReadonlyDamageUnit, DamageInstance as IDamageInstance } from './types';

/**
 * 伤害单位属性
 */
export interface DamageUnitProps {
  type: DamageTypeId;
  amount: DamageAmount;
  resPen: ResistanceAmount;
  resMult: Multiplier;
  damageMult: Multiplier;
  unconditionalResMult: Multiplier;
  unconditionalDamageMult: Multiplier;
}

/**
 * 伤害单位（不可变）
 */
export class DamageUnit implements ReadonlyDamageUnit {
  readonly type!: DamageTypeId;
  readonly amount!: DamageAmount;
  readonly resPen!: ResistanceAmount;
  readonly resMult!: Multiplier;
  readonly damageMult!: Multiplier;
  readonly unconditionalResMult!: Multiplier;
  readonly unconditionalDamageMult!: Multiplier;

  constructor(props: DamageUnitProps) {
    const defaults = {
      resPen: 0,
      resMult: 1.0,
      damageMult: 1.0,
      unconditionalResMult: 1.0,
      unconditionalDamageMult: 1.0,
    };

    const finalProps = { ...defaults, ...props };

    Object.defineProperty(this, 'type', { value: finalProps.type, enumerable: true });
    Object.defineProperty(this, 'amount', { value: finalProps.amount, enumerable: true });
    Object.defineProperty(this, 'resPen', { value: finalProps.resPen, enumerable: true });
    Object.defineProperty(this, 'resMult', { value: finalProps.resMult, enumerable: true });
    Object.defineProperty(this, 'damageMult', { value: finalProps.damageMult, enumerable: true });
    Object.defineProperty(this, 'unconditionalResMult', { value: finalProps.unconditionalResMult, enumerable: true });
    Object.defineProperty(this, 'unconditionalDamageMult', { value: finalProps.unconditionalDamageMult, enumerable: true });

    Object.freeze(this);
  }

  /**
   * 创建伤害单位
   */
  static create(props: DamageUnitProps): DamageUnit {
    return new DamageUnit(props);
  }

  /**
   * 创建简单的伤害单位
   */
  static simple(type: DamageTypeId, amount: DamageAmount): DamageUnit {
    return new DamageUnit({
      type,
      amount,
      resPen: 0,
      resMult: 1.0,
      damageMult: 1.0,
      unconditionalResMult: 1.0,
      unconditionalDamageMult: 1.0,
    });
  }

  /**
   * 克隆并修改
   */
  set<K extends keyof DamageUnitProps>(key: K, value: DamageUnitProps[K]): DamageUnit {
    return new DamageUnit({ ...this, [key]: value });
  }
}

/**
 * DamageInstance 属性接口
 */
export interface DamageInstanceProps {
  damageUnits: ReadonlyDamageUnit[];
  onHitEffects: EffectTypeId[];
  onDamageEffects: EffectTypeId[];
}

/**
 * DamageInstance - 伤害实例类
 *
 * 表示一组可以同时造成的伤害
 */
export class DamageInstance implements IDamageInstance {
  readonly damageUnits!: List<ReadonlyDamageUnit>;
  readonly onHitEffects!: List<EffectTypeId>;
  readonly onDamageEffects!: List<EffectTypeId>;

  constructor(props?: DamageInstanceProps) {
    const defaults = {
      damageUnits: [],
      onHitEffects: [],
      onDamageEffects: [],
    };

    const finalProps = { ...defaults, ...props };

    Object.defineProperty(this, 'damageUnits', { value: List(finalProps.damageUnits), enumerable: true });
    Object.defineProperty(this, 'onHitEffects', { value: List(finalProps.onHitEffects), enumerable: true });
    Object.defineProperty(this, 'onDamageEffects', { value: List(finalProps.onDamageEffects), enumerable: true });

    Object.freeze(this);
  }

  // ========== 伤害操作 ==========

  /**
   * 添加伤害（合并相同类型）
   */
  addDamage(type: DamageTypeId, amount: DamageAmount, resPen: ResistanceAmount = 0): DamageInstance {
    // 检查是否已有相同类型的伤害
    const existingIndex = this.damageUnits.findIndex(unit => unit.type === type);

    if (existingIndex >= 0) {
      // 合并到现有伤害
      const existing = this.damageUnits.get(existingIndex)!;
      const merged: ReadonlyDamageUnit = new DamageUnit({
        type,
        amount: existing.amount + amount,
        resPen: Math.max(existing.resPen, resPen), // 使用更高的穿透值
        resMult: existing.resMult,
        damageMult: existing.damageMult,
        unconditionalResMult: existing.unconditionalResMult,
        unconditionalDamageMult: existing.unconditionalDamageMult,
      });
      const newUnits = [...this.damageUnits.toArray()];
      newUnits[existingIndex] = merged;
      return new DamageInstance({
        damageUnits: newUnits,
        onHitEffects: this.onHitEffects.toArray(),
        onDamageEffects: this.onDamageEffects.toArray(),
      });
    }

    // 添加新伤害
    const unit: ReadonlyDamageUnit = new DamageUnit({
      type,
      amount,
      resPen,
      resMult: 1.0,
      damageMult: 1.0,
      unconditionalResMult: 1.0,
      unconditionalDamageMult: 1.0,
    });
    return new DamageInstance({
      damageUnits: [...this.damageUnits.toArray(), unit],
      onHitEffects: this.onHitEffects.toArray(),
      onDamageEffects: this.onDamageEffects.toArray(),
    });
  }

  /**
   * 应用伤害倍率
   */
  multDamage(multiplier: Multiplier, preArmor: boolean = false): DamageInstance {
    const newUnits: ReadonlyDamageUnit[] = this.damageUnits.map(unit => {
      if (preArmor) {
        // 应用在护甲前的倍率（修改 damageMult）
        return new DamageUnit({
          type: unit.type,
          amount: unit.amount,
          resPen: unit.resPen,
          resMult: unit.resMult,
          damageMult: unit.damageMult * multiplier,
          unconditionalResMult: unit.unconditionalResMult,
          unconditionalDamageMult: unit.unconditionalDamageMult,
        });
      } else {
        // 应用在护甲后的倍率（修改 unconditionalDamageMult）
        return new DamageUnit({
          type: unit.type,
          amount: unit.amount,
          resPen: unit.resPen,
          resMult: unit.resMult,
          damageMult: unit.damageMult,
          unconditionalResMult: unit.unconditionalResMult,
          unconditionalDamageMult: unit.unconditionalDamageMult * multiplier,
        });
      }
    }).toArray();

    return new DamageInstance({
      damageUnits: newUnits,
      onHitEffects: this.onHitEffects.toArray(),
      onDamageEffects: this.onDamageEffects.toArray(),
    });
  }

  /**
   * 计算总伤害
   */
  totalDamage(): DamageAmount {
    return this.damageUnits.reduce((sum, unit) => {
      return sum + unit.amount * unit.damageMult * unit.unconditionalDamageMult;
    }, 0);
  }

  /**
   * 检查是否为空
   */
  isEmpty(): boolean {
    return this.damageUnits.isEmpty() || this.totalDamage() <= 0;
  }

  /**
   * 获取指定类型的伤害量
   */
  getDamageByType(type: DamageTypeId): DamageAmount {
    return this.damageUnits
      .filter(unit => unit.type === type)
      .reduce((sum, unit) => sum + unit.amount * unit.damageMult, 0);
  }

  /**
   * 检查是否包含指定伤害类型
   */
  hasDamageType(type: DamageTypeId): boolean {
    const typeUpper = type.toUpperCase();
    return this.damageUnits.some(unit => unit.type.toUpperCase() === typeUpper);
  }

  /**
   * 获取所有伤害类型
   */
  getDamageTypes(): DamageTypeId[] {
    return Array.from(new Set(this.damageUnits.map(unit => unit.type).toArray()));
  }

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      damageUnits: this.damageUnits.map(u => ({
        type: u.type,
        amount: u.amount,
        resPen: u.resPen,
        resMult: u.resMult,
        damageMult: u.damageMult,
        unconditionalResMult: u.unconditionalResMult,
        unconditionalDamageMult: u.unconditionalDamageMult,
      })).toArray(),
      onHitEffects: this.onHitEffects.toArray(),
      onDamageEffects: this.onDamageEffects.toArray(),
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>): DamageInstance {
    const units = (json.damageUnits ?? []).map((u: any) => new DamageUnit(u));
    return new DamageInstance({
      damageUnits: units,
      onHitEffects: json.onHitEffects ?? [],
      onDamageEffects: json.onDamageEffects ?? [],
    });
  }

  // ========== 效果操作 ==========

  /**
   * 添加命中效果
   */
  addOnHitEffect(effect: EffectTypeId): DamageInstance {
    return new DamageInstance({
      damageUnits: this.damageUnits.toArray(),
      onHitEffects: [...this.onHitEffects.toArray(), effect],
      onDamageEffects: this.onDamageEffects.toArray(),
    });
  }

  /**
   * 添加伤害效果
   */
  addOnDamageEffect(effect: EffectTypeId): DamageInstance {
    return new DamageInstance({
      damageUnits: this.damageUnits.toArray(),
      onHitEffects: this.onHitEffects.toArray(),
      onDamageEffects: [...this.onDamageEffects.toArray(), effect],
    });
  }

  // ========== 工厂方法 ==========

  /**
   * 创建空的伤害实例
   */
  static create(): DamageInstance {
    return new DamageInstance();
  }

  /**
   * 从伤害单位列表创建
   */
  static fromUnits(units: ReadonlyDamageUnit[]): DamageInstance {
    return new DamageInstance({
      damageUnits: units,
      onHitEffects: [],
      onDamageEffects: [],
    });
  }

  /**
   * 创建钝击伤害
   */
  static bash(amount: DamageAmount, armorPen: ResistanceAmount = 0): DamageInstance {
    return DamageInstance.create().addDamage('bash' as DamageTypeId, amount, armorPen);
  }

  /**
   * 创建切割伤害
   */
  static cut(amount: DamageAmount, armorPen: ResistanceAmount = 0): DamageInstance {
    return DamageInstance.create().addDamage('cut' as DamageTypeId, amount, armorPen);
  }

  /**
   * 创建穿刺伤害
   */
  static stab(amount: DamageAmount, armorPen: ResistanceAmount = 0): DamageInstance {
    return DamageInstance.create().addDamage('stab' as DamageTypeId, amount, armorPen);
  }

  /**
   * 组合多个伤害实例
   */
  static combine(...instances: DamageInstance[]): DamageInstance {
    let result = DamageInstance.create();

    for (const instance of instances) {
      for (const unit of instance.damageUnits) {
        result = result.addDamage(
          unit.type,
          unit.amount * unit.damageMult,
          unit.resPen
        );
      }
    }

    return result;
  }
}
