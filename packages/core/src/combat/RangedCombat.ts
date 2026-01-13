/**
 * RangedCombat - 远程战斗系统
 *
 * 参考 Cataclysm-DDA 的 ballistics.h 和 ranged.cpp
 * 处理枪械、弓箭等远程攻击的完整流程
 */

import { List, Map } from 'immutable';
import type {
  DamageTypeId,
  BodyPartId,
  SkillId,
  Multiplier,
} from './types';
import { createBodyPartId } from './types';
import { AttackType, HitResult } from './types';
import { DamageInstance } from './DamageInstance';
import { Resistances } from './Resistances';
import { Attack } from './Attack';
import { DamageCalculator } from './DamageCalculator';
import { DamageHandler, DamageableCreature } from './DamageHandler';

// ============================================================================
// 射击模式
// ============================================================================

/**
 * 射击模式
 */
export enum FireMode {
  SINGLE = 'SINGLE',       // 单发
  BURST = 'BURST',         // 点射（3发）
  AUTO = 'AUTO',           // 全自动
}

// ============================================================================
// 弹道数据
// ============================================================================

/**
 * 弹道数据
 */
export interface BallisticData {
  /** 初始速度 */
  velocity: number;
  /** 重力影响 */
  gravity: number;
  /** 空气阻力 */
  drag: number;
  /** 风的影响 */
  windEffect: number;
}

// ============================================================================
// 射击结果
// ============================================================================

/**
 * 单发射击结果
 */
export interface ShotResult {
  /** 是否命中 */
  hit: boolean;
  /** 命中部位 */
  bodyPart: BodyPartId | null;
  /** 原始伤害 */
  rawDamage: number;
  /** 实际伤害 */
  actualDamage: number;
  /** 是否穿透 */
  penetrated: boolean;
  /** 是否跳弹 */
  ricocheted: boolean;
  /** 命中位置偏移（格） */
  offset: { x: number; y: number };
}

/**
 * 远程攻击完整结果
 */
export interface RangedAttackResult {
  /** 攻击者ID */
  attackerId: string;
  /** 目标ID */
  targetId: string;
  /** 使用的武器 */
  weaponUsed: string;
  /** 射击距离 */
  distance: number;
  /** 射击模式 */
  fireMode: FireMode;
  /** 发射数 */
  shotsFired: number;
  /** 命中数 */
  hits: number;
  /** 总伤害 */
  totalDamage: number;
  /** 单发结果 */
  shotResults: List<ShotResult>;
  /** 消耗弹药 */
  ammoConsumed: number;
  /** 射击时间（移动点数） */
  moveCost: number;
  /** 散布值（角分） */
  dispersion: number;
}

// ============================================================================
// 瞄准状态
// ============================================================================

/**
 * 瞄准状态
 */
export interface AimState {
  /** 瞄准目标 */
  targetId: string;
  /** 瞄准部位 */
  targetPart: BodyPartId | null;
  /** 瞄准回合数 */
  aimTurns: number;
  /** 精度加值 */
  accuracyBonus: number;
  /** 瞄准质量 */
  aimQuality: number; // 0-1, 1 = 完美瞄准
}

// ============================================================================
// RangedCombat 类
// ============================================================================

/**
 * RangedCombat - 远程战斗类
 *
 * 处理远程攻击的完整流程
 */
export class RangedCombat {
  // ============ 创建远程攻击 ============

  /**
   * 创建枪械射击攻击
   */
  static createGunAttack(
    damage: number,
    penetration: number,
    dispersion: number,
    range: number,
    skill: SkillId | null = null,
    skillLevel: number = 0
  ): Attack {
    const damageInstance = new DamageInstance().addDamage(
      'BULLET' as DamageTypeId,
      damage,
      penetration
    );
    return Attack.ranged(damageInstance, dispersion, range, skill, skillLevel);
  }

  /**
   * 创建弓箭攻击
   */
  static createBowAttack(
    damage: number,
    penetration: number,
    dispersion: number,
    range: number,
    skill: SkillId,
    skillLevel: number
  ): Attack {
    const damageInstance = new DamageInstance().addDamage(
      'STAB' as DamageTypeId,
      damage,
      penetration
    );
    return Attack.ranged(damageInstance, dispersion, range, skill, skillLevel);
  }

  /**
   * 创建投掷攻击
   */
  static createThrowAttack(
    damage: number,
    range: number
  ): Attack {
    const damageInstance = DamageInstance.bash(damage, 0);
    return Attack.throw(damageInstance, range);
  }

  // ============ 执行远程攻击 ============

  /**
   * 执行远程攻击
   *
   * @param attacker 攻击者
   * @param target 目标
   * @param attack 攻击定义
   * @param distance 距离
   * @param fireMode 射击模式
   * @param aimState 瞄准状态
   */
  static executeRangedAttack(
    attacker: RangedCombatCharacter,
    target: DamageableCreature,
    attack: Attack,
    distance: number,
    fireMode: FireMode = FireMode.SINGLE,
    aimState: AimState | null = null
  ): RangedAttackResult {
    // 确定发射数
    const shotsFired = RangedCombat.getShotsPerAttack(fireMode);
    const shotResults: ShotResult[] = [];

    let hits = 0;
    let totalDamage = 0;

    // 获取属性
    const accuracy = attacker.getRangedAccuracy() + (aimState?.accuracyBonus ?? 0);
    const dodge = (target as any).getDodgeValue?.() ?? 0;
    const resistances = target.getResistances();
    const availableParts = attacker.getTargetableBodyParts?.() ??
      [createBodyPartId('TORSO')];

    for (let i = 0; i < shotsFired; i++) {
      // 执行命中检定
      const hitRoll = attack.rollHit(accuracy, dodge, distance);

      // 计算偏移
      const offset = RangedCombat.calculateHitOffset(hitRoll, distance);

      // 判断是否命中
      const hit = hitRoll.missedBy < 0.5; // 命中阈值

      if (hit) {
        // 选择命中部位
        const bodyPart = aimState?.targetPart &&
          availableParts.includes(aimState.targetPart) &&
          Math.random() < aimState.aimQuality
          ? aimState.targetPart
          : RangedCombat.selectHitBodyPart(availableParts, hitRoll, aimState);

        // 计算伤害
        const dmgResult = attack.executeAttack(accuracy, dodge, resistances, [bodyPart]);

        hits++;
        totalDamage += dmgResult.actualDamage;

        shotResults.push({
          hit: true,
          bodyPart,
          rawDamage: dmgResult.rawDamage.totalDamage(),
          actualDamage: dmgResult.actualDamage,
          penetrated: dmgResult.actualDamage > 0,
          ricocheted: false,
          offset,
        });
      } else {
        // 未命中
        shotResults.push({
          hit: false,
          bodyPart: null,
          rawDamage: 0,
          actualDamage: 0,
          penetrated: false,
          ricocheted: hitRoll.missedBy > 1.0, // 严重失误可能跳弹
          offset,
        });
      }
    }

    // 计算弹药消耗
    const ammoConsumed = RangedCombat.calculateAmmoConsumption(fireMode, shotsFired);

    // 计算移动点数
    const moveCost = RangedCombat.calculateFireMoveCost(attacker, fireMode, distance);

    return {
      attackerId: attacker.id,
      targetId: (target as any).id ?? 'unknown',
      weaponUsed: attacker.getWeaponName?.() ?? 'unknown',
      distance,
      fireMode,
      shotsFired,
      hits,
      totalDamage,
      shotResults: List(shotResults),
      ammoConsumed,
      moveCost,
      dispersion: attack.dispersion,
    };
  }

  /**
   * 执行范围射击（霰弹枪、爆炸等）
   */
  static executeAreaAttack(
    attacker: RangedCombatCharacter,
    targets: Map<string, DamageableCreature>,
    attack: Attack,
    centerPosition: { x: number; y: number },
    blastRadius: number = 1
  ): Map<string, RangedAttackResult> {
    const results = Map<string, RangedAttackResult>();

    for (const [targetId, target] of targets.entries()) {
      // 计算距离
      const distance = 1; // 简化：假设都在射程内

      // 执行攻击
      const result = RangedCombat.executeRangedAttack(
        attacker,
        target,
        attack,
        distance,
        FireMode.SINGLE,
        null
      );

      results.set(targetId, result);
    }

    return results;
  }

  // ============ 瞄准系统 ============

  /**
   * 开始瞄准
   */
  static startAiming(
    targetId: string,
    targetPart: BodyPartId | null = null
  ): AimState {
    return {
      targetId,
      targetPart,
      aimTurns: 0,
      accuracyBonus: 0,
      aimQuality: 0,
    };
  }

  /**
   * 继续瞄准
   */
  static continueAiming(aimState: AimState, maxBonus: number = 10): AimState {
    const newTurns = aimState.aimTurns + 1;
    const newBonus = Math.min(maxBonus, newTurns * 2);
    const newQuality = Math.min(1.0, newTurns * 0.15);

    return {
      ...aimState,
      aimTurns: newTurns,
      accuracyBonus: newBonus,
      aimQuality: newQuality,
    };
  }

  // ============ 命中部位选择 ============

  /**
   * 选择命中部位（远程）
   */
  private static selectHitBodyPart(
    availableParts: BodyPartId[],
    hitRoll: { missedBy: number },
    aimState: AimState | null
  ): BodyPartId {
    // 如果瞄准了特定部位
    if (aimState?.targetPart && availableParts.includes(aimState.targetPart)) {
      // 瞄准质量决定命中率
      if (Math.random() < aimState.aimQuality) {
        return aimState.targetPart;
      }
    }

    // 随机选择，躯干权重最高
    const torsoIndex = availableParts.indexOf('TORSO' as BodyPartId);
    if (torsoIndex >= 0 && Math.random() < 0.5) {
      return 'TORSO' as BodyPartId;
    }

    return availableParts[Math.floor(Math.random() * availableParts.length)];
  }

  // ============ 计算方法 ============

  /**
   * 获取射击模式的发射数
   */
  private static getShotsPerAttack(fireMode: FireMode): number {
    switch (fireMode) {
      case FireMode.SINGLE:
        return 1;
      case FireMode.BURST:
        return 3;
      case FireMode.AUTO:
        return 5 + Math.floor(Math.random() * 5); // 5-10发
      default:
        return 1;
    }
  }

  /**
   * 计算弹药消耗
   */
  private static calculateAmmoConsumption(fireMode: FireMode, shotsFired: number): number {
    // 自动射击偶尔会多消耗（模拟后坐力导致的失误射击）
    if (fireMode === FireMode.AUTO && Math.random() < 0.1) {
      return shotsFired + 1;
    }
    return shotsFired;
  }

  /**
   * 计算射击移动点数
   */
  private static calculateFireMoveCost(
    character: RangedCombatCharacter,
    fireMode: FireMode,
    distance: number
  ): number {
    let baseCost = 80;

    // 射击模式影响
    switch (fireMode) {
      case FireMode.BURST:
        baseCost = 150;
        break;
      case FireMode.AUTO:
        baseCost = 200;
        break;
    }

    // 距离影响
    baseCost += distance * 5;

    // 武器技能影响
    const skillLevel = character.getSkillLevel?.('rifle' as SkillId) ?? 0;
    baseCost = Math.max(50, baseCost - skillLevel * 5);

    return baseCost;
  }

  /**
   * 计算命中偏移
   */
  private static calculateHitOffset(
    hitRoll: { missedBy: number; dispersion: number },
    distance: number
  ): { x: number; y: number } {
    const missFactor = Math.max(0, hitRoll.missedBy);
    const dispersionRadians = (hitRoll.dispersion * Math.PI) / 180 / 60;
    const offsetDistance = missFactor * distance * Math.tan(dispersionRadians);

    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.floor(offsetDistance * Math.cos(angle)),
      y: Math.floor(offsetDistance * Math.sin(angle)),
    };
  }

  /**
   * 计算散布随距离的变化
   */
  static calculateDispersionAtDistance(
    baseDispersion: number,
    distance: number
  ): number {
    // 散布随距离增加
    return baseDispersion * (1 + distance * 0.1);
  }

  /**
   * 计算命中率
   */
  static calculateHitChance(
    accuracy: number,
    dodge: number,
    distance: number,
    dispersion: number
  ): number {
    // 距离惩罚
    const distancePenalty = distance * 2;

    // 散布惩罚
    const dispersionPenalty = dispersion / 10;

    // 最终命中率
    const netAccuracy = accuracy - dodge - distancePenalty - dispersionPenalty;
    return Math.max(0, Math.min(100, netAccuracy));
  }

  // ============ 格式化输出 ============

  /**
   * 格式化射击结果
   */
  static formatShotResult(result: ShotResult): string {
    if (result.hit) {
      return `命中 ${result.bodyPart}: ${result.actualDamage} 伤害${result.penetrated ? ' (穿透)' : ''}`;
    }
    return `未命中${result.ricocheted ? ' (跳弹)' : ''} 偏移 (${result.offset.x}, ${result.offset.y})`;
  }

  /**
   * 格式化远程攻击结果
   */
  static formatAttackResult(result: RangedAttackResult): string {
    const lines = [
      '=== 远程攻击结果 ===',
      `攻击者: ${result.attackerId}`,
      `目标: ${result.targetId}`,
      `武器: ${result.weaponUsed}`,
      `射击模式: ${FireMode[result.fireMode]}`,
      `距离: ${result.distance} 格`,
      `发射: ${result.shotsFired} 发`,
      `命中: ${result.hits} 发`,
      `总伤害: ${result.totalDamage}`,
      `散布: ${result.dispersion.toFixed(1)} MOA`,
      `弹药消耗: ${result.ammoConsumed}`,
      `移动消耗: ${result.moveCost}`,
      '',
      '射击详情:',
    ];

    for (let i = 0; i < result.shotResults.size; i++) {
      lines.push(`  ${i + 1}. ${RangedCombat.formatShotResult(result.shotResults.get(i)!)}`);
    }

    return lines.join('\n');
  }
}

// ============================================================================
// 远程战斗角色接口
// ============================================================================

/**
 * 远程战斗角色接口
 */
export interface RangedCombatCharacter {
  /** 角色ID */
  id: string;
  /** 获取远程精度 */
  getRangedAccuracy(): number;
  /** 获取技能等级 */
  getSkillLevel?(skill: SkillId): number;
  /** 获取武器名称 */
  getWeaponName?(): string;
  /** 获取可攻击的身体部位 */
  getTargetableBodyParts?(): BodyPartId[];
}

// ============================================================================
// 内置武器数据
// ============================================================================

/**
 * 枪械数据
 */
export interface GunData {
  id: string;
  name: string;
  damage: number;
  penetration: number;
  dispersion: number;
  effectiveRange: number;
  maxRange: number;
  skill: SkillId;
  magazineSize: number;
  reloadTime: number;
  fireModes: FireMode[];
  burstSize?: number;
}

/**
 * 预定义枪械
 */
export const PREDEFINED_GUNS: Record<string, GunData> = {
  pistol_9mm: {
    id: 'pistol_9mm',
    name: '9mm 手枪',
    damage: 15,
    penetration: 2,
    dispersion: 180,
    effectiveRange: 15,
    maxRange: 25,
    skill: 'pistol' as SkillId,
    magazineSize: 12,
    reloadTime: 2000,
    fireModes: [FireMode.SINGLE],
  },
  rifle_assault: {
    id: 'rifle_assault',
    name: '突击步枪',
    damage: 25,
    penetration: 5,
    dispersion: 45,
    effectiveRange: 30,
    maxRange: 50,
    skill: 'rifle' as SkillId,
    magazineSize: 30,
    reloadTime: 3000,
    fireModes: [FireMode.SINGLE, FireMode.BURST, FireMode.AUTO],
    burstSize: 3,
  },
  shotgun_pump: {
    id: 'shotgun_pump',
    name: '泵动式霰弹枪',
    damage: 80,
    penetration: 1,
    dispersion: 600,
    effectiveRange: 8,
    maxRange: 15,
    skill: 'shotgun' as SkillId,
    magazineSize: 6,
    reloadTime: 2500,
    fireModes: [FireMode.SINGLE],
  },
  sniper_rifle: {
    id: 'sniper_rifle',
    name: '狙击步枪',
    damage: 60,
    penetration: 15,
    dispersion: 15,
    effectiveRange: 60,
    maxRange: 100,
    skill: 'rifle' as SkillId,
    magazineSize: 5,
    reloadTime: 4000,
    fireModes: [FireMode.SINGLE],
  },
};
