/**
 * MaterialArmor - 材料护甲集成
 *
 * 实现材料系统与护甲系统的集成
 * 参考 Cataclysm-DDA 的材料抗性和护甲计算
 */

import { Map } from 'immutable';
import { MaterialDefinition, MaterialDefinitions } from './Material';
import type { DamageType } from '../combat/types';

// 重新导出 MaterialDefinitions 以便测试使用
export { MaterialDefinitions };

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 材料护甲数据
 */
export interface MaterialArmorData {
  /** 材料列表 */
  materials: MaterialDefinition[];
  /** 材料厚度（毫米） */
  thickness: number;
  /** 覆盖率（百分比） */
  coverage: number;
  /** 是否是刚性护甲 */
  rigid: boolean;
  /** 层数 */
  layers: number;
}

/**
 * 有效护甲值
 */
export interface EffectiveArmor {
  /** 对各伤害类型的抗性 */
  resistances: Map<DamageType, number>;
  /** 有效厚度 */
  effectiveThickness: number;
  /** 环境保护 */
  envProtection: number;
  /** 切割阻力 */
  cutResistance: number;
  /** 穿刺阻力 */
  stabResistance: number;
  /** 钝击阻力 */
  bashResistance: number;
}

// ============================================================================
// 材料护甲计算
// ============================================================================

/**
 * 计算材料组合的有效厚度
 *
 * 根据材料的硬度和厚度计算有效厚度
 */
export function calculateMaterialThickness(
  materials: MaterialDefinition[],
  baseThickness: number
): number {
  if (materials.length === 0) {
    return baseThickness;
  }

  // 过滤掉 undefined 的材料
  const validMaterials = materials.filter(m => m && m.properties);

  if (validMaterials.length === 0) {
    return baseThickness;
  }

  // 计算平均硬度
  const avgRigidity = validMaterials.reduce(
    (sum, mat) => sum + mat.properties.rigidity,
    0
  ) / validMaterials.length;

  // 硬度材料有更高的有效厚度
  const rigidityModifier = 0.5 + avgRigidity;

  return baseThickness * rigidityModifier;
}

/**
 * 计算材料组合的切割阻力
 */
export function calculateCutResistance(
  materials: MaterialDefinition[],
  thickness: number
): number {
  if (materials.length === 0) {
    return thickness * 2;
  }

  // 过滤掉 undefined 的材料
  const validMaterials = materials.filter(m => m && m.properties);

  if (validMaterials.length === 0) {
    return thickness * 2;
  }

  // 计算平均硬度和密度
  const avgRigidity = validMaterials.reduce(
    (sum, mat) => sum + mat.properties.rigidity,
    0
  ) / validMaterials.length;

  const avgDensity = validMaterials.reduce(
    (sum, mat) => sum + mat.properties.density,
    0
  ) / validMaterials.length;

  // 切割阻力 = 厚度 * 硬度因子 * 密度因子
  const rigidityFactor = 0.5 + avgRigidity * 0.5;
  const densityFactor = 0.5 + avgDensity * 0.3;

  return thickness * rigidityFactor * densityFactor * 2;
}

/**
 * 计算材料组合的穿刺阻力
 */
export function calculateStabResistance(
  materials: MaterialDefinition[],
  thickness: number
): number {
  if (materials.length === 0) {
    return thickness * 1.5;
  }

  // 过滤掉 undefined 的材料
  const validMaterials = materials.filter(m => m && m.properties);

  if (validMaterials.length === 0) {
    return thickness * 1.5;
  }

  // 穿刺阻力主要取决于硬度和厚度
  const avgRigidity = validMaterials.reduce(
    (sum, mat) => sum + mat.properties.rigidity,
    0
  ) / validMaterials.length;

  const rigidityFactor = 0.3 + avgRigidity * 0.7;

  return thickness * rigidityFactor * 1.5;
}

/**
 * 计算材料组合的钝击阻力
 */
export function calculateBashResistance(
  materials: MaterialDefinition[],
  thickness: number,
  rigid: boolean
): number {
  if (materials.length === 0) {
    return thickness;
  }

  // 过滤掉 undefined 的材料
  const validMaterials = materials.filter(m => m && m.properties);

  if (validMaterials.length === 0) {
    return thickness;
  }

  // 钝击阻力取决于密度和柔韧性
  const avgDensity = validMaterials.reduce(
    (sum, mat) => sum + mat.properties.density,
    0
  ) / validMaterials.length;

  const avgFlexibility = validMaterials.reduce(
    (sum, mat) => sum + mat.properties.flexibility,
    0
  ) / validMaterials.length;

  // 柔性材料对钝击有更好的吸收能力
  const flexibilityFactor = rigid ? 0.7 : (0.7 + avgFlexibility * 0.3);
  const densityFactor = 0.5 + avgDensity * 0.5;

  return thickness * flexibilityFactor * densityFactor;
}

/**
 * 计算材料组合对特定伤害类型的抗性
 */
export function calculateMaterialResistance(
  materials: MaterialDefinition[],
  damageType: DamageType,
  thickness: number
): number {
  if (materials.length === 0) {
    return 0;
  }

  // 过滤掉 undefined 的材料
  const validMaterials = materials.filter(m => m && typeof m.getResistanceForDamageType === 'function');

  if (validMaterials.length === 0) {
    return 0;
  }

  // 合并所有材料的抗性
  let totalResistance = 0;

  for (const material of validMaterials) {
    const materialResist = material.getResistanceForDamageType(damageType);
    totalResistance += materialResist;
  }

  // 厚度加成
  const thicknessBonus = thickness * 2;

  return totalResistance + thicknessBonus;
}

/**
 * 计算材料组合的环境保护
 */
export function calculateEnvProtection(
  materials: MaterialDefinition[],
  coverage: number,
  thickness: number
): number {
  if (materials.length === 0) {
    return coverage * 0.5;
  }

  // 过滤掉 undefined 的材料
  const validMaterials = materials.filter(m => m && m.properties);

  if (validMaterials.length === 0) {
    return coverage * 0.5;
  }

  // 环境保护基于覆盖率和厚度
  const thicknessModifier = Math.min(thickness / 5, 1);

  // 计算平均密度（影响防气体/液体能力）
  // 密度范围通常是 0.1-10，归一化到 0-1
  const avgDensity = validMaterials.reduce(
    (sum, mat) => sum + mat.properties.density,
    0
  ) / validMaterials.length;

  // 密度修正因子：使用对数缩放避免过度放大
  const densityModifier = 0.5 + Math.min(avgDensity / 10, 0.5);

  return Math.min(coverage * thicknessModifier * densityModifier, coverage);
}

/**
 * 计算有效护甲值
 */
export function calculateEffectiveArmor(
  materialData: MaterialArmorData
): EffectiveArmor {
  const { materials, thickness, coverage, rigid } = materialData;

  // 计算各种阻力
  const cutResistance = calculateCutResistance(materials, thickness);
  const stabResistance = calculateStabResistance(materials, thickness);
  const bashResistance = calculateBashResistance(materials, thickness, rigid);

  // 计算伤害类型抗性
  const resistances = Map<DamageType, number>({
    'CUT': calculateMaterialResistance(materials, 'CUT', thickness),
    'STAB': calculateMaterialResistance(materials, 'STAB', thickness),
    'BASH': calculateMaterialResistance(materials, 'BASH', thickness),
    'BULLET': calculateMaterialResistance(materials, 'BULLET', thickness),
    'ACID': calculateMaterialResistance(materials, 'ACID', thickness),
    'HEAT': calculateMaterialResistance(materials, 'HEAT', thickness),
    'COLD': calculateMaterialResistance(materials, 'COLD', thickness),
    'ELECTRIC': calculateMaterialResistance(materials, 'ELECTRIC', thickness),
    'BIAS': calculateMaterialResistance(materials, 'BIAS', thickness), // 免疫系统
  });

  // 计算有效厚度
  const effectiveThickness = calculateMaterialThickness(materials, thickness);

  // 计算环境保护
  const envProtection = calculateEnvProtection(materials, coverage, thickness);

  return {
    resistances,
    effectiveThickness,
    envProtection,
    cutResistance,
    stabResistance,
    bashResistance,
  };
}

/**
 * 根据材料 ID 列表获取材料定义
 */
export function getMaterialsByIds(materialIds: string[]): MaterialDefinition[] {
  const materials: MaterialDefinition[] = [];

  // 将 MaterialDefinitions 转换为数组以便遍历
  const materialArray = Object.values(MaterialDefinitions).filter(m => m && typeof m === 'object');

  for (const id of materialIds) {
    // 首先尝试通过 name 匹配（小写，如 'steel', 'cotton'）
    let material = materialArray.find(m => m && m.name === id);

    // 如果没有找到，尝试通过 id 匹配（如 'material_steel'）
    if (!material) {
      material = materialArray.find(m => m && m.id && (
        m.id.toString().toLowerCase() === id.toLowerCase() ||
        m.id.toString() === id
      ));
    }

    // 如果还没找到，尝试作为对象键查找（大写，如 'STEEL'）
    if (!material) {
      const upperKey = id.toUpperCase() as keyof typeof MaterialDefinitions;
      if (MaterialDefinitions[upperKey]) {
        material = MaterialDefinitions[upperKey];
      }
    }

    if (material) {
      materials.push(material);
    }
  }

  return materials;
}

// ============================================================================
// 工具类
// ============================================================================

/**
 * MaterialArmor - 材料护甲工具类
 *
 * 提供材料与护甲集成相关的计算方法
 */
export class MaterialArmor {
  /**
   * 从材料 ID 列表计算有效护甲
   */
  static calculateFromIds(
    materialIds: string[],
    thickness: number,
    coverage: number,
    rigid: boolean = true,
    layers: number = 1
  ): EffectiveArmor {
    const materials = getMaterialsByIds(materialIds);

    return calculateEffectiveArmor({
      materials,
      thickness,
      coverage,
      rigid,
      layers,
    });
  }

  /**
   * 获取护甲质量等级
   */
  static getArmorQuality(armor: EffectiveArmor): string {
    const avgResistance = (armor.cutResistance + armor.stabResistance + armor.bashResistance) / 3;

    if (avgResistance >= 30) return '顶级';
    if (avgResistance >= 20) return '优秀';
    if (avgResistance >= 12) return '良好';
    if (avgResistance >= 6) return '普通';
    if (avgResistance >= 3) return '较差';
    return '极差';
  }

  /**
   * 比较两个护甲的优劣
   */
  static compareArmor(a: EffectiveArmor, b: EffectiveArmor): number {
    const avgA = (a.cutResistance + a.stabResistance + a.bashResistance) / 3;
    const avgB = (b.cutResistance + b.stabResistance + b.bashResistance) / 3;

    return avgA - avgB;
  }

  /**
   * 获取护甲描述
   */
  static describeArmor(armor: EffectiveArmor): string {
    const quality = MaterialArmor.getArmorQuality(armor);

    const parts = [
      `质量: ${quality}`,
      `切割抗性: ${armor.cutResistance.toFixed(1)}`,
      `穿刺抗性: ${armor.stabResistance.toFixed(1)}`,
      `钝击抗性: ${armor.bashResistance.toFixed(1)}`,
      `有效厚度: ${armor.effectiveThickness.toFixed(2)}mm`,
      `环境保护: ${armor.envProtection.toFixed(0)}%`,
    ];

    return parts.join('\n');
  }
}

// ============================================================================
// 常见材料组合
// ============================================================================

/**
 * 预定义的材料组合
 */
export const MaterialCombinations = {
  /** 布料 */
  CLOTH: ['cotton'],

  /** 厚帆布 */
  CANVAS: ['cotton'],

  /** 皮革 */
  LEATHER: ['leather'],

  /** 牛仔布 */
  DENIM: ['denim'],

  /** 凯夫拉 */
  KEVLAR: ['kevlar'],

  /** 钢板 */
  STEEL_PLATE: ['steel'],

  /** 铁链 */
  IRON_CHAIN: ['iron'],

  /** 混合护甲（凯夫拉+钢板） */
  COMPOSITE: ['kevlar', 'steel'],

  /** 软皮革 */
  SOFT_LEATHER: ['leather', 'cotton'],

  /** 强化皮革 */
  REINFORCED_LEATHER: ['leather', 'iron'],

  /** 防弹背心 */
  BULLETPROOF_VEST: ['kevlar', 'steel', 'cotton'],

  /** 战术装备 */
  TACTICAL: ['kevlar', 'steel', 'cotton', 'plastic'],
} as const;

/**
 * 获取常见组合的护甲值
 */
export function getCommonArmorData(
  combination: keyof typeof MaterialCombinations,
  thickness: number,
  coverage: number,
  rigid: boolean = false
): EffectiveArmor {
  const materialIds = MaterialCombinations[combination];
  return MaterialArmor.calculateFromIds(materialIds, thickness, coverage, rigid);
}
