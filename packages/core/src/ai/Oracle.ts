/**
 * Oracle - 感知和知识系统
 *
 * 参考 Cataclysm-DDA 的 NPC 感知系统
 * 管理 NPC 的视觉、听觉、记忆和威胁评估
 *
 * Oracle 为 AI 决策提供环境信息
 */

import { List, Map } from 'immutable';
import type { Tripoint } from '../coordinates/Tripoint';
import type { GameMap } from '../map/GameMap';
import type { Creature } from '../creature/Creature';
import type {
  MemoryEntry,
  PerceptionData,
  ThreatLevel,
  PerceptionType,
} from './types';
import {
  PerceptionType as PerceptionTypeEnum,
  ThreatLevel as ThreatLevelEnum,
  DEFAULT_AI_CONFIG,
} from './types';

/**
 * Oracle 属性（内部）
 */
interface OracleProps {
  readonly owner: any; // NPC
  readonly visionRange: number;
  readonly hearingRange: number;
  readonly smellRange: number;
  readonly memories: List<MemoryEntry>;
  readonly perceivedEntities: Map<string, PerceptionData>;
  readonly threats: Map<string, ThreatLevel>;
  readonly currentTime: number;
}

/**
 * Oracle - 感知和知识系统
 *
 * 使用不可变数据结构
 */
export class Oracle {
  readonly owner!: any; // NPC
  readonly visionRange!: number;
  readonly hearingRange!: number;
  readonly smellRange!: number;
  readonly memories!: List<MemoryEntry>;
  readonly perceivedEntities!: Map<string, PerceptionData>;
  readonly threats!: Map<string, ThreatLevel>;
  readonly currentTime!: number;

  private constructor(props: OracleProps) {
    this.owner = props.owner;
    this.visionRange = props.visionRange;
    this.hearingRange = props.hearingRange;
    this.smellRange = props.smellRange;
    this.memories = props.memories;
    this.perceivedEntities = props.perceivedEntities;
    this.threats = props.threats;
    this.currentTime = props.currentTime;

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建 Oracle
   * @param owner NPC 实例
   * @param config AI 配置
   */
  static create(
    owner: any, // NPC
    config?: Partial<typeof DEFAULT_AI_CONFIG>
  ): Oracle {
    const aiConfig = { ...DEFAULT_AI_CONFIG, ...config };

    return new Oracle({
      owner,
      visionRange: aiConfig.perceptionRange,
      hearingRange: aiConfig.hearingRange,
      smellRange: 5, // 默认嗅觉范围
      memories: List(),
      perceivedEntities: Map(),
      threats: Map(),
      currentTime: Date.now(),
    });
  }

  // ========== 核心更新方法 ==========

  /**
   * 更新感知（每帧调用）
   * @param map 游戏地图
   * @param currentTime 当前时间
   * @param deltaTime 时间增量
   */
  update(
    map: GameMap,
    currentTime: number,
    deltaTime: number
  ): Oracle {
    let oracle = this as any; // 开始时是 this

    // 感知周围环境
    oracle = (oracle as Oracle).perceive(map);

    // 更新记忆衰减
    oracle = (oracle as Oracle).updateMemoryDecay(currentTime);

    // 更新威胁等级
    oracle = (oracle as Oracle).updateThreats(map);

    // 清理过期数据
    oracle = (oracle as Oracle).cleanupMemories(currentTime);

    return oracle as Oracle;
  }

  /**
   * 感知周围环境
   */
  perceive(map: GameMap): Oracle {
    let oracle = this as any;

    // 视觉感知
    oracle = (oracle as Oracle).perceiveVision(map);

    // 听觉感知
    oracle = (oracle as Oracle).perceiveHearing(map);

    // 嗅觉感知（可选）
    // oracle = (oracle as Oracle).perceiveSmell(map);

    return oracle as Oracle;
  }

  // ========== 视觉感知 ==========

  /**
   * 视觉感知
   * 检测视野范围内的所有生物
   */
  perceiveVision(map: GameMap): Oracle {
    if (!this.owner.position) {
      return this;
    }

    // 收集所有感知数据
    const perceptionEntries: [string, PerceptionData][] = [];
    const threatEntries: [string, ThreatLevel][] = [];
    const memoryEntries: MemoryEntry[] = this.memories.toArray();

    // 支持 native Map 和 Immutable.js Map
    const creatures = map.creatures as any;
    const creatureEntries: [string, any][] = creatures.entries ? Array.from(creatures.entries()) : Object.entries(creatures);

    // 遍历地图上的所有生物
    for (const [entityId, creature] of creatureEntries) {
      // 跳过自己
      if (entityId === this.owner.id) {
        continue;
      }

      // 检查距离
      const distance = this.getDistanceTo(this.owner.position, creature.position);
      if (distance > this.visionRange) {
        continue;
      }

      // 检查视线（简化版本，实际需要检查障碍物）
      if (!this.checkLineOfSight(map, this.owner.position, creature.position)) {
        continue;
      }

      // 计算感知强度（距离越近越强）
      const intensity = 1.0 - distance / this.visionRange;

      // 创建感知数据
      const perceptionData: PerceptionData = {
        type: PerceptionTypeEnum.VISION,
        sourceId: this.owner.id,
        targetId: entityId,
        position: creature.position,
        intensity,
        timestamp: this.currentTime,
      };

      perceptionEntries.push([entityId, perceptionData]);

      // 评估威胁等级
      const threatLevel = this.assessThreatFromCreature(creature as any, distance);
      threatEntries.push([entityId, threatLevel]);

      // 添加记忆
      memoryEntries.push({
        id: `${entityId}_${this.currentTime}`,
        type: PerceptionTypeEnum.VISION,
        targetId: entityId,
        position: creature.position,
        timestamp: this.currentTime,
        confidence: intensity,
        importance: (threatLevel ?? 0) * 0.5, // 威胁越高越重要
      });
    }

    const newPerceptions = Map<string, PerceptionData>(perceptionEntries);
    const newThreats = Map<string, ThreatLevel>(threatEntries);
    const newMemories = List(memoryEntries);

    return new Oracle({
      ...this,
      perceivedEntities: newPerceptions,
      threats: newThreats,
      memories: newMemories,
    });
  }

  // ========== 听觉感知 ==========

  /**
   * 听觉感知
   * 检测听觉范围内的声音
   */
  perceiveHearing(map: GameMap): Oracle {
    // 简化版本：实际需要声音系统
    // 这里假设地图上的生物在移动时会发出声音

    const perceptionEntries: [string, PerceptionData][] = [];

    const creatures = map.creatures as any;
    const creatureEntries: [string, any][] = creatures.entries ? Array.from(creatures.entries()) : Object.entries(creatures);

    for (const [entityId, creature] of creatureEntries) {
      if (entityId === this.owner.id) {
        continue;
      }

      const distance = this.getDistanceTo(this.owner.position, creature.position);
      if (distance > this.hearingRange) {
        continue;
      }

      // 移动中的生物更容易被听到
      const isMoving = creature.isMoving?.() ?? false;
      if (!isMoving) {
        continue;
      }

      const intensity = 1.0 - distance / this.hearingRange;

      const perceptionData: PerceptionData = {
        type: PerceptionTypeEnum.HEARING,
        sourceId: this.owner.id,
        targetId: entityId,
        position: creature.position,
        intensity: intensity * 0.7, // 听觉强度低于视觉
        timestamp: this.currentTime,
      };

      perceptionEntries.push([entityId, perceptionData]);
    }

    // 合并到现有感知中
    const mergedPerceptions = this.perceivedEntities.merge(Map(perceptionEntries));

    return new Oracle({
      ...this,
      perceivedEntities: mergedPerceptions,
    });
  }

  // ========== 记忆管理 ==========

  /**
   * 添加记忆
   */
  addMemory(memory: MemoryEntry): Oracle {
    return new Oracle({
      ...this,
      memories: this.memories.push(memory),
    });
  }

  /**
   * 获取记忆
   */
  getMemory(targetId: string): MemoryEntry | undefined {
    return this.memories.find(m => m.targetId === targetId);
  }

  /**
   * 获取目标的所有记忆
   */
  getMemoriesForTarget(targetId: string): List<MemoryEntry> {
    return this.memories.filter(m => m.targetId === targetId).toList();
  }

  /**
   * 清理过期记忆
   */
  cleanupMemories(currentTime: number): Oracle {
    const memoryDuration = 60000; // 60 秒

    const validMemories = this.memories.filter(memory => {
      const age = currentTime - memory.timestamp;
      return age < memoryDuration;
    });

    return new Oracle({
      ...this,
      memories: validMemories.toList(),
      currentTime,
    });
  }

  /**
   * 更新记忆衰减
   * 记忆的置信度随时间降低
   */
  updateMemoryDecay(currentTime: number): Oracle {
    const decayRate = 0.0001; // 毫秒衰减率

    const updatedMemories = this.memories.map(memory => {
      const age = currentTime - memory.timestamp;
      const decay = age * decayRate;
      const newConfidence = Math.max(0, memory.confidence - decay);

      return {
        ...memory,
        confidence: newConfidence,
      };
    });

    return new Oracle({
      ...this,
      memories: updatedMemories,
      currentTime,
    });
  }

  // ========== 威胁评估 ==========

  /**
   * 评估威胁等级
   * @param targetId 目标 ID
   */
  assessThreat(targetId: string): ThreatLevel {
    return this.threats.get(targetId) ?? ThreatLevelEnum.NONE;
  }

  /**
   * 从生物评估威胁等级
   */
  private assessThreatFromCreature(
    creature: any, // Creature | NPC
    distance: number
  ): number {
    // 基础威胁等级
    let threat = ThreatLevelEnum.NONE;

    // 检查是否为敌对 NPC
    if (creature.isHostile?.(this.owner)) {
      threat = ThreatLevelEnum.HIGH;
    }

    // 检查是否为玩家
    if (creature.isPlayer?.()) {
      threat = ThreatLevelEnum.MEDIUM;
    }

    // 距离调整（越近威胁越大）
    if (distance < 5 && threat > ThreatLevelEnum.NONE) {
      threat = Math.min(ThreatLevelEnum.CRITICAL, threat + 1);
    } else if (distance > 15 && threat > ThreatLevelEnum.NONE) {
      threat = Math.max(ThreatLevelEnum.LOW, threat - 1);
    }

    // 装备检查（携带武器增加威胁）
    if (creature.weapon && threat > ThreatLevelEnum.NONE) {
      threat = Math.min(ThreatLevelEnum.CRITICAL, threat + 1);
    }

    return threat;
  }

  /**
   * 获取最高威胁目标
   */
  getHighestThreat(): { targetId: string; level: ThreatLevel } | null {
    let maxThreat = ThreatLevelEnum.NONE;
    let targetId: string | null = null;

    for (const [id, level] of this.threats) {
      if (level > maxThreat) {
        maxThreat = level;
        targetId = id;
      }
    }

    return targetId ? { targetId, level: maxThreat } : null;
  }

  /**
   * 更新所有威胁等级
   */
  updateThreats(map: GameMap): Oracle {
    const threatEntries: [string, number][] = [];

    // 支持 native Map 和 Immutable.js Map
    for (const [entityId, perception] of this.perceivedEntities.entries()) {
      const creature = (map.creatures as any).get?.(entityId) ?? (map.creatures as any)[entityId];
      if (!creature) continue;

      const distance = this.getDistanceTo(this.owner.position, creature.position);
      const threatLevel = this.assessThreatFromCreature(creature as any, distance);
      threatEntries.push([entityId, threatLevel]);
    }

    const newThreats = Map<string, ThreatLevel>(threatEntries);

    return new Oracle({
      ...this,
      threats: newThreats,
    });
  }

  // ========== 查询方法 ==========

  /**
   * 检查是否能感知到目标
   */
  canPerceive(targetId: string): boolean {
    return this.perceivedEntities.has(targetId);
  }

  /**
   * 获取感知到的所有生物
   */
  getPerceivedCreatures(): Creature[] {
    const creatures: Creature[] = [];
    for (const entityId of this.perceivedEntities.keys()) {
      // 假设可以通过某种方式获取 Creature 实例
      // 这里简化处理
    }
    return creatures;
  }

  /**
   * 获取感知到的所有敌人
   */
  getPerceivedEnemies(): string[] {
    const enemies: string[] = [];
    for (const [entityId, level] of this.threats) {
      if (level >= ThreatLevelEnum.MEDIUM) {
        enemies.push(entityId);
      }
    }
    return enemies;
  }

  /**
   * 获取已知资源位置
   */
  getKnownResourceLocations(resourceType: string): Tripoint[] {
    // 从记忆中查找资源位置
    const locations: Tripoint[] = [];
    for (const memory of this.memories) {
      if (memory.type === PerceptionTypeEnum.MEMORY) {
        // 这里需要更复杂的资源类型匹配逻辑
        locations.push(memory.position);
      }
    }
    return locations;
  }

  /**
   * 检查位置是否安全
   */
  isLocationSafe(position: Tripoint): boolean {
    // 检查位置附近是否有高威胁目标（距离 < 5）
    const entries = this.perceivedEntities.entries ? Array.from(this.perceivedEntities.entries()) : Object.entries(this.perceivedEntities) as unknown as [string, PerceptionData][];

    for (const [entityId, perception] of entries) {
      const perceptionData = perception as PerceptionData;
      const distance = this.getDistanceTo(position, perceptionData.position);
      // 只有很近的威胁才被视为危险
      if (distance < 5) {
        const threat = this.threats.get(entityId) ?? ThreatLevelEnum.NONE;
        if (threat >= ThreatLevelEnum.CRITICAL) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 获取感知范围内的实体数量
   */
  getPerceivedEntityCount(): number {
    return this.perceivedEntities.size;
  }

  // ========== 辅助方法 ==========

  /**
   * 计算两点之间的距离
   */
  private getDistanceTo(from: Tripoint, to: Tripoint): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 检查视线（简化版本）
   */
  private checkLineOfSight(
    map: GameMap,
    from: Tripoint,
    to: Tripoint
  ): boolean {
    // 简化版本：实际需要实现射线检测
    // 这里假设没有障碍物
    return true;
  }

  // ========== 序列化方法 ==========

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      visionRange: this.visionRange,
      hearingRange: this.hearingRange,
      smellRange: this.smellRange,
      memories: this.memories.toArray(),
      perceivedEntities: this.perceivedEntities.toObject(),
      threats: this.threats.toObject(),
      currentTime: this.currentTime,
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>, owner: any): Oracle {
    return new Oracle({
      owner,
      visionRange: json.visionRange as number,
      hearingRange: json.hearingRange as number,
      smellRange: json.smellRange as number,
      memories: List(json.memories as MemoryEntry[]),
      perceivedEntities: Map(json.perceivedEntities as Record<string, PerceptionData>),
      threats: Map(json.threats as Record<string, ThreatLevel>),
      currentTime: json.currentTime as number,
    });
  }
}
