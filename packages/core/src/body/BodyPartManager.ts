/**
 * BodyPartManager - 身体部位管理器
 *
 * 管理生物的所有身体部位
 * 负责伤害分配、状态管理和查询功能
 *
 * 使用不可变数据结构
 */

import { Map, List } from 'immutable';
import type { BodyPartId, BodyPartType } from '../creature/types';
import type { SubBodyPartId, SubBodyPartType } from './SubBodyPart';
import { SubBodyPart } from './SubBodyPart';
import { BodyPart } from './BodyPart';
import {
  BodyPartStatus,
  DamageResult,
  HealResult,
  BodyPartQuery,
  BodyPartStats,
  BodyPartImpact,
} from './BodyPartTypes';

// ============================================================================
// BodyPartManager 属性（内部）
// ============================================================================

/**
 * BodyPartManager 构造函数属性
 */
interface BodyPartManagerProps {
  readonly parts: Map<BodyPartId, BodyPart>;
  readonly ownerId: string;
  readonly ownerName: string;
}

// ============================================================================
// BodyPartManager 类
// ============================================================================

/**
 * BodyPartManager - 身体部位管理器
 *
 * 管理生物的所有身体部位，提供伤害分配、治疗和查询功能
 */
export class BodyPartManager {
  readonly parts!: Map<BodyPartId, BodyPart>;
  readonly ownerId!: string;
  readonly ownerName!: string;

  private constructor(props: BodyPartManagerProps) {
    this.parts = props.parts;
    this.ownerId = props.ownerId;
    this.ownerName = props.ownerName;

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建身体部位管理器
   */
  static create(
    ownerId: string,
    ownerName: string,
    parts: Map<BodyPartId, BodyPart>
  ): BodyPartManager {
    return new BodyPartManager({
      parts,
      ownerId,
      ownerName,
    });
  }

  /**
   * 创建默认的人类身体部位
   */
  static createHuman(
    ownerId: string,
    ownerName: string
  ): BodyPartManager {
    const parts = BodyPartManager.createDefaultHumanParts();
    return BodyPartManager.create(ownerId, ownerName, parts);
  }

  /**
   * 创建默认的人类身体部位映射
   */
  private static createDefaultHumanParts(): Map<BodyPartId, BodyPart> {
    const { BodyPartId: BPI, BodyPartType: BPT } = require('../creature/types');

    // 定义所有身体部位
    const partConfigs = [
      { id: BPI.TORSO, type: BPT.TORSO, name: '躯干', hp: 80, size: 10, lethal: true },
      { id: BPI.HEAD, type: BPT.HEAD, name: '头部', hp: 60, size: 3, lethal: true },
      { id: BPI.EYES, type: BPT.SENSOR, name: '眼睛', hp: 20, size: 1, lethal: false },
      { id: BPI.MOUTH, type: BPT.MOUTH, name: '嘴巴', hp: 30, size: 2, lethal: false },
      { id: BPI.ARM_L, type: BPT.ARM, name: '左臂', hp: 50, size: 4, lethal: false },
      { id: BPI.ARM_R, type: BPT.ARM, name: '右臂', hp: 50, size: 4, lethal: false },
      { id: BPI.HAND_L, type: BPT.HAND, name: '左手', hp: 40, size: 2, lethal: false },
      { id: BPI.HAND_R, type: BPT.HAND, name: '右手', hp: 40, size: 2, lethal: false },
      { id: BPI.LEG_L, type: BPT.LEG, name: '左腿', hp: 60, size: 5, lethal: false },
      { id: BPI.LEG_R, type: BPT.LEG, name: '右腿', hp: 60, size: 5, lethal: false },
      { id: BPI.FOOT_L, type: BPT.FOOT, name: '左脚', hp: 30, size: 2, lethal: false },
      { id: BPI.FOOT_R, type: BPT.FOOT, name: '右脚', hp: 30, size: 2, lethal: false },
    ];

    const partsMap = Map<BodyPartId, BodyPart>();

    for (const config of partConfigs) {
      const part = BodyPart.create({
        id: config.id,
        type: config.type,
        name: config.name,
        maxHP: config.hp,
        currentHP: config.hp,
        size: config.size,
        isLethal: config.lethal,
        canBeMissing: !config.lethal && [BPI.ARM_L, BPI.ARM_R, BPI.LEG_L, BPI.LEG_R].includes(config.id),
        status: BodyPartStatus.HEALTHY,
        statusDuration: 0,
        pain: 0,
        bleeding: 0,
        infection: 0,
      });

      (partsMap as any).set(config.id, part);
    }

    return partsMap;
  }

  // ========== 核心方法 ==========

  /**
   * 获取指定部位
   */
  getPart(id: BodyPartId): BodyPart | undefined {
    return this.parts.get(id);
  }

  /**
   * 受到伤害
   */
  takeDamage(partId: BodyPartId, damage: number): BodyPartManager {
    const part = this.parts.get(partId);
    if (!part) {
      return this; // 部位不存在，忽略
    }

    const result = part.takeDamage(damage);
    const updatedPart = new BodyPart({
      ...part,
      currentHP: result.newHP,
      status: result.effects[0]?.type || part.status,
      statusDuration: result.effects[0]?.duration || 0,
      pain: result.effects[0]?.pain || 0,
      bleeding: result.effects[0]?.bleeding || 0,
    });

    const newParts = this.parts.set(partId, updatedPart);

    return new BodyPartManager({
      ...this,
      parts: newParts,
    });
  }

  /**
   * 治疗
   */
  heal(partId: BodyPartId, amount: number): BodyPartManager {
    const part = this.parts.get(partId);
    if (!part) {
      return this;
    }

    const result = part.heal(amount);
    const updatedPart = new BodyPart({
      ...part,
      currentHP: result.newHP,
      status: result.statusRemoved ? BodyPartStatus.HEALTHY : part.status,
      statusDuration: result.statusRemoved ? 0 : part.statusDuration,
      pain: result.statusRemoved ? Math.max(0, part.pain - 2) : part.pain,
    });

    const newParts = this.parts.set(partId, updatedPart);

    return new BodyPartManager({
      ...this,
      parts: newParts,
    });
  }

  /**
   * 设置部位状态
   */
  setPartStatus(partId: BodyPartId, status: BodyPartStatus, duration: number = 0): BodyPartManager {
    const part = this.parts.get(partId);
    if (!part) {
      return this;
    }

    const updatedPart = part.setStatus(status, duration);
    const newParts = this.parts.set(partId, updatedPart);

    return new BodyPartManager({
      ...this,
      parts: newParts,
    });
  }

  /**
   * 处理回合（更新所有部位的状态持续时间）
   */
  processTurn(): BodyPartManager {
    let newParts = this.parts;

    for (const [id, part] of this.parts) {
      const updatedPart = part.processStatusTurn();
      newParts = newParts.set(id, updatedPart);

      // 处理出血
      if (updatedPart.bleeding > 0) {
        const bleedingDamage = Math.ceil(updatedPart.bleeding);
        const damageResult = updatedPart.takeDamage(bleedingDamage);
        const damagedPart = new BodyPart({
          ...updatedPart,
          currentHP: damageResult.newHP,
        });
        newParts = newParts.set(id, damagedPart);
      }

      // 处理感染恶化
      if (updatedPart.infection > 0.5) {
        // 高感染率造成额外伤害
        const infectionDamage = Math.ceil(updatedPart.infection * 2);
        const damageResult = updatedPart.takeDamage(infectionDamage);
        const damagedPart = new BodyPart({
          ...updatedPart,
          currentHP: damageResult.newHP,
        });
        newParts = newParts.set(id, damagedPart);
      }
    }

    return new BodyPartManager({
      ...this,
      parts: newParts,
    });
  }

  // ========== 查询方法 ==========

  /**
   * 检查部位是否功能正常
   */
  isPartFunctional(partId: BodyPartId): boolean {
    const part = this.parts.get(partId);
    return part?.isFunctional() ?? false;
  }

  /**
   * 获取部位效率 (0-1)
   */
  getPartEfficiency(partId: BodyPartId): number {
    const part = this.parts.get(partId);
    return part?.getEfficiency() ?? 0;
  }

  /**
   * 获取部位 HP
   */
  getPartHP(partId: BodyPartId): number {
    return this.parts.get(partId)?.currentHP ?? 0;
  }

  /**
   * 获取部位最大 HP
   */
  getPartMaxHP(partId: BodyPartId): number {
    return this.parts.get(partId)?.maxHP ?? 0;
  }

  /**
   * 获取所有部位
   */
  getAllParts(): Map<BodyPartId, BodyPart> {
    return this.parts;
  }

  /**
   * 查询部位
   */
  queryParts(query: BodyPartQuery = {}): List<BodyPart> {
    let parts = this.parts.toList();

    if (query.onlyFunctional) {
      parts = parts.filter(part => part.isFunctional());
    }

    if (query.typeFilter) {
      parts = parts.filter(part => part.type === query.typeFilter);
    }

    if (query.statusFilter) {
      parts = parts.filter(part => part.status === query.statusFilter);
    }

    return parts;
  }

  /**
   * 获取总体统计
   */
  getStats(): BodyPartStats {
    let totalHP = 0;
    let totalMaxHP = 0;
    let functionalParts = 0;
    let injuredParts = 0;
    let amputatedParts = 0;
    let totalPain = 0;
    let totalBleeding = 0;
    let totalInfection = 0;

    for (const part of this.parts.values()) {
      const stats = part.getStats();
      totalHP += stats.totalHP;
      totalMaxHP += stats.totalMaxHP;
      functionalParts += stats.functionalParts;
      injuredParts += stats.injuredParts;
      amputatedParts += stats.amputatedParts;
      totalPain += stats.totalPain;
      totalBleeding += stats.totalBleeding;
      totalInfection += stats.totalInfection;
    }

    return {
      totalHP,
      totalMaxHP,
      functionalParts,
      injuredParts,
      amputatedParts,
      totalPain,
      totalBleeding,
      totalInfection,
      healthPercentage: totalMaxHP > 0 ? (totalHP / totalMaxHP) * 100 : 0,
    };
  }

  /**
   * 获取整体影响
   */
  getOverallImpact(): BodyPartImpact {
    const impact: BodyPartImpact = {
      speedModifier: 1,
      dexterityModifier: 1,
      combatModifier: 1,
      perceptionModifier: 1,
      carryModifier: 1,
      canMove: true,
      canUseBothHands: true,
      canDoFineWork: true,
    };

    for (const part of this.parts.values()) {
      const partImpact = part.getImpact();

      // 取最差的影响
      impact.speedModifier = Math.min(impact.speedModifier, partImpact.speedModifier);
      impact.dexterityModifier = Math.min(impact.dexterityModifier, partImpact.dexterityModifier);
      impact.combatModifier = Math.min(impact.combatModifier, partImpact.combatModifier);
      impact.perceptionModifier = Math.min(impact.perceptionModifier, partImpact.perceptionModifier);
      impact.carryModifier = Math.min(impact.carryModifier, partImpact.carryModifier);
      impact.canMove = impact.canMove && partImpact.canMove;
      impact.canUseBothHands = impact.canUseBothHands && partImpact.canUseBothHands;
      impact.canDoFineWork = impact.canDoFineWork && partImpact.canDoFineWork;
    }

    return impact;
  }

  /**
   * 检查是否死亡
   */
  isDead(): boolean {
    // 检查致命部位
    for (const part of this.parts.values()) {
      if (part.isLethal && part.currentHP <= 0) {
        return true;
      }
    }

    // 检查头部
    const head = this.parts.get(0); // BodyPartId.HEAD
    if (head && head.currentHP <= 0) {
      return true;
    }

    // 检查躯干
    const torso = this.parts.get(1); // BodyPartId.TORSO
    if (torso && torso.currentHP <= 0) {
      return true;
    }

    return false;
  }

  /**
   * 检查是否倒地
   */
  isDowned(): boolean {
    const { BodyPartId: BPI } = require('../creature/types');

    const leftLeg = this.parts.get(BPI.LEG_L);
    const rightLeg = this.parts.get(BPI.LEG_R);

    const leftLegDown = !leftLeg || !leftLeg.isFunctional();
    const rightLegDown = !rightLeg || !rightLeg.isFunctional();

    // 双腿都失去功能则倒地
    return leftLegDown && rightLegDown;
  }

  // ========== 序列化方法 ==========

  /**
   * 转换为 JSON
   */
  toJSON(): Record<string, any> {
    return {
      ownerId: this.ownerId,
      ownerName: this.ownerName,
      parts: this.parts.map(part => part.toJSON()).toObject(),
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJSON(json: Record<string, any>): BodyPartManager {
    const parts = Map<BodyPartId, BodyPart>(
      Object.entries(json.parts).map(([id, part]) => [
        parseInt(id) as BodyPartId,
        BodyPart.fromJSON(part as any),
      ])
    );

    return new BodyPartManager({
      parts,
      ownerId: json.ownerId,
      ownerName: json.ownerName,
    });
  }
}
