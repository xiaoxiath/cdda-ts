/**
 * use-methods 测试
 *
 * 测试物品使用方法系统的各种功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Map } from 'immutable';
import { Item } from '../Item';
import { ItemType } from '../ItemType';
import { ItemContents } from '../ItemContents';
import {
  UseMethodType,
  useMethodRegistry,
  registerBuiltinUseMethods,
  getAvailableUseMethods,
  executeUseMethod,
  useItem,
  canUseItem,
  getUseTime,
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
  applySideEffects,
  type UseMethodDefinition,
  type UseContext,
  type UseResult,
  type UseSideEffect,
} from '../use-methods';
import { createItemTypeId } from '../types';

// Mock Item class for testing
class MockItemForTesting {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: ItemType,
    public charges: number,
    public active: boolean = false,
    public frozen: number = 0,
    public _contents: ItemContents = new ItemContents(),
    public _damage: number = 0,
    private _isComestible: boolean = false,
    private _isTool: boolean = false,
    private _isGun: boolean = false,
    private _isArmor: boolean = false,
    private _isBook: boolean = false,
    private _isBionic: boolean = false,
    private _isWeapon: boolean = false,
    private comestibleData?: any,
    private gunData?: any
  ) {}

  isTool() { return this._isTool; }
  isComestible() { return this._isComestible; }
  isGun() { return this._isGun; }
  isArmor() { return this._isArmor; }
  isBook() { return this._isBook; }
  isBionic() { return this._isBionic; }
  isWeapon() { return this._isGun || this._isWeapon; }

  get comestible() { return this.comestibleData; }
  get gun() { return this.gunData; }
  get contents() { return this._contents; }
  get damage() { return this._damage; }
  get itemVars() { return Map(); }

  consumeOne() {
    if (this.charges > 1) {
      this.charges--;
      return this;
    }
    return undefined;
  }

  toggleActive() {
    this.active = !this.active;
    return this;
  }

  setActive(value: boolean) {
    const newItem = new MockItemForTesting(
      this.id,
      this.name,
      this.type,
      this.charges,
      value,
      this.frozen,
      this._contents,
      this._damage,
      this._isComestible,
      this._isTool,
      this._isGun,
      this._isArmor,
      this._isBook,
      this._isBionic,
      this._isWeapon,
      this.comestibleData,
      this.gunData
    );
    return newItem;
  }

  isSpoiled() {
    return false;
  }

  isBroken() {
    return this._damage >= 4000;
  }

  // Immutable-like set method for testing
  set(key: string, value: any): any {
    if (key === 'charges') {
      return new MockItemForTesting(
        this.id,
        this.name,
        this.type,
        value,
        this.active,
        this.frozen,
        this._contents,
        this._damage,
        this._isComestible,
        this._isTool,
        this._isGun,
        this._isArmor,
        this._isBook,
        this._isBionic,
        this._isWeapon,
        this.comestibleData,
        this.gunData
      );
    }
    if (key === 'active') {
      return new MockItemForTesting(
        this.id,
        this.name,
        this.type,
        this.charges,
        value,
        this.frozen,
        this._contents,
        this._damage,
        this._isComestible,
        this._isTool,
        this._isGun,
        this._isArmor,
        this._isBook,
        this._isBionic,
        this._isWeapon,
        this.comestibleData,
        this.gunData
      );
    }
    if (key === 'contents') {
      return new MockItemForTesting(
        this.id,
        this.name,
        this.type,
        this.charges,
        this.active,
        this.frozen,
        value,
        this._damage,
        this._isComestible,
        this._isTool,
        this._isGun,
        this._isArmor,
        this._isBook,
        this._isBionic,
        this._isWeapon,
        this.comestibleData,
        this.gunData
      );
    }
    return this;
  }
}

// Helper function to create a test item
function createTestItem(props: {
  id: string;
  name?: string;
  category?: any;
  stackable?: boolean;
  charges?: number;
  isTool?: boolean;
  isComestible?: boolean;
  isGun?: boolean;
  isArmor?: boolean;
  isBook?: boolean;
  isBionic?: boolean;
  isWeapon?: boolean;
  comestible?: any;
  gun?: any;
  book?: any;
  armor?: any;
  generic?: any;
  active?: boolean;
  frozen?: number;
  damage?: number;
  contents?: ItemContents;
}): any {
  const itemType = new ItemType({
    id: createItemTypeId(props.id),
    name: props.name || props.id,
    description: 'Test item',
    stackable: props.stackable ?? false,
    stackSize: 1,
    category: props.category || 'misc',
    weight: 1 as any,
    volume: 1 as any,
    material: ['flesh' as any],
    symbol: '?',
    color: 'white',
    comestible: props.comestible,
    gun: props.gun,
    book: props.book,
    armor: props.armor,
    generic: props.generic,
  });

  return new MockItemForTesting(
    props.id,
    props.name || props.id,
    itemType,
    props.charges ?? 1,
    props.active,
    props.frozen,
    props.contents,
    props.damage,
    props.isComestible,
    props.isTool,
    props.isGun,
    props.isArmor,
    props.isBook,
    props.isBionic,
    props.isWeapon,
    props.comestible,
    props.gun
  );
}

describe('use-methods - 使用方法注册表', () => {
  beforeEach(() => {
    // Clear registry before each test - use clear() method on each type map
    const methods = (useMethodRegistry as any).methods;
    if (methods && typeof methods.clear === 'function') {
      methods.clear();
    }
    registerBuiltinUseMethods();
  });

  describe('register and get', () => {
    it('should register and retrieve method', () => {
      const customMethod: UseMethodDefinition = {
        type: UseMethodType.CUSTOM,
        id: 'custom_action',
        name: 'Custom Action',
        description: 'A custom use method',
        use: (item: Item, context: UseContext) => ({
          success: true,
          timeTaken: 100,
          message: 'Custom action performed',
        }),
      };

      useMethodRegistry.register(customMethod);
      const retrieved = useMethodRegistry.get(UseMethodType.CUSTOM, 'custom_action');

      expect(retrieved).toEqual(customMethod);
    });

    it('should return undefined for non-existent method', () => {
      const retrieved = useMethodRegistry.get(UseMethodType.CUSTOM, 'non_existent');
      expect(retrieved).toBeUndefined();
    });

    it('should get all methods by type', () => {
      const methods = useMethodRegistry.getByType(UseMethodType.EAT);

      expect(methods.length).toBeGreaterThan(0);
      expect(methods[0].type).toBe(UseMethodType.EAT);
    });
  });

  describe('getForItem', () => {
    it('should return eat method for comestible items', () => {
      const item = createTestItem({
        id: 'apple',
        isComestible: true,
        comestible: { calories: 100, quench: 0 },
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const methods = useMethodRegistry.getForItem(item, context);

      expect(methods.length).toBeGreaterThan(0);
      expect(methods.some(m => m.type === UseMethodType.EAT)).toBe(true);
    });

    it('should return tool methods for tool items', () => {
      const item = createTestItem({
        id: 'flashlight',
        isTool: true,
        charges: 10,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const methods = useMethodRegistry.getForItem(item, context);

      expect(methods.length).toBeGreaterThan(0);
      expect(methods.some(m => m.type === UseMethodType.TOOL_ACTIVATE)).toBe(true);
    });

    it('should not return eat method for non-comestible items', () => {
      const item = createTestItem({
        id: 'rock',
        isComestible: false,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const methods = useMethodRegistry.getForItem(item, context);

      expect(methods.some(m => m.type === UseMethodType.EAT)).toBe(false);
    });
  });
});

describe('use-methods - 内置使用方法', () => {
  beforeEach(() => {
    registerBuiltinUseMethods();
  });

  describe('eatMethod', () => {
    it('should have correct properties', () => {
      expect(eatMethod.type).toBe(UseMethodType.EAT);
      expect(eatMethod.id).toBe('eat');
      expect(eatMethod.name).toBe('吃');
      expect(eatMethod.baseTime).toBe(300);
    });

    it('should return true for edible items', () => {
      const item = createTestItem({
        id: 'apple',
        isComestible: true,
        comestible: { calories: 100 },
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const canUse = eatMethod.canUse!(item, context);
      expect(canUse).toBe(true);
    });

    it('should return false for non-comestible items', () => {
      const item = createTestItem({
        id: 'rock',
        isComestible: false,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const canUse = eatMethod.canUse!(item, context);
      expect(canUse).toBe(false);
    });

    it('should return false for spoiled items', () => {
      const item = createTestItem({
        id: 'rotten_food',
        isComestible: true,
        comestible: { calories: 100 },
      });

      (item as any).isSpoiled = () => true;

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const canUse = eatMethod.canUse!(item, context);
      expect(canUse).toBe(false);
    });

    it('should return false for frozen items', () => {
      const item = createTestItem({
        id: 'frozen_food',
        isComestible: true,
        comestible: { calories: 100 },
        frozen: 1,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const canUse = eatMethod.canUse!(item, context);
      expect(canUse).toBe(false);
    });

    it('should return success result with side effects', () => {
      const item = createTestItem({
        id: 'apple',
        name: '苹果',
        isComestible: true,
        comestible: { calories: 100, quench: 10, fun: 5 },
        charges: 1,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = eatMethod.use(item, context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('苹果');
      expect(result.timeTaken).toBe(300);
      expect(result.sideEffects).toBeDefined();
      expect(result.sideEffects!.length).toBeGreaterThan(0);

      // Check for calories side effect
      const caloriesEffect = result.sideEffects!.find(e => e.id === 'hunger');
      expect(caloriesEffect).toBeDefined();
      expect(caloriesEffect?.value).toBe(100);

      // Check for quench side effect
      const quenchEffect = result.sideEffects!.find(e => e.id === 'thirst');
      expect(quenchEffect).toBeDefined();
      expect(quenchEffect?.value).toBe(10);
    });

    it('should return failure result for non-food items', () => {
      const item = createTestItem({
        id: 'rock',
        isComestible: false,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = eatMethod.use(item, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('NOT_FOOD');
      expect(result.message).toContain('不是食物');
    });
  });

  describe('drinkMethod', () => {
    it('should have correct properties', () => {
      expect(drinkMethod.type).toBe(UseMethodType.DRINK);
      expect(drinkMethod.id).toBe('drink');
      expect(drinkMethod.name).toBe('喝');
      expect(drinkMethod.baseTime).toBe(250);
    });

    it('should return success result with quench effect', () => {
      const item = createTestItem({
        id: 'water',
        name: '水',
        isComestible: true,
        comestible: { quench: 50 },
        charges: 1,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = drinkMethod.use(item, context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('水');
      expect(result.sideEffects).toBeDefined();

      const quenchEffect = result.sideEffects!.find(e => e.id === 'thirst');
      expect(quenchEffect).toBeDefined();
      expect(quenchEffect?.value).toBe(50);
    });

    it('should not allow drinking spoiled items', () => {
      const item = createTestItem({
        id: 'dirty_water',
        isComestible: true,
        comestible: { quench: 50 },
      });

      (item as any).isSpoiled = () => true;

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const canUse = drinkMethod.canUse!(item, context);
      expect(canUse).toBe(false);
    });
  });

  describe('toolActivateMethod', () => {
    it('should have correct properties', () => {
      expect(toolActivateMethod.type).toBe(UseMethodType.TOOL_ACTIVATE);
      expect(toolActivateMethod.id).toBe('tool_activate');
      expect(toolActivateMethod.name).toBe('激活');
    });

    it('should allow activation of tools with charges', () => {
      const item = createTestItem({
        id: 'flashlight',
        isTool: true,
        charges: 10,
        active: false,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const canUse = toolActivateMethod.canUse!(item, context);
      expect(canUse).toBe(true);
    });

    it('should not allow activation of tools without charges', () => {
      const item = createTestItem({
        id: 'dead_flashlight',
        isTool: true,
        charges: 0,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const canUse = toolActivateMethod.canUse!(item, context);
      expect(canUse).toBe(false);
    });

    it('should toggle active state when used', () => {
      const item = createTestItem({
        id: 'flashlight',
        name: '手电筒',
        isTool: true,
        charges: 10,
        active: false,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = toolActivateMethod.use(item, context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('激活');
      expect(result.resultingItem).toBeDefined();
      expect(result.resultingItem?.active).toBe(true);
    });

    it('should deactivate active tool', () => {
      const item = createTestItem({
        id: 'flashlight',
        name: '手电筒',
        isTool: true,
        charges: 10,
        active: true,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = toolActivateMethod.use(item, context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('关闭');
    });
  });

  describe('toolUseMethod', () => {
    it('should have correct properties', () => {
      expect(toolUseMethod.type).toBe(UseMethodType.TOOL_USE);
      expect(toolUseMethod.id).toBe('tool_use');
      expect(toolUseMethod.name).toBe('使用');
    });

    it('should consume one charge when used', () => {
      const item = createTestItem({
        id: 'screwdriver',
        name: '螺丝刀',
        isTool: true,
        charges: 10,
      });

      const result = toolUseMethod.use(item, { user: {}, currentTime: Date.now() });

      expect(result.success).toBe(true);
      expect(result.resultingItem?.charges).toBe(9);
    });
  });

  describe('gunFireMethod', () => {
    it('should have correct properties', () => {
      expect(gunFireMethod.type).toBe(UseMethodType.GUN_FIRE);
      expect(gunFireMethod.id).toBe('gun_fire');
      expect(gunFireMethod.name).toBe('射击');
    });

    it('should allow firing guns with ammo', () => {
      const item = createTestItem({
        id: 'pistol',
        isGun: true,
        charges: 10,
        gun: { ammoToFire: 1 },
      });

      const canUse = gunFireMethod.canUse!(item, { user: {}, currentTime: Date.now() });
      expect(canUse).toBe(true);
    });

    it('should not allow firing guns without ammo', () => {
      const item = createTestItem({
        id: 'empty_pistol',
        isGun: true,
        charges: 0,
      });

      const canUse = gunFireMethod.canUse!(item, { user: {}, currentTime: Date.now() });
      expect(canUse).toBe(false);
    });

    it('should consume ammo when fired', () => {
      const item = createTestItem({
        id: 'rifle',
        name: '步枪',
        isGun: true,
        charges: 10,
        gun: { ammoToFire: 1 },
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = gunFireMethod.use(item, context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('步枪');
      expect(result.resultingItem?.charges).toBe(9);
    });
  });
});

describe('use-methods - 辅助函数', () => {
  beforeEach(() => {
    registerBuiltinUseMethods();
  });

  describe('getAvailableUseMethods', () => {
    it('should return available methods for item', () => {
      const item = createTestItem({
        id: 'apple',
        isComestible: true,
        comestible: { calories: 100 },
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const methods = getAvailableUseMethods(item, context);

      expect(methods.length).toBeGreaterThan(0);
      expect(methods[0].type).toBeDefined();
    });

    it('should return empty array for items with no use methods', () => {
      const item = createTestItem({
        id: 'useless_rock',
        isComestible: false,
        isTool: false,
        isGun: false,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const methods = getAvailableUseMethods(item, context);

      expect(methods.length).toBe(0);
    });
  });

  describe('executeUseMethod', () => {
    it('should execute method successfully', async () => {
      const item = createTestItem({
        id: 'apple',
        name: '苹果',
        isComestible: true,
        comestible: { calories: 100 },
        charges: 1,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = await executeUseMethod(item, eatMethod, context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('苹果');
    });

    it('should fail when canUse returns false', async () => {
      const item = createTestItem({
        id: 'rock',
        isComestible: false,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = await executeUseMethod(item, eatMethod, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('CANNOT_USE');
    });

    it('should fail with reason when canUse returns object with canUse: false', async () => {
      const item = createTestItem({
        id: 'spoiled_food',
        isComestible: true,
        comestible: { calories: 100 },
      });

      (item as any).isSpoiled = () => true;

      const customMethod: UseMethodDefinition = {
        type: UseMethodType.EAT,
        id: 'custom_eat',
        name: 'Custom Eat',
        canUse: () => ({ canUse: false, reason: '食物已腐烂' }),
        use: () => ({ success: true, timeTaken: 100, message: 'Ate' }),
      };

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = await executeUseMethod(item, customMethod, context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('食物已腐烂');
      expect(result.error).toBe('CANNOT_USE');
    });
  });

  describe('useItem', () => {
    it('should use item with first available method', async () => {
      const item = createTestItem({
        id: 'apple',
        name: '苹果',
        isComestible: true,
        comestible: { calories: 100 },
        charges: 1,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = await useItem(item, context);

      expect(result.success).toBe(true);
    });

    it('should fail when no use methods available', async () => {
      const item = createTestItem({
        id: 'rock',
        isComestible: false,
        isTool: false,
        isGun: false,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = await useItem(item, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('NO_USE_METHOD');
    });
  });

  describe('canUseItem', () => {
    it('should return true for usable items', () => {
      const item = createTestItem({
        id: 'apple',
        isComestible: true,
        comestible: { calories: 100 },
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      expect(canUseItem(item, context)).toBe(true);
    });

    it('should return false for unusable items', () => {
      const item = createTestItem({
        id: 'rock',
        isComestible: false,
        isTool: false,
        isGun: false,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      expect(canUseItem(item, context)).toBe(false);
    });
  });

  describe('getUseTime', () => {
    it('should return base time from method', () => {
      const item = createTestItem({ id: 'test' });

      expect(getUseTime(item, eatMethod)).toBe(300);
      expect(getUseTime(item, drinkMethod)).toBe(250);
      expect(getUseTime(item, toolActivateMethod)).toBe(100);
    });

    it('should return default time if base time not specified', () => {
      const item = createTestItem({ id: 'test' });

      const customMethod: UseMethodDefinition = {
        type: UseMethodType.CUSTOM,
        id: 'custom',
        name: 'Custom',
        use: () => ({ success: true, timeTaken: 100, message: 'Custom' }),
      };

      expect(getUseTime(item, customMethod)).toBe(100);
    });
  });
});

describe('use-methods - 边界情况', () => {
  it('should handle async use methods', async () => {
    const asyncMethod: UseMethodDefinition = {
      type: UseMethodType.CUSTOM,
      id: 'async_method',
      name: 'Async Method',
      use: async (item: Item, context: UseContext) => {
        // Simulate async operation
        await Promise.resolve();
        return {
          success: true,
          timeTaken: 200,
          message: 'Async operation completed',
        };
      },
    };

    const item = createTestItem({ id: 'test' });
    const context: UseContext = {
      user: {},
      currentTime: Date.now(),
    };

    const result = await executeUseMethod(item, asyncMethod, context);

    expect(result.success).toBe(true);
    expect(result.message).toContain('Async operation');
  });

  it('should handle items with multiple charges', () => {
    const item = createTestItem({
      id: 'ammo_stack',
      name: '弹药堆',
      isComestible: true,
      comestible: { calories: 0 },
      charges: 50,
    });

    const context: UseContext = {
      user: {},
      currentTime: Date.now(),
    };

    const result = eatMethod.use(item, context);

    expect(result.success).toBe(true);
    expect(result.resultingItem?.charges).toBe(49);
  });
});

describe('use-methods - registerBuiltinUseMethods', () => {
  it('should register all builtin methods', () => {
    // Clear registry
    const methods = (useMethodRegistry as any).methods;
    if (methods && typeof methods.clear === 'function') {
      methods.clear();
    }
    registerBuiltinUseMethods();

    expect(useMethodRegistry.get(UseMethodType.EAT, 'eat')).toBeDefined();
    expect(useMethodRegistry.get(UseMethodType.DRINK, 'drink')).toBeDefined();
    expect(useMethodRegistry.get(UseMethodType.TOOL_ACTIVATE, 'tool_activate')).toBeDefined();
    expect(useMethodRegistry.get(UseMethodType.TOOL_USE, 'tool_use')).toBeDefined();
    expect(useMethodRegistry.get(UseMethodType.GUN_FIRE, 'gun_fire')).toBeDefined();
  });
});

describe('use-methods - 容器方法', () => {
  beforeEach(() => {
    registerBuiltinUseMethods();
  });

  describe('containerOpenMethod', () => {
    it('应该打开有内容的容器', () => {
      const contentType = new ItemType({
        id: createItemTypeId('coin'),
        name: '硬币',
        weight: 1 as any,
        volume: 1 as any,
        stackable: true,
        stackSize: 1,
        category: 'misc' as any,
        material: ['steel' as any],
        symbol: '?',
        color: 'white',
      });

      const contents = new ItemContents().addItem(Item.create(contentType));
      const item = createTestItem({
        id: 'bag',
        name: '袋子',
        contents: contents,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const canOpen = containerOpenMethod.canUse!(item, context);
      expect(canOpen).toBe(true);

      const result = containerOpenMethod.use(item, context);
      expect(result.success).toBe(true);
      expect(result.message).toContain('打开');
    });

    it('空容器不能打开', () => {
      const item = createTestItem({
        id: 'empty_box',
        name: '空盒子',
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const canOpen = containerOpenMethod.canUse!(item, context);
      expect(canOpen).toBe(false);
    });
  });

  describe('containerCloseMethod', () => {
    it('应该关闭容器', () => {
      const item = createTestItem({
        id: 'box',
        name: '盒子',
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = containerCloseMethod.use(item, context);
      expect(result.success).toBe(true);
      expect(result.message).toContain('关闭');
    });
  });
});

describe('use-methods - 书籍方法', () => {
  beforeEach(() => {
    registerBuiltinUseMethods();
  });

  describe('bookReadMethod', () => {
    it('应该允许阅读书籍', () => {
      const item = createTestItem({
        id: 'skill_book',
        name: '技能书',
        isBook: true,
        book: {
          level: 5,
          skill: 'cooking',
          skillLevel: 3,
        },
      });

      const context: UseContext = {
        user: { skills: Map() },
        currentTime: Date.now(),
      };

      const result = bookReadMethod.use(item, context);
      expect(result.success).toBe(true);
      expect(result.sideEffects).toBeDefined();
      expect(result.sideEffects?.some(e => e.type === 'skill')).toBe(true);
    });

    it('应该检查技能要求', () => {
      const item = createTestItem({
        id: 'advanced_book',
        name: '高级书籍',
        isBook: true,
        book: {
          level: 10,
          requiredSkill: 'cooking',
          requiredLevel: 5,
        },
      });

      const context: UseContext = {
        user: { skills: Map() },
        currentTime: Date.now(),
      };

      const canRead = bookReadMethod.canUse!(item, context);
      expect(canRead).toBe(false);
    });

    it('有足够技能应该能阅读', () => {
      const item = createTestItem({
        id: 'advanced_book',
        name: '高级书籍',
        isBook: true,
        book: {
          level: 10,
          requiredSkill: 'cooking',
          requiredLevel: 5,
        },
      });

      const context: UseContext = {
        user: { skills: Map().set('cooking', 5) },
        currentTime: Date.now(),
      };

      const canRead = bookReadMethod.canUse!(item, context);
      expect(canRead).toBe(true);
    });
  });
});

describe('use-methods - 护甲方法', () => {
  beforeEach(() => {
    registerBuiltinUseMethods();
  });

  describe('armorWearMethod', () => {
    it('应该穿戴护甲', () => {
      const item = createTestItem({
        id: 'shirt',
        name: '衬衫',
        isArmor: true,
        armor: {
          coverage: 90,
          encumbrance: 2,
        },
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = armorWearMethod.use(item, context);
      expect(result.success).toBe(true);
      expect(result.resultingItem?.active).toBe(true);
    });

    it('已穿戴的护甲不能再次穿戴', () => {
      const item = createTestItem({
        id: 'jacket',
        name: '夹克',
        isArmor: true,
        active: true,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const canWear = armorWearMethod.canUse!(item, context);
      expect(canWear).toBe(false);
    });

    it('损坏的护甲不能穿戴', () => {
      const item = createTestItem({
        id: 'broken_armor',
        name: '损坏的护甲',
        isArmor: true,
        damage: 4000,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const canWear = armorWearMethod.canUse!(item, context);
      expect(canWear).toBe(false);
    });
  });

  describe('armorRemoveMethod', () => {
    it('应该脱下护甲', () => {
      const item = createTestItem({
        id: 'helmet',
        name: '头盔',
        isArmor: true,
        active: true,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = armorRemoveMethod.use(item, context);
      expect(result.success).toBe(true);
      expect(result.resultingItem?.active).toBe(false);
    });

    it('未穿戴的护甲不能脱下', () => {
      const item = createTestItem({
        id: 'vest',
        name: '背心',
        isArmor: true,
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const canRemove = armorRemoveMethod.canUse!(item, context);
      expect(canRemove).toBe(false);
    });
  });
});

describe('use-methods - 武器攻击方法', () => {
  beforeEach(() => {
    registerBuiltinUseMethods();
  });

  describe('weaponAttackMethod', () => {
    it('枪械攻击应该消耗弹药并造成伤害', () => {
      const item = createTestItem({
        id: 'rifle',
        name: '步枪',
        isGun: true,
        charges: 10,
        gun: {
          rangedDamage: 30,
          ammoToFire: 1,
        },
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = weaponAttackMethod.use(item, context);
      expect(result.success).toBe(true);
      expect(result.resultingItem?.charges).toBe(9);
      expect(result.sideEffects?.some(e => e.type === 'damage' && e.value === 30)).toBe(true);
    });

    it('没有弹药的枪械不能攻击', () => {
      const item = createTestItem({
        id: 'pistol',
        name: '手枪',
        isGun: true,
        charges: 0,
        gun: {
          rangedDamage: 25,
        },
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const canAttack = weaponAttackMethod.canUse!(item, context);
      expect(canAttack).toBe(false);
    });

    it('近战武器应该造成伤害', () => {
      const item = createTestItem({
        id: 'knife',
        name: '刀',
        isWeapon: true,
        category: 'WEAPON',
        generic: {
          cut: 15,
          toHit: 2,
        },
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = weaponAttackMethod.use(item, context);
      expect(result.success).toBe(true);
      expect(result.sideEffects?.some(e => e.type === 'damage' && e.value === 15)).toBe(true);
    });

    it('应该使用 bash 或 cut 中较大的值', () => {
      const item = createTestItem({
        id: 'hammer',
        name: '锤子',
        isWeapon: true,
        category: 'WEAPON',
        generic: {
          bash: 20,
          cut: 5,
        },
      });

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = weaponAttackMethod.use(item, context);
      expect(result.sideEffects?.some(e => e.type === 'damage' && e.value === 20)).toBe(true);
    });
  });
});

describe('use-methods - 副作用应用', () => {
  describe('applySideEffects', () => {
    it('应该应用所有类型的副作用', () => {
      const sideEffects: UseSideEffect[] = [
        { type: 'effect', id: 'heal', value: 10, message: '你恢复了生命' },
        { type: 'skill', id: 'cooking', value: 1, message: '你获得了烹饪经验' },
        { type: 'stat', id: 'stamina', value: -5, message: '你消耗了体力' },
        { type: 'damage', value: 20, message: '你造成了 20 点伤害' },
        { type: 'heal', value: 15, message: '你恢复了 15 点生命' },
      ];

      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = applySideEffects(sideEffects, context);

      expect(result.success).toBe(true);
      expect(result.appliedCount).toBe(5);
      expect(result.messages.length).toBe(5);
      expect(result.failedEffects.length).toBe(0);
    });

    it('空副作用数组应该返回成功', () => {
      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = applySideEffects([], context);

      expect(result.success).toBe(true);
      expect(result.appliedCount).toBe(0);
    });

    it('undefined 副作用应该返回成功', () => {
      const context: UseContext = {
        user: {},
        currentTime: Date.now(),
      };

      const result = applySideEffects(undefined, context);

      expect(result.success).toBe(true);
      expect(result.appliedCount).toBe(0);
    });
  });
});
