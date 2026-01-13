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
    private _isComestible: boolean = false,
    private _isTool: boolean = false,
    private _isGun: boolean = false,
    private _isArmor: boolean = false,
    private _isBook: boolean = false,
    private _isBionic: boolean = false,
    private comestibleData?: any,
    private gunData?: any
  ) {}

  isTool() { return this._isTool; }
  isComestible() { return this._isComestible; }
  isGun() { return this._isGun; }
  isArmor() { return this._isArmor; }
  isBook() { return this._isBook; }
  isBionic() { return this._isBionic; }

  get comestible() { return this.comestibleData; }
  get gun() { return this.gunData; }

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

  isSpoiled() {
    return false;
  }

  // Add other required methods
  get contents() { return new ItemContents(); }
  get damage() { return 0; }
  get itemVars() { return Map(); }
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
  comestible?: any;
  gun?: any;
  active?: boolean;
  frozen?: number;
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
  });

  return new MockItemForTesting(
    props.id,
    props.name || props.id,
    itemType,
    props.charges ?? 1,
    props.active,
    props.frozen,
    props.isComestible,
    props.isTool,
    props.isGun,
    props.isArmor,
    props.isBook,
    props.isBionic,
    props.comestible,
    props.gun
  );
}

describe('use-methods - 使用方法注册表', () => {
  beforeEach(() => {
    // Clear registry before each test
    (useMethodRegistry as any).methods = new Map();
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
    (useMethodRegistry as any).methods = new Map();
    registerBuiltinUseMethods();

    expect(useMethodRegistry.get(UseMethodType.EAT, 'eat')).toBeDefined();
    expect(useMethodRegistry.get(UseMethodType.DRINK, 'drink')).toBeDefined();
    expect(useMethodRegistry.get(UseMethodType.TOOL_ACTIVATE, 'tool_activate')).toBeDefined();
    expect(useMethodRegistry.get(UseMethodType.TOOL_USE, 'tool_use')).toBeDefined();
    expect(useMethodRegistry.get(UseMethodType.GUN_FIRE, 'gun_fire')).toBeDefined();
  });
});
