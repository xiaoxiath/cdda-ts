import { Terrain } from './Terrain';
import { TerrainId } from '../coordinates/types';
import { TerrainData } from './TerrainData';
import { TerrainParser, TerrainJson } from './TerrainParser';

/**
 * 地形加载器
 */
export class TerrainLoader {
  private readonly data: TerrainData;
  private readonly parser: TerrainParser;

  constructor() {
    this.data = new TerrainData();
    this.parser = new TerrainParser();
  }

  /**
   * 从 JSON 数组加载地形
   */
  async loadFromJson(json: TerrainJson[]): Promise<TerrainData> {
    const terrains: Terrain[] = [];

    for (const obj of json) {
      try {
        if (obj.type === 'terrain') {
          const terrain = this.parser.parse(obj as TerrainJson);
          terrains.push(terrain);
        }
      } catch (error) {
        // Silently skip abstract terrain definitions (templates)
        if ((error as Error).message?.includes('Abstract terrain definition')) {
          continue;
        }
        console.error(`Failed to parse terrain: ${obj.id}`, error);
      }
    }

    // 添加到数据存储
    this.data.setMany(terrains);

    return this.data;
  }

  /**
   * 从 URL 加载地形数据
   */
  async loadFromUrl(url: string): Promise<TerrainData> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load terrain from ${url}: ${response.statusText}`);
    }

    const json = (await response.json()) as TerrainJson[];
    return this.loadFromJson(json);
  }

  /**
   * 从多个 URL 加载地形数据
   */
  async loadFromUrls(urls: string[]): Promise<TerrainData> {
    const allTerrains: Terrain[] = [];

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Failed to load ${url}: ${response.statusText}`);
          continue;
        }

        const json = await response.json();
        const terrainArray = Array.isArray(json) ? json : [json];

        for (const obj of terrainArray) {
          if (obj.type === 'terrain') {
            try {
              const terrain = this.parser.parse(obj as TerrainJson);
              allTerrains.push(terrain);
            } catch (error) {
              // Silently skip abstract terrain definitions (templates)
              if ((error as Error).message?.includes('Abstract terrain definition')) {
                continue;
              }
              console.error(`Failed to parse terrain from ${url}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Failed to load ${url}:`, error);
      }
    }

    this.data.setMany(allTerrains);
    return this.data;
  }

  /**
   * 获取地形数据
   */
  getData(): TerrainData {
    return this.data;
  }

  /**
   * 获取地形
   */
  get(id: TerrainId): Terrain | undefined {
    return this.data.get(id);
  }

  /**
   * 按名称查找地形
   */
  findByName(name: string): Terrain | undefined {
    return this.data.findByName(name);
  }

  /**
   * 按原始字符串 ID 查找地形
   */
  findByIdString(idString: string): Terrain | undefined {
    return this.data.findByIdString(idString);
  }

  /**
   * 获取所有地形
   */
  getAll(): Terrain[] {
    return this.data.getAll();
  }

  /**
   * 清空数据
   */
  clear(): void {
    this.data.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): { total: number; bySymbol: Record<string, number> } {
    const terrains = this.getAll();
    const bySymbol: Record<string, number> = {};

    terrains.forEach((terrain) => {
      bySymbol[terrain.symbol] = (bySymbol[terrain.symbol] || 0) + 1;
    });

    return {
      total: terrains.length,
      bySymbol,
    };
  }
}
