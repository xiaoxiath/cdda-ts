/**
 * 枪械和弹药系统
 *
 * 参考 Cataclysm-DDA 的 gun 系统实现
 * 处理枪械装填、射击、弹药消耗、改装等功能
 */

import type { ItemTypeId, AmmoTypeId } from './types';
import type { Item } from './Item';
import { List } from 'immutable';

// ============ 射击模式 ============

/**
 * 射击模式
 */
export enum FireMode {
  SINGLE = 'SINGLE',       // 单发
  BURST = 'BURST',         // 点射（3发）
  AUTO = 'AUTO',           // 全自动
}

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
  /** 实际射击次数 */
  shotsFired?: number;
  /** 是否卡壳 */
  jammed?: boolean;
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
  /** 装填时间（毫秒） */
  reloadTime?: number;
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

// ============ 射击模式系统 ============

/**
 * 获取枪械支持的射击模式
 */
export function getFireModes(item: Item): FireMode[] {
  if (!item.type.isGun() || !item.type.gun) {
    return [FireMode.SINGLE];
  }

  const modes: FireMode[] = [FireMode.SINGLE];

  // 点射模式（burst > 0）
  if (item.type.gun.burst && item.type.gun.burst > 0) {
    modes.push(FireMode.BURST);
  }

  // 全自动模式（某些枪械支持）
  if (hasFlag(item, 'AUTO_FIRE')) {
    modes.push(FireMode.AUTO);
  }

  return modes;
}

/**
 * 检查枪械是否支持指定射击模式
 */
export function hasFireMode(item: Item, mode: FireMode): boolean {
  return getFireModes(item).includes(mode);
}

/**
 * 获取点射模式的射击数量
 */
export function getBurstCount(item: Item): number {
  if (!item.type.isGun() || !item.type.gun) {
    return 1;
  }
  return item.type.gun.burst || 1;
}

/**
 * 检查物品是否有指定标志
 */
function hasFlag(item: Item, flag: string): boolean {
  // 如果有其他方法检查标志，可以使用那个
  // 这里简化处理
  return item.type.flags.has(flag as any);
}

// ============ 后坐力和散布计算 ============

/**
 * 枪械状态
 */
export interface GunState {
  /** 后坐力累积 */
  recoil: number;
  /** 散布累积 */
  dispersion: number;
  /** 是否卡壳 */
  jammed: boolean;
  /** 过热程度 */
  overheated: number;
  /** 连续射击次数 */
  consecutiveShots: number;
}

/**
 * 获取枪械基础后坐力
 */
export function getGunRecoil(item: Item): number {
  if (!item.type.isGun() || !item.type.gun) {
    return 0;
  }

  // 后坐力与伤害和散布相关
  const damage = item.type.gun.rangedDamage || 0;
  const dispersion = item.type.gun.dispersion || 0;

  // 简化公式：伤害越高，后坐力越大
  return Math.floor(damage / 5) + Math.floor(dispersion / 100);
}

/**
 * 计算枪械散布
 */
export function calculateDispersion(item: Item, state: GunState): number {
  if (!item.type.isGun() || !item.type.gun) {
    return 0;
  }

  const baseDispersion = item.type.gun.dispersion || 0;

  // 后坐力累积增加散布
  const recoilDispersion = state.recoil * 10;

  // 连续射击增加散布
  const consecutiveDispersion = state.consecutiveShots * 15;

  return baseDispersion + recoilDispersion + consecutiveDispersion;
}

/**
 * 计算装填时间（考虑技能等级）
 */
export function calculateReloadTime(item: Item, skillLevel: number = 0): number {
  if (!item.type.isGun() || !item.type.gun) {
    return 0;
  }

  const baseTime = item.type.gun.reloadTime || item.type.gun.reload || 1000;

  // 技能每级减少 5% 装填时间，最多减少 50%
  const skillBonus = Math.min(0.5, skillLevel * 0.05);

  return Math.floor(baseTime * (1 - skillBonus));
}

/**
 * 更新枪械状态（射击后）
 */
export function updateGunStateAfterFire(
  item: Item,
  state: GunState,
  shotsFired: number
): GunState {
  const recoil = getGunRecoil(item);

  return {
    recoil: state.recoil + recoil * shotsFired,
    dispersion: calculateDispersion(item, state),
    jammed: state.jammed,
    overheated: state.overheated,
    consecutiveShots: state.consecutiveShots + shotsFired,
  };
}

/**
 * 检查枪械是否可能卡壳
 */
export function checkJam(item: Item): boolean {
  if (!item.type.isGun()) {
    return false;
  }

  // 如果有 NEVER_JAMS 标志，不会卡壳
  if (hasFlag(item, 'NEVER_JAMS')) {
    return false;
  }

  // 基础卡壳概率 1%
  const baseJamChance = 0.01;

  // 伤害状态增加卡壳概率
  const damageBonus = item.damage / 10000; // 0-0.4

  return Math.random() < (baseJamChance + damageBonus);
}

/**
 * 重置枪械状态
 */
export function resetGunState(): GunState {
  return {
    recoil: 0,
    dispersion: 0,
    jammed: false,
    overheated: 0,
    consecutiveShots: 0,
  };
}

// ============ 高级射击功能 ============

/**
 * 使用指定射击模式射击
 */
export function fireGunWithMode(
  item: Item,
  mode: FireMode,
  count: number = 1,
  state: GunState = resetGunState()
): { result: FireResult; gun: Item; newState: GunState } {
  if (!item.type.isGun()) {
    return {
      result: {
        success: false,
        ammoConsumed: 0,
        error: '不是枪械',
      },
      gun: item,
      newState: state,
    };
  }

  // 检查是否卡壳
  if (state.jammed) {
    return {
      result: {
        success: false,
        ammoConsumed: 0,
        error: '枪械卡壳',
        jammed: true,
      },
      gun: item,
      newState: state,
    };
  }

  let shotsToFire = count;

  // 根据射击模式确定射击次数
  if (mode === FireMode.BURST) {
    shotsToFire = getBurstCount(item);
  } else if (mode === FireMode.AUTO) {
    // 全自动模式，至少射击 5 次，最多 10 次
    shotsToFire = 5 + Math.floor(Math.random() * 5);
  }

  const ammoPerShot = getAmmoPerShot(item);
  const totalAmmoNeeded = ammoPerShot * shotsToFire;

  if (item.charges < totalAmmoNeeded) {
    return {
      result: {
        success: false,
        ammoConsumed: 0,
        error: '弹药不足',
      },
      gun: item,
      newState: state,
    };
  }

  // 消耗弹药
  const newGun = item.set('charges', item.charges - totalAmmoNeeded);

  // 检查是否卡壳
  const jammed = checkJam(item);

  // 生成弹壳
  const ammoSlot = item.type.ammo;
  let casing: ItemTypeId | undefined;
  if (ammoSlot?.casing) {
    casing = ammoSlot.casing as any as ItemTypeId;
  }

  // 更新枪械状态
  const newState = updateGunStateAfterFire(item, state, shotsToFire);

  return {
    result: {
      success: true,
      ammoConsumed: totalAmmoNeeded,
      casing,
      shotsFired: shotsToFire,
      jammed,
    },
    gun: newGun,
    newState: jammed ? { ...newState, jammed: true } : newState,
  };
}

/**
 * 清除枪械卡壳
 */
export function clearJam(item: Item): Item {
  // 清除卡壳可能需要一定时间
  // 这里简化处理，只是返回原物品
  // 实际游戏中可能需要消耗工具或时间
  return item;
}

/**
 * 枪械冷却（减少后坐力和散布累积）
 */
export function coolDownGun(state: GunState, turns: number = 1): GunState {
  const recoilDecay = 50 * turns;
  const consecutiveDecay = Math.min(state.consecutiveShots, turns);

  return {
    recoil: Math.max(0, state.recoil - recoilDecay),
    dispersion: Math.max(0, state.dispersion - recoilDecay),
    jammed: state.jammed,
    overheated: Math.max(0, state.overheated - turns * 10),
    consecutiveShots: Math.max(0, state.consecutiveShots - consecutiveDecay),
  };
}

// ============ 枪械配件系统（基础）============

/**
 * 枪械配件槽
 */
export enum GunModSlot {
  SIGHT = 'SIGHT',           // 瞄具
  STOCK = 'STOCK',           // 枪托
  BARREL = 'BARREL',         // 枪管
  UNDERBARREL = 'UNDERBARREL', // 下挂
  MAGAZINE = 'MAGAZINE',     // 弹匣
  MUZZLE = 'MUZZLE',         // 枪口
  LASER = 'LASER',           // 激光指示器
  GRIP = 'GRIP',             // 握把
  RAIL = 'RAIL',             // 导轨
}

/**
 * 检查枪械是否支持指定配件槽
 */
export function hasModSlot(item: Item, slot: GunModSlot): boolean {
  if (!item.type.isGun() || !item.type.gun) {
    return false;
  }

  const modLocations = item.type.gun.modLocations;
  if (!modLocations) {
    return false;
  }

  return modLocations.includes(slot);
}

/**
 * 获取枪械支持的所有配件槽
 */
export function getModSlots(item: Item): GunModSlot[] {
  if (!item.type.isGun() || !item.type.gun) {
    return [];
  }

  const modLocations = item.type.gun.modLocations;
  if (!modLocations) {
    return [];
  }

  return modLocations.map(loc => loc as GunModSlot);
}
