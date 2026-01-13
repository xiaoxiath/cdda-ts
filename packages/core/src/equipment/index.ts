/**
 * Equipment Module - 装备系统
 *
 * 导出装备系统的所有核心类和类型
 */

// 类型定义
export * from './types';

// 核心类
export { EquipmentSlot, EquipmentSlots, AllEquipmentSlots } from './EquipmentSlot';
export { Equipment } from './Equipment';

// 材料系统
export { MaterialDefinition, MaterialDefinitions } from './Material';
export {
  MaterialArmor,
  calculateEffectiveArmor,
  calculateMaterialThickness,
  calculateCutResistance,
  calculateStabResistance,
  calculateBashResistance,
  calculateMaterialResistance,
  calculateEnvProtection,
  getMaterialsByIds,
  getCommonArmorData,
  MaterialCombinations,
  type MaterialArmorData,
  type EffectiveArmor,
} from './MaterialArmor';
