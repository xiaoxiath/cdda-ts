import { Trap } from './Trap';
import { TrapId } from '../coordinates/types';
import { TrapData } from './TrapData';
import { TrapParser, TrapJson } from './TrapParser';

/**
 * 陷阱加载器
 */
export class TrapLoader {
  private readonly data: TrapData;
  private readonly parser: TrapParser;

  constructor() {
    this.data = new TrapData();
    this.parser = new TrapParser();
  }

  /**
   * 从 JSON 数组加载陷阱
   */
  async loadFromJson(json: TrapJson[], clearDefinitions = false): Promise<TrapData> {
    // Clear raw definitions if requested (for fresh loads)
    if (clearDefinitions) {
      this.parser.clearRawDefinitions();
    }

    // First pass: store all raw definitions (including abstract ones) for inheritance
    this.parser.storeRawDefinitions(json);

    const traps: Trap[] = [];

    // Second pass: resolve inheritance and parse only concrete traps
    for (const obj of json) {
      try {
        if (obj.type === 'trap') {
          // Skip abstract definitions (templates that don't have an 'id')
          const isAbstract = (obj as any).abstract && !obj.id;
          if (isAbstract) {
            continue;
          }

          // Parse with inheritance resolution
          const trap = this.parser.parseWithInheritance(obj as TrapJson);
          traps.push(trap);
        }
      } catch (error) {
        console.error(`Failed to parse trap: ${obj.id}`, error);
      }
    }

    this.data.setMany(traps);

    return this.data;
  }

  /**
   * 从 URL 加载陷阱数据
   */
  async loadFromUrl(url: string, clearDefinitions = false): Promise<TrapData> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load traps from ${url}: ${response.statusText}`);
    }

    const json = (await response.json()) as TrapJson[];
    return this.loadFromJson(json, clearDefinitions);
  }

  /**
   * 从多个 URL 加载陷阱数据
   */
  async loadFromUrls(urls: string[]): Promise<TrapData> {
    // Clear any previous raw definitions before starting fresh
    this.parser.clearRawDefinitions();

    const allTraps: Trap[] = [];

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Failed to load ${url}: ${response.statusText}`);
          continue;
        }

        const json = await response.json();
        const trapArray = Array.isArray(json) ? json : [json];

        // Store raw definitions for inheritance
        this.parser.storeRawDefinitions(trapArray);

        // Parse with inheritance resolution
        for (const obj of trapArray) {
          if (obj.type === 'trap') {
            try {
              // Skip abstract definitions (templates that don't have an 'id')
              const isAbstract = (obj as any).abstract && !obj.id;
              if (isAbstract) {
                continue;
              }

              const trap = this.parser.parseWithInheritance(obj as TrapJson);
              allTraps.push(trap);
            } catch (error) {
              console.error(`Failed to parse trap from ${url}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Failed to load ${url}:`, error);
      }
    }

    this.data.setMany(allTraps);
    return this.data;
  }

  /**
   * 获取陷阱数据
   */
  getData(): TrapData {
    return this.data;
  }

  /**
   * 获取陷阱
   */
  get(id: TrapId): Trap | undefined {
    return this.data.get(id);
  }

  /**
   * 按名称查找陷阱
   */
  findByName(name: string): Trap | undefined {
    return this.data.findByName(name);
  }

  /**
   * 获取所有陷阱
   */
  getAll(): Trap[] {
    return this.data.getAll();
  }

  /**
   * 清空数据
   */
  clear(): void {
    this.data.clear();
    this.parser.clearRawDefinitions();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    visible: number;
    hidden: number;
    benign: number;
    dangerous: number;
    lethal: number;
    requiresAmmunition: number;
  } {
    const traps = this.getAll();

    return {
      total: traps.length,
      visible: this.data.getVisibleTraps().length,
      hidden: this.data.getHiddenTraps().length,
      benign: this.data.getBenignTraps().length,
      dangerous: this.data.getDangerousTraps().length,
      lethal: this.data.getLethalTraps().length,
      requiresAmmunition: this.data.getTrapsRequiringAmmunition().length,
    };
  }
}
