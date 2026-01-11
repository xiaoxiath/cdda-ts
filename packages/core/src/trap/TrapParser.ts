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
  copy_from?: string;  // For inheritance
}

/**
 * 陷阱 JSON 解析器
 */
export class TrapParser {
  private static readonly warnedActions: Set<string> = new Set();
  // Store all raw JSON objects (including abstract) for inheritance resolution
  private rawDefinitions: Map<string, TrapJson> = new Map();

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

  /**
   * Store raw trap definitions (including abstract ones) for inheritance
   */
  storeRawDefinitions(jsonArray: TrapJson[]): void {
    for (const obj of jsonArray) {
      // Get identifier - could be 'id' or 'abstract'
      const identifier = obj.id || (obj as any).abstract;
      if (identifier) {
        this.rawDefinitions.set(identifier, obj);
      }
    }
  }

  /**
   * Clear stored raw definitions
   */
  clearRawDefinitions(): void {
    this.rawDefinitions.clear();
  }

  /**
   * Resolve copy-from inheritance for a trap JSON object
   */
  resolveInheritance(obj: TrapJson): TrapJson {
    const result: TrapJson = { ...obj };

    // Handle copy_from field (supports both 'copy-from' and 'copy_from')
    const copyFrom = (obj as any)['copy-from'] || obj.copy_from;
    if (copyFrom) {
      const parent = this.rawDefinitions.get(copyFrom);
      if (parent) {
        // Recursively resolve parent's inheritance first
        const resolvedParent = this.resolveInheritance(parent);
        // Merge parent properties into result (child overrides parent)
        this.mergeProperties(result, resolvedParent);
      } else {
        console.warn(`Warning: copy-from parent '${copyFrom}' not found for trap '${obj.id}'`);
      }
    }

    return result;
  }

  /**
   * Merge parent properties into child object (child takes precedence)
   */
  private mergeProperties(child: TrapJson, parent: TrapJson): void {
    // Merge simple properties (only if child doesn't have them)
    if (!child.name && parent.name) child.name = parent.name;
    if (!child.description && parent.description) child.description = parent.description;
    if (!child.symbol && parent.symbol) child.symbol = parent.symbol;
    if (!child.color && parent.color) child.color = parent.color;
    if (child.visibility === undefined && parent.visibility !== undefined) child.visibility = parent.visibility;
    if (child.avoidance === undefined && parent.avoidance !== undefined) child.avoidance = parent.avoidance;
    if (child.difficulty === undefined && parent.difficulty !== undefined) child.difficulty = parent.difficulty;
    if (child.trap_radius === undefined && parent.trap_radius !== undefined) child.trap_radius = parent.trap_radius;
    if (child.benign === undefined && parent.benign !== undefined) child.benign = parent.benign;
    if (child.always_invisible === undefined && parent.always_invisible !== undefined) child.always_invisible = parent.always_invisible;
    if (child.trigger_weight === undefined && parent.trigger_weight !== undefined) child.trigger_weight = parent.trigger_weight;
    if (!child.action && parent.action) child.action = parent.action;
    if (child.fun === undefined && parent.fun !== undefined) child.fun = parent.fun;
    if (child.complexity === undefined && parent.complexity !== undefined) child.complexity = parent.complexity;

    // Merge arrays (concatenate)
    if (parent.flags && parent.flags.length > 0) {
      if (!child.flags) child.flags = [];
      // Add parent flags that aren't already in child
      const childFlagSet = new Set(child.flags);
      for (const flag of parent.flags) {
        if (!childFlagSet.has(flag)) {
          child.flags.push(flag);
        }
      }
    }
  }

  /**
   * Parse with inheritance resolution
   */
  parseWithInheritance(obj: TrapJson): Trap {
    const resolved = this.resolveInheritance(obj);
    return this.parse(resolved);
  }
}
