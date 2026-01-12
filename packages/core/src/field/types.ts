/**
 * 场强度等级
 */
export interface IntensityLevel {
  name: string;
  color?: string;
  symbol?: string;
  priority?: number;
}

/**
 * 场相态
 * 匹配 CDDA enums.h::phase_id
 */
export enum FieldPhase {
  /** 空/无效相态 */
  PNULL = 'pnull',
  /** 固体 */
  SOLID = 'solid',
  /** 液体 */
  LIQUID = 'liquid',
  /** 气体 */
  GAS = 'gas',
  /** 等离子体 */
  PLASMA = 'plasma',
}

/**
 * 场类型标志
 */
export enum FieldTypeFlag {
  ACID = 'ACID',
  AGGRESSIVE = 'AGGRESSIVE',
  ALCOHOL = 'ALCOHOL',
  ATOMIC = 'ATOMIC',
  BENEIGH = 'BENEIGH',
  BLOODY = 'BLOODY',
  BRITTLE = 'BRITTLE',
  CONDUCTIVE = 'CONDUCTIVE',
  CORROSIVE = 'CORROSIVE',
  DANGEROUS = 'DANGEROUS',
  DIFFUSION = 'DIFFUSION',
  DISPELLED_BY_FIRE = 'DISPELLED_BY_FIRE',
  EFFECT_SPREAD = 'EFFECT_SPREAD',
  ENFLAMMABLE = 'ENFLAMMABLE',
  FERTILIZER = 'FERTILIZER',
  FERTILIZES_PLANT = 'FERTILIZES_PLANT',
  FIRE = 'FIRE',
  FLAG_CHEM = 'FLAG_CHEM',
  FLAG_MUTAGEN = 'FLAG_MUTAGEN',
  FLAG_SOURCE = 'FLAG_SOURCE',
  FLAG_WEB = 'FLAG_WEB',
  FUME = 'FUME',
  GASEOUS = 'GASEOUS',
  HEAT = 'HEAT',
  HEAVY = 'HEAVY',
  HIDDEN = 'HIDDEN',
  HIGH_DENSITY = 'HIGH_DENSITY',
  INEVITABLE = 'INEVITABLE',
  INSECTICIDAL = 'INSECTICIDAL',
  INVESTIGATED = 'INVESTIGATED',
  LOUD = 'LOUD',
  LUNG_IRRITANT = 'LUNG_IRRITANT',
  MELTABLE = 'MELTABLE',
  MULTIPLE = 'MULTIPLE',
  NON_NEWTONIAN = 'NON_NEWTONIAN',
  OBSTACLE = 'OBSTACLE',
  OPTICALLY_INVISIBLE = 'OPTICALLY_INVISIBLE',
  PAINFUL = 'PAINFUL',
  POISON = 'POISON',
  PYRO = 'PYRO',
  RADIOACTIVE = 'RADIOACTIVE',
  REFRIGERANT = 'REFRIGERANT',
  REQUIRES_FLAMMABLE = 'REQUIRES_FLAMMABLE',
  REQUIRES_OXYGEN = 'REQUIRES_OXYGEN',
  SLOW = 'SLOW',
  SLUDGE = 'SLUDGE',
  SMOKE = 'SMOKE',
  SMOLDER = 'SMOLDER',
  SNARE = 'SNARE',
  SOLVENT = 'SOLVENT',
  SPREAD = 'SPREAD',
  STICKY = 'STICKY',
  STUN = 'STUN',
  SUICIDAL = 'SUICIDAL',
  SUPERHEAT = 'SUPERHEAT',
  TOXIC = 'TOXIC',
  TRANSPARENT = 'TRANSPARENT',
  UNBURIED = 'UNBURIED',
  URINE = 'URINE',
  VENTED = 'VENTED',
  WEB = 'WEB',
}

/**
 * 场类型标志集合
 */
export class FieldTypeFlags {
  private readonly _flags: Set<FieldTypeFlag>;

  constructor(flags?: FieldTypeFlag[]) {
    this._flags = new Set(flags);
    Object.freeze(this);
  }

  /**
   * 获取标志数量
   */
  get size(): number {
    return this._flags.size;
  }

  /**
   * 检查是否为空
   */
  isEmpty(): boolean {
    return this._flags.size === 0;
  }

  /**
   * 从 JSON 数组创建
   */
  static fromJson(json: string[]): FieldTypeFlags {
    const flags = json
      .map((s) => {
        const flag = Object.values(FieldTypeFlag).find((v) => v === s);
        return flag;
      })
      .filter((f): f is FieldTypeFlag => f !== undefined);

    return new FieldTypeFlags(flags);
  }

  /**
   * 获取所有标志
   */
  values(): FieldTypeFlag[] {
    return Array.from(this._flags);
  }

  /**
   * 检查是否有标志
   */
  hasFlag(flag: FieldTypeFlag): boolean {
    return this._flags.has(flag);
  }

  /**
   * 检查是否包含标志（Immutable.js Set 兼容）
   */
  has(flag: FieldTypeFlag): boolean {
    return this._flags.has(flag);
  }

  /**
   * 添加标志
   */
  add(flag: FieldTypeFlag): FieldTypeFlags {
    const newFlags = new Set(this._flags);
    newFlags.add(flag);
    return new FieldTypeFlags(Array.from(newFlags));
  }

  /**
   * 移除标志
   */
  remove(flag: FieldTypeFlag): FieldTypeFlags {
    const newFlags = new Set(this._flags);
    newFlags.delete(flag);
    return new FieldTypeFlags(Array.from(newFlags));
  }

  /**
   * 检查是否是火
   */
  isFire(): boolean {
    return this.has(FieldTypeFlag.FIRE);
  }

  /**
   * 检查是否是烟雾
   */
  isSmoke(): boolean {
    return this.has(FieldTypeFlag.SMOKE);
  }

  /**
   * 检查是否有毒
   */
  isToxic(): boolean {
    return (
      this.has(FieldTypeFlag.TOXIC) ||
      this.has(FieldTypeFlag.POISON) ||
      this.has(FieldTypeFlag.LUNG_IRRITANT) ||
      this.has(FieldTypeFlag.ACID)
    );
  }

  /**
   * 检查是否是酸
   */
  isAcid(): boolean {
    return this.has(FieldTypeFlag.ACID);
  }

  /**
   * 检查是否是液体
   */
  isLiquid(): boolean {
    return this.has(FieldTypeFlag.GASEOUS) === false;
  }

  /**
   * 检查是否危险
   */
  isDangerous(): boolean {
    return (
      this.has(FieldTypeFlag.DANGEROUS) ||
      this.has(FieldTypeFlag.FIRE) ||
      this.has(FieldTypeFlag.ACID) ||
      this.has(FieldTypeFlag.RADIOACTIVE)
    );
  }

  /**
   * 检查是否透明
   */
  isTransparent(): boolean {
    return this.has(FieldTypeFlag.TRANSPARENT);
  }

  /**
   * 检查是否扩散
   */
  spreads(): boolean {
    return this.has(FieldTypeFlag.SPREAD) || this.has(FieldTypeFlag.DIFFUSION);
  }

  /**
   * 检查是否粘滞
   */
  isSticky(): boolean {
    return this.has(FieldTypeFlag.STICKY) || this.has(FieldTypeFlag.SNARE);
  }

  /**
   * 检查是否导电
   */
  isConductive(): boolean {
    return this.has(FieldTypeFlag.CONDUCTIVE);
  }
}
