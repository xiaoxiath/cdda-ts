/**
 * Avatar - 玩家角色类
 *
 * 代表游戏中的玩家角色
 */

import { Creature } from './Creature';
import { Tripoint } from '../coordinates/Tripoint';
import { BodyPartId, CreatureSize, CreatureType, CharacterStats, BodyPartData, BodyPartType } from './types';
import { SurvivalStats } from './SurvivalStats';

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
   * 身体部位映射
   */
  private readonly bodyParts: Map<BodyPartId, BodyPartData>;

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
    this.bodyParts = Avatar.createDefaultBodyParts();
    this.survivalStats = survivalStats ?? SurvivalStats.create();
  }

  /**
   * 创建默认的身体部位
   */
  private static createDefaultBodyParts(): Map<BodyPartId, BodyPartData> {
    const parts = new Map<BodyPartId, BodyPartData>();

    // 定义所有身体部位的默认HP
    const defaultHP: Record<BodyPartId, number> = {
      [BodyPartId.TORSO]: 80,
      [BodyPartId.HEAD]: 60,
      [BodyPartId.EYES]: 20,
      [BodyPartId.MOUTH]: 30,
      [BodyPartId.ARM_L]: 50,
      [BodyPartId.ARM_R]: 50,
      [BodyPartId.HAND_L]: 40,
      [BodyPartId.HAND_R]: 40,
      [BodyPartId.LEG_L]: 60,
      [BodyPartId.LEG_R]: 60,
      [BodyPartId.FOOT_L]: 30,
      [BodyPartId.FOOT_R]: 30,
    };

    // 定义身体部位类型
    const partTypes: Record<BodyPartId, BodyPartType> = {
      [BodyPartId.TORSO]: BodyPartType.TORSO,
      [BodyPartId.HEAD]: BodyPartType.HEAD,
      [BodyPartId.EYES]: BodyPartType.SENSOR,
      [BodyPartId.MOUTH]: BodyPartType.MOUTH,
      [BodyPartId.ARM_L]: BodyPartType.ARM,
      [BodyPartId.ARM_R]: BodyPartType.ARM,
      [BodyPartId.HAND_L]: BodyPartType.HAND,
      [BodyPartId.HAND_R]: BodyPartType.HAND,
      [BodyPartId.LEG_L]: BodyPartType.LEG,
      [BodyPartId.LEG_R]: BodyPartType.LEG,
      [BodyPartId.FOOT_L]: BodyPartType.FOOT,
      [BodyPartId.FOOT_R]: BodyPartType.FOOT,
    };

    // 定义身体部位名称
    const partNames: Record<BodyPartId, string> = {
      [BodyPartId.TORSO]: '躯干',
      [BodyPartId.HEAD]: '头部',
      [BodyPartId.EYES]: '眼睛',
      [BodyPartId.MOUTH]: '嘴巴',
      [BodyPartId.ARM_L]: '左臂',
      [BodyPartId.ARM_R]: '右臂',
      [BodyPartId.HAND_L]: '左手',
      [BodyPartId.HAND_R]: '右手',
      [BodyPartId.LEG_L]: '左腿',
      [BodyPartId.LEG_R]: '右腿',
      [BodyPartId.FOOT_L]: '左脚',
      [BodyPartId.FOOT_R]: '右脚',
    };

    // 创建所有身体部位
    for (const id of Object.values(BodyPartId)) {
      if (typeof id === 'number') {
        parts.set(id, {
          id,
          name: partNames[id],
          type: partTypes[id],
          baseHP: defaultHP[id],
          currentHP: defaultHP[id],
        });
      }
    }

    return parts;
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
    const part = this.bodyParts.get(bodyPart);
    return part?.currentHP;
  }

  /**
   * 获取指定身体部位的最大生命值
   */
  getHPMax(bodyPart: BodyPartId): number | undefined {
    const part = this.bodyParts.get(bodyPart);
    return part?.baseHP;
  }

  /**
   * 获取所有身体部位
   */
  getBodyParts(): ReadonlyMap<BodyPartId, BodyPartData> {
    return this.bodyParts;
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
    const part = this.bodyParts.get(bodyPart);
    if (!part) {
      return true; // 部位不存在，忽略伤害
    }

    const newHP = Math.max(0, part.currentHP - damage);
    (part as any).currentHP = newHP;

    return !this.isDead();
  }

  /**
   * 治疗
   *
   * @param bodyPart - 要治疗的身体部位
   * @param amount - 治疗量
   */
  heal(bodyPart: BodyPartId, amount: number): void {
    const part = this.bodyParts.get(bodyPart);
    if (!part) {
      return;
    }

    const newHP = Math.min(part.baseHP, part.currentHP + amount);
    (part as any).currentHP = newHP;
  }

  /**
   * 获取总体状态
   */
  getHealthStatus(): string {
    const totalHP = Array.from(this.bodyParts.values())
      .reduce((sum, part) => sum + part.currentHP, 0);
    const maxHP = Array.from(this.bodyParts.values())
      .reduce((sum, part) => sum + part.baseHP, 0);

    const percentage = (totalHP / maxHP) * 100;

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
