import { FieldType } from './FieldType';
import { FieldPhase, FieldTypeFlags, IntensityLevel } from './types';

/**
 * 场强度等级 JSON
 */
export interface IntensityLevelJson {
  name: string;
  color?: string;
  symbol?: string;
  priority?: number;
}

/**
 * 场类型 JSON
 */
export interface FieldTypeJson {
  id: string;
  type: 'field_type';
  name?: string;
  description?: string;
  intensity_levels?: IntensityLevelJson[];
  half_life?: number | string;
  phase?: string;
  accelerated_decay?: boolean;
  display_field?: boolean;
  display_priority?: number;
  transparent?: boolean;
  danger_level?: number;
  fire_spread_chance?: number;
  fire_ignition_chance?: number;
  light_emitted?: number;
  light_consumed?: number;
  flags?: string[];
}

/**
 * 场类型 JSON 解析器
 */
export class FieldTypeParser {
  /**
   * 解析场类型对象
   */
  parse(obj: FieldTypeJson): FieldType {
    return new FieldType({
      id: obj.id,
      name: obj.name || obj.id,
      description: obj.description || '',
      intensityLevels: this.parseIntensityLevels(obj.intensity_levels || []),
      halfLife: this.parseDuration(obj.half_life),
      phase: this.parsePhase(obj.phase),
      acceleratedDecay: obj.accelerated_decay ?? false,
      displayField: obj.display_field ?? true,
      displayPriority: obj.display_priority ?? 0,
      transparent: obj.transparent ?? true,
      dangerLevel: obj.danger_level ?? 0,
      fireSpreadChance: obj.fire_spread_chance ?? 0,
      fireIgnitionChance: obj.fire_ignition_chance ?? 0,
      lightEmitted: obj.light_emitted ?? 0,
      lightConsumed: obj.light_consumed ?? 0,
      flags: FieldTypeFlags.fromJson(obj.flags || []),
    });
  }

  /**
   * 批量解析
   */
  parseMany(jsonArray: FieldTypeJson[]): FieldType[] {
    return jsonArray.map((obj) => this.parse(obj));
  }

  /**
   * 解析强度等级
   */
  private parseIntensityLevels(json: IntensityLevelJson[]): IntensityLevel[] {
    // 确保至少有一个等级
    if (json.length === 0) {
      return [{ name: 'default' }];
    }

    return json.map((level) => ({
      name: level.name,
      color: level.color,
      symbol: level.symbol,
      priority: level.priority,
    }));
  }

  /**
   * 解析持续时间
   */
  private parseDuration(value: number | string | undefined): number {
    if (value === undefined) return 0;
    if (typeof value === 'number') return value;

    // 解析字符串格式，如 "2 days", "100 turns"
    const match = value.match(/(\d+)\s*(\w+)/);
    if (!match) return 0;

    const amount = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'turn':
      case 'turns':
        return amount;
      case 'second':
      case 'seconds':
        return amount * 6; // 1 秒 = 6 回合
      case 'minute':
      case 'minutes':
        return amount * 360; // 1 分钟 = 360 回合
      case 'hour':
      case 'hours':
        return amount * 21600; // 1 小时 = 21600 回合
      case 'day':
      case 'days':
        return amount * 518400; // 1 天 = 518400 回合 (12 * 60 * 60 * 6)
      default:
        return amount;
    }
  }

  /**
   * 解析相态
   */
  private parsePhase(phase: string | undefined): FieldPhase {
    if (!phase) return FieldPhase.GAS;

    const normalized = phase.toLowerCase();
    switch (normalized) {
      case 'solid':
        return FieldPhase.SOLID;
      case 'liquid':
        return FieldPhase.LIQUID;
      case 'gas':
        return FieldPhase.GAS;
      case 'plasma':
        return FieldPhase.PLASMA;
      case 'energy':
        return FieldPhase.ENERGY;
      default:
        return FieldPhase.GAS;
    }
  }
}
