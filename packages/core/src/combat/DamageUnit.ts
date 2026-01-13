/**
 * DamageUnit - 伤害单位
 *
 * 参考 Cataclysm-DDA 的 damage_unit 结构
 * 表示最小伤害单元，包含类型、数量和穿透属性
 */

import type {
  DamageTypeId,
  DamageAmount,
  ResistanceAmount,
  Multiplier,
} from './types';

// ============================================================================
// DamageUnit 类
// ============================================================================

/**
 * DamageUnit - 伤害单位类
 *
 * 表示最小伤害单元，不可变数据结构
 */
export class DamageUnit {
  // ============ 属性 ============

  /** 伤害类型 */
  readonly type: DamageTypeId;

  /** 伤害量 */
  readonly amount: DamageAmount;

  /** 护甲穿透值 */
  readonly resPen: ResistanceAmount;

  /** 抗性倍率 */
  readonly resMult: Multiplier;

  /** 伤害倍率 */
  readonly damageMult: Multiplier;

  /** 无条件抗性倍率（忽略护甲） */
  readonly unconditionalResMult: Multiplier;

  /** 无条件伤害倍率 */
  readonly unconditionalDamageMult: Multiplier;

  // ============ 构造函数 ============

  private constructor(props: DamageUnitProps) {
    this.type = props.type;
    this.amount = props.amount;
    this.resPen = props.resPen ?? 0;
    this.resMult = props.resMult ?? 1.0;
    this.damageMult = props.damageMult ?? 1.0;
    this.unconditionalResMult = props.unconditionalResMult ?? 1.0;
    this.unconditionalDamageMult = props.unconditionalDamageMult ?? 1.0;
  }

  // ============ 工厂方法 ============

  /**
   * 创建伤害单位
   */
  static create(
    type: DamageTypeId,
    amount: DamageAmount,
    resPen: ResistanceAmount = 0,
    resMult: Multiplier = 1.0,
    damageMult: Multiplier = 1.0
  ): DamageUnit {
    return new DamageUnit({
      type,
      amount,
      resPen,
      resMult,
      damageMult,
      unconditionalResMult: 1.0,
      unconditionalDamageMult: 1.0,
    });
  }

  /**
   * 创建无条件伤害单位（忽略护甲）
   */
  static createUnconditional(
    type: DamageTypeId,
    amount: DamageAmount,
    unconditionalResMult: Multiplier = 1.0,
    unconditionalDamageMult: Multiplier = 1.0
  ): DamageUnit {
    return new DamageUnit({
      type,
      amount,
      resPen: 0,
      resMult: 1.0,
      damageMult: 1.0,
      unconditionalResMult,
      unconditionalDamageMult,
    });
  }

  /**
   * 从属性对象创建
   */
  static fromProps(props: DamageUnitProps): DamageUnit {
    return new DamageUnit(props);
  }

  // ============ 修改方法 ============

  /**
   * 设置伤害量
   */
  withAmount(amount: DamageAmount): DamageUnit {
    return new DamageUnit({
      ...this.asProps(),
      amount,
    });
  }

  /**
   * 添加伤害量
   */
  addAmount(delta: DamageAmount): DamageUnit {
    return new DamageUnit({
      ...this.asProps(),
      amount: Math.max(0, this.amount + delta),
    });
  }

  /**
   * 设置伤害倍率
   */
  withDamageMult(mult: Multiplier): DamageUnit {
    return new DamageUnit({
      ...this.asProps(),
      damageMult: mult,
    });
  }

  /**
   * 设置抗性倍率
   */
  withResMult(mult: Multiplier): DamageUnit {
    return new DamageUnit({
      ...this.asProps(),
      resMult: mult,
    });
  }

  /**
   * 设置穿透值
   */
  withResPen(pen: ResistanceAmount): DamageUnit {
    return new DamageUnit({
      ...this.asProps(),
      resPen: pen,
    });
  }

  /**
   * 应用伤害倍率（可选择是否在护甲前）
   */
  multDamage(multiplier: Multiplier, preArmor: boolean): DamageUnit {
    if (preArmor) {
      return new DamageUnit({
        ...this.asProps(),
        unconditionalDamageMult: this.unconditionalDamageMult * multiplier,
      });
    } else {
      return new DamageUnit({
        ...this.asProps(),
        damageMult: this.damageMult * multiplier,
      });
    }
  }

  // ============ 计算方法 ============

  /**
   * 计算最终伤害量（应用所有倍率）
   */
  getFinalAmount(): DamageAmount {
    return Math.floor(this.amount * this.damageMult * this.unconditionalDamageMult);
  }

  /**
   * 计算有效穿透值
   */
  getEffectivePenetration(): ResistanceAmount {
    return Math.floor(this.resPen);
  }

  /**
   * 计算最终抗性倍率
   */
  getEffectiveResMult(): Multiplier {
    return this.resMult * this.unconditionalResMult;
  }

  /**
   * 计算对抗护甲后的伤害
   *
   * @param armor 护甲值
   * @returns 最终伤害
   */
  calculateDamage(armor: ResistanceAmount): DamageAmount {
    const pen = this.getEffectivePenetration();
    const effectiveArmor = Math.max(0, armor - pen);
    const resMult = this.getEffectiveResMult();
    const effectiveResist = effectiveArmor * resMult;
    const baseDamage = this.getFinalAmount();
    return Math.max(0, Math.floor(baseDamage - effectiveResist));
  }

  // ============ 工具方法 ============

  /**
   * 是否为零伤害
   */
  isZero(): boolean {
    return this.getFinalAmount() <= 0;
  }

  /**
   * 转换为属性对象
   */
  asProps(): DamageUnitProps {
    return {
      type: this.type,
      amount: this.amount,
      resPen: this.resPen,
      resMult: this.resMult,
      damageMult: this.damageMult,
      unconditionalResMult: this.unconditionalResMult,
      unconditionalDamageMult: this.unconditionalDamageMult,
    };
  }

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      type: this.type,
      amount: this.amount,
      resPen: this.resPen,
      resMult: this.resMult,
      damageMult: this.damageMult,
      unconditionalResMult: this.unconditionalResMult,
      unconditionalDamageMult: this.unconditionalDamageMult,
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>): DamageUnit {
    return new DamageUnit({
      type: json.type as DamageTypeId,
      amount: json.amount as DamageAmount,
      resPen: json.resPen as ResistanceAmount ?? 0,
      resMult: json.resMult as Multiplier ?? 1.0,
      damageMult: json.damageMult as Multiplier ?? 1.0,
      unconditionalResMult: json.unconditionalResMult as Multiplier ?? 1.0,
      unconditionalDamageMult: json.unconditionalDamageMult as Multiplier ?? 1.0,
    });
  }
}

// ============================================================================
// 类型导出
// ============================================================================

/**
 * DamageUnit 属性接口
 */
export interface DamageUnitProps {
  /** 伤害类型 */
  type: DamageTypeId;
  /** 伤害量 */
  amount: DamageAmount;
  /** 护甲穿透值 */
  resPen: ResistanceAmount;
  /** 抗性倍率 */
  resMult: Multiplier;
  /** 伤害倍率 */
  damageMult: Multiplier;
  /** 无条件抗性倍率 */
  unconditionalResMult: Multiplier;
  /** 无条件伤害倍率 */
  unconditionalDamageMult: Multiplier;
}

/**
 * 只读 DamageUnit 接口
 */
export interface ReadonlyDamageUnit {
  readonly type: DamageTypeId;
  readonly amount: DamageAmount;
  readonly resPen: ResistanceAmount;
  readonly resMult: Multiplier;
  readonly damageMult: Multiplier;
  readonly unconditionalResMult: Multiplier;
  readonly unconditionalDamageMult: Multiplier;
}
