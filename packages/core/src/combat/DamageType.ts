/**
 * DamageType - 伤害类型定义
 *
 * 参考 Cataclysm-DDA 的 damage_type 结构
 * 定义每种伤害类型的属性和行为
 */

import { Set, Map } from 'immutable';
import type {
  DamageTypeId,
  SkillId,
} from './types';
import { DamageCategory } from './types';
import {
  createDamageTypeId,
  createSkillId,
} from './types';

// ============================================================================
// DamageType 插槽接口
// ============================================================================

/**
 * 基础插槽
 */
export interface DamageTypeBaseSlot {
  /** 类型 ID */
  id: DamageTypeId;
  /** 名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 分类 */
  category: DamageCategory;
}

/**
 * 物理属性插槽
 */
export interface DamageTypePhysicalSlot {
  /** 是否为物理伤害 */
  physical: boolean;
  /** 是否为边缘伤害 (切割/刺击) */
  edged: boolean;
}

/**
 * 热伤害插槽
 */
export interface DamageTypeHeatSlot {
  /** 是否为热伤害 */
  heat: boolean;
}

/**
 * 免疫标志插槽
 */
export interface DamageTypeImmuneSlot {
  /** 免疫标志集合 */
  immuneFlags: Set<string>;
}

/**
 * 技能关联插槽
 */
export interface DamageTypeSkillSlot {
  /** 关联技能 */
  skill: SkillId | null;
}

// ============================================================================
// DamageType 属性接口
// ============================================================================

/**
 * DamageType 完整属性接口
 */
export interface DamageTypeProps extends
  DamageTypeBaseSlot,
  DamageTypePhysicalSlot,
  DamageTypeHeatSlot,
  DamageTypeImmuneSlot,
  DamageTypeSkillSlot {}

// ============================================================================
// DamageType 类
// ============================================================================

/**
 * DamageType - 伤害类型类
 *
 * 定义伤害类型的静态属性，使用不可变数据结构
 */
export class DamageType {
  // ============ 基础属性 ============

  /** 类型 ID */
  readonly id: DamageTypeId;

  /** 名称 */
  readonly name: string;

  /** 描述 */
  readonly description: string | undefined;

  /** 分类 */
  readonly category: DamageCategory;

  // ============ 物理属性 ============

  /** 是否为物理伤害 */
  readonly physical: boolean;

  /** 是否为边缘伤害 */
  readonly edged: boolean;

  // ============ 热伤害 ============

  /** 是否为热伤害 */
  readonly heat: boolean;

  // ============ 免疫 ============

  /** 免疫标志 */
  readonly immuneFlags: Set<string>;

  // ============ 技能关联 ============

  /** 关联技能 */
  readonly skill: SkillId | null;

  // ============ 构造函数 ============

  private constructor(props: DamageTypeProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.category = props.category;
    this.physical = props.physical ?? false;
    this.edged = props.edged ?? false;
    this.heat = props.heat ?? false;
    this.immuneFlags = props.immuneFlags ?? Set();
    this.skill = props.skill ?? null;
  }

  // ============ 工厂方法 ============

  /**
   * 创建伤害类型
   */
  static create(props: DamageTypeProps): DamageType {
    return new DamageType(props);
  }

  /**
   * 从另一个 DamageType 复制创建
   */
  static copyFrom(
    other: DamageType,
    overrides: Partial<DamageTypeProps>
  ): DamageType {
    return DamageType.create({
      id: other.id,
      name: other.name,
      description: other.description,
      category: other.category,
      physical: other.physical,
      edged: other.edged,
      heat: other.heat,
      immuneFlags: other.immuneFlags,
      skill: other.skill,
      ...overrides,
    });
  }

  // ============ 类型检查方法 ============

  /**
   * 是否为物理伤害
   */
  isPhysical(): boolean {
    return this.physical;
  }

  /**
   * 是否为边缘伤害
   */
  isEdged(): boolean {
    return this.edged;
  }

  /**
   * 是否为热伤害
   */
  isHeat(): boolean {
    return this.heat;
  }

  /**
   * 是否为电击伤害
   */
  isElectric(): boolean {
    return this.category === DamageCategory.ELECTRIC;
  }

  /**
   * 是否为寒冷伤害
   */
  isCold(): boolean {
    return this.category === DamageCategory.COLD;
  }

  /**
   * 是否为生物伤害
   */
  isBiological(): boolean {
    return this.category === DamageCategory.BIOLOGICAL;
  }

  /**
   * 是否为毒素伤害
   */
  isPoison(): boolean {
    return this.category === DamageCategory.POISON;
  }

  /**
   * 是否为酸性伤害
   */
  isAcid(): boolean {
    return this.category === DamageCategory.ACID;
  }

  // ============ 免疫检查 ============

  /**
   * 检查是否有指定免疫标志
   */
  hasImmuneFlag(flag: string): boolean {
    return this.immuneFlags.contains(flag);
  }

  /**
   * 检查是否有任意免疫标志
   */
  hasAnyImmuneFlag(...flags: string[]): boolean {
    return flags.some(flag => this.immuneFlags.contains(flag));
  }

  /**
   * 检查是否有所有免疫标志
   */
  hasAllImmuneFlags(...flags: string[]): boolean {
    return flags.every(flag => this.immuneFlags.contains(flag));
  }

  // ============ 技能相关 ============

  /**
   * 是否有关联技能
   */
  hasSkill(): boolean {
    return this.skill !== null;
  }

  /**
   * 获取关联技能 ID
   */
  getSkill(): SkillId | null {
    return this.skill;
  }

  // ============ 工具方法 ============

  /**
   * 获取显示名称
   */
  getDisplayName(): string {
    return this.name;
  }

  /**
   * 获取描述
   */
  getDescription(): string {
    return this.description ?? `A ${this.name.toLowerCase()} damage type.`;
  }

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      physical: this.physical,
      edged: this.edged,
      heat: this.heat,
      immuneFlags: this.immuneFlags.toArray(),
      skill: this.skill,
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>): DamageType {
    return DamageType.create({
      id: createDamageTypeId(json.id as string),
      name: json.name as string,
      description: json.description as string | undefined,
      category: json.category as DamageCategory,
      physical: json.physical as boolean ?? false,
      edged: json.edged as boolean ?? false,
      heat: json.heat as boolean ?? false,
      immuneFlags: Set(json.immuneFlags ?? []),
      skill: json.skill ? createSkillId(json.skill as string) : null,
    });
  }
}

// ============================================================================
// 预定义伤害类型常量
// ============================================================================

/**
 * 预定义伤害类型
 */
export const DamageTypes = {
  /** 钝击伤害 */
  BASH: DamageType.create({
    id: createDamageTypeId('BASH'),
    name: 'Blunt',
    description: 'Blunt force trauma damage',
    category: DamageCategory.PHYSICAL,
    physical: true,
    edged: false,
    heat: false,
    immuneFlags: Set(),
    skill: null,
  }),

  /** 切割伤害 */
  CUT: DamageType.create({
    id: createDamageTypeId('CUT'),
    name: 'Cut',
    description: 'Sharp cutting damage',
    category: DamageCategory.PHYSICAL,
    physical: true,
    edged: true,
    heat: false,
    immuneFlags: Set(),
    skill: createSkillId('cutting'),
  }),

  /** 刺击伤害 */
  STAB: DamageType.create({
    id: createDamageTypeId('STAB'),
    name: 'Stab',
    description: 'Piercing stab damage',
    category: DamageCategory.PHYSICAL,
    physical: true,
    edged: true,
    heat: false,
    immuneFlags: Set(),
    skill: createSkillId('stabbing'),
  }),

  /** 火焰伤害 */
  HEAT: DamageType.create({
    id: createDamageTypeId('HEAT'),
    name: 'Heat',
    description: 'Fire and heat damage',
    category: DamageCategory.HEAT,
    physical: false,
    edged: false,
    heat: true,
    immuneFlags: Set(['FIRE_IMMUNE']),
    skill: null,
  }),

  /** 电击伤害 */
  ELECTRIC: DamageType.create({
    id: createDamageTypeId('ELECTRIC'),
    name: 'Electric',
    description: 'Electric shock damage',
    category: DamageCategory.ELECTRIC,
    physical: false,
    edged: false,
    heat: false,
    immuneFlags: Set(['ELECTRIC_IMMUNE']),
    skill: null,
  }),

  /** 寒冷伤害 */
  COLD: DamageType.create({
    id: createDamageTypeId('COLD'),
    name: 'Cold',
    description: 'Freezing cold damage',
    category: DamageCategory.COLD,
    physical: false,
    edged: false,
    heat: false,
    immuneFlags: Set(['COLD_IMMUNE']),
    skill: null,
  }),

  /** 生物伤害 */
  BIOLOGICAL: DamageType.create({
    id: createDamageTypeId('BIOLOGICAL'),
    name: 'Biological',
    description: 'Infection and disease damage',
    category: DamageCategory.BIOLOGICAL,
    physical: false,
    edged: false,
    heat: false,
    immuneFlags: Set(),
    skill: null,
  }),

  /** 酸性伤害 */
  ACID: DamageType.create({
    id: createDamageTypeId('ACID'),
    name: 'Acid',
    description: 'Corrosive acid damage',
    category: DamageCategory.ACID,
    physical: false,
    edged: false,
    heat: false,
    immuneFlags: Set(['ACID_IMMUNE']),
    skill: null,
  }),

  /** 窒息伤害 */
  OXYGEN: DamageType.create({
    id: createDamageTypeId('OXYGEN'),
    name: 'Suffocation',
    description: 'Oxygen deprivation damage',
    category: DamageCategory.BIOLOGICAL,
    physical: false,
    edged: false,
    heat: false,
    immuneFlags: Set(['NO_BREATHE', 'OXYGEN_IMMUNE']),
    skill: null,
  }),

  /** 辐射伤害 */
  RADIATION: DamageType.create({
    id: createDamageTypeId('RADIATION'),
    name: 'Radiation',
    description: 'Ionizing radiation damage',
    category: DamageCategory.SPECIAL,
    physical: false,
    edged: false,
    heat: false,
    immuneFlags: Set(['RADIATION_IMMUNE']),
    skill: null,
  }),
};
