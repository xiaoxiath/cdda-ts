/**
 * 枪械和弹药系统
 *
 * 参考 Cataclysm-DDA 的 gun 系统实现
 * 处理枪械装填、射击、弹药消耗等功能
 */

import type { ItemTypeId, AmmoTypeId } from './types';
import type { Item } from './Item';

// ============ 射击结果 ============

/**
 * 射击结果
 */
export interface FireResult {
  /** 是否成功射击 */
  success: boolean;
  /** 消耗的弹药数量 */
  ammoConsumed: number;
  /** 生成的弹壳 */
  casing?: ItemTypeId;
  /** 失败原因 */
  error?: string;
}

// ============ 装填结果 ============

/**
 * 装填结果
 */
export interface ReloadResult {
  /** 是否成功装填 */
  success: boolean;
  /** 装填的弹药数量 */
  amountLoaded: number;
  /** 失败原因 */
  error?: string;
}

// ============ 弹药查询 ============

/**
 * 获取枪械当前弹药
 */
export function getGunAmmo(item: Item): number {
  if (!item.type.isGun()) {
    return 0;
  }
  return item.charges;
}

/**
 * 检查枪械是否有弹药
 */
export function hasAmmo(item: Item): boolean {
  if (!item.type.isGun()) {
    return false;
  }
  return item.charges > 0;
}

/**
 * 获取枪械的弹匣容量
 */
export function getMagazineSize(item: Item): number {
  if (!item.type.isGun() || !item.type.gun) {
    return 0;
  }

  const magazineSize = item.type.gun.magazineSize;
  if (Array.isArray(magazineSize)) {
    const size = magazineSize[0];
    return typeof size === 'number' ? size : 0;
  }
  return magazineSize || 0;
}

/**
 * 检查枪械是否需要装填
 */
export function needsReload(item: Item): boolean {
  if (!item.type.isGun()) {
    return false;
  }
  return item.charges < getMagazineSize(item);
}

/**
 * 检查枪械是否已装满
 */
export function isFullyLoaded(item: Item): boolean {
  if (!item.type.isGun()) {
    return false;
  }
  return item.charges >= getMagazineSize(item);
}

// ============ 弹药兼容性 ============

/**
 * 检查弹药是否与枪械兼容
 */
export function isAmmoCompatible(gunItem: Item, ammoItem: Item): boolean {
  if (!gunItem.type.isGun()) {
    return false;
  }
  if (!ammoItem.type.isAmmo()) {
    return false;
  }

  const gunSlot = gunItem.type.gun;
  if (!gunSlot || !gunSlot.ammo) {
    return false;
  }

  return gunSlot.ammo.some(ammoType => ammoType === ammoItem.type.ammo?.type);
}

/**
 * 获取枪械的默认弹药类型
 */
export function getDefaultAmmoType(item: Item): AmmoTypeId | undefined {
  if (!item.type.isGun() || !item.type.gun) {
    return undefined;
  }

  if (item.type.gun.defaultAmmo) {
    return item.type.gun.defaultAmmo as any as AmmoTypeId;
  }

  if (item.type.gun.ammo && item.type.gun.ammo.length > 0) {
    return item.type.gun.ammo[0];
  }

  return undefined;
}

// ============ 装填操作 ============

/**
 * 计算可装填的弹药数量
 */
export function calculateReloadAmount(gunItem: Item, ammoItem: Item): number {
  if (!isAmmoCompatible(gunItem, ammoItem)) {
    return 0;
  }

  const magazineSize = getMagazineSize(gunItem);
  const currentAmmo = gunItem.charges;
  const availableAmmo = ammoItem.charges;
  const needed = magazineSize - currentAmmo;

  return Math.min(needed, availableAmmo);
}

/**
 * 装填枪械
 *
 * @param gunItem 枪械物品
 * @param ammoItem 弹药物品
 * @returns 装填后的枪械和弹药
 */
export function reloadGun(gunItem: Item, ammoItem: Item): { gun: Item; ammo: Item } {
  const amount = calculateReloadAmount(gunItem, ammoItem);

  if (amount <= 0) {
    return { gun: gunItem, ammo: ammoItem };
  }

  const newGun = gunItem.set('charges', gunItem.charges + amount);
  const newAmmo = ammoItem.consumeOne();

  return { gun: newGun, ammo: newAmmo };
}

// ============ 射击操作 ============

/**
 * 获取单次射击消耗的弹药数量
 */
export function getAmmoPerShot(item: Item): number {
  if (!item.type.isGun() || !item.type.gun) {
    return 1;
  }
  return item.type.gun.ammoToFire || 1;
}

/**
 * 射击枪械
 *
 * @param gunItem 枪械物品
 * @param count 射击次数（默认 1）
 * @returns 射击结果和更新后的枪械
 */
export function fireGun(gunItem: Item, count: number = 1): { result: FireResult; gun: Item } {
  if (!gunItem.type.isGun()) {
    return {
      result: {
        success: false,
        ammoConsumed: 0,
        error: '不是枪械',
      },
      gun: gunItem,
    };
  }

  const ammoPerShot = getAmmoPerShot(gunItem);
  const totalAmmoNeeded = ammoPerShot * count;

  if (gunItem.charges < totalAmmoNeeded) {
    return {
      result: {
        success: false,
        ammoConsumed: 0,
        error: '弹药不足',
      },
      gun: gunItem,
    };
  }

  // 消耗弹药
  const newGun = gunItem.set('charges', gunItem.charges - totalAmmoNeeded);

  // 生成弹壳（如果有定义）
  const ammoSlot = gunItem.type.ammo;
  let casing: ItemTypeId | undefined;
  if (ammoSlot?.casing) {
    casing = ammoSlot.casing as any as ItemTypeId;
  }

  return {
    result: {
      success: true,
      ammoConsumed: totalAmmoNeeded,
      casing,
    },
    gun: newGun,
  };
}

// ============ 枪械属性查询 ============

/**
 * 获取枪械射程
 */
export function getGunRange(item: Item): number {
  if (!item.type.isGun() || !item.type.gun) {
    return 0;
  }
  return item.type.gun.range || 0;
}

/**
 * 获取枪械伤害
 */
export function getGunDamage(item: Item): number {
  if (!item.type.isGun() || !item.type.gun) {
    return 0;
  }
  return item.type.gun.rangedDamage || 0;
}

/**
 * 获取枪械散布（精度）
 */
export function getGunDispersion(item: Item): number {
  if (!item.type.isGun() || !item.type.gun) {
    return 0;
  }
  return item.type.gun.dispersion || 0;
}

/**
 * 获取枪械装填时间
 */
export function getReloadTime(item: Item): number {
  if (!item.type.isGun() || !item.type.gun) {
    return 0;
  }
  return item.type.gun.reloadTime || 0;
}

/**
 * 获取枪械技能类型
 */
export function getGunSkill(item: Item): string | undefined {
  if (!item.type.isGun() || !item.type.gun) {
    return undefined;
  }
  return item.type.gun.skill;
}

// ============ 弹药属性查询 ============

/**
 * 获取弹药类型
 */
export function getAmmoType(item: Item): AmmoTypeId | undefined {
  if (!item.type.isAmmo() || !item.type.ammo) {
    return undefined;
  }
  return item.type.ammo.type;
}

/**
 * 获取弹药堆叠大小
 */
export function getAmmoStackSize(item: Item): number {
  if (!item.type.isAmmo() || !item.type.ammo) {
    return 1;
  }
  return item.type.ammo.stackSize || 1;
}

// ============ 弹壳相关 ============

/**
 * 获取弹壳物品类型
 */
export function getCasingType(item: Item): ItemTypeId | undefined {
  if (!item.type.isAmmo() || !item.type.ammo) {
    return undefined;
  }
  if (!item.type.ammo.casing) {
    return undefined;
  }
  return item.type.ammo.casing as any as ItemTypeId;
}

/**
 * 获取弹药掉落物品
 */
export function getAmmoDrop(item: Item): ItemTypeId | undefined {
  if (!item.type.isAmmo() || !item.type.ammo) {
    return undefined;
  }
  if (!item.type.ammo.drop) {
    return undefined;
  }
  return item.type.ammo.drop as any as ItemTypeId;
}

/**
 * 获取弹药掉落概率
 */
export function getAmmoDropChance(item: Item): number {
  if (!item.type.isAmmo() || !item.type.ammo) {
    return 0;
  }
  return item.type.ammo.dropChance || 0;
}

/**
 * 检查弹药是否在掉落时激活
 */
export function isAmmoDropActive(item: Item): boolean {
  if (!item.type.isAmmo() || !item.type.ammo) {
    return false;
  }
  return item.type.ammo.dropActive || false;
}
