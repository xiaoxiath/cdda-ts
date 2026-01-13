/**
 * 伤害类型 ID
 */
export type DamageTypeId = string

/**
 * 伤害类型枚举（对应 CDDA 的 damage_types.json）
 */
export const enum DamageType {
  BASH = 'bash',           // 钝击伤害
  CUT = 'cut',             // 切割伤害
  STAB = 'stab',           // 刺击伤害
  BULLET = 'bullet',       // 子弹伤害
  ACID = 'acid',           // 酸性伤害
  HEAT = 'heat',           // 热能伤害
  COLD = 'cold',           // 寒冷伤害
  ELECTRIC = 'electric',   // 电击伤害
  BIOLOGICAL = 'biological', // 生物伤害
  RADIATION = 'radiation', // 辐射伤害
}

/**
 * 伤害单位（单个伤害组件）
 * 对应 CDDA 的 damage_unit 结构
 */
export interface DamageUnit {
  type: DamageTypeId
  amount: number
  resPen: number        // 护甲穿透值
  resMult: number       // 护甲穿透倍率
  damageMult: number   // 伤害倍率
}

/**
 * 伤害实例（可包含多种伤害类型）
 * 对应 CDDA 的 damage_instance 结构
 */
export class DamageInstance {
  private units: DamageUnit[] = []

  constructor(damageUnits: DamageUnit[] = []) {
    this.units = [...damageUnits]
  }

  /**
   * 添加伤害
   */
  addDamage(type: DamageTypeId, amount: number, resPen = 0, resMult = 1, damageMult = 1): void {
    this.units.push({ type, amount, resPen, resMult, damageMult })
  }

  /**
   * 设置单个伤害单位
   */
  setDamage(type: DamageTypeId, amount: number, resPen = 0, resMult = 1, damageMult = 1): void {
    this.units = [{ type, amount, resPen, resMult, damageMult }]
  }

  /**
   * 获取所有伤害单位
   */
  getUnits(): ReadonlyArray<DamageUnit> {
    return this.units
  }

  /**
   * 计算总伤害
   */
  totalDamage(): number {
    return this.units.reduce((sum, unit) => sum + unit.amount * unit.damageMult, 0)
  }

  /**
   * 应用伤害倍率
   */
  multDamage(multiplier: number): void {
    this.units = this.units.map(unit => ({
      ...unit,
      amount: unit.amount * multiplier,
    }))
  }

  /**
   * 创建钝击伤害实例
   */
  static bash(amount: number, armorPen = 0): DamageInstance {
    return new DamageInstance([{
      type: DamageType.BASH,
      amount,
      resPen: armorPen,
      resMult: 1.0,
      damageMult: 1.0,
    }])
  }

  /**
   * 创建切割伤害实例
   */
  static cut(amount: number, armorPen = 0): DamageInstance {
    return new DamageInstance([{
      type: DamageType.CUT,
      amount,
      resPen: armorPen,
      resMult: 1.0,
      damageMult: 1.0,
    }])
  }

  /**
   * 创建穿刺伤害实例
   */
  static stab(amount: number, armorPen = 0): DamageInstance {
    return new DamageInstance([{
      type: DamageType.STAB,
      amount,
      resPen: armorPen,
      resMult: 1.0,
      damageMult: 1.0,
    }])
  }

  /**
   * 创建子弹伤害实例
   */
  static bullet(amount: number, armorPen = 0): DamageInstance {
    return new DamageInstance([{
      type: DamageType.BULLET,
      amount,
      resPen: armorPen,
      resMult: 1.0,
      damageMult: 1.0,
    }])
  }

  /**
   * 组合多种伤害
   */
  static combine(...instances: DamageInstance[]): DamageInstance {
    const combined = new DamageInstance()
    for (const inst of instances) {
      for (const unit of inst.getUnits()) {
        combined.addDamage(unit.type, unit.amount, unit.resPen, unit.resMult, unit.damageMult)
      }
    }
    return combined
  }
}

/**
 * 造成的伤害结果
 */
export interface DealtDamageInstance {
  damageInstance: DamageInstance
  actualDamage: number
  blocked: number
  penetrating: boolean
  critical: boolean
}

/**
 * 身体部位 ID
 */
export type BodyPartId =
  | 'head'       // 头部
  | 'eyes'       // 眼睛
  | 'mouth'      // 嘴巴
  | 'torso'      // 躯干
  | 'arm_l'      // 左臂
  | 'arm_r'      // 右臂
  | 'hand_l'     // 左手
  | 'hand_r'     // 右手
  | 'leg_l'      // 左腿
  | 'leg_r'      // 右腿
  | 'foot_l'     // 左脚
  | 'foot_r'     // 右脚
  | 'num_bp'     // 身体部位总数

/**
 * 身体部位最大 HP 值
 */
export const BODY_PART_HP_MAX: Record<BodyPartId, number> = {
  head: 80,
  eyes: 20,
  mouth: 30,
  torso: 100,
  arm_l: 60,
  arm_r: 60,
  hand_l: 40,
  hand_r: 40,
  leg_l: 70,
  leg_r: 70,
  foot_l: 30,
  foot_r: 30,
  num_bp: 0,
}
