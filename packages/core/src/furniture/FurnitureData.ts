import { Furniture } from './Furniture';
import { FurnitureId, FurnitureFlag } from './types';

/**
 * 家具数据管理器
 */
export class FurnitureData {
  private readonly byId: Map<FurnitureId, Furniture> = new Map();
  private readonly byName: Map<string, Furniture> = new Map();
  private readonly bySymbol: Map<string, Furniture> = new Map();
  private readonly byIdString: Map<string, Furniture> = new Map();  // 按原始字符串 ID 查找

  /**
   * 设置家具
   */
  set(id: FurnitureId, furniture: Furniture): void {
    this.byId.set(id, furniture);
    this.byName.set(furniture.name, furniture);
    this.bySymbol.set(furniture.symbol, furniture);
    if (furniture.idString) {
      this.byIdString.set(furniture.idString, furniture);
    }
  }

  /**
   * 批量设置家具
   */
  setMany(furnitures: Furniture[]): void {
    furnitures.forEach((furniture) => this.set(furniture.id, furniture));
  }

  /**
   * 获取家具
   */
  get(id: FurnitureId): Furniture | undefined {
    return this.byId.get(id);
  }

  /**
   * 按名称查找
   */
  findByName(name: string): Furniture | undefined {
    return this.byName.get(name);
  }

  /**
   * 按符号查找
   */
  findBySymbol(symbol: string): Furniture | undefined {
    return this.bySymbol.get(symbol);
  }

  /**
   * 按原始字符串 ID 查找
   */
  findByIdString(idString: string): Furniture | undefined {
    return this.byIdString.get(idString);
  }

  /**
   * 获取所有家具
   */
  getAll(): Furniture[] {
    return Array.from(this.byId.values());
  }

  /**
   * 获取家具数量
   */
  size(): number {
    return this.byId.size;
  }

  /**
   * 检查是否存在
   */
  has(id: FurnitureId): boolean {
    return this.byId.has(id);
  }

  /**
   * 清空数据
   */
  clear(): void {
    this.byId.clear();
    this.byName.clear();
    this.bySymbol.clear();
    this.byIdString.clear();
  }

  /**
   * 按标志过滤家具
   */
  filterByFlag(flag: FurnitureFlag): Furniture[] {
    return this.getAll().filter((furniture) => furniture.flags.has(flag));
  }

  /**
   * 获取所有工作台
   */
  getWorkbenches(): Furniture[] {
    return this.getAll().filter((furniture) => furniture.isWorkbench());
  }

  /**
   * 获取所有可坐家具
   */
  getSittable(): Furniture[] {
    return this.getAll().filter((furniture) => furniture.isSittable());
  }

  /**
   * 获取所有容器
   */
  getContainers(): Furniture[] {
    return this.getAll().filter((furniture) => furniture.isContainer());
  }

  /**
   * 获取所有植物
   */
  getPlants(): Furniture[] {
    return this.getAll().filter((furniture) => furniture.isPlant());
  }

  /**
   * 获取所有发光家具
   */
  getLightEmitters(): Furniture[] {
    return this.getAll().filter((furniture) => furniture.emitsLight());
  }

  /**
   * 获取所有易燃家具
   */
  getFlammable(): Furniture[] {
    return this.getAll().filter((furniture) => furniture.isFlammable());
  }

  /**
   * 获取所有阻挡视线的家具
   */
  getVisionBlockers(): Furniture[] {
    return this.getAll().filter((furniture) => furniture.blocksVision());
  }

  /**
   * 按舒适度排序
   */
  sortByComfort(): Furniture[] {
    return this.getAll().sort((a, b) => b.getComfort() - a.getComfort());
  }

  /**
   * 按质量排序
   */
  sortByMass(): Furniture[] {
    return this.getAll().sort((a, b) => a.getMass() - b.getMass());
  }
}
