import { Terrain } from './Terrain';
import { TerrainId, TerrainFlag } from './types';

/**
 * 地形数据管理器
 */
export class TerrainData {
  private readonly byId: Map<TerrainId, Terrain> = new Map();
  private readonly byName: Map<string, Terrain> = new Map();
  private readonly bySymbol: Map<string, Terrain> = new Map();
  private readonly byIdString: Map<string, Terrain> = new Map();  // 按原始字符串 ID 查找

  /**
   * 设置地形
   */
  set(id: TerrainId, terrain: Terrain): void {
    this.byId.set(id, terrain);
    this.byName.set(terrain.name, terrain);
    this.bySymbol.set(terrain.symbol, terrain);
    if (terrain.idString) {
      this.byIdString.set(terrain.idString, terrain);
    }
  }

  /**
   * 批量设置地形
   */
  setMany(terrains: Terrain[]): void {
    terrains.forEach((terrain) => this.set(terrain.id, terrain));
  }

  /**
   * 获取地形
   */
  get(id: TerrainId): Terrain | undefined {
    return this.byId.get(id);
  }

  /**
   * 按名称查找
   */
  findByName(name: string): Terrain | undefined {
    return this.byName.get(name);
  }

  /**
   * 按符号查找
   */
  findBySymbol(symbol: string): Terrain | undefined {
    return this.bySymbol.get(symbol);
  }

  /**
   * 按原始字符串 ID 查找
   */
  findByIdString(idString: string): Terrain | undefined {
    return this.byIdString.get(idString);
  }

  /**
   * 获取所有地形
   */
  getAll(): Terrain[] {
    return Array.from(this.byId.values());
  }

  /**
   * 获取地形数量
   */
  size(): number {
    return this.byId.size;
  }

  /**
   * 检查是否存在
   */
  has(id: TerrainId): boolean {
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
   * 按标志过滤地形
   */
  filterByFlag(flag: TerrainFlag): Terrain[] {
    return this.getAll().filter((terrain) => terrain.flags.has(flag));
  }

  /**
   * 获取所有平坦地形
   */
  getFlatTerrains(): Terrain[] {
    return this.getAll().filter((terrain) => terrain.flags.isFlat());
  }

  /**
   * 获取所有墙
   */
  getWalls(): Terrain[] {
    return this.getAll().filter((terrain) => terrain.flags.isWall());
  }

  /**
   * 获取所有门
   */
  getDoors(): Terrain[] {
    return this.getAll().filter((terrain) => terrain.flags.isDoor());
  }
}
