import { FieldType } from './FieldType';
import { FieldEntry } from './FieldEntry';
import { FieldTypeId } from '../coordinates/types';
import { FieldTypeFlag } from './types';

/**
 * 场数据管理器
 */
export class FieldData {
  private readonly byId: Map<FieldTypeId, FieldType> = new Map();
  private readonly byName: Map<string, FieldType> = new Map();

  /**
   * 设置场类型
   */
  set(id: FieldTypeId, fieldType: FieldType): void {
    this.byId.set(id, fieldType);
    this.byName.set(fieldType.name, fieldType);
  }

  /**
   * 批量设置场类型
   */
  setMany(fieldTypes: FieldType[]): void {
    fieldTypes.forEach((fieldType) => this.set(fieldType.id, fieldType));
  }

  /**
   * 获取场类型
   */
  get(id: FieldTypeId): FieldType | undefined {
    return this.byId.get(id);
  }

  /**
   * 按名称查找
   */
  findByName(name: string): FieldType | undefined {
    return this.byName.get(name);
  }

  /**
   * 获取所有场类型
   */
  getAll(): FieldType[] {
    return Array.from(this.byId.values());
  }

  /**
   * 获取场类型数量
   */
  size(): number {
    return this.byId.size;
  }

  /**
   * 检查是否存在
   */
  has(id: FieldTypeId): boolean {
    return this.byId.has(id);
  }

  /**
   * 清空数据
   */
  clear(): void {
    this.byId.clear();
    this.byName.clear();
  }

  /**
   * 按标志过滤场类型
   */
  filterByFlag(flag: FieldTypeFlag): FieldType[] {
    return this.getAll().filter((fieldType) => fieldType.flags.has(flag));
  }

  /**
   * 获取所有火场
   */
  getFireFields(): FieldType[] {
    return this.getAll().filter((fieldType) => fieldType.isFire());
  }

  /**
   * 获取所有烟雾
   */
  getSmokeFields(): FieldType[] {
    return this.getAll().filter((fieldType) => fieldType.isSmoke());
  }

  /**
   * 获取所有有毒场
   */
  getToxicFields(): FieldType[] {
    return this.getAll().filter((fieldType) => fieldType.isToxic());
  }

  /**
   * 获取所有危险场
   */
  getDangerousFields(): FieldType[] {
    return this.getAll().filter((fieldType) => fieldType.isDangerous());
  }

  /**
   * 获取所有发光场
   */
  getLightEmitters(): FieldType[] {
    return this.getAll().filter((fieldType) => fieldType.emitsLight());
  }

  /**
   * 获取所有液体场
   */
  getLiquidFields(): FieldType[] {
    return this.getAll().filter((fieldType) => fieldType.isLiquid());
  }

  /**
   * 获取所有气体场
   */
  getGasFields(): FieldType[] {
    return this.getAll().filter((fieldType) => fieldType.isGas());
  }

  /**
   * 按相态获取场
   */
  getByPhase(phase: string): FieldType[] {
    return this.getAll().filter((fieldType) => fieldType.getPhase() === phase);
  }

  /**
   * 按危险等级排序
   */
  sortByDangerLevel(): FieldType[] {
    return this.getAll().sort((a, b) => b.getDangerLevel() - a.getDangerLevel());
  }

  /**
   * 创建场实例
   */
  createEntry(typeId: FieldTypeId, intensity: number = 1): FieldEntry | undefined {
    const fieldType = this.get(typeId);
    if (!fieldType) {
      return undefined;
    }
    return fieldType.createEntry(intensity);
  }

  /**
   * 更新场实例
   */
  updateEntry(entry: FieldEntry): FieldEntry {
    const fieldType = this.get(entry.type);
    if (!fieldType) {
      return entry;
    }

    // 检查是否应该在衰减前检查（年龄+1是半衰期的倍数）
    const shouldDecay =
      fieldType.shouldAccelerateDecay() && (entry.age + 1) % fieldType.halfLife === 0;

    // 更新年龄
    let updated = entry.update(1);

    // 执行衰减
    if (shouldDecay) {
      updated = updated.decayIntensity();
    }

    // 检查是否过期
    if (updated.isExpired()) {
      updated = updated.kill();
    }

    return updated;
  }

  /**
   * 获取场实例的显示信息
   */
  getEntryDisplayInfo(entry: FieldEntry): {
    symbol: string;
    color: string;
    name: string;
    priority: number;
  } | undefined {
    const fieldType = this.get(entry.type);
    if (!fieldType) {
      return undefined;
    }
    return fieldType.getDisplayInfo(entry.intensity);
  }

  /**
   * 合并场实例
   */
  mergeEntries(entries: FieldEntry[]): FieldEntry | undefined {
    if (entries.length === 0) {
      return undefined;
    }

    // 按优先级排序
    const sorted = entries.sort((a, b) => {
      const typeA = this.get(a.type);
      const typeB = this.get(b.type);
      if (!typeA || !typeB) return 0;
      return typeB.comparePriority(typeA);
    });

    return sorted[0];
  }
}
