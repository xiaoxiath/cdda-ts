import { Trap } from './Trap';
import { TrapId, TrapFlag } from './types';

/**
 * 陷阱数据管理器
 */
export class TrapData {
  private byId: Map<TrapId, Trap> = new Map();
  private byName: Map<string, Trap> = new Map();
  private bySymbol: Map<string, Trap> = new Map();

  /**
   * 设置陷阱
   */
  set(id: TrapId, trap: Trap): void {
    this.byId = this.byId.set(id, trap);
    this.byName = this.byName.set(trap.name, trap);
    this.bySymbol = this.bySymbol.set(trap.symbol, trap);
  }

  /**
   * 批量设置陷阱
   */
  setMany(traps: Trap[]): void {
    traps.forEach((trap) => this.set(trap.id, trap));
  }

  /**
   * 获取陷阱
   */
  get(id: TrapId): Trap | undefined {
    return this.byId.get(id);
  }

  /**
   * 按名称查找
   */
  findByName(name: string): Trap | undefined {
    return this.byName.get(name);
  }

  /**
   * 按符号查找
   */
  findBySymbol(symbol: string): Trap | undefined {
    return this.bySymbol.get(symbol);
  }

  /**
   * 获取所有陷阱
   */
  getAll(): Trap[] {
    return Array.from(this.byId.values());
  }

  /**
   * 获取陷阱数量
   */
  size(): number {
    return this.byId.size;
  }

  /**
   * 检查是否存在
   */
  has(id: TrapId): boolean {
    return this.byId.has(id);
  }

  /**
   * 清空数据
   */
  clear(): void {
    this.byId.clear();
    this.byName.clear();
    this.bySymbol.clear();
  }

  /**
   * 按标志过滤陷阱
   */
  filterByFlag(flag: TrapFlag): Trap[] {
    return this.getAll().filter((trap) => trap.flags.has(flag));
  }

  /**
   * 获取所有可见陷阱
   */
  getVisibleTraps(): Trap[] {
    return this.getAll().filter((trap) => trap.flags.isVisible());
  }

  /**
   * 获取所有隐藏陷阱
   */
  getHiddenTraps(): Trap[] {
    return this.getAll().filter((trap) => trap.flags.isHidden());
  }

  /**
   * 获取所有无害陷阱
   */
  getBenignTraps(): Trap[] {
    return this.getAll().filter((trap) => trap.benign);
  }

  /**
   * 获取所有危险陷阱
   */
  getDangerousTraps(): Trap[] {
    return this.getAll().filter((trap) => trap.isDangerous());
  }

  /**
   * 获取所有致命陷阱
   */
  getLethalTraps(): Trap[] {
    return this.getAll().filter((trap) => trap.isLethal());
  }

  /**
   * 获取所有需要弹药的陷阱
   */
  getTrapsRequiringAmmunition(): Trap[] {
    return this.getAll().filter((trap) => trap.requiresAmmunition());
  }

  /**
   * 按动作类型获取陷阱
   */
  getTrapsByAction(action: string): Trap[] {
    return this.getAll().filter((trap) => trap.action === action);
  }

  /**
   * 按复杂度排序
   */
  sortByComplexity(): Trap[] {
    return this.getAll().sort((a, b) => a.getComplexity() - b.getComplexity());
  }

  /**
   * 按难度排序
   */
  sortByDifficulty(): Trap[] {
    return this.getAll().sort((a, b) => a.difficulty - b.difficulty);
  }

  /**
   * 获取适合新手角色的陷阱
   */
  getBeginnerTraps(maxDifficulty: number = 2): Trap[] {
    return this.getAll().filter((trap) => trap.difficulty <= maxDifficulty);
  }

  /**
   * 获取适合专家角色的陷阱
   */
  getExpertTraps(minDifficulty: number = 5): Trap[] {
    return this.getAll().filter((trap) => trap.difficulty >= minDifficulty);
  }

  /**
   * 获取低触发重量的陷阱
   */
  getLightweightTraps(maxWeight: number = 10000): Trap[] {
    return this.getAll().filter((trap) => trap.triggerWeight <= maxWeight);
  }

  /**
   * 获取高触发重量的陷阱
   */
  getHeavyweightTraps(minWeight: number = 50000): Trap[] {
    return this.getAll().filter((trap) => trap.triggerWeight >= minWeight);
  }
}
