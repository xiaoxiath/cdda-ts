/**
 * 枪械弹药系统测试
 *
 * 测试枪械和弹药的各种功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Set, Map } from 'immutable';
import {
  FireMode,
  GunState,
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
  // 新增功能
  getFireModes,
  hasFireMode,
  getBurstCount,
  getGunRecoil,
  calculateDispersion,
  calculateReloadTime as calculateReloadTimeWithSkill,
  updateGunStateAfterFire,
  checkJam,
  resetGunState,
  fireGunWithMode,
  clearJam,
  coolDownGun,
  hasModSlot,
  getModSlots,
  GunModSlot,
} from '../weapon';
import { Item } from '../Item';
import { ItemType } from '../ItemType';
import { ItemCategory } from '../types';
import { createItemTypeId, createAmmoTypeId } from '../types';

// 测试辅助函数
function createTestItemType(props?: any): ItemType {
  return new ItemType({
    id: createItemTypeId('test_item'),
    name: 'Test Item',
    weight: 100,
    volume: 250,
    category: ItemCategory.WEAPON,
    flags: Set(),
    material: [],
    qualities: Map(),
    ...props,
  });
}

function createTestItem(type: ItemType, charges: number = 0): Item {
  return Item.create(type).set('charges', charges);
}

describe('枪械弹药系统 - 基础功能', () => {
  describe('弹药查询', () => {
    it('应该获取枪械当前弹药', () => {
      const gunType = createTestItemType({
        id: createItemTypeId('pistol_9mm'),
        category: 'GUN' as any,
        gun: {
          magazineSize: 12,
          ammo: [createAmmoTypeId('9mm')] as any,
        },
      });

      const gun = createTestItem(gunType, 8);
      expect(getGunAmmo(gun)).toBe(8);
    });

    it('非枪械应该返回 0', () => {
      const nonGunType = createTestItemType();
      const nonGun = createTestItem(nonGunType, 5);
      expect(getGunAmmo(nonGun)).toBe(0);
    });

    it('应该检查枪械是否有弹药', () => {
      const gunType = createTestItemType({
        category: 'GUN' as any,
        gun: {
          magazineSize: 12,
          ammo: [createAmmoTypeId('9mm')] as any,
        },
      });

      const loadedGun = createTestItem(gunType, 6);
      expect(hasAmmo(loadedGun)).toBe(true);

      const emptyGun = createTestItem(gunType, 0);
      expect(hasAmmo(emptyGun)).toBe(false);
    });

    it('应该获取弹匣容量', () => {
      const gunType = createTestItemType({
        category: 'GUN' as any,
        gun: {
          magazineSize: 30,
        },
      });

      const gun = createTestItem(gunType);
      expect(getMagazineSize(gun)).toBe(30);
    });

    it('应该检查是否需要装填', () => {
      const gunType = createTestItemType({
        category: 'GUN' as any,
        gun: {
          magazineSize: 12,
        },
      });

      const partiallyLoaded = createTestItem(gunType, 6);
      expect(needsReload(partiallyLoaded)).toBe(true);

      const fullyLoaded = createTestItem(gunType, 12);
      expect(isFullyLoaded(fullyLoaded)).toBe(true);
    });
  });

  describe('弹药兼容性', () => {
    const pistol9mmType = createTestItemType({
      id: createItemTypeId('pistol_9mm'),
      category: 'GUN' as any,
      gun: {
        ammo: [createAmmoTypeId('9mm'), createAmmoTypeId('9mm_fmj')] as any,
        magazineSize: 12,
      },
    });

    const ammo9mmType = createTestItemType({
      id: createItemTypeId('ammo_9mm'),
      category: 'AMMO' as any,
      ammo: {
        type: createAmmoTypeId('9mm'),
        stackSize: 30,
      },
    });

    const ammo45Type = createTestItemType({
      id: createItemTypeId('ammo_45'),
      category: 'AMMO' as any,
      ammo: {
        type: createAmmoTypeId('45ACP'),
        stackSize: 20,
      },
    });

    it('应该检查弹药兼容性', () => {
      const pistol = createTestItem(pistol9mmType);
      const ammo9mm = createTestItem(ammo9mmType);
      const ammo45 = createTestItem(ammo45Type);

      expect(isAmmoCompatible(pistol, ammo9mm)).toBe(true);
      expect(isAmmoCompatible(pistol, ammo45)).toBe(false);
    });

    it('应该获取默认弹药类型', () => {
      const pistol = createTestItem(pistol9mmType);
      const defaultAmmo = getDefaultAmmoType(pistol);
      expect(defaultAmmo).toBe(createAmmoTypeId('9mm'));
    });
  });

  describe('装填操作', () => {
    it('应该计算可装填数量', () => {
      const gunType = createTestItemType({
        category: 'GUN' as any,
        gun: {
          magazineSize: 12,
          ammo: [createAmmoTypeId('9mm')] as any,
        },
      });

      const ammoType = createTestItemType({
        id: createItemTypeId('ammo_9mm'),
        category: 'AMMO' as any,
        ammo: {
          type: createAmmoTypeId('9mm'),
          stackSize: 30,
        },
      });

      const gun = createTestItem(gunType, 6);
      const ammo = createTestItem(ammoType, 30);

      const amount = calculateReloadAmount(gun, ammo);
      expect(amount).toBe(6); // 需要装填 6 发
    });

    it('应该装填枪械', () => {
      const gunType = createTestItemType({
        category: 'GUN' as any,
        gun: {
          magazineSize: 12,
          ammo: [createAmmoTypeId('9mm')] as any,
        },
      });

      const ammoType = createTestItemType({
        id: createItemTypeId('ammo_9mm'),
        category: 'AMMO' as any,
        ammo: {
          type: createAmmoTypeId('9mm'),
          stackSize: 30,
        },
      });

      const gun = createTestItem(gunType, 0);
      const ammo = createTestItem(ammoType, 30);

      const result = reloadGun(gun, ammo);

      expect(result.gun.charges).toBe(12); // 装填整个弹匣（消耗 1 个弹药物品）
      expect(result.ammo.charges).toBe(29);
    });
  });

  describe('射击操作', () => {
    it('应该获取单次射击弹药消耗', () => {
      const gunType = createTestItemType({
        category: 'GUN' as any,
        gun: {
          ammoToFire: 1,
        },
      });

      const gun = createTestItem(gunType);
      expect(getAmmoPerShot(gun)).toBe(1);
    });

    it('应该射击枪械', () => {
      const gunType = createTestItemType({
        category: 'GUN' as any,
        gun: {
          ammo: [createAmmoTypeId('9mm')] as any,
          magazineSize: 12,
          ammoToFire: 1,
        },
      });

      const gun = createTestItem(gunType, 12);

      const result = fireGun(gun, 1);

      expect(result.result.success).toBe(true);
      expect(result.result.ammoConsumed).toBe(1);
      expect(result.gun.charges).toBe(11);
    });

    it('弹药不足时射击应该失败', () => {
      const gunType = createTestItemType({
        category: 'GUN' as any,
        gun: {
          magazineSize: 12,
          ammoToFire: 1,
        },
      });

      const gun = createTestItem(gunType, 0);

      const result = fireGun(gun, 1);

      expect(result.result.success).toBe(false);
      expect(result.result.error).toBe('弹药不足');
      expect(result.gun.charges).toBe(0);
    });
  });

  describe('枪械属性', () => {
    it('应该获取枪械射程', () => {
      const gunType = createTestItemType({
        category: 'GUN' as any,
        gun: {
          range: 30,
        },
      });

      const gun = createTestItem(gunType);
      expect(getGunRange(gun)).toBe(30);
    });

    it('应该获取枪械伤害', () => {
      const gunType = createTestItemType({
        category: 'GUN' as any,
        gun: {
          rangedDamage: 25,
        },
      });

      const gun = createTestItem(gunType);
      expect(getGunDamage(gun)).toBe(25);
    });

    it('应该获取枪械散布', () => {
      const gunType = createTestItemType({
        category: 'GUN' as any,
        gun: {
          dispersion: 180,
        },
      });

      const gun = createTestItem(gunType);
      expect(getGunDispersion(gun)).toBe(180);
    });

    it('应该获取装填时间', () => {
      const gunType = createTestItemType({
        category: 'GUN' as any,
        gun: {
          reloadTime: 2000,
        },
      });

      const gun = createTestItem(gunType);
      expect(getReloadTime(gun)).toBe(2000);
    });

    it('应该获取枪械技能', () => {
      const gunType = createTestItemType({
        category: 'GUN' as any,
        gun: {
          skill: 'pistol' as any,
        },
      });

      const gun = createTestItem(gunType);
      expect(getGunSkill(gun)).toBe('pistol');
    });
  });

  describe('弹药属性', () => {
    it('应该获取弹药类型', () => {
      const ammoType = createTestItemType({
        category: 'AMMO' as any,
        ammo: {
          type: createAmmoTypeId('9mm'),
        },
      });

      const ammo = createTestItem(ammoType);
      expect(getAmmoType(ammo)).toBe(createAmmoTypeId('9mm'));
    });

    it('应该获取弹药堆叠大小', () => {
      const ammoType = createTestItemType({
        category: 'AMMO' as any,
        ammo: {
          type: createAmmoTypeId('9mm'),
          stackSize: 50,
        },
      });

      const ammo = createTestItem(ammoType);
      expect(getAmmoStackSize(ammo)).toBe(50);
    });

    it('应该获取弹壳类型', () => {
      const ammoType = createTestItemType({
        category: 'AMMO' as any,
        ammo: {
          type: createAmmoTypeId('9mm'),
          casing: createItemTypeId('casing_9mm'),
        },
      });

      const ammo = createTestItem(ammoType);
      expect(getCasingType(ammo)).toBe(createItemTypeId('casing_9mm'));
    });
  });
});

describe('枪械弹药系统 - 射击模式', () => {
  describe('射击模式', () => {
    it('应该获取单发枪械的射击模式', () => {
      const gunType = createTestItemType({
        category: 'GUN' as any,
        gun: {
          magazineSize: 6,
        },
      });

      const gun = createTestItem(gunType);
      const modes = getFireModes(gun);

      expect(modes).toEqual([FireMode.SINGLE]);
    });

    it('应该获取点射枪械的射击模式', () => {
      const gunType = createTestItemType({
        category: 'GUN' as any,
        gun: {
          magazineSize: 30,
          burst: 3,
        },
      });

      const gun = createTestItem(gunType);
      const modes = getFireModes(gun);

      expect(modes).toContain(FireMode.SINGLE);
      expect(modes).toContain(FireMode.BURST);
    });

    it('应该检查枪械是否支持指定射击模式', () => {
      const gunType = createTestItemType({
        category: 'GUN' as any,
        gun: {
          magazineSize: 30,
          burst: 3,
        },
      });

      const gun = createTestItem(gunType);

      expect(hasFireMode(gun, FireMode.SINGLE)).toBe(true);
      expect(hasFireMode(gun, FireMode.BURST)).toBe(true);
      expect(hasFireMode(gun, FireMode.AUTO)).toBe(false);
    });

    it('应该获取点射数量', () => {
      const gunType = createTestItemType({
        category: 'GUN' as any,
        gun: {
          burst: 5,
        },
      });

      const gun = createTestItem(gunType);
      expect(getBurstCount(gun)).toBe(5);
    });
  });
});

describe('枪械弹药系统 - 后坐力和散布', () => {
  let gunType: ItemType;
  let gun: Item;

  beforeEach(() => {
    gunType = createTestItemType({
      category: 'GUN' as any,
      gun: {
        magazineSize: 30,
        dispersion: 180,
        rangedDamage: 25,
      },
    });
    gun = createTestItem(gunType, 30);
  });

  it('应该获取枪械后坐力', () => {
    const recoil = getGunRecoil(gun);
    // 25 / 5 + 180 / 100 = 5 + 1 = 6
    expect(recoil).toBe(6);
  });

  it('应该计算散布', () => {
    const state: GunState = {
      recoil: 100,
      dispersion: 0,
      jammed: false,
      overheated: 0,
      consecutiveShots: 5,
    };

    const dispersion = calculateDispersion(gun, state);
    // 180 + 100 * 10 + 5 * 15 = 180 + 1000 + 75 = 1255
    expect(dispersion).toBe(1255);
  });

  it('应该计算考虑技能的装填时间', () => {
    const gunTypeWithReloadTime = createTestItemType({
      category: 'GUN' as any,
      gun: {
        magazineSize: 30,
        reloadTime: 2000,
      },
    });

    const gunWithReload = createTestItem(gunTypeWithReloadTime);

    // 0 级技能
    expect(calculateReloadTimeWithSkill(gunWithReload, 0)).toBe(2000);

    // 5 级技能 - 减少 25%
    expect(calculateReloadTimeWithSkill(gunWithReload, 5)).toBe(1500);

    // 10 级技能 - 减少 50%（上限）
    expect(calculateReloadTimeWithSkill(gunWithReload, 10)).toBe(1000);
  });

  it('应该更新枪械状态', () => {
    const state: GunState = {
      recoil: 0,
      dispersion: 0,
      jammed: false,
      overheated: 0,
      consecutiveShots: 0,
    };

    const newState = updateGunStateAfterFire(gun, state, 3);

    expect(newState.recoil).toBe(18); // 6 * 3
    expect(newState.consecutiveShots).toBe(3);
  });
});

describe('枪械弹药系统 - 枪械状态', () => {
  it('应该重置枪械状态', () => {
    const state = resetGunState();

    expect(state.recoil).toBe(0);
    expect(state.dispersion).toBe(0);
    expect(state.jammed).toBe(false);
    expect(state.overheated).toBe(0);
    expect(state.consecutiveShots).toBe(0);
  });

  it('应该检查枪械是否卡壳', () => {
    const gunType = createTestItemType({
      category: 'GUN' as any,
      gun: {
        magazineSize: 12,
      },
      flags: Set(), // 无 NEVER_JAMS 标志
    });

    const gun = createTestItem(gunType);

    // 由于卡壳是随机的，我们只测试函数不会抛出错误
    const jammed = checkJam(gun);
    expect(typeof jammed).toBe('boolean');
  });

  it('应该清除卡壳', () => {
    const gunType = createTestItemType({
      category: 'GUN' as any,
      gun: {
        magazineSize: 12,
      },
    });

    const gun = createTestItem(gunType);
    const clearedGun = clearJam(gun);

    // clearJam 目前只是返回原物品
    expect(clearedGun).toBe(gun);
  });

  it('应该冷却枪械', () => {
    const state: GunState = {
      recoil: 200,
      dispersion: 500,
      jammed: false,
      overheated: 50,
      consecutiveShots: 10,
    };

    const cooled = coolDownGun(state, 2);

    expect(cooled.recoil).toBe(100); // 200 - 50 * 2
    expect(cooled.consecutiveShots).toBe(8); // 10 - 2
    expect(cooled.overheated).toBe(30); // 50 - 10 * 2
  });
});

describe('枪械弹药系统 - 高级射击', () => {
  let gunType: ItemType;
  let gun: Item;

  beforeEach(() => {
    gunType = createTestItemType({
      category: 'GUN' as any,
      gun: {
        magazineSize: 30,
        burst: 3,
        ammoToFire: 1,
      },
    });
    gun = createTestItem(gunType, 30);
  });

  it('应该使用点射模式射击', () => {
    const state = resetGunState();

    const result = fireGunWithMode(gun, FireMode.BURST, 1, state);

    expect(result.result.success).toBe(true);
    expect(result.result.shotsFired).toBe(3); // burst 模式射击 3 发
    expect(result.result.ammoConsumed).toBe(3);
    expect(result.gun.charges).toBe(27);
  });

  it('卡壳的枪械不应该射击', () => {
    const jammedState: GunState = {
      recoil: 0,
      dispersion: 0,
      jammed: true,
      overheated: 0,
      consecutiveShots: 0,
    };

    const result = fireGunWithMode(gun, FireMode.SINGLE, 1, jammedState);

    expect(result.result.success).toBe(false);
    expect(result.result.error).toBe('枪械卡壳');
    expect(result.result.jammed).toBe(true);
    expect(result.gun.charges).toBe(30); // 弹药未消耗
  });
});

describe('枪械弹药系统 - 配件系统', () => {
  it('应该检查枪械是否支持指定配件槽', () => {
    const gunType = createTestItemType({
      category: 'GUN' as any,
      gun: {
        magazineSize: 30,
        modLocations: ['SIGHT', 'STOCK'],
      },
    });

    const gun = createTestItem(gunType);

    expect(hasModSlot(gun, GunModSlot.SIGHT)).toBe(true);
    expect(hasModSlot(gun, GunModSlot.STOCK)).toBe(true);
    expect(hasModSlot(gun, GunModSlot.BARREL)).toBe(false);
  });

  it('应该获取枪械支持的所有配件槽', () => {
    const gunType = createTestItemType({
      category: 'GUN' as any,
      gun: {
        magazineSize: 30,
        modLocations: ['SIGHT', 'STOCK', 'BARREL'],
      },
    });

    const gun = createTestItem(gunType);
    const slots = getModSlots(gun);

    expect(slots).toContain(GunModSlot.SIGHT);
    expect(slots).toContain(GunModSlot.STOCK);
    expect(slots).toContain(GunModSlot.BARREL);
    expect(slots.length).toBe(3);
  });
});
