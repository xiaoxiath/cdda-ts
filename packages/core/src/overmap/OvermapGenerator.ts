/**
 * OvermapGenerator - Overmap 生成器
 *
 * 负责生成 Overmap 内容，包括地形、城市、特殊地点等
 * 对应 CDDA 的 overmap 生成逻辑
 */

import { Overmap } from './Overmap';
import { City } from './City';
import { OvermapBuffer } from './OvermapBuffer';
import { OvermapSpecial } from './OvermapSpecial';
import { OvermapConnection } from './OvermapConnection';
import { OmTerrain } from './OmTerrain';
import type {
  PointAbsOM,
  PointOMT,
  TripointOMT,
} from './types';
import { OMAPX, OMAPY, OVERMAP_LAYERS, OVERMAP_DEPTH, Z_TO_INDEX, INDEX_TO_Z } from './types';

/**
 * OvermapGenerator - 生成器类
 *
 * 使用不可变数据结构
 */
export class OvermapGenerator {
  private readonly buffer: OvermapBuffer;
  private readonly terrains: Map<string, OmTerrain>;
  private readonly specials: readonly OvermapSpecial[];
  private readonly connections: Map<string, OvermapConnection>;

  private constructor(
    buffer: OvermapBuffer,
    terrains: Map<string, OmTerrain>,
    specials: OvermapSpecial[],
    connections: Map<string, OvermapConnection>
  ) {
    this.buffer = buffer;
    this.terrains = terrains;
    this.specials = specials;
    this.connections = connections;

    Object.freeze(this);
  }

  /**
   * 创建生成器
   */
  static create(
    buffer: OvermapBuffer,
    terrains: OmTerrain[],
    specials: OvermapSpecial[],
    connections: OvermapConnection[]
  ): OvermapGenerator {
    const terrainMap = new Map<string, OmTerrain>();
    for (const terrain of terrains) {
      terrainMap.set(terrain.getPrimaryId(), terrain);
    }

    const connectionMap = new Map<string, OvermapConnection>();
    for (const connection of connections) {
      connectionMap.set(connection.id, connection);
    }

    return new OvermapGenerator(buffer, terrainMap, specials, connectionMap);
  }

  /**
   * 生成 overmap (简化版本)
   *
   * 完整版本需要：
   * - 处理与邻近 overmap 的连接
   * - 河流生成
   * - 道路生成
   * - 特殊地点放置
   */
  generate(globalPos: PointAbsOM): Overmap {
    const overmap = this.buffer.getOrCreate(globalPos);

    // 基础地形填充
    let current = this.fillBaseTerrain(overmap);

    // 放置城市 (简化版本)
    current = this.placeCities(current);

    // 这里可以添加更多生成步骤：
    // - placeRivers
    // - placeRoads
    // - placeSpecials
    // - placeForests
    // - placeSwamps

    return current;
  }

  /**
   * 填充基础地形
   */
  private fillBaseTerrain(overmap: Overmap): Overmap {
    let result = overmap;

    for (let z = 0; z < OVERMAP_LAYERS; z++) {
      const defaultTerrain = this.getDefaultTerrain(z);

      for (let y = 0; y < OMAPY; y++) {
        for (let x = 0; x < OMAPX; x++) {
          result = result.setTerrain({ x, y, z }, defaultTerrain);
        }
      }
    }

    return result;
  }

  /**
   * 获取指定层索引的默认地形
   * 使用简化的 z 坐标系统 (0-20 作为数组索引)
   * 0 = 地下, 1 = 地面, 2+ = 空中
   */
  private getDefaultTerrain(z: number): string {
    if (z === 0) {
      return 'rock_floor'; // 地下层
    }
    if (z === 1) {
      return 'field'; // 地面层
    }
    return 'open_air'; // 空中
  }

  /**
   * 放置城市 (简化版本)
   *
   * 完整版本需要：
   * - 根据区域设置确定城市数量和大小
   * - 处理与邻近 overmap 的城市连接
   * - 在城市内放置建筑
   */
  private placeCities(overmap: Overmap): Overmap {
    // 简化版本：在中心放置一个城市
    // 实际实现应该根据区域设置随机生成多个城市

    const centerX = Math.floor(OMAPX / 2);
    const centerY = Math.floor(OMAPY / 2);
    const citySize = 8; // 默认城市大小

    const city = City.fromPositionSize(centerX, centerY, citySize, 'Generated City');
    const updated = overmap.addCity(city);

    // 在城市区域内放置建筑 (简化：使用 house 地形)
    let result = updated;
    const halfSize = citySize / 2;

    for (let dy = -halfSize; dy <= halfSize; dy++) {
      for (let dx = -halfSize; dx <= halfSize; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (result.inBounds2D(x, y)) {
          // 简化：在城市内放置房屋 (z=1 是地面层)
          if (Math.random() > 0.3) {
            result = result.setTerrain({ x, y, z: 1 }, 'house');
          }
        }
      }
    }

    return result;
  }

  /**
   * 查找适合放置特殊地点的位置
   *
   * @param special 特殊地点定义
   * @param z z 层
   * @returns 合适的位置，如果没有则返回 null
   */
  findValidLocationForSpecial(special: OvermapSpecial, z: number = 0): PointOMT | null {
    const overmap = this.buffer.getOrCreate({ x: 0, y: 0 });

    // 收集所有符合 location 要求的位置
    const validPositions: PointOMT[] = [];

    for (let y = 0; y < OMAPY; y++) {
      for (let x = 0; x < OMAPX; x++) {
        const terrainId = overmap.getTerrain({ x, y, z });

        // 检查地形是否在允许的位置列表中
        for (const locationId of special.locations) {
          // 简化：直接检查地形 ID
          // 完整版本需要通过 OvermapLocation 查询
          if (terrainId === locationId || terrainId.startsWith(locationId)) {
            validPositions.push({ x, y });
            break;
          }
        }
      }
    }

    if (validPositions.length === 0) {
      return null;
    }

    // 随机选择一个位置
    return validPositions[Math.floor(Math.random() * validPositions.length)];
  }

  /**
   * 获取地形定义
   */
  getTerrain(terrainId: string): OmTerrain | undefined {
    return this.terrains.get(terrainId);
  }

  /**
   * 获取连接定义
   */
  getConnection(connectionId: string): OvermapConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * 获取缓冲区
   */
  getBuffer(): OvermapBuffer {
    return this.buffer;
  }

  /**
   * 获取所有特殊地点定义
   */
  getSpecials(): readonly OvermapSpecial[] {
    return this.specials;
  }
}
