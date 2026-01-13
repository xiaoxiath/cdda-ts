/**
 * 物品附魔和变体系统
 *
 * 参考 Cataclysm-DDA 的 item enchantment 和 variant 系统
 * 处理物品的附魔效果和变体继承
 */

import { Map, List } from 'immutable';
import type { ItemTypeId, ItemFlagType, SkillId } from './types';
import type { Item } from './Item';

// ============ 附魔类型 ============

/**
 * 附魔类型枚举
 */
export enum EnchantmentType {
  // 属性加成
  STAT_BOOST = 'STAT_BOOST',           // 属性提升
  STAT_PENALTY = 'STAT_PENALTY',       // 属性降低
  SKILL_BOOST = 'SKILL_BOOST',         // 技能提升
  SPEED_BOOST = 'SPEED_BOOST',         // 速度提升
  SPEED_PENALTY = 'SPEED_PENALTY',     // 速度降低

  // 战斗加成
  DAMAGE_BOOST = 'DAMAGE_BOOST',       // 伤害提升
  DAMAGE_PENALTY = 'DAMAGE_PENALTY',   // 伤害降低
  ARMOR_BOOST = 'ARMOR_BOOST',         // 护甲提升
  ARMOR_PENALTY = 'ARMOR_PENALTY',     // 护甲降低
  ACCURACY_BOOST = 'ACCURACY_BOOST',   // 精度提升
  ACCURACY_PENALTY = 'ACCURACY_PENALTY', // 精度降低

  // 环境抗性
  FIRE_RESIST = 'FIRE_RESIST',         // 火焰抗性
  COLD_RESIST = 'COLD_RESIST',         // 寒冷抗性
  ELECTRIC_RESIST = 'ELECTRIC_RESIST', // 电力抗性
  ACID_RESIST = 'ACID_RESIST',         // 酸液抗性

  // 特殊效果
  NIGHT_VISION = 'NIGHT_VISION',       // 夜视
  INFRARED = 'INFRARED',               // 红外视觉
  CLAIRVOYANCE = 'CLAIRVOYANCE',       // 千里眼
  TELEPATHY = 'TELEPATHY',             // 心灵感应

  // 消耗品效果
  QUICK_CONSUME = 'QUICK_CONSUME',     // 快速消耗
  NO_CONSUME = 'NO_CONSUME',           // 不消耗
  INFINITE_AMMO = 'INFINITE_AMMO',     // 无限弹药

  // 容器效果
  PRESERVES = 'PRESERVES',             // 保鲜
  WATERPROOF = 'WATERPROOF',           // 防水
  AIRTIGHT = 'AIRTIGHT',               // 气密

  // 工具效果
  QUIET = 'QUIET',                     // 静音
  UNBREAKABLE = 'UNBREAKABLE',         // 不可破坏
  RECHARGING = 'RECHARGING',           // 自动充能

  // 自定义
  CUSTOM = 'CUSTOM',
}

// ============ 附魔定义 ============

/**
 * 附魔效果定义
 */
export interface EnchantmentEffect {
  /** 附魔类型 */
  type: EnchantmentType;
  /** 效果值 */
  value?: number;
  /** 效果 ID（用于技能、属性等） */
  id?: string;
  /** 是否是永久效果 */
  permanent?: boolean;
  /** 持续时间（毫秒，临时附魔用） */
  duration?: number;
  /** 触发条件 */
  condition?: string;
  /** 消息描述 */
  message?: string;
}

/**
 * 附魔定义
 */
export interface Enchantment {
  /** 附魔 ID */
  id: string;
  /** 附魔名称 */
  name: string;
  /** 附魔描述 */
  description?: string;
  /** 附魔效果列表 */
  effects: List<EnchantmentEffect>;
  /** 附魔强度 */
  intensity?: number;
  /** 附加标志 */
  addedFlags?: Set<ItemFlagType>;
  /** 移除标志 */
  removedFlags?: Set<ItemFlagType>;
}

// ============ 变体类型 ============

/**
 * 变体类型
 */
export enum VariantType {
  MATERIAL = 'MATERIAL',     // 材质变体
  COLOR = 'COLOR',           // 颜色变体
  STYLE = 'STYLE',           // 样式变体
  QUALITY = 'QUALITY',       // 品质变体
  SIZE = 'SIZE',             // 尺寸变体
  CONDITION = 'CONDITION',   // 状况变体
  CUSTOM = 'CUSTOM',         // 自定义变体
}

/**
 * 变体属性覆盖
 */
export interface VariantOverride {
  /** 名称前缀 */
  namePrefix?: string;
  /** 名称后缀 */
  nameSuffix?: string;
  /** 描述覆盖 */
  description?: string;
  /** 符号覆盖 */
  symbol?: string;
  /** 颜色覆盖 */
  color?: string;
  /** 重量修正 */
  weightMod?: number;
  /** 体积修正 */
  volumeMod?: number;
  /** 伤害修正 */
  damageMod?: number;
  /** 防御修正 */
  armorMod?: number;
  /** 价格修正 */
  priceMod?: number;
  /** 最大堆叠数修正 */
  stackSizeMod?: number;
  /** 添加标志 */
  addFlags?: Set<ItemFlagType>;
  /** 移除标志 */
  removeFlags?: Set<ItemFlagType>;
}

/**
 * 物品变体
 */
export interface ItemVariant {
  /** 变体 ID */
  id: ItemTypeId;
  /** 变体类型 */
  type: VariantType;
  /** 变体名称 */
  name: string;
  /** 继承的基础物品 ID */
  baseItemId: ItemTypeId;
  /** 属性覆盖 */
  overrides: VariantOverride;
  /** 附魔列表 */
  enchantments?: List<Enchantment>;
  /** 变体条件 */
  condition?: (item: Item) => boolean;
}

// ============ 附魔管理器 ============

/**
 * 附魔管理器
 */
export class EnchantmentManager {
  private readonly enchantments: List<Enchantment>;

  constructor(enchantments: List<Enchantment> = List()) {
    this.enchantments = enchantments;
  }

  /**
   * 创建空附魔管理器
   */
  static create(): EnchantmentManager {
    return new EnchantmentManager(List());
  }

  /**
   * 添加附魔
   */
  addEnchantment(enchantment: Enchantment): EnchantmentManager {
    return new EnchantmentManager(this.enchantments.push(enchantment));
  }

  /**
   * 移除附魔
   */
  removeEnchantment(enchantmentId: string): EnchantmentManager {
    return new EnchantmentManager(
      this.enchantments.filter(e => e.id !== enchantmentId)
    );
  }

  /**
   * 获取所有附魔
   */
  getEnchantments(): List<Enchantment> {
    return this.enchantments;
  }

  /**
   * 获取指定类型的附魔
   */
  getEnchantmentsByType(type: EnchantmentType): List<Enchantment> {
    return List(this.enchantments.filter(e => e.effects.some(eff => eff.type === type)));
  }

  /**
   * 检查是否有指定类型的附魔
   */
  hasEnchantmentType(type: EnchantmentType): boolean {
    return this.enchantments.some(e =>
      e.effects.some(eff => eff.type === type)
    );
  }

  /**
   * 计算附魔对属性的总修正值
   */
  getStatBonus(statId: string): number {
    let total = 0;

    for (const enchantment of this.enchantments) {
      for (const effect of enchantment.effects) {
        if (effect.type === EnchantmentType.STAT_BOOST && effect.id === statId) {
          total += effect.value || 0;
        }
        if (effect.type === EnchantmentType.STAT_PENALTY && effect.id === statId) {
          total += effect.value || 0;
        }
      }
    }

    return total;
  }

  /**
   * 计算附魔对伤害的总修正值
   */
  getDamageBonus(): number {
    let total = 0;

    for (const enchantment of this.enchantments) {
      for (const effect of enchantment.effects) {
        if (effect.type === EnchantmentType.DAMAGE_BOOST) {
          total += effect.value || 0;
        }
        if (effect.type === EnchantmentType.DAMAGE_PENALTY) {
          total += effect.value || 0;
        }
      }
    }

    return total;
  }

  /**
   * 计算附魔对护甲的总修正值
   */
  getArmorBonus(): number {
    let total = 0;

    for (const enchantment of this.enchantments) {
      for (const effect of enchantment.effects) {
        if (effect.type === EnchantmentType.ARMOR_BOOST) {
          total += effect.value || 0;
        }
        if (effect.type === EnchantmentType.ARMOR_PENALTY) {
          total += effect.value || 0;
        }
      }
    }

    return total;
  }

  /**
   * 计算附魔对速度的总修正值
   */
  getSpeedBonus(): number {
    let total = 0;

    for (const enchantment of this.enchantments) {
      for (const effect of enchantment.effects) {
        if (effect.type === EnchantmentType.SPEED_BOOST) {
          total += effect.value || 0;
        }
        if (effect.type === EnchantmentType.SPEED_PENALTY) {
          total += effect.value || 0;
        }
      }
    }

    return total;
  }

  /**
   * 检查是否有特定抗性
   */
  hasResistance(damageType: string): boolean {
    const resistTypes: Map<EnchantmentType, string> = Map([
      [EnchantmentType.FIRE_RESIST, 'fire'],
      [EnchantmentType.COLD_RESIST, 'cold'],
      [EnchantmentType.ELECTRIC_RESIST, 'electric'],
      [EnchantmentType.ACID_RESIST, 'acid'],
    ]);

    for (const [enchantType, resistType] of resistTypes) {
      if (damageType === resistType && this.hasEnchantmentType(enchantType)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取所有附加的标志
   */
  getAddedFlags(): Set<ItemFlagType> {
    const flags = new Set<ItemFlagType>();

    for (const enchantment of this.enchantments) {
      if (enchantment.addedFlags) {
        for (const flag of enchantment.addedFlags) {
          flags.add(flag);
        }
      }
    }

    return flags;
  }

  /**
   * 获取所有移除的标志
   */
  getRemovedFlags(): Set<ItemFlagType> {
    const flags = new Set<ItemFlagType>();

    for (const enchantment of this.enchantments) {
      if (enchantment.removedFlags) {
        for (const flag of enchantment.removedFlags) {
          flags.add(flag);
        }
      }
    }

    return flags;
  }

  /**
   * 转换为 JSON
   */
  toJson(): any[] {
    return this.enchantments.map(e => ({
      id: e.id,
      name: e.name,
      description: e.description,
      effects: e.effects.toArray(),
      intensity: e.intensity,
      addedFlags: e.addedFlags ? Array.from(e.addedFlags) : undefined,
      removedFlags: e.removedFlags ? Array.from(e.removedFlags) : undefined,
    })).toArray();
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: any[]): EnchantmentManager {
    const enchantments: Enchantment[] = [];

    for (const e of json) {
      enchantments.push({
        id: e.id,
        name: e.name,
        description: e.description,
        effects: List(e.effects.map((eff: any) => ({
          type: eff.type,
          value: eff.value,
          id: eff.id,
          permanent: eff.permanent,
          duration: eff.duration,
          condition: eff.condition,
          message: eff.message,
        }))),
        intensity: e.intensity,
        addedFlags: e.addedFlags ? new Set(e.addedFlags) : undefined,
        removedFlags: e.removedFlags ? new Set(e.removedFlags) : undefined,
      });
    }

    return new EnchantmentManager(List(enchantments));
  }
}

// ============ 变体管理器 ============

/**
 * 变体管理器
 */
export class VariantManager {
  private readonly variants: Map<ItemTypeId, ItemVariant>;

  constructor(variants: Map<ItemTypeId, ItemVariant> = Map()) {
    this.variants = variants;
  }

  /**
   * 创建空变体管理器
   */
  static create(): VariantManager {
    return new VariantManager(Map());
  }

  /**
   * 注册变体
   */
  registerVariant(variant: ItemVariant): VariantManager {
    return new VariantManager(this.variants.set(variant.id, variant));
  }

  /**
   * 获取变体
   */
  getVariant(variantId: ItemTypeId): ItemVariant | undefined {
    return this.variants.get(variantId);
  }

  /**
   * 获取物品的所有变体
   */
  getVariantsForItem(baseItemId: ItemTypeId): ItemVariant[] {
    return this.variants
      .valueSeq()
      .filter(v => v.baseItemId === baseItemId)
      .toArray();
  }

  /**
   * 应用变体到物品
   */
  applyVariant(item: Item, variant: ItemVariant): Item {
    let result = item;

    // 应用名称前缀/后缀
    if (variant.overrides.namePrefix || variant.overrides.nameSuffix) {
      // 名称通过类型定义处理，这里记录日志
      console.log(`Applying variant ${variant.id} to item ${item.id}`);
    }

    // 应用属性修正
    if (variant.overrides.weightMod) {
      // 重量修正需要通过类型定义处理
    }

    // 应用标志
    if (variant.overrides.addFlags || variant.overrides.removeFlags) {
      // 标志修正需要通过类型定义处理
    }

    // 应用附魔
    if (variant.enchantments && variant.enchantments.size > 0) {
      // 附魔通过 itemVars 存储引用
      for (const enchantment of variant.enchantments) {
        result = result.setItemVar(`enchantment_${enchantment.id}`, true);
      }
    }

    return result;
  }

  /**
   * 检查物品是否符合变体条件
   */
  checkVariantCondition(item: Item, variant: ItemVariant): boolean {
    if (variant.condition) {
      return variant.condition(item);
    }
    return true;
  }
}

// ============ 内置附魔定义 ============

/**
 * 火焰附魔
 */
export const fireEnchantment: Enchantment = {
  id: 'fire_enchantment',
  name: '火焰附魔',
  description: '物品燃烧着火焰',
  effects: List([
    { type: EnchantmentType.DAMAGE_BOOST, value: 5, message: '火焰伤害 +5' },
    { type: EnchantmentType.FIRE_RESIST, value: 1 },
  ]),
  intensity: 1,
  addedFlags: new Set(['FIRE' as ItemFlagType]),
};

/**
 * 冰霜附魔
 */
export const frostEnchantment: Enchantment = {
  id: 'frost_enchantment',
  name: '冰霜附魔',
  description: '物品散发着寒气',
  effects: List([
    { type: EnchantmentType.DAMAGE_BOOST, value: 3, message: '寒冷伤害 +3' },
    { type: EnchantmentType.COLD_RESIST, value: 1 },
  ]),
  intensity: 1,
  addedFlags: new Set(['FROST' as ItemFlagType]),
};

/**
 * 速度附魔
 */
export const speedEnchantment: Enchantment = {
  id: 'speed_enchantment',
  name: '速度附魔',
  description: '使物品更轻更快',
  effects: List([
    { type: EnchantmentType.SPEED_BOOST, value: 10, message: '速度 +10%' },
    { type: EnchantmentType.ACCURACY_BOOST, value: 5, message: '精度 +5%' },
  ]),
  intensity: 1,
};

/**
 * 夜视附魔
 */
export const nightVisionEnchantment: Enchantment = {
  id: 'night_vision_enchantment',
  name: '夜视附魔',
  description: '提供夜视能力',
  effects: List([
    { type: EnchantmentType.NIGHT_VISION, value: 1, permanent: true },
  ]),
  intensity: 1,
};

// ============ 内置变体定义 ============

/**
 * 材质变体 - 钢铁
 */
export const steelMaterialVariant: ItemVariant = {
  id: 'steel_material' as ItemTypeId,
  type: VariantType.MATERIAL,
  name: '钢铁',
  baseItemId: undefined as unknown as ItemTypeId, // 需要动态指定
  overrides: {
    nameSuffix: ' (钢铁)',
    weightMod: 1.1,
    armorMod: 1.2,
    priceMod: 1.0,
  },
};

/**
 * 材质变体 - 皮革
 */
export const leatherMaterialVariant: ItemVariant = {
  id: 'leather_material' as ItemTypeId,
  type: VariantType.MATERIAL,
  name: '皮革',
  baseItemId: undefined as unknown as ItemTypeId,
  overrides: {
    nameSuffix: ' (皮革)',
    weightMod: 0.8,
    armorMod: 0.8,
    priceMod: 0.5,
  },
};

/**
 * 材质变体 - 银
 */
export const silverMaterialVariant: ItemVariant = {
  id: 'silver_material' as ItemTypeId,
  type: VariantType.MATERIAL,
  name: '银',
  baseItemId: undefined as unknown as ItemTypeId,
  overrides: {
    nameSuffix: ' (银制)',
    damageMod: 1.5, // 对亡灵额外伤害
    priceMod: 3.0,
    addFlags: new Set(['SILVER' as ItemFlagType]),
  },
};

/**
 * 状况变体 - 损坏
 */
export const damagedConditionVariant: ItemVariant = {
  id: 'damaged_condition' as ItemTypeId,
  type: VariantType.CONDITION,
  name: '损坏',
  baseItemId: undefined as unknown as ItemTypeId,
  overrides: {
    namePrefix: '损坏的 ',
    weightMod: 0.9,
    armorMod: 0.8,
    damageMod: -0.2,
    priceMod: 0.5,
  },
  condition: (item: Item) => item.isDamaged() && !item.isBroken(),
};

/**
 * 状况变体 - 破旧
 */
export const wornConditionVariant: ItemVariant = {
  id: 'worn_condition' as ItemTypeId,
  type: VariantType.CONDITION,
  name: '破旧',
  baseItemId: undefined as unknown as ItemTypeId,
  overrides: {
    namePrefix: '破旧的 ',
    weightMod: 0.85,
    armorMod: 0.7,
    damageMod: -0.3,
    priceMod: 0.3,
  },
  condition: (item: Item) => item.damage > 1000,
};

/**
 * 品质变体 - 优质
 */
export const highQualityVariant: ItemVariant = {
  id: 'high_quality' as ItemTypeId,
  type: VariantType.QUALITY,
  name: '优质',
  baseItemId: undefined as unknown as ItemTypeId,
  overrides: {
    namePrefix: '优质的 ',
    damageMod: 0.2,
    armorMod: 1.1,
    priceMod: 2.0,
  },
};

/**
 * 品质变体 - 精良
 */
export const superiorQualityVariant: ItemVariant = {
  id: 'superior_quality' as ItemTypeId,
  type: VariantType.QUALITY,
  name: '精良',
  baseItemId: undefined as unknown as ItemTypeId,
  overrides: {
    namePrefix: '精良的 ',
    damageMod: 0.5,
    armorMod: 1.3,
    priceMod: 5.0,
  },
};

// ============ 附魔/变体工厂函数 ============

/**
 * 创建附魔
 */
export function createEnchantment(
  id: string,
  name: string,
  effects: EnchantmentEffect[],
  options?: {
    description?: string;
    intensity?: number;
    addedFlags?: Set<ItemFlagType>;
    removedFlags?: Set<ItemFlagType>;
  }
): Enchantment {
  return {
    id,
    name,
    description: options?.description,
    effects: List(effects),
    intensity: options?.intensity || 1,
    addedFlags: options?.addedFlags,
    removedFlags: options?.removedFlags,
  };
}

/**
 * 创建变体
 */
export function createVariant(
  id: string,
  type: VariantType,
  name: string,
  baseItemId: ItemTypeId,
  overrides: VariantOverride,
  enchantments?: Enchantment[]
): ItemVariant {
  return {
    id: id as ItemTypeId,
    type,
    name,
    baseItemId,
    overrides,
    enchantments: enchantments ? List(enchantments) : List(),
  };
}

/**
 * 为物品添加附魔
 */
export function enchantItem(
  item: Item,
  enchantment: Enchantment
): { item: Item; manager: EnchantmentManager } {
  // 获取或创建附魔管理器
  const manager = item.enchantmentManager || EnchantmentManager.create();
  const newManager = manager.addEnchantment(enchantment);

  // 将附魔管理器设置到物品上
  const enchantedItem = item.set('enchantmentManager', newManager);

  return {
    item: enchantedItem,
    manager: newManager,
  };
}
