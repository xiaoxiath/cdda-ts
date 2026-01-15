/**
 * Avatar - 玩家角色类
 *
 * 代表游戏中的玩家角色
 */

import { Creature } from './Creature';
import { Tripoint } from '../coordinates/Tripoint';
import { BodyPartId, CreatureSize, CreatureType, CharacterStats } from './types';
import { SurvivalStats } from './SurvivalStats';
import { BodyPartManager } from '../body/BodyPartManager';
import { BodyPart } from '../body/BodyPart';

/**
 * 玩家角色类
 *
 * 继承自 Creature，表示玩家控制的角色
 */
export class Avatar extends Creature {
  /**
   * 角色属性
   */
  public readonly stats: CharacterStats;

  /**
   * 身体部位管理器
   */
  private readonly bodyPartManager: BodyPartManager;

  /**
   * 生存统计
   */
  public readonly survivalStats: SurvivalStats;

  /**
   * 创建玩家角色
   *
   * @param id - 角色唯一标识符
   * @param position - 初始位置
   * @param name - 角色名称
   * @param stats - 角色属性
   */
  constructor(
    id: string,
    position: Tripoint,
    name: string,
    stats: CharacterStats = {
      str: 8,
      dex: 8,
      int: 8,
      per: 8,
    },
    survivalStats?: SurvivalStats
  ) {
    super(id, position, name, CreatureSize.MEDIUM);
    this.stats = stats;
    this.bodyPartManager = BodyPartManager.createHuman(id, name);
    this.survivalStats = survivalStats ?? SurvivalStats.create();
  }

  // ========== 类型检查 ==========

  isMonster(): boolean {
    return false;
  }

  isAvatar(): boolean {
    return true;
  }

  isNPC(): boolean {
    return false;
  }

  getType(): CreatureType {
    return CreatureType.AVATAR;
  }

  // ========== 属性访问 ==========

  /**
   * 获取重量
   * 人类平均体重约 70kg
   */
  getWeight(): number {
    // 简化实现：固定 70kg
    // 未来可以根据力量、体质等属性调整
    return 70000; // 70kg in grams
  }

  /**
   * 获取指定身体部位的生命值
   */
  getHP(bodyPart: BodyPartId): number | undefined {
    const part = this.bodyPartManager.getPart(bodyPart);
    if (!part) {
      return undefined;
    }
    return part.currentHP;
  }

  /**
   * 获取指定身体部位的最大生命值
   */
  getHPMax(bodyPart: BodyPartId): number | undefined {
    const part = this.bodyPartManager.getPart(bodyPart);
    if (!part) {
      return undefined;
    }
    return part.maxHP;
  }

  /**
   * 获取所有身体部位
   */
  getBodyParts(): ReadonlyMap<BodyPartId, BodyPart> {
    return this.bodyPartManager.getAllParts();
  }

  /**
   * 获取身体部位管理器
   */
  getBodyPartManager(): BodyPartManager {
    return this.bodyPartManager;
  }

  // ========== 动作和方法 ==========

  /**
   * 移动到新位置
   *
   * 重写父类方法，添加位置验证
   */
  moveTo(newPosition: Tripoint): Avatar {
    if (this.position.equals(newPosition)) {
      return this;
    }

    // 注意：这里暂时修改现有实例
    // 未来应该创建新实例以保持不可变性
    (this as any).position = newPosition;
    return this;
  }

  /**
   * 受到伤害
   *
   * @param bodyPart - 受伤的身体部位
   * @param damage - 伤害值
   * @returns 是否仍然存活
   */
  takeDamage(bodyPart: BodyPartId, damage: number): boolean {
    const newManager = this.bodyPartManager.takeDamage(bodyPart, damage);
    (this as any).bodyPartManager = newManager;

    return !this.isDead();
  }

  /**
   * 治疗
   *
   * @param bodyPart - 要治疗的身体部位
   * @param amount - 治疗量
   */
  heal(bodyPart: BodyPartId, amount: number): void {
    const newManager = this.bodyPartManager.heal(bodyPart, amount);
    (this as any).bodyPartManager = newManager;
  }

  /**
   * 获取总体状态
   */
  getHealthStatus(): string {
    const stats = this.bodyPartManager.getStats();
    const percentage = stats.healthPercentage;

    if (percentage >= 90) return '健康';
    if (percentage >= 70) return '轻微受伤';
    if (percentage >= 40) return '中度受伤';
    if (percentage >= 20) return '重度受伤';
    return '濒死';
  }

  /**
   * 获取角色描述
   */
  getDescription(): string {
    const status = this.getHealthStatus();
    const survival = this.survivalStats.getDescription();
    const posStr = `(${this.position.x}, ${this.position.y}, ${this.position.z})`;
    const survivalStr = survival !== '状态良好' ? ` - ${survival}` : '';
    return `${this.name} - ${status}${survivalStr} @ ${posStr}`;
  }

  // ========== 生存状态方法 ==========

  /**
   * 更新生存状态
   */
  setSurvivalStats(stats: SurvivalStats): Avatar {
    (this as any).survivalStats = stats;
    return this;
  }

  /**
   * 处理一回合
   *
   * 重写父类方法，添加生存状态更新
   */
  override processTurn(isMoving: boolean = false, isFighting: boolean = false): void {
    // 更新身体部位状态（处理出血、感染等）
    const newBodyPartManager = this.bodyPartManager.processTurn();
    (this as any).bodyPartManager = newBodyPartManager;

    // 更新生存状态
    const newSurvivalStats = this.survivalStats.processTurn(isMoving, isFighting);
    (this as any).survivalStats = newSurvivalStats;

    // 如果处于临界状态，可能会受到伤害
    if (newSurvivalStats.isCritical()) {
      // TODO: 根据具体的临界状态施加负面效果
      // 例如：饥饿造成体力流失，脱水造成感知下降等
    }
  }

  /**
   * 进食
   */
  eat(hungerRestored: number, thirstRestored: number = 0): Avatar {
    const newStats = this.survivalStats
      .consumeHunger(hungerRestored)
      .consumeThirst(thirstRestored);
    return this.setSurvivalStats(newStats);
  }

  /**
   * 饮水
   */
  drink(amount: number): Avatar {
    const newStats = this.survivalStats.consumeThirst(amount);
    return this.setSurvivalStats(newStats);
  }

  /**
   * 开始睡眠
   */
  startSleeping(): Avatar {
    const newStats = this.survivalStats.startSleeping();
    return this.setSurvivalStats(newStats);
  }

  /**
   * 结束睡眠
   */
  stopSleeping(): Avatar {
    const newStats = this.survivalStats.stopSleeping();
    return this.setSurvivalStats(newStats);
  }
}
