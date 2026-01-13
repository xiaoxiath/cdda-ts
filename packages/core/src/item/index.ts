/**
 * 物品系统模块
 *
 * 参考 Cataclysm-DDA 的 item.h, itype.h, inventory.h
 */

// ============ 类型定义 ============
export * from './types';

// ============ 腐烂系统 ============
export {
  SpoilState,
  calculateTemperatureFactor,
  calculateSpoilState,
  getRemainingTime as getSpoilageRemainingTime,
  isFresh,
  isWilting,
  isSpoiled,
  isRotten,
  createSpoilageData,
  updateSpoilageEnvironment,
  getSpoilageProgress,
  SpoilageConstants,
} from './spoilage';
export type { SpoilageData } from './spoilage';

// ============ 潮湿系统 ============
export {
  WetnessLevel,
  createWetnessData,
  getWetnessLevel,
  getWetnessLevelName,
  calculateWetnessEffect,
  updateWetness,
  addWetness,
  setWetness,
  isWet,
  isSoaked,
  getWetnessDescription,
  getMaterialDryFactor,
  getMaterialAbsorbFactor,
  calculateAbsorbedWetness,
  Wetness,
  BASE_DRY_RATE,
  WETNESS_WARMTH_PENALTY,
  WETNESS_WEIGHT_BONUS,
} from './wetness';
export type {
  WetnessValue,
  WetnessData,
  WetnessEffect,
} from './wetness';

// ============ 物品类型 ============
export { ItemType } from './ItemType';
export type {
  ToolSlot,
  ComestibleSlot,
  ArmorSlot,
  GunSlot,
  AmmoSlot,
  BookSlot,
  ModSlot,
  BionicSlot,
  EngineSlot,
  WheelSlot,
  FurnitureSlot,
  PetArmorSlot,
  GenericSlot,
} from './ItemType';

// ============ 物品实例 ============
export { Item } from './Item';

// ============ 容器系统 ============
export { ItemPocket } from './ItemPocket';
export type { ContainResult } from './ItemPocket';
export { ItemContents } from './ItemContents';
export type { PocketMatch } from './ItemContents';

// ============ 物品栏 ============
export { Inventory } from './Inventory';
export { InvletAssigner } from './Inventory';

// ============ 工厂 ============
export { ItemFactory } from './ItemFactory';
export type { Migration, ItemGroup, ItemGroupEntry, ItemGroupType } from './ItemFactory';

// ============ 加载器 ============
export { ItemLoader } from './ItemLoader';

// ============ 枪械和弹药系统 ============
export {
  getGunAmmo,
  hasAmmo,
  getMagazineSize,
  needsReload,
  isFullyLoaded,
  isAmmoCompatible,
  getDefaultAmmoType,
  calculateReloadAmount,
  reloadGun,
  getAmmoPerShot,
  fireGun,
  getGunRange,
  getGunDamage,
  getGunDispersion,
  getReloadTime,
  getGunSkill,
  getAmmoType,
  getAmmoStackSize,
  getCasingType,
  getAmmoDrop,
  getAmmoDropChance,
  isAmmoDropActive,
  // 新增：射击模式系统
  getFireModes,
  hasFireMode,
  getBurstCount,
  // 新增：后坐力和散布
  getGunRecoil,
  calculateDispersion,
  calculateReloadTime as calculateReloadTimeWithSkill,
  // 新增：枪械状态
  updateGunStateAfterFire,
  checkJam,
  resetGunState,
  // 新增：高级射击
  fireGunWithMode,
  clearJam,
  coolDownGun,
  // 新增：配件系统
  hasModSlot,
  getModSlots,
} from './weapon';
export type {
  FireResult,
  ReloadResult,
  FireMode,
  GunState,
  GunModSlot,
} from './weapon';

// ============ 物品堆叠系统 ============
export {
  canStackWith,
  isStackable,
  getMaxStackSize,
  getCurrentStackSize,
  calculateMergeAmount,
  mergeStacks,
  splitStack,
  takeFromStack,
  isStackFull,
  isStackEmpty,
  getStackSpace,
  isSingleItem,
  addToStack,
  removeFromStack,
  setStackCount,
  groupStackableItems,
  consolidateStacks,
} from './stacking';
export type { StackMergeResult, StackSplitResult } from './stacking';

// ============ 物品使用方法系统 ============
export {
  UseMethodType,
  useMethodRegistry,
  eatMethod,
  drinkMethod,
  toolActivateMethod,
  toolUseMethod,
  gunFireMethod,
  containerOpenMethod,
  containerCloseMethod,
  bookReadMethod,
  armorWearMethod,
  armorRemoveMethod,
  weaponAttackMethod,
  registerBuiltinUseMethods,
  getAvailableUseMethods,
  executeUseMethod,
  useItem,
  canUseItem,
  getUseTime,
  applySideEffects,
} from './use-methods';
export type {
  UseResult,
  UseSideEffect,
  UseContext,
  UseMethodDefinition,
  ApplySideEffectsResult,
} from './use-methods';

// ============ 物品附魔和变体系统 ============
export {
  EnchantmentType,
  VariantType,
  fireEnchantment,
  frostEnchantment,
  speedEnchantment,
  nightVisionEnchantment,
  steelMaterialVariant,
  leatherMaterialVariant,
  silverMaterialVariant,
  damagedConditionVariant,
  wornConditionVariant,
  highQualityVariant,
  superiorQualityVariant,
  EnchantmentManager,
  VariantManager,
  createEnchantment,
  createVariant,
  enchantItem,
} from './enchantments';
export type {
  EnchantmentEffect,
  Enchantment,
  VariantOverride,
  ItemVariant,
} from './enchantments';
