/**
 * Resistances - 抗性系统
 *
 * 参考 Cataclysm-DDA 的 resistances 结构
 * 管理护甲和生物抗性
 */

import { Map } from 'immutable';
import type {
  DamageTypeId,
  ResistanceAmount,
  BodyPartId,
} from './types';
import { createBodyPartId, createDamageTypeId } from './types';

// ============================================================================
// 抗性数据接口
// ============================================================================

/**
 * 身体部位抗性数据
 */
export interface BodyPartResistanceData {
  /** 部位 ID */
  bodyPart: BodyPartId;
  /** 抗性值映射 */
  resistances: Map<DamageTypeId, ResistanceAmount>;
}

// ============================================================================
// Resistances 类
// ============================================================================

/**
 * Resistances - 抗性类
 *
 * 管理角色或装备的抗性值
 */
export class Resistances {
  /** 抗性值映射 (伤害类型 -> 抗性值) */
  readonly resistances: Map<DamageTypeId, ResistanceAmount>;

  /** 身体部位特定抗性 (部位 -> (伤害类型 -> 抗性值)) */
  readonly bodyPartResistances: Map<BodyPartId, Map<DamageTypeId, ResistanceAmount>>;

  // ============ 构造函数 ============

  private constructor(
    resistances: Map<DamageTypeId, ResistanceAmount>,
    bodyPartResistances: Map<BodyPartId, Map<DamageTypeId, ResistanceAmount>>
  ) {
    this.resistances = resistances;
    this.bodyPartResistances = bodyPartResistances;
  }

  // ============ 工厂方法 ============

  /**
   * 创建空抗性
   */
  static create(): Resistances {
    return new Resistances(Map(), Map());
  }

  /**
   * 从抗性映射创建
   */
  static fromMap(resistances: Map<DamageTypeId, ResistanceAmount>): Resistances {
    return new Resistances(resistances, Map());
  }

  /**
   * 从对象创建
   */
  static fromObject(resistances: Record<string, ResistanceAmount>): Resistances {
    const mapped = Map<DamageTypeId, ResistanceAmount>(
      Object.entries(resistances).map(([key, value]) => [createDamageTypeId(key), value])
    );
    return new Resistances(mapped, Map());
  }

  /**
   * 从装备/物品创建（护甲）
   *
   * @param armorResistances 装备提供的抗性
   * @param coverage 覆盖率 (0-1)
   */
  static fromArmor(
    armorResistances: Map<DamageTypeId, ResistanceAmount>,
    coverage: number = 1.0
  ): Resistances {
    // 根据覆盖率调整抗性值
    const adjusted = armorResistances.map(
      value => Math.floor(value * coverage)
    );
    return new Resistances(adjusted, Map());
  }

  // ============ 抗性修改 ============

  /**
   * 设置抗性值
   */
  setResistance(type: DamageTypeId, value: ResistanceAmount): Resistances {
    return new Resistances(
      this.resistances.set(type, Math.max(0, value)),
      this.bodyPartResistances
    );
  }

  /**
   * 添加抗性值
   */
  addResistance(type: DamageTypeId, value: ResistanceAmount): Resistances {
    const current = this.resistances.get(type) ?? 0;
    return this.setResistance(type, current + value);
  }

  /**
   * 设置身体部位抗性
   */
  setBodyPartResistance(
    bodyPart: BodyPartId,
    type: DamageTypeId,
    value: ResistanceAmount
  ): Resistances {
    const currentPartResistances = this.bodyPartResistances.get(bodyPart) ?? Map();
    return new Resistances(
      this.resistances,
      this.bodyPartResistances.set(bodyPart, currentPartResistances.set(type, Math.max(0, value)))
    );
  }

  /**
   * 添加身体部位抗性
   */
  addBodyPartResistance(
    bodyPart: BodyPartId,
    type: DamageTypeId,
    value: ResistanceAmount
  ): Resistances {
    const currentPartResistances = this.bodyPartResistances.get(bodyPart) ?? Map();
    const current = currentPartResistances.get(type) ?? 0;
    return new Resistances(
      this.resistances,
      this.bodyPartResistances.set(bodyPart, currentPartResistances.set(type, current + value))
    );
  }

  /**
   * 合并抗性（取最大值）
   */
  merge(other: Resistances): Resistances {
    let mergedResistances = this.resistances;
    let mergedBodyPartResistances = this.bodyPartResistances;

    // 合并基础抗性
    for (const [type, value] of other.resistances.entries()) {
      const current = mergedResistances.get(type) ?? 0;
      mergedResistances = mergedResistances.set(type, Math.max(current, value));
    }

    // 合并身体部位抗性
    for (const [bodyPart, partResistances] of other.bodyPartResistances.entries()) {
      const currentPartResistances = mergedBodyPartResistances.get(bodyPart) ?? Map();
      for (const [type, value] of partResistances.entries()) {
        const current = currentPartResistances.get(type) ?? 0;
        mergedBodyPartResistances = mergedBodyPartResistances.set(
          bodyPart,
          currentPartResistances.set(type, Math.max(current, value))
        );
      }
    }

    return new Resistances(mergedResistances, mergedBodyPartResistances);
  }

  /**
   * 累加抗性
   */
  add(other: Resistances): Resistances {
    let sumResistances = this.resistances;
    let sumBodyPartResistances = this.bodyPartResistances;

    // 累加基础抗性
    for (const [type, value] of other.resistances.entries()) {
      const current = sumResistances.get(type) ?? 0;
      sumResistances = sumResistances.set(type, current + value);
    }

    // 累加身体部位抗性
    for (const [bodyPart, partResistances] of other.bodyPartResistances.entries()) {
      const currentPartResistances = sumBodyPartResistances.get(bodyPart) ?? Map();
      for (const [type, value] of partResistances.entries()) {
        const current = currentPartResistances.get(type) ?? 0;
        sumBodyPartResistances = sumBodyPartResistances.set(
          bodyPart,
          currentPartResistances.set(type, current + value)
        );
      }
    }

    return new Resistances(sumResistances, sumBodyPartResistances);
  }

  // ============ 抗性查询 ============

  /**
   * 获取抗性值
   */
  getResistance(type: DamageTypeId): ResistanceAmount {
    return this.resistances.get(type) ?? 0;
  }

  /**
   * 获取身体部位抗性值
   */
  getBodyPartResistance(bodyPart: BodyPartId, type: DamageTypeId): ResistanceAmount {
    const partResistances = this.bodyPartResistances.get(bodyPart);
    if (partResistances && partResistances.has(type)) {
      return partResistances.get(type)!;
    }
    // 如果部位没有特定抗性，使用基础抗性
    return this.getResistance(type);
  }

  /**
   * 获取有效抗性（基础与部位抗性的最大值）
   */
  getEffectiveResistance(bodyPart: BodyPartId | null, type: DamageTypeId): ResistanceAmount {
    if (bodyPart === null) {
      return this.getResistance(type);
    }
    const baseResist = this.getResistance(type);
    const partResist = this.getBodyPartResistance(bodyPart, type);
    return Math.max(baseResist, partResist);
  }

  /**
   * 检查是否有指定抗性
   */
  hasResistance(type: DamageTypeId): boolean {
    return (this.resistances.get(type) ?? 0) > 0;
  }

  /**
   * 检查是否完全免疫某种伤害
   */
  isImmuneTo(type: DamageTypeId): boolean {
    return (this.resistances.get(type) ?? 0) >= 1000; // CDDA 使用 1000+ 表示完全免疫
  }

  /**
   * 获取所有抗性
   */
  getAllResistances(): Map<DamageTypeId, ResistanceAmount> {
    return this.resistances;
  }

  /**
   * 获取所有身体部位抗性
   */
  getAllBodyPartResistances(): Map<BodyPartId, Map<DamageTypeId, ResistanceAmount>> {
    return this.bodyPartResistances;
  }

  // ============ 工具方法 ============

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    const resistancesObj: Record<string, any> = {};

    for (const [type, value] of this.resistances.entries()) {
      resistancesObj[type] = value;
    }

    const bodyPartResistancesObj: Record<string, any> = {};
    for (const [bodyPart, partResistances] of this.bodyPartResistances.entries()) {
      const partObj: Record<string, ResistanceAmount> = {};
      for (const [type, value] of partResistances.entries()) {
        partObj[type] = value;
      }
      bodyPartResistancesObj[bodyPart] = partObj;
    }

    return {
      resistances: resistancesObj,
      bodyPartResistances: bodyPartResistancesObj,
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>): Resistances {
    const resistances = Map<DamageTypeId, ResistanceAmount>(json.resistances ?? {});
    const bodyPartResistances: Map<BodyPartId, Map<DamageTypeId, ResistanceAmount>> = Map();

    if (json.bodyPartResistances) {
      for (const [bodyPart, partResistances] of Object.entries(json.bodyPartResistances)) {
        bodyPartResistances.set(
          createBodyPartId(bodyPart),
          Map(partResistances as Record<DamageTypeId, ResistanceAmount>)
        );
      }
    }

    return new Resistances(resistances, bodyPartResistances);
  }
}

// ============================================================================
// 预定义抗性常量
// ============================================================================

/**
 * 空抗性（无保护）
 */
export const EMPTY_RESISTANCES = Resistances.create();

/**
 * 轻型护甲抗性
 */
export const LIGHT_ARMOR_RESISTANCES = Resistances.fromObject({
  BASH: 10,
  CUT: 15,
  STAB: 10,
  BULLET: 5,
  HEAT: 5,
});

/**
 * 中型护甲抗性
 */
export const MEDIUM_ARMOR_RESISTANCES = Resistances.fromObject({
  BASH: 25,
  CUT: 30,
  STAB: 25,
  BULLET: 15,
  HEAT: 10,
});

/**
 * 重型护甲抗性
 */
export const HEAVY_ARMOR_RESISTANCES = Resistances.fromObject({
  BASH: 50,
  CUT: 60,
  STAB: 50,
  BULLET: 40,
  HEAT: 20,
});

/**
 * 完全抗性（免疫）
 */
export const IMMUNE_RESISTANCES = Resistances.fromObject({
  bash: 1000,
  cut: 1000,
  stab: 1000,
  heat: 1000,
  cold: 1000,
  electric: 1000,
  acid: 1000,
  biological: 1000,
});
