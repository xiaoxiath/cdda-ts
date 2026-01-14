/**
 * NPC - 非玩家角色类
 *
 * 继承自 Creature，表示游戏中的 NPC
 */

import { Creature } from './Creature';
import { Tripoint } from '../coordinates/Tripoint';
import { BodyPartId, CreatureSize, CreatureType, CharacterStats } from './types';
import type { NPCAI } from '../ai/NPCAI';
import type { GameMap } from '../map/GameMap';

/**
 * NPC 类数据
 */
export interface NPCClass {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly defaultStats?: CharacterStats;
  readonly hpMultiplier?: number;
  readonly skills?: Record<string, number>;
}

/**
 * NPC 实例数据
 */
export interface NPCData {
  readonly id: string;
  readonly name?: string;
  readonly nameSuffix?: string;
  readonly nameUnique?: string;
  readonly classId: string;
  readonly attitude?: number;
  readonly gender?: 'male' | 'female' | 'nonbinary';
  readonly faction?: string;
  readonly mission?: number;
  readonly chat?: string;
}

/**
 * 非玩家角色类
 *
 * 继承自 Creature，表示游戏中的 NPC
 */
export class NPC extends Creature {
  /**
   * NPC 类（职业模板）
   */
  public readonly npcClass: NPCClass;

  /**
   * NPC 态度（0-10）
   * 0 = 敌对
   * 5 = 中立
   * 10 = 友好
   */
  public readonly attitude: number;

  /**
   * NPC 所属派系
   */
  public readonly faction: string;

  /**
   * AI 控制器（可选）
   * 使用动态属性以保持类不可变
   */
  private _ai?: NPCAI;

  /**
   * 创建 NPC
   *
   * @param id - NPC 唯一标识符
   * @param position - 位置
   * @param name - 名称
   * @param npcClass - NPC 类
   * @param attitude - 态度
   * @param faction - 派系
   */
  constructor(
    id: string,
    position: Tripoint,
    name: string,
    npcClass: NPCClass,
    attitude: number = 5,
    faction: string = 'no_faction'
  ) {
    super(id, position, name, CreatureSize.MEDIUM);
    this.npcClass = npcClass;
    this.attitude = attitude;
    this.faction = faction;
  }

  // ========== 类型检查 ==========

  isMonster(): boolean {
    return false;
  }

  isAvatar(): boolean {
    return false;
  }

  isNPC(): boolean {
    return true;
  }

  getType(): CreatureType {
    return CreatureType.NPC;
  }

  // ========== 属性访问 ==========

  /**
   * 获取属性（使用 NPC 类的默认值）
   */
  getStats(): CharacterStats {
    return this.npcClass.defaultStats || {
      str: 8,
      dex: 8,
      int: 8,
      per: 8,
    };
  }

  /**
   * 获取重量
   */
  getWeight(): number {
    const baseWeight = 70000; // 70 kg 基础重量
    const multiplier = this.npcClass.hpMultiplier || 1.0;
    return Math.floor(baseWeight * multiplier);
  }

  /**
   * 获取健康状态（NPC 使用简化版本）
   */
  getHealthStatus(): string {
    // NPC 使用简化的健康状态判断
    // 如果没有具体的 HP 数据，返回默认状态
    return '健康';
  }

  /**
   * 获取 HP（应用 NPC 类的乘数）
   */
  getHP(bodyPart: BodyPartId): number | undefined {
    // 基础实现：NPC 使用标准 HP
    // 未来可以扩展为从 NPC 类加载
    return undefined;
  }

  getHPMax(bodyPart: BodyPartId): number | undefined {
    return undefined;
  }

  // ========== 行为方法 ==========

  /**
   * 是否友好
   */
  isFriendly(): boolean {
    return this.attitude >= 7;
  }

  /**
   * 是否中立
   */
  isNeutral(): boolean {
    return this.attitude >= 4 && this.attitude < 7;
  }

  /**
   * 是否敌对
   */
  isHostile(): boolean {
    return this.attitude < 4;
  }

  /**
   * 获取描述
   */
  getDescription(): string {
    const attitudeStr = this.isFriendly() ? '友好的' : this.isHostile() ? '敌对的' : '中立的';
    const factionStr = this.faction !== 'no_faction' ? ` [${this.faction}]` : '';
    const healthStr = this.getHealthStatus();
    return `${this.name} (${attitudeStr}${factionStr}) - ${healthStr}`;
  }

  // ========== AI 集成 ==========

  /**
   * 设置 AI 控制器
   * @param ai NPCAI 实例
   * @returns 更新后的 NPC（为了保持不可变性，返回新实例）
   */
  setAI(ai: NPCAI): this {
    (this as any)._ai = ai;
    return this;
  }

  /**
   * 获取 AI 控制器
   */
  getAI(): NPCAI | undefined {
    return this._ai;
  }

  /**
   * 是否有 AI
   */
  hasAI(): boolean {
    return this._ai !== undefined;
  }

  /**
   * 处理回合（集成 AI 决策）
   * 如果有 AI，会使用 AI 进行决策
   * @param map 游戏地图
   */
  processTurn(map?: GameMap): void {
    // 调用父类的 processTurn
    super.processTurn();

    // 如果有 AI 和地图，使用 AI 决策
    if (this._ai && map) {
      try {
        const result = this._ai.processTurn(map);
        // 更新 AI 引用
        (this as any)._ai = result;
      } catch (error) {
        console.error(`AI error for NPC ${this.id}:`, error);
      }
    }
  }

  /**
   * 更新 AI（实时模式）
   * @param map 游戏地图
   * @param currentTime 当前时间
   * @param deltaTime 时间增量
   */
  updateAI(map: GameMap, currentTime: number, deltaTime: number): void {
    if (!this._ai) return;

    try {
      const { ai } = this._ai.update(map, currentTime, deltaTime);
      (this as any)._ai = ai;
    } catch (error) {
      console.error(`AI update error for NPC ${this.id}:`, error);
    }
  }
}
