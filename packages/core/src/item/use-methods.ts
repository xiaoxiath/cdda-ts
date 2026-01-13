/**
 * 物品使用方法系统
 *
 * 参考 Cataclysm-DDA 的 iuse_actor 和 use_methods
 * 处理物品的各种使用方式（吃、喝、工具使用等）
 */

import type { Item } from './Item';
import type { ItemTypeId } from './types';

// ============ 使用方法类型 ============

/**
 * 使用方法类型枚举
 */
export enum UseMethodType {
  CONSUME = 'CONSUME',           // 消耗品（食物、药物）
  EAT = 'EAT',                   // 食物
  DRINK = 'DRINK',               // 饮料
  TOOL_ACTIVATE = 'TOOL_ACTIVATE', // 工具激活
  TOOL_USE = 'TOOL_USE',         // 工具使用
  WEAPON_ATTACK = 'WEAPON_ATTACK', // 武器攻击
  GUN_FIRE = 'GUN_FIRE',         // 枪械射击
  CONTAINER_OPEN = 'CONTAINER_OPEN', // 打开容器
  CONTAINER_CLOSE = 'CONTAINER_CLOSE', // 关闭容器
  BOOK_READ = 'BOOK_READ',       // 读书
  BIONIC_INSTALL = 'BIONIC_INSTALL', // 安装生物植入物
  ARMOR_WEAR = 'ARMOR_WEAR',     // 穿戴护甲
  ARMOR_REMOVE = 'ARMOR_REMOVE', // 脱下护甲
  CUSTOM = 'CUSTOM',             // 自定义使用方式
}

// ============ 使用结果 ============

/**
 * 使用结果
 */
export interface UseResult {
  /** 是否成功使用 */
  success: boolean;
  /** 使用后的物品（可能被消耗或改变） */
  resultingItem?: Item;
  /** 使用时间（毫秒） */
  timeTaken: number;
  /** 成功/失败消息 */
  message: string;
  /** 副作用（如获得的效果、技能等） */
  sideEffects?: UseSideEffect[];
  /** 失败原因 */
  error?: string;
}

/**
 * 使用副作用
 */
export interface UseSideEffect {
  type: 'effect' | 'skill' | 'stat' | 'damage' | 'heal';
  id?: string;
  value?: number;
  message?: string;
}

// ============ 使用上下文 ============

/**
 * 使用上下文 - 提供使用时的环境信息
 */
export interface UseContext {
  /** 使用者（角色） */
  user: any;
  /** 当前时间 */
  currentTime: number;
  /** 位置 */
  position?: { x: number; y: number; z: number };
  /** 目标（某些使用方式需要） */
  target?: any;
  /** 使用次数（默认 1） */
  count?: number;
}

// ============ 使用方法定义 ============

/**
 * 使用方法定义
 */
export interface UseMethodDefinition {
  /** 方法类型 */
  type: UseMethodType;
  /** 方法 ID */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 基础使用时间（移动点数） */
  baseTime?: number;
  /** 需要的技能 */
  requiredSkills?: { skill: string; level: number }[];
  /** 需要的品质 */
  requiredQualities?: { quality: string; level: number }[];
  /** 使用条件函数 */
  canUse?: (item: Item, context: UseContext) => boolean | { canUse: boolean; reason?: string };
  /** 使用执行函数 */
  use: (item: Item, context: UseContext) => UseResult | Promise<UseResult>;
}

// ============ 使用方法注册表 ============

/**
 * 使用方法注册表
 */
class UseMethodRegistry {
  private methods = new Map<UseMethodType, Map<string, UseMethodDefinition>>();

  /**
   * 注册使用方法
   */
  register(method: UseMethodDefinition): void {
    let typeMap = this.methods.get(method.type);
    if (!typeMap) {
      typeMap = new Map();
      this.methods.set(method.type, typeMap);
    }
    typeMap.set(method.id, method);
  }

  /**
   * 获取使用方法
   */
  get(type: UseMethodType, id: string): UseMethodDefinition | undefined {
    return this.methods.get(type)?.get(id);
  }

  /**
   * 获取指定类型的所有方法
   */
  getByType(type: UseMethodType): UseMethodDefinition[] {
    const typeMap = this.methods.get(type);
    return typeMap ? Array.from(typeMap.values()) : [];
  }

  /**
   * 获取物品的所有可用使用方法
   */
  getForItem(item: Item, context: UseContext): UseMethodDefinition[] {
    const available: UseMethodDefinition[] = [];

    for (const [type, typeMap] of this.methods) {
      for (const method of typeMap.values()) {
        // 检查是否可以使用
        if (method.canUse) {
          const canUseResult = method.canUse(item, context);
          if (typeof canUseResult === 'boolean') {
            if (!canUseResult) continue;
          } else {
            if (!canUseResult.canUse) continue;
          }
        }

        // 根据物品类型过滤
        if (!this.isMethodApplicable(type, item)) {
          continue;
        }

        available.push(method);
      }
    }

    return available;
  }

  /**
   * 检查方法是否适用于物品
   */
  private isMethodApplicable(type: UseMethodType, item: Item): boolean {
    switch (type) {
      case UseMethodType.EAT:
      case UseMethodType.CONSUME:
        return item.isComestible();
      case UseMethodType.DRINK:
        return item.isComestible();
      case UseMethodType.TOOL_ACTIVATE:
      case UseMethodType.TOOL_USE:
        return item.isTool();
      case UseMethodType.WEAPON_ATTACK:
        // 武器检查：有枪械插槽，或者是 WEAPON 类别
        return item.isGun() || item.type.category === 'WEAPON';
      case UseMethodType.GUN_FIRE:
        return item.isGun();
      case UseMethodType.CONTAINER_OPEN:
      case UseMethodType.CONTAINER_CLOSE:
        return item.contents !== undefined && !item.contents.isEmpty();
      case UseMethodType.BOOK_READ:
        return item.isBook();
      case UseMethodType.BIONIC_INSTALL:
        return item.isBionic();
      case UseMethodType.ARMOR_WEAR:
      case UseMethodType.ARMOR_REMOVE:
        return item.isArmor();
      default:
        return true;
    }
  }
}

// 全局注册表实例
export const useMethodRegistry = new UseMethodRegistry();

// ============ 内置使用方法 ============

/**
 * 食物使用方法
 */
export const eatMethod: UseMethodDefinition = {
  type: UseMethodType.EAT,
  id: 'eat',
  name: '吃',
  description: '食用食物',
  baseTime: 300, // 300 移动点数

  canUse(item: Item, context: UseContext): boolean {
    // 检查是否是食物
    if (!item.isComestible()) {
      return false;
    }

    // 检查是否腐烂
    if (item.isSpoiled(context.currentTime)) {
      return false;
    }

    // 检查是否冷冻
    if (item.frozen && item.frozen > 0) {
      return false;
    }

    return true;
  },

  use(item: Item, context: UseContext): UseResult {
    const comestible = item.type.comestible;
    if (!comestible) {
      return {
        success: false,
        timeTaken: 0,
        message: '这不是食物',
        error: 'NOT_FOOD',
      };
    }

    const sideEffects: UseSideEffect[] = [];

    // 添加饥饿效果
    if (comestible.calories) {
      sideEffects.push({
        type: 'stat',
        id: 'hunger',
        value: comestible.calories,
        message: `你吃了 ${item.name}，获得 ${comestible.calories} 卡路里`,
      });
    }

    // 添加口渴效果
    if (comestible.quench) {
      sideEffects.push({
        type: 'stat',
        id: 'thirst',
        value: comestible.quench,
      });
    }

    // 添加快乐效果
    if (comestible.fun) {
      sideEffects.push({
        type: 'effect',
        id: 'fun',
        value: comestible.fun,
      });
    }

    // 消耗食物
    const newItem = item.charges > 1 ? item.consumeOne() : undefined;

    return {
      success: true,
      resultingItem: newItem,
      timeTaken: 300,
      message: `你吃了 ${item.name}`,
      sideEffects,
    };
  },
};

/**
 * 饮料使用方法
 */
export const drinkMethod: UseMethodDefinition = {
  type: UseMethodType.DRINK,
  id: 'drink',
  name: '喝',
  description: '饮用饮料',
  baseTime: 250,

  canUse(item: Item, context: UseContext): boolean {
    if (!item.isComestible()) {
      return false;
    }
    return !item.isSpoiled(context.currentTime);
  },

  use(item: Item, context: UseContext): UseResult {
    const comestible = item.type.comestible;
    if (!comestible) {
      return {
        success: false,
        timeTaken: 0,
        message: '这不是饮料',
        error: 'NOT_DRINK',
      };
    }

    const sideEffects: UseSideEffect[] = [];

    // 添加口渴效果
    if (comestible.quench) {
      sideEffects.push({
        type: 'stat',
        id: 'thirst',
        value: comestible.quench,
        message: `你喝了 ${item.name}，解渴 ${comestible.quench}`,
      });
    }

    const newItem = item.charges > 1 ? item.consumeOne() : undefined;

    return {
      success: true,
      resultingItem: newItem,
      timeTaken: 250,
      message: `你喝了 ${item.name}`,
      sideEffects,
    };
  },
};

/**
 * 工具激活方法
 */
export const toolActivateMethod: UseMethodDefinition = {
  type: UseMethodType.TOOL_ACTIVATE,
  id: 'tool_activate',
  name: '激活',
  description: '激活工具',
  baseTime: 100,

  canUse(item: Item, context: UseContext): boolean {
    if (!item.isTool()) {
      return false;
    }
    // 检查是否有电量
    return item.charges > 0;
  },

  use(item: Item, context: UseContext): UseResult {
    // 切换激活状态
    const newItem = item.toggleActive();

    return {
      success: true,
      resultingItem: newItem,
      timeTaken: 100,
      message: newItem.active
        ? `你激活了 ${item.name}`
        : `你关闭了 ${item.name}`,
    };
  },
};

/**
 * 工具使用方法
 */
export const toolUseMethod: UseMethodDefinition = {
  type: UseMethodType.TOOL_USE,
  id: 'tool_use',
  name: '使用',
  description: '使用工具',
  baseTime: 100,

  canUse(item: Item): boolean {
    return item.isTool() && item.charges > 0;
  },

  use(item: Item): UseResult {
    // 消耗一个单位电量
    const newItem = item.consumeOne();

    return {
      success: true,
      resultingItem: newItem,
      timeTaken: 100,
      message: `你使用了 ${item.name}`,
    };
  },
};

/**
 * 枪械射击方法
 */
export const gunFireMethod: UseMethodDefinition = {
  type: UseMethodType.GUN_FIRE,
  id: 'gun_fire',
  name: '射击',
  description: '发射枪械',
  baseTime: 80,

  canUse(item: Item): boolean {
    return item.isGun() && item.charges > 0;
  },

  use(item: Item, context: UseContext): UseResult {
    // 消耗弹药
    const ammoPerShot = item.type.gun?.ammoToFire || 1;
    const newItem = item.set('charges', Math.max(0, item.charges - ammoPerShot));

    return {
      success: true,
      resultingItem: newItem,
      timeTaken: 80,
      message: `你发射了 ${item.name}`,
    };
  },
};

/**
 * 容器打开方法
 */
export const containerOpenMethod: UseMethodDefinition = {
  type: UseMethodType.CONTAINER_OPEN,
  id: 'container_open',
  name: '打开',
  description: '打开容器',
  baseTime: 100,

  canUse(item: Item): boolean {
    return item.contents !== undefined && !item.contents.isEmpty();
  },

  use(item: Item, context: UseContext): UseResult {
    // 容器已经通过 contents 访问，这里只是确认操作
    const contents = item.contents;
    const itemCount = contents.getItemCount();

    return {
      success: true,
      resultingItem: item,
      timeTaken: 100,
      message: `你打开了 ${item.name}，里面有 ${itemCount} 个物品`,
    };
  },
};

/**
 * 容器关闭方法
 */
export const containerCloseMethod: UseMethodDefinition = {
  type: UseMethodType.CONTAINER_CLOSE,
  id: 'container_close',
  name: '关闭',
  description: '关闭容器',
  baseTime: 50,

  canUse(item: Item): boolean {
    return item.contents !== undefined;
  },

  use(item: Item, context: UseContext): UseResult {
    return {
      success: true,
      resultingItem: item,
      timeTaken: 50,
      message: `你关闭了 ${item.name}`,
    };
  },
};

/**
 * 书籍阅读方法
 */
export const bookReadMethod: UseMethodDefinition = {
  type: UseMethodType.BOOK_READ,
  id: 'book_read',
  name: '阅读',
  description: '阅读书籍',
  baseTime: 1000, // 阅读需要较长时间

  canUse(item: Item, context: UseContext): boolean {
    if (!item.isBook()) {
      return false;
    }
    const book = item.type.book;
    if (!book) {
      return false;
    }

    // 检查技能要求
    if (book.requiredSkill && context.user) {
      const userSkill = context.user.skills?.get(book.requiredSkill);
      const requiredLevel = book.requiredLevel || 0;
      if ((userSkill || 0) < requiredLevel) {
        return false;
      }
    }

    return true;
  },

  use(item: Item, context: UseContext): UseResult {
    const book = item.type.book;
    if (!book) {
      return {
        success: false,
        timeTaken: 0,
        message: '这不是一本书',
        error: 'NOT_BOOK',
      };
    }

    const sideEffects: UseSideEffect[] = [];

    // 添加技能经验
    if (book.skill && book.skillLevel) {
      sideEffects.push({
        type: 'skill',
        id: book.skill,
        value: book.skillLevel,
        message: `你阅读了 ${item.name}，获得了 ${book.skill} 经验`,
      });
    }

    // 添加效果
    if (book.effect) {
      sideEffects.push({
        type: 'effect',
        id: book.effect,
        message: `你获得了 ${book.effect} 效果`,
      });
    }

    return {
      success: true,
      resultingItem: item,
      timeTaken: 1000,
      message: `你阅读了 ${item.name}`,
      sideEffects,
    };
  },
};

/**
 * 护甲穿戴方法
 */
export const armorWearMethod: UseMethodDefinition = {
  type: UseMethodType.ARMOR_WEAR,
  id: 'armor_wear',
  name: '穿戴',
  description: '穿戴护甲',
  baseTime: 200,

  canUse(item: Item, context: UseContext): boolean {
    if (!item.isArmor()) {
      return false;
    }

    // 检查是否已经穿戴
    if (item.active) {
      return false;
    }

    // 检查是否损坏
    if (item.isBroken()) {
      return false;
    }

    // TODO: 检查角色是否已经穿戴了同部位护甲
    return true;
  },

  use(item: Item, context: UseContext): UseResult {
    const armor = item.type.armor;
    if (!armor) {
      return {
        success: false,
        timeTaken: 0,
        message: '这不是护甲',
        error: 'NOT_ARMOR',
      };
    }

    const sideEffects: UseSideEffect[] = [];

    // 添加防护效果（作为副作用记录，实际应用由角色系统处理）
    sideEffects.push({
      type: 'effect',
      id: 'armor_protection',
      message: `你穿戴了 ${item.name}，获得防护`,
    });

    // 激活护甲
    const newItem = item.setActive(true);

    return {
      success: true,
      resultingItem: newItem,
      timeTaken: 200,
      message: `你穿戴了 ${item.name}`,
      sideEffects,
    };
  },
};

/**
 * 护甲脱下方法
 */
export const armorRemoveMethod: UseMethodDefinition = {
  type: UseMethodType.ARMOR_REMOVE,
  id: 'armor_remove',
  name: '脱下',
  description: '脱下护甲',
  baseTime: 150,

  canUse(item: Item, context: UseContext): boolean {
    if (!item.isArmor()) {
      return false;
    }

    // 检查是否已穿戴
    return item.active;
  },

  use(item: Item, context: UseContext): UseResult {
    // 关闭护甲
    const newItem = item.setActive(false);

    return {
      success: true,
      resultingItem: newItem,
      timeTaken: 150,
      message: `你脱下了 ${item.name}`,
    };
  },
};

/**
 * 武器攻击方法
 */
export const weaponAttackMethod: UseMethodDefinition = {
  type: UseMethodType.WEAPON_ATTACK,
  id: 'weapon_attack',
  name: '攻击',
  description: '使用武器攻击',
  baseTime: 80,

  canUse(item: Item, context: UseContext): boolean {
    // 检查是否是武器
    if (!item.isWeapon()) {
      return false;
    }

    // 枪械需要检查弹药
    if (item.isGun()) {
      return item.charges > 0;
    }

    // 近战武器检查是否损坏
    return !item.isBroken();
  },

  use(item: Item, context: UseContext): UseResult {
    const sideEffects: UseSideEffect[] = [];
    let newItem = item;

    // 计算伤害
    let damage = 0;
    if (item.isGun()) {
      // 枪械伤害
      damage = item.type.gun?.rangedDamage || 0;
      // 消耗弹药
      const ammoPerShot = item.type.gun?.ammoToFire || 1;
      newItem = item.set('charges', Math.max(0, item.charges - ammoPerShot));
    } else {
      // 近战伤害（使用 generic 插槽的 bash/cut 值）
      const generic = item.type.generic;
      damage = Math.max(generic?.bash || 0, generic?.cut || 0);
    }

    // 记录伤害副作用
    sideEffects.push({
      type: 'damage',
      value: damage,
      message: `你使用 ${item.name} 造成 ${damage} 点伤害`,
    });

    return {
      success: true,
      resultingItem: newItem,
      timeTaken: 80,
      message: `你使用 ${item.name} 进行攻击`,
      sideEffects,
    };
  },
};

// 注册所有内置使用方法
export function registerBuiltinUseMethods(): void {
  useMethodRegistry.register(eatMethod);
  useMethodRegistry.register(drinkMethod);
  useMethodRegistry.register(toolActivateMethod);
  useMethodRegistry.register(toolUseMethod);
  useMethodRegistry.register(gunFireMethod);
  useMethodRegistry.register(containerOpenMethod);
  useMethodRegistry.register(containerCloseMethod);
  useMethodRegistry.register(bookReadMethod);
  useMethodRegistry.register(armorWearMethod);
  useMethodRegistry.register(armorRemoveMethod);
  useMethodRegistry.register(weaponAttackMethod);
}

// ============ 使用方法辅助函数 ============

/**
 * 获取物品的可用使用方法
 */
export function getAvailableUseMethods(item: Item, context: UseContext): UseMethodDefinition[] {
  return useMethodRegistry.getForItem(item, context);
}

/**
 * 执行使用方法
 */
export async function executeUseMethod(
  item: Item,
  method: UseMethodDefinition,
  context: UseContext
): Promise<UseResult> {
  // 先检查是否可以使用
  if (method.canUse) {
    const canUseResult = method.canUse(item, context);
    if (typeof canUseResult === 'boolean') {
      if (!canUseResult) {
        return {
          success: false,
          timeTaken: 0,
          message: '无法使用此物品',
          error: 'CANNOT_USE',
        };
      }
    } else {
      if (!canUseResult.canUse) {
        return {
          success: false,
          timeTaken: 0,
          message: canUseResult.reason || '无法使用此物品',
          error: 'CANNOT_USE',
        };
      }
    }
  }

  // 执行使用方法
  return method.use(item, context);
}

/**
 * 使用物品（使用默认方法）
 */
export async function useItem(item: Item, context: UseContext): Promise<UseResult> {
  const methods = getAvailableUseMethods(item, context);

  if (methods.length === 0) {
    return {
      success: false,
      timeTaken: 0,
      message: '此物品没有可用的使用方法',
      error: 'NO_USE_METHOD',
    };
  }

  // 使用第一个可用方法
  return executeUseMethod(item, methods[0], context);
}

/**
 * 检查物品是否可以被使用
 */
export function canUseItem(item: Item, context: UseContext): boolean {
  const methods = getAvailableUseMethods(item, context);
  return methods.length > 0;
}

/**
 * 获取物品的使用时间
 */
export function getUseTime(item: Item, method: UseMethodDefinition): number {
  return method.baseTime || 100;
}

// ============ 副作用应用 ============

/**
 * 应用使用物品的副作用
 *
 * 此函数将 UseSideEffect 数组应用到角色上
 * 实际的修改由角色系统处理，这里提供接口
 */
export interface ApplySideEffectsResult {
  /** 是否成功应用 */
  success: boolean;
  /** 应用的副作用数量 */
  appliedCount: number;
  /** 失败的副作用 */
  failedEffects: Array<{ effect: UseSideEffect; reason: string }>;
  /** 生成的消息 */
  messages: string[];
}

export function applySideEffects(
  sideEffects: UseSideEffect[],
  context: UseContext
): ApplySideEffectsResult {
  const result: ApplySideEffectsResult = {
    success: true,
    appliedCount: 0,
    failedEffects: [],
    messages: [],
  };

  if (!sideEffects || sideEffects.length === 0) {
    return result;
  }

  // TODO: 当角色系统实现后，这里会实际应用效果
  // 目前只记录消息和返回结果
  for (const effect of sideEffects) {
    try {
      switch (effect.type) {
        case 'effect':
          // 应用效果（需要角色系统）
          result.appliedCount++;
          if (effect.message) {
            result.messages.push(effect.message);
          }
          break;

        case 'skill':
          // 添加技能经验（需要角色系统）
          result.appliedCount++;
          if (effect.message) {
            result.messages.push(effect.message);
          }
          break;

        case 'stat':
          // 修改属性（需要角色系统）
          result.appliedCount++;
          if (effect.message) {
            result.messages.push(effect.message);
          }
          break;

        case 'damage':
          // 造成伤害（需要战斗系统）
          result.appliedCount++;
          if (effect.message) {
            result.messages.push(effect.message);
          }
          break;

        case 'heal':
          // 治疗（需要角色系统）
          result.appliedCount++;
          if (effect.message) {
            result.messages.push(effect.message);
          }
          break;

        default:
          result.failedEffects.push({
            effect,
            reason: `未知的效果类型: ${(effect as any).type}`,
          });
      }
    } catch (error) {
      result.failedEffects.push({
        effect,
        reason: String(error),
      });
    }
  }

  result.success = result.failedEffects.length === 0;
  return result;
}
