import { FieldType } from './FieldType';
import { FieldTypeId } from '../coordinates/types';
import { FieldData } from './FieldData';
import { FieldTypeParser, FieldTypeJson } from './FieldTypeParser';

/**
 * 场类型加载器
 */
export class FieldTypeLoader {
  private readonly data: FieldData;
  private readonly parser: FieldTypeParser;

  constructor() {
    this.data = new FieldData();
    this.parser = new FieldTypeParser();
  }

  /**
   * 从 JSON 数组加载场类型
   */
  async loadFromJson(json: FieldTypeJson[]): Promise<FieldData> {
    const fieldTypes: FieldType[] = [];

    for (const obj of json) {
      try {
        if (obj.type === 'field_type') {
          const fieldType = this.parser.parse(obj as FieldTypeJson);
          fieldTypes.push(fieldType);
        }
      } catch (error) {
        console.error(`Failed to parse field type: ${obj.id}`, error);
      }
    }

    this.data.setMany(fieldTypes);

    return this.data;
  }

  /**
   * 从 URL 加载场类型数据
   */
  async loadFromUrl(url: string): Promise<FieldData> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load field types from ${url}: ${response.statusText}`);
    }

    const json = (await response.json()) as FieldTypeJson[];
    return this.loadFromJson(json);
  }

  /**
   * 从多个 URL 加载场类型数据
   */
  async loadFromUrls(urls: string[]): Promise<FieldData> {
    const allFieldTypes: FieldType[] = [];

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Failed to load ${url}: ${response.statusText}`);
          continue;
        }

        const json = await response.json();
        const fieldTypeArray = Array.isArray(json) ? json : [json];

        for (const obj of fieldTypeArray) {
          if (obj.type === 'field_type') {
            try {
              const fieldType = this.parser.parse(obj as FieldTypeJson);
              allFieldTypes.push(fieldType);
            } catch (error) {
              console.error(`Failed to parse field type from ${url}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Failed to load ${url}:`, error);
      }
    }

    this.data.setMany(allFieldTypes);
    return this.data;
  }

  /**
   * 获取场类型数据
   */
  getData(): FieldData {
    return this.data;
  }

  /**
   * 获取场类型
   */
  get(id: FieldTypeId): FieldType | undefined {
    return this.data.get(id);
  }

  /**
   * 按名称查找场类型
   */
  findByName(name: string): FieldType | undefined {
    return this.data.findByName(name);
  }

  /**
   * 获取所有场类型
   */
  getAll(): FieldType[] {
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
    byPhase: Record<string, number>;
    fire: number;
    smoke: number;
    toxic: number;
    dangerous: number;
    lightEmitters: number;
  } {
    const fieldTypes = this.getAll();
    const byPhase: Record<string, number> = {};

    fieldTypes.forEach((fieldType) => {
      const phase = fieldType.getPhase();
      byPhase[phase] = (byPhase[phase] || 0) + 1;
    });

    return {
      total: fieldTypes.length,
      byPhase,
      fire: this.data.getFireFields().length,
      smoke: this.data.getSmokeFields().length,
      toxic: this.data.getToxicFields().length,
      dangerous: this.data.getDangerousFields().length,
      lightEmitters: this.data.getLightEmitters().length,
    };
  }
}
