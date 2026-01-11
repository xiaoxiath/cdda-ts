import { Trap } from './Trap';
import { TrapAction, TrapFlags } from './types';

/**
 * 陷阱 JSON 接口
 */
export interface TrapJson {
  id: string;
  type: 'trap';
  name: string;
  description?: string;
  symbol?: string;
  color?: string;
  visibility?: number;
  avoidance?: number;
  difficulty?: number;
  trap_radius?: number;
  benign?: boolean;
  always_invisible?: boolean;
  trigger_weight?: number;
  action?: string;
  flags?: string[];
  fun?: number;
  complexity?: number;
}

/**
 * 陷阱 JSON 解析器
 */
export class TrapParser {
  private static readonly warnedActions: Set<string> = new Set();

  /**
   * 解析陷阱对象
   */
  parse(obj: TrapJson): Trap {
    return new Trap({
      id: obj.id,
      name: obj.name || '',
      description: obj.description || '',
      symbol: obj.symbol || '^',
      color: obj.color || 'light_green',
      visibility: obj.visibility ?? 3,
      avoidance: obj.avoidance ?? 0,
      difficulty: obj.difficulty ?? 0,
      trapRadius: obj.trap_radius ?? 0,
      benign: obj.benign ?? false,
      alwaysInvisible: obj.always_invisible ?? false,
      triggerWeight: obj.trigger_weight ?? 500,
      action: this.parseAction(obj.action),
      flags: TrapFlags.fromJson(obj.flags || []),
      fun: obj.fun ?? 0,
      complexity: obj.complexity ?? 0,
    });
  }

  /**
   * 批量解析
   */
  parseMany(jsonArray: TrapJson[]): Trap[] {
    return jsonArray.map((obj) => this.parse(obj));
  }

  /**
   * 解析陷阱动作
   */
  private parseAction(action: string | undefined): TrapAction {
    if (!action) {
      return TrapAction.NONE;
    }

    // 转换为小写并替换连字符
    const normalized = action.toLowerCase().replace(/-/g, '_');

    // 检查是否是有效的 TrapAction
    if (Object.values(TrapAction).includes(normalized as TrapAction)) {
      return normalized as TrapAction;
    }

    // 只对每个未知动作警告一次
    if (!TrapParser.warnedActions.has(action)) {
      console.warn(`Unknown trap action: ${action}, using NONE`);
      TrapParser.warnedActions.add(action);
    }

    return TrapAction.NONE;
  }
}
