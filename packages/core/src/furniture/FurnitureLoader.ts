import { Furniture } from './Furniture';
import { FurnitureId } from '../coordinates/types';
import { FurnitureData } from './FurnitureData';
import { FurnitureParser, FurnitureJson } from './FurnitureParser';

/**
 * 家具加载器
 */
export class FurnitureLoader {
  private readonly data: FurnitureData;
  private readonly parser: FurnitureParser;

  constructor() {
    this.data = new FurnitureData();
    this.parser = new FurnitureParser();
  }

  /**
   * 从 JSON 数组加载家具
   */
  async loadFromJson(json: FurnitureJson[]): Promise<FurnitureData> {
    const furnitures: Furniture[] = [];

    for (const obj of json) {
      try {
        if (obj.type === 'furniture' || obj.type === 'furniture_nested') {
          const furniture = this.parser.parse(obj as FurnitureJson);
          furnitures.push(furniture);
        }
      } catch (error) {
        console.error(`Failed to parse furniture: ${obj.id}`, error);
      }
    }

    this.data.setMany(furnitures);

    return this.data;
  }

  /**
   * 从 URL 加载家具数据
   */
  async loadFromUrl(url: string): Promise<FurnitureData> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load furniture from ${url}: ${response.statusText}`);
    }

    const json = (await response.json()) as FurnitureJson[];
    return this.loadFromJson(json);
  }

  /**
   * 从多个 URL 加载家具数据
   */
  async loadFromUrls(urls: string[]): Promise<FurnitureData> {
    const allFurnitures: Furniture[] = [];

    for ( const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Failed to load ${url}: ${response.statusText}`);
          continue;
        }

        const json = await response.json();
        const furnitureArray = Array.isArray(json) ? json : [json];

        for (const obj of furnitureArray) {
          if (obj.type === 'furniture' || obj.type === 'furniture_nested') {
            try {
              const furniture = this.parser.parse(obj as FurnitureJson);
              allFurnitures.push(furniture);
            } catch (error) {
              console.error(`Failed to parse furniture from ${url}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Failed to load ${url}:`, error);
      }
    }

    this.data.setMany(allFurnitures);
    return this.data;
  }

  /**
   * 获取家具数据
   */
  getData(): FurnitureData {
    return this.data;
  }

  /**
   * 获取家具
   */
  get(id: FurnitureId): Furniture | undefined {
    return this.data.get(id);
  }

  /**
   * 按名称查找家具
   */
  findByName(name: string): Furniture | undefined {
    return this.data.findByName(name);
  }

  /**
   * 按原始字符串 ID 查找家具
   */
  findByIdString(idString: string): Furniture | undefined {
    return this.data.findByIdString(idString);
  }

  /**
   * 获取所有家具
   */
  getAll(): Furniture[] {
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
  getStats(): {
    total: number;
    bySymbol: Record<string, number>;
    workbenches: number;
    sittable: number;
    containers: number;
    plants: number;
    lightEmitters: number;
  } {
    const furnitures = this.getAll();
    const bySymbol: Record<string, number> = {};

    furnitures.forEach((furniture) => {
      bySymbol[furniture.symbol] = (bySymbol[furniture.symbol] || 0) + 1;
    });

    return {
      total: furnitures.length,
      bySymbol,
      workbenches: this.data.getWorkbenches().length,
      sittable: this.data.getSittable().length,
      containers: this.data.getContainers().length,
      plants: this.data.getPlants().length,
      lightEmitters: this.data.getLightEmitters().length,
    };
  }
}
