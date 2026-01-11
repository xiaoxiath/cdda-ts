import { Submap, SpawnPoint, SUBMAP_SIZE } from '../map/Submap';
import { Tripoint } from '../coordinates/Tripoint';
import { Point } from '../coordinates/Point';
import { GameMap } from '../map/GameMap';

/**
 * Mapgen 上下文
 *
 * 提供生成过程中需要的所有信息
 */
export interface MapGenContext {
  /** 生成位置（submap 坐标） */
  position: Tripoint;
  /** 随机种子 */
  seed: number;
  /** 当前地图状态（只读） */
  map: GameMap;
  /** 生成器参数 */
  params: Record<string, unknown>;
  /** 生成深度（用于递归生成） */
  depth: number;
}

/**
 * Mapgen 函数基类
 *
 * 所有地图生成器的基础接口
 */
export abstract class MapGenFunction {
  /** 生成器 ID */
  abstract readonly id: string;

  /** 生成器名称 */
  abstract readonly name: string;

  /**
   * 生成 submap
   *
   * @param context 生成上下文
   * @returns 生成的 submap
   */
  abstract generate(context: MapGenContext): Submap;

  /**
   * 生成多个 submap
   *
   * 默认实现只生成一个 submap。子类可以重写此方法以支持大型 mapgen。
   *
   * @param context 生成上下文
   * @returns 生成的多个 submap
   */
  generateMultiple(context: MapGenContext): MultiSubmapResult {
    const submap = this.generate(context);

    return {
      submaps: [{
        submap,
        position: {
          gridX: 0,
          gridY: 0,
          globalPosition: context.position,
        },
      }],
      generatorId: this.id,
      mapgenWidth: SUBMAP_SIZE,
      mapgenHeight: SUBMAP_SIZE,
      submapGridWidth: 1,
      submapGridHeight: 1,
      timestamp: Date.now(),
    };
  }

  /**
   * 验证生成器是否可以应用
   *
   * @param context 生成上下文
   * @returns 是否可以生成
   */
  canApply(context: MapGenContext): boolean {
    return true;
  }

  /**
   * 获取生成器权重
   *
   * 用于选择生成器时排序
   *
   * @param context 生成上下文
   * @returns 权重值（越大优先级越高）
   */
  getWeight(context: MapGenContext): number {
    return 1;
  }

  /**
   * 克隆生成器
   */
  clone(): MapGenFunction {
    // 返回新实例（子类应该重写此方法以支持参数化）
    return this;
  }
}

/**
 * Submap 位置
 */
export interface SubmapPosition {
  /** Submap 在 mapgen 中的网格坐标 (从 0 开始) */
  gridX: number;
  /** Submap 在 mapgen 中的网格坐标 (从 0 开始) */
  gridY: number;
  /** Submap 在全局地图中的绝对位置 */
  globalPosition: Tripoint;
}

/**
 * Submap 生成结果
 */
export interface SubmapResult {
  /** 生成的 submap */
  submap: Submap;
  /** Submap 位置信息 */
  position: SubmapPosition;
}

/**
 * Mapgen 生成结果
 *
 * 包含生成的 submap 和元数据
 */
export interface MapGenResult {
  /** 生成的 submap */
  submap: Submap;
  /** 生成器 ID */
  generatorId: string;
  /** 生成时间戳 */
  timestamp: number;
  /** 生成元数据 */
  metadata: Record<string, unknown>;
}

/**
 * Mapgen 生成结果（多个 submap）
 */
export interface MultiSubmapResult {
  /** 所有生成的 submap */
  submaps: SubmapResult[];
  /** 生成器 ID */
  generatorId: string;
  /** Mapgen 总尺寸（瓦片单位） */
  mapgenWidth: number;
  /** Mapgen 总尺寸（瓦片单位） */
  mapgenHeight: number;
  /** Submap 网格尺寸 */
  submapGridWidth: number;
  /** Submap 网格尺寸 */
  submapGridHeight: number;
  /** 生成时间戳 */
  timestamp: number;
}

/**
 * Mapgen 配置
 */
export interface MapGenConfig {
  /** 生成器 ID */
  id: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 权重 */
  weight?: number;
  /** 生成器参数 */
  params?: Record<string, unknown>;
}

/**
 * 创建基本生成结果
 */
export function createMapGenResult(
  submap: Submap,
  generatorId: string,
  metadata: Record<string, unknown> = {}
): MapGenResult {
  return {
    submap,
    generatorId,
    timestamp: Date.now(),
    metadata,
  };
}
