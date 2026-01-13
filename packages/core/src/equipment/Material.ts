/**
 * Material - 材料系统
 *
 * 参考 Cataclysm-DDA 的 material 系统
 * 材料决定装备的抗性、厚度等属性
 */

import { Map } from 'immutable';
import type {
  MaterialId,
  MaterialDefinition,
  MaterialProperties,
  MaterialResistances,
} from './types';
import { DamageType } from '../damage/types';

/**
 * MaterialDefinition - 材料定义类
 *
 * 定义材料的静态属性
 */
export class MaterialDefinition {
  readonly id!: MaterialId;
  readonly name!: string;
  readonly displayName!: string;
  readonly description!: string;
  readonly properties!: MaterialProperties;
  readonly resistances!: MaterialResistances;
  readonly baseThickness!: number;
  readonly isMetal!: boolean;
  readonly isOrganic!: boolean;

  private constructor(props: MaterialDefinition) {
    this.id = props.id;
    this.name = props.name;
    this.displayName = props.displayName;
    this.description = props.description ?? '';
    this.properties = props.properties;
    this.resistances = props.resistances;
    this.baseThickness = props.baseThickness;
    this.isMetal = props.isMetal ?? false;
    this.isOrganic = props.isOrganic ?? false;

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建材料定义
   */
  static create(props: MaterialDefinition): MaterialDefinition {
    return new MaterialDefinition(props);
  }

  /**
   * 创建金属材料
   */
  static metal(
    id: MaterialId,
    name: string,
    displayName: string,
    options?: Partial<MaterialDefinition>
  ): MaterialDefinition {
    return MaterialDefinition.create({
      id,
      name,
      displayName,
      properties: {
        rigidity: 0.9,
        flexibility: 0.1,
        density: 7.8,
        conductivity: 0.9,
        thermalConductivity: 0.8,
        flammability: 0.0,
        corrosionResistance: 0.5,
      },
      resistances: {
        bash: 0.8,
        cut: 0.7,
        stab: 0.6,
        bullet: 0.7,
        acid: 0.4,
        heat: 0.6,
        cold: 0.3,
        electric: 0.1,
      },
      baseThickness: 2,
      isMetal: true,
      isOrganic: false,
      ...options,
    });
  }

  /**
   * 创建布料材料
   */
  static cloth(
    id: MaterialId,
    name: string,
    displayName: string,
    options?: Partial<MaterialDefinition>
  ): MaterialDefinition {
    return MaterialDefinition.create({
      id,
      name,
      displayName,
      properties: {
        rigidity: 0.1,
        flexibility: 0.9,
        density: 0.5,
        conductivity: 0.0,
        thermalConductivity: 0.1,
        flammability: 0.8,
        corrosionResistance: 0.3,
      },
      resistances: {
        bash: 0.1,
        cut: 0.3,
        stab: 0.2,
        bullet: 0.1,
        acid: 0.3,
        heat: 0.2,
        cold: 0.4,
        electric: 0.0,
      },
      baseThickness: 0.5,
      isMetal: false,
      isOrganic: true,
      ...options,
    });
  }

  /**
   * 创建皮革材料
   */
  static leather(
    id: MaterialId,
    name: string,
    displayName: string,
    options?: Partial<MaterialDefinition>
  ): MaterialDefinition {
    return MaterialDefinition.create({
      id,
      name,
      displayName,
      properties: {
        rigidity: 0.3,
        flexibility: 0.7,
        density: 0.9,
        conductivity: 0.0,
        thermalConductivity: 0.2,
        flammability: 0.4,
        corrosionResistance: 0.4,
      },
      resistances: {
        bash: 0.3,
        cut: 0.5,
        stab: 0.4,
        bullet: 0.3,
        acid: 0.5,
        heat: 0.3,
        cold: 0.3,
        electric: 0.0,
      },
      baseThickness: 1.5,
      isMetal: false,
      isOrganic: true,
      ...options,
    });
  }

  /**
   * 创建塑料材料
   */
  static plastic(
    id: MaterialId,
    name: string,
    displayName: string,
    options?: Partial<MaterialDefinition>
  ): MaterialDefinition {
    return MaterialDefinition.create({
      id,
      name,
      displayName,
      properties: {
        rigidity: 0.5,
        flexibility: 0.5,
        density: 1.2,
        conductivity: 0.0,
        thermalConductivity: 0.1,
        flammability: 0.6,
        corrosionResistance: 0.7,
      },
      resistances: {
        bash: 0.4,
        cut: 0.2,
        stab: 0.2,
        bullet: 0.3,
        acid: 0.8,
        heat: 0.2,
        cold: 0.2,
        electric: 0.0,
      },
      baseThickness: 1,
      isMetal: false,
      isOrganic: false,
      ...options,
    });
  }

  /**
   * 创建骨头材料
   */
  static bone(
    id: MaterialId,
    name: string,
    displayName: string,
    options?: Partial<MaterialDefinition>
  ): MaterialDefinition {
    return MaterialDefinition.create({
      id,
      name,
      displayName,
      properties: {
        rigidity: 0.7,
        flexibility: 0.1,
        density: 1.8,
        conductivity: 0.0,
        thermalConductivity: 0.1,
        flammability: 0.1,
        corrosionResistance: 0.2,
      },
      resistances: {
        bash: 0.6,
        cut: 0.2,
        stab: 0.3,
        bullet: 0.4,
        acid: 0.6,
        heat: 0.2,
        cold: 0.2,
        electric: 0.0,
      },
      baseThickness: 1.5,
      isMetal: false,
      isOrganic: true,
      ...options,
    });
  }

  /**
   * 创建木头材料
   */
  static wood(
    id: MaterialId,
    name: string,
    displayName: string,
    options?: Partial<MaterialDefinition>
  ): MaterialDefinition {
    return MaterialDefinition.create({
      id,
      name,
      displayName,
      properties: {
        rigidity: 0.4,
        flexibility: 0.3,
        density: 0.7,
        conductivity: 0.0,
        thermalConductivity: 0.1,
        flammability: 0.9,
        corrosionResistance: 0.3,
      },
      resistances: {
        bash: 0.4,
        cut: 0.4,
        stab: 0.3,
        bullet: 0.2,
        acid: 0.3,
        heat: 0.1,
        cold: 0.2,
        electric: 0.0,
      },
      baseThickness: 2,
      isMetal: false,
      isOrganic: true,
      ...options,
    });
  }

  // ========== 计算方法 ==========

  /**
   * 计算有效厚度
   *
   * @param baseThickness 基础厚度
   * @param quality 材料质量 (0-1)
   * @returns 有效厚度
   */
  calculateEffectiveThickness(baseThickness: number, quality: number = 1.0): number {
    // 质量越高，有效厚度越高
    return baseThickness * this.baseThickness * (0.8 + quality * 0.4);
  }

  /**
   * 计算材料对特定伤害类型的抗性
   *
   * @param damageType 伤害类型
   * @returns 抗性值 (0-1)
   */
  getResistanceForDamageType(damageType: DamageType | string): number {
    const type = typeof damageType === 'string' ? damageType : damageType;

    switch (type) {
      case DamageType.BASH:
      case 'bash':
        return this.resistances.bash;
      case DamageType.CUT:
      case 'cut':
        return this.resistances.cut;
      case DamageType.STAB:
      case 'stab':
        return this.resistances.stab;
      case DamageType.BULLET:
      case 'bullet':
        return this.resistances.bullet;
      case DamageType.ACID:
      case 'acid':
        return this.resistances.acid;
      case DamageType.HEAT:
      case 'heat':
        return this.resistances.heat;
      case DamageType.COLD:
      case 'cold':
        return this.resistances.cold;
      case DamageType.ELECTRIC:
      case 'electric':
        return this.resistances.electric;
      default:
        return 0;
    }
  }

  /**
   * 计算装备重量修正
   *
   * @param baseWeight 基础重量
   * @returns 修正后的重量
   */
  calculateWeight(baseWeight: number): number {
    // 基于密度计算重量
    return baseWeight * (this.properties.density / 2.0);
  }

  /**
   * 检查是否易燃
   */
  isFlammable(): boolean {
    return this.properties.flammability > 0.5;
  }

  /**
   * 检查是否导电
   */
  isConductive(): boolean {
    return this.properties.conductivity > 0.5;
  }

  /**
   * 获取退化修正值
   *
   * @param temperature 环境温度
   * @param wetness 潮湿度 (0-1)
   * @returns 退化修正值 (0-1, 越小退化越快)
   */
  getDegradationModifier(temperature: number = 20, wetness: number = 0): number {
    let modifier = 1.0;

    // 温度影响
    if (temperature > 30) {
      modifier -= (temperature - 30) * 0.02; // 高温加速退化
    } else if (temperature < 0) {
      modifier -= Math.abs(temperature) * 0.01; // 低温也会加速退化
    }

    // 潮湿影响
    if (wetness > 0.5) {
      modifier -= (wetness - 0.5) * 0.3; // 潮湿加速退化
    }

    // 材料自身抗腐蚀性
    modifier += this.properties.corrosionResistance * 0.2;

    return Math.max(0.1, Math.min(1.0, modifier));
  }

  // ========== 显示方法 ==========

  /**
   * 获取显示描述
   */
  getDisplayDescription(): string {
    const lines = [
      `=== ${this.displayName} ===`,
      this.description,
      '',
      `属性:`,
      `  刚性: ${(this.properties.rigidity * 100).toFixed(0)}%`,
      `  柔性: ${(this.properties.flexibility * 100).toFixed(0)}%`,
      `  密度: ${this.properties.density.toFixed(2)}`,
      '',
      `抗性:`,
      `  钝击: ${(this.resistances.bash * 100).toFixed(0)}%`,
      `  切割: ${(this.resistances.cut * 100).toFixed(0)}%`,
      `  刺击: ${(this.resistances.stab * 100).toFixed(0)}%`,
      `  子弹: ${(this.resistances.bullet * 100).toFixed(0)}%`,
      '',
      `基础厚度: ${this.baseThickness}`,
    ];

    if (this.isMetal) {
      lines.push('类型: 金属');
    } else if (this.isOrganic) {
      lines.push('类型: 有机');
    } else {
      lines.push('类型: 其他');
    }

    return lines.join('\n');
  }
}

/**
 * 预定义材料定义
 */
export const MaterialDefinitions = {
  // 金属材料
  IRON: MaterialDefinition.metal(
    'material_iron' as any,
    'iron',
    '铁',
    {
      baseThickness: 2,
    }
  ),

  STEEL: MaterialDefinition.metal(
    'material_steel' as any,
    'steel',
    '钢',
    {
      baseThickness: 3,
      resistances: {
        bash: 0.9,
        cut: 0.8,
        stab: 0.7,
        bullet: 0.8,
        acid: 0.5,
        heat: 0.7,
        cold: 0.4,
        electric: 0.1,
      },
    }
  ),

  COPPER: MaterialDefinition.metal(
    'material_copper' as any,
    'copper',
    '铜',
    {
      conductivity: 1.0,
      properties: {
        rigidity: 0.7,
        flexibility: 0.3,
        density: 8.9,
        conductivity: 1.0,
        thermalConductivity: 1.0,
        flammability: 0.0,
        corrosionResistance: 0.6,
      },
    }
  ),

  // 布料材料
  COTTON: MaterialDefinition.cloth(
    'material_cotton' as any,
    'cotton',
    '棉布',
    {
      flammability: 0.9,
    }
  ),

  WOOL: MaterialDefinition.cloth(
    'material_wool' as any,
    'wool',
    '羊毛',
    {
      thermalConductivity: 0.05,
      properties: {
        rigidity: 0.1,
        flexibility: 0.9,
        density: 0.4,
        conductivity: 0.0,
        thermalConductivity: 0.05,
        flammability: 0.6,
        corrosionResistance: 0.4,
      },
      resistances: {
        bash: 0.1,
        cut: 0.3,
        stab: 0.2,
        bullet: 0.1,
        acid: 0.3,
        heat: 0.3,
        cold: 0.7,
        electric: 0.0,
      },
    }
  ),

  LEATHER: MaterialDefinition.leather(
    'material_leather' as any,
    'leather',
    '皮革'
  ),

  DENIM: MaterialDefinition.cloth(
    'material_denim' as any,
    'denim',
    '牛仔布',
    {
      baseThickness: 0.8,
      properties: {
        rigidity: 0.2,
        flexibility: 0.8,
        density: 0.7,
        conductivity: 0.0,
        thermalConductivity: 0.1,
        flammability: 0.7,
        corrosionResistance: 0.4,
      },
      resistances: {
        bash: 0.15,
        cut: 0.4,
        stab: 0.25,
        bullet: 0.15,
        acid: 0.35,
        heat: 0.25,
        cold: 0.45,
        electric: 0.0,
      },
    }
  ),

  // 塑料材料
  PLASTIC: MaterialDefinition.plastic(
    'material_plastic' as any,
    'plastic',
    '塑料'
  ),

  KEVLAR: MaterialDefinition.plastic(
    'material_kevlar' as any,
    'kevlar',
    '凯夫拉',
    {
      baseThickness: 2,
      properties: {
        rigidity: 0.3,
        flexibility: 0.7,
        density: 1.4,
        conductivity: 0.0,
        thermalConductivity: 0.1,
        flammability: 0.2,
        corrosionResistance: 0.9,
      },
      resistances: {
        bash: 0.3,
        cut: 0.8,
        stab: 0.9,
        bullet: 0.9,
        acid: 0.9,
        heat: 0.3,
        cold: 0.2,
        electric: 0.0,
      },
    }
  ),

  // 有机材料
  BONE: MaterialDefinition.bone(
    'material_bone' as any,
    'bone',
    '骨头'
  ),

  WOOD: MaterialDefinition.wood(
    'material_wood' as any,
    'wood',
    '木头',
    {
      baseThickness: 2.5,
    }
  ),
};
