/**
 * Creature - 生物基类
 *
 * 所有游戏中的生物（玩家、NPC、怪物）的抽象基类
 */

import { Tripoint } from '../coordinates/Tripoint';
import { CreatureSize, BodyPartId, CreatureType } from './types';

/**
 * 生物基类
 *
 * 提供所有生物共有的属性和方法
 */
export abstract class Creature {
  /**
   * 创建生物实例
   *
   * @param id - 生物唯一标识符
   * @param position - 生物的3D坐标位置
   * @param name - 生物名称
   * @param size - 生物大小
   */
  constructor(
    public readonly id: string,
    public readonly position: Tripoint,
    public readonly name: string,
    public readonly size: CreatureSize = CreatureSize.MEDIUM,
  ) {}

  /**
   * 类型检查：是否是怪物
   */
  abstract isMonster(): boolean;

  /**
   * 类型检查：是否是玩家角色
   */
  abstract isAvatar(): boolean;

  /**
   * 类型检查：是否是NPC
   */
  abstract isNPC(): boolean;

  /**
   * 获取生物类型
   */
  abstract getType(): CreatureType;

  /**
   * 获取重量（克）
   */
  abstract getWeight(): number;

  /**
   * 获取指定身体部位的生命值
   *
   * @param bodyPart - 身体部位ID
   * @returns 当前HP，如果部位不存在返回 undefined
   */
  abstract getHP(bodyPart: BodyPartId): number | undefined;

  /**
   * 获取指定身体部位的最大生命值
   *
   * @param bodyPart - 身体部位ID
   * @returns 最大HP，如果部位不存在返回 undefined
   */
  abstract getHPMax(bodyPart: BodyPartId): number | undefined;

  /**
   * 获取健康状态
   *
   * @returns 健康状态描述字符串
   */
  abstract getHealthStatus(): string;

  /**
   * 移动到新位置
   *
   * @param newPosition - 新的3D坐标
   * @returns 新的生物实例（不可变更新）
   */
  moveTo(newPosition: Tripoint): Creature {
    // 注意：这里返回 this 而不是创建新实例
    // 因为 Creature 是抽象类，具体子类应该重写这个方法
    // 在实际使用中，我们可能需要重新设计为完全不可变的模式
    if (this.position === newPosition) {
      return this;
    }

    // 对于基础实现，我们暂时允许修改
    // TODO: 未来改为完全不可变
    (this as any).position = newPosition;
    return this;
  }

  /**
   * 处理一回合
   *
   * 子类应该重写此方法来实现具体的回合逻辑
   */
  processTurn(): void {
    // 基础实现：什么都不做
    // 子类可以重写来实现AI、玩家输入等
  }

  /**
   * 检查生物是否死亡
   */
  isDead(): boolean {
    // 基础实现：检查头部或躯干的HP
    const headHP = this.getHP(BodyPartId.HEAD);
    const torsoHP = this.getHP(BodyPartId.TORSO);

    if (headHP !== undefined && headHP <= 0) {
      return true;
    }

    if (torsoHP !== undefined && torsoHP <= 0) {
      return true;
    }

    return false;
  }

  /**
   * 检查生物是否倒地
   */
  isDowned(): boolean {
    // 检查双腿的HP
    const leftLegHP = this.getHP(BodyPartId.LEG_L);
    const rightLegHP = this.getHP(BodyPartId.LEG_R);

    const leftLegDown = leftLegHP !== undefined && leftLegHP <= 0;
    const rightLegDown = rightLegHP !== undefined && rightLegHP <= 0;

    // 如果双腿都失去功能，则倒地
    return leftLegDown && rightLegDown;
  }

  /**
   * 获取生物的描述信息
   */
  getDescription(): string {
    return `${this.name} (${CreatureSize[this.size]})`;
  }

  /**
   * 检查位置是否相同
   *
   * @param other - 另一个生物或坐标
   */
  atSamePosition(other: Creature | Tripoint): boolean {
    const otherPos = other instanceof Creature ? other.position : other;
    return this.position.equals(otherPos);
  }
}
