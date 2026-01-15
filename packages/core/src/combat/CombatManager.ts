/**
 * CombatManager - 战斗管理器
 *
 * 集成所有战斗系统的核心组件
 * 负责战斗循环、物品系统集成、效果系统集成
 */

import { List, Map } from 'immutable';
import type {
  DamageTypeId,
  BodyPartId,
  SkillId as CombatSkillId,
} from './types';
import {
  createBodyPartId,
  createSkillId,
  HitResult,
} from './types';
import { DamageInstance } from './DamageInstance';
import { Resistances } from './Resistances';
import { DamageHandler, DamageableCreature, DamageApplicationResult } from './DamageHandler';
import { MeleeCombat, MeleeAttackResult, MeleeCombatCharacter } from './MeleeCombat';
import { RangedCombat, RangedAttackResult, RangedCombatCharacter, FireMode, AimState } from './RangedCombat';
import { CombatFeedback, CombatFeedbackEvent, FeedbackManager, FeedbackType } from './CombatFeedback';
import { EffectCombatIntegration, CombatModifier, CombatEffectContext } from './EffectCombatIntegration';
import type { FeedbackMessage, VisualFeedback, SoundFeedback } from './CombatFeedback';
import { EffectIntensity } from '../effect/types';
import type { AttackResult } from './Attack';
import type { Item } from '../item/Item';
import type { Effect } from '../effect/Effect';
import type { EffectManager } from '../effect/EffectManager';
import type { SkillId as ItemSkillId } from '../item/types';

// ============ 战斗事件 ============

/**
 * 战斗事件
 */
export interface CombatEvent {
  /** 事件ID */
  id: string;
  /** 事件类型 */
  type: 'attack' | 'damage' | 'effect' | 'move' | 'death' | 'flee' | 'reload';
  /** 事件发生时间 */
  timestamp: number;
  /** 相关角色 */
  actorId: string;
  /** 目标ID */
  targetId?: string;
  /** 事件数据 */
  data?: any;
}

// ============ 装填结果 ============

/**
 * 装填动作结果
 */
export interface ReloadActionResult {
  /** 是否成功 */
  success: boolean;
  /** 装填数量 */
  amountLoaded: number;
  /** 装填时间（毫秒） */
  reloadTime: number;
  /** 更新后的武器 */
  updatedWeapon?: Item;
  /** 剩余弹药 */
  remainingAmmo?: Item;
  /** 反馈信息 */
  feedback: CombatFeedbackEvent;
  /** 新状态 */
  newState: CombatState;
  /** 错误信息（如果失败） */
  error?: string;
}

// ============ 战斗参与者 ============

/**
 * 战斗参与者接口
 */
export interface Combatant extends DamageableCreature {
  /** 参与者ID */
  id: string;
  /** 名称 */
  name: string;
  /** 队伍ID */
  teamId: string;
  /** 当前HP（按部位） */
  currentHP: Map<BodyPartId, number>;
  /** 最大HP（按部位） */
  maxHP: Map<BodyPartId, number>;
  /** 是否存活 */
  isAlive: boolean;
  /** 是否可行动 */
  canAct: boolean;
  /** 当前移动点数 */
  movePoints: number;
  /** 最大移动点数 */
  maxMovePoints: number;
  /** 当前武器 */
  weapon: Item | null;
  /** 当前护甲 */
  armor: Map<BodyPartId, Item>;
  /** 效果管理器 */
  effectManager?: EffectManager;

  // ============ 近战接口 ============
  getMeleeAccuracy(): number;
  getCritChance(): number;
  getCritMultiplier(): number;
  getSkillLevel?(skill: CombatSkillId): number;
  getWeaponName?(): string;
  getWeaponWeight?(): number;
  getBlockChance?(): number;
  getBlockReduction?(): number;
  getBlockingWeapon?(): string;
  getDodgeChance?(): number;
  getDodgeValue?(): number;

  // ============ 远程接口 ============
  getRangedAccuracy(): number;
  getTargetableBodyParts?(): BodyPartId[];

  // ============ 移动点数管理 ============
  consumeMovePoints(amount: number): Combatant;
  resetMovePoints(): Combatant;
  isDead(): boolean;
}

// ============ 战斗状态 ============

/**
 * 战斗状态类
 */
export class CombatState {
  constructor(
    public readonly combatId: string,
    public readonly turnNumber: number,
    public readonly currentActorId: string,
    public readonly combatants: Map<string, Combatant>,
    public readonly actionQueue: List<string>,
    public readonly aimStates: Map<string, AimState>,
    public readonly gunStates: Map<string, any>, // GunState from weapon.ts
    public readonly eventLog: List<CombatEvent>,
    public readonly feedbackManager: FeedbackManager,
    public readonly isCombatOver: boolean,
    public readonly winningTeam: string | null
  ) {}

  withCombatants(combatants: Map<string, Combatant>): CombatState {
    return new CombatState(
      this.combatId,
      this.turnNumber,
      this.currentActorId,
      combatants,
      this.actionQueue,
      this.aimStates,
      this.gunStates,
      this.eventLog,
      this.feedbackManager,
      this.isCombatOver,
      this.winningTeam
    );
  }

  withActionQueue(queue: List<string>): CombatState {
    return new CombatState(
      this.combatId,
      this.turnNumber,
      this.currentActorId,
      this.combatants,
      queue,
      this.aimStates,
      this.gunStates,
      this.eventLog,
      this.feedbackManager,
      this.isCombatOver,
      this.winningTeam
    );
  }

  withTurnNumber(turnNumber: number): CombatState {
    return new CombatState(
      this.combatId,
      turnNumber,
      this.currentActorId,
      this.combatants,
      this.actionQueue,
      this.aimStates,
      this.gunStates,
      this.eventLog,
      this.feedbackManager,
      this.isCombatOver,
      this.winningTeam
    );
  }

  withCurrentActor(currentActorId: string): CombatState {
    return new CombatState(
      this.combatId,
      this.turnNumber,
      currentActorId,
      this.combatants,
      this.actionQueue,
      this.aimStates,
      this.gunStates,
      this.eventLog,
      this.feedbackManager,
      this.isCombatOver,
      this.winningTeam
    );
  }

  withAimStates(aimStates: Map<string, AimState>): CombatState {
    return new CombatState(
      this.combatId,
      this.turnNumber,
      this.currentActorId,
      this.combatants,
      this.actionQueue,
      aimStates,
      this.gunStates,
      this.eventLog,
      this.feedbackManager,
      this.isCombatOver,
      this.winningTeam
    );
  }

  withGunStates(gunStates: Map<string, any>): CombatState {
    return new CombatState(
      this.combatId,
      this.turnNumber,
      this.currentActorId,
      this.combatants,
      this.actionQueue,
      this.aimStates,
      gunStates,
      this.eventLog,
      this.feedbackManager,
      this.isCombatOver,
      this.winningTeam
    );
  }

  withEventLog(eventLog: List<CombatEvent>): CombatState {
    return new CombatState(
      this.combatId,
      this.turnNumber,
      this.currentActorId,
      this.combatants,
      this.actionQueue,
      this.aimStates,
      this.gunStates,
      eventLog,
      this.feedbackManager,
      this.isCombatOver,
      this.winningTeam
    );
  }

  withCombatOver(isCombatOver: boolean, winningTeam: string | null = null): CombatState {
    return new CombatState(
      this.combatId,
      this.turnNumber,
      this.currentActorId,
      this.combatants,
      this.actionQueue,
      this.aimStates,
      this.gunStates,
      this.eventLog,
      this.feedbackManager,
      isCombatOver,
      winningTeam ?? this.winningTeam
    );
  }

  withFeedbackManager(feedbackManager: FeedbackManager): CombatState {
    return new CombatState(
      this.combatId,
      this.turnNumber,
      this.currentActorId,
      this.combatants,
      this.actionQueue,
      this.aimStates,
      this.gunStates,
      this.eventLog,
      feedbackManager,
      this.isCombatOver,
      this.winningTeam
    );
  }
}

// ============ 近战攻击请求 ============

/**
 * 近战攻击请求
 */
export interface MeleeAttackRequest {
  /** 攻击者ID */
  attackerId: string;
  /** 目标ID */
  targetId: string;
  /** 攻击类型（可选，默认使用武器攻击） */
  attackType?: 'bash' | 'cut' | 'stab';
  /** 是否瞄准特定部位 */
  aimForBodyPart?: BodyPartId;
}

// ============ 远程攻击请求 ============

/**
 * 远程攻击请求
 */
export interface RangedAttackRequest {
  /** 攻击者ID */
  attackerId: string;
  /** 目标ID */
  targetId: string;
  /** 射击模式 */
  fireMode: FireMode;
  /** 距离 */
  distance: number;
  /** 是否瞄准 */
  aim: boolean;
}

// ============ 战斗回合结果 ============

/**
 * 战斗行动结果
 */
export interface CombatActionResult {
  /** 行动是否成功 */
  success: boolean;
  /** 行动类型 */
  actionType: string;
  /** 战斗反馈事件 */
  feedback: CombatFeedbackEvent;
  /** 是否结束回合 */
  endTurn: boolean;
  /** 新的战斗状态 */
  newState: CombatState;
  /** 错误消息 */
  error?: string;
}

// ============ CombatManager 类 ============

/**
 * CombatManager - 战斗管理器
 *
 * 管理完整的战斗流程
 */
export class CombatManager {
  private state: CombatState;

  constructor(initialState: {
    combatId?: string;
    turnNumber?: number;
    currentActorId?: string;
    combatants?: Map<string, Combatant>;
    actionQueue?: List<string>;
    aimStates?: Map<string, AimState>;
    gunStates?: Map<string, any>;
    eventLog?: List<CombatEvent>;
    feedbackManager?: FeedbackManager;
    isCombatOver?: boolean;
    winningTeam?: string | null;
  } = {}) {
    this.state = new CombatState(
      initialState.combatId ?? `combat_${Date.now()}`,
      initialState.turnNumber ?? 0,
      initialState.currentActorId ?? '',
      initialState.combatants ?? Map(),
      initialState.actionQueue ?? List(),
      initialState.aimStates ?? Map(),
      initialState.gunStates ?? Map(),
      initialState.eventLog ?? List(),
      initialState.feedbackManager ?? new FeedbackManager(),
      initialState.isCombatOver ?? false,
      initialState.winningTeam ?? null
    );
  }

  // ============ 状态管理 ============

  /**
   * 获取当前战斗状态
   */
  getState(): CombatState {
    return this.state;
  }

  /**
   * 添加战斗参与者
   */
  addCombatant(combatant: Combatant): CombatManager {
    const newCombatants = this.state.combatants.set(combatant.id, combatant);
    const newQueue = this.state.actionQueue.push(combatant.id);
    this.state = this.state
      .withCombatants(newCombatants)
      .withActionQueue(newQueue);
    return this;
  }

  /**
   * 移除战斗参与者
   */
  removeCombatant(combatantId: string): CombatManager {
    const newCombatants = this.state.combatants.delete(combatantId);
    const newQueue = this.state.actionQueue.filter(id => id !== combatantId);
    this.state = this.state
      .withCombatants(newCombatants)
      .withActionQueue(newQueue);
    return this;
  }

  // ============ 战斗流程控制 ============

  /**
   * 开始战斗
   */
  startCombat(): CombatManager {
    if (this.state.actionQueue.isEmpty()) {
      throw new Error('没有战斗参与者');
    }

    // 按速度排序行动队列
    const sortedQueue = this.state.actionQueue.sort((a, b) => {
      const combatantA = this.state.combatants.get(a);
      const combatantB = this.state.combatants.get(b);
      if (!combatantA || !combatantB) return 0;
      return combatantB.maxMovePoints - combatantA.maxMovePoints;
    });

    this.state = this.state
      .withTurnNumber(1)
      .withActionQueue(sortedQueue)
      .withCurrentActor(sortedQueue.first() ?? '');

    return this;
  }

  /**
   * 下一回合
   */
  nextTurn(): CombatManager {
    // 检查战斗是否结束
    if (this.state.isCombatOver) {
      return this;
    }

    // 移动到下一个参与者
    let newQueue = this.state.actionQueue;
    let currentActor = newQueue.first();

    if (currentActor) {
      newQueue = newQueue.shift();
      // 如果还有人未行动，将当前参与者加入队尾
      if (newQueue.size > 0) {
        newQueue = newQueue.push(currentActor);
      } else {
        // 所有人都行动过一次，新回合
        this.state = this.state.withTurnNumber(this.state.turnNumber + 1);
      }
    }

    currentActor = newQueue.first();
    this.state = this.state.withCurrentActor(currentActor ?? '');

    // 检查战斗是否结束
    this.checkCombatEnd();

    return this;
  }

  /**
   * 结束当前参与者的回合
   */
  endTurn(): CombatManager {
    const currentActor = this.state.combatants.get(this.state.currentActorId);
    if (currentActor) {
      // 重置移动点数
      const resetActor = currentActor.resetMovePoints();
      this.state = this.state.withCombatants(
        this.state.combatants.set(this.state.currentActorId, resetActor)
      );
    }

    return this.nextTurn();
  }

  /**
   * 检查战斗是否结束
   */
  private checkCombatEnd(): void {
    const aliveTeams = new Set<string>();

    for (const combatant of this.state.combatants.values()) {
      if (combatant.isAlive) {
        aliveTeams.add(combatant.teamId);
      }
    }

    if (aliveTeams.size <= 1) {
      const winningTeam = aliveTeams.size === 1 ? Array.from(aliveTeams)[0] : null;
      this.state = this.state.withCombatOver(true, winningTeam);
    }
  }

  // ============ 近战攻击 ============

  /**
   * 执行近战攻击
   */
  executeMeleeAttack(request: MeleeAttackRequest): CombatActionResult {
    const attacker = this.state.combatants.get(request.attackerId);
    const target = this.state.combatants.get(request.targetId);

    if (!attacker) {
      return this.createErrorResult('attack', '攻击者不存在');
    }
    if (!target) {
      return this.createErrorResult('attack', '目标不存在');
    }
    if (!attacker.isAlive || !target.isAlive) {
      return this.createErrorResult('attack', '攻击者或目标已死亡');
    }

    // 检查移动点数
    const moveCost = 100;
    if (attacker.movePoints < moveCost) {
      return this.createErrorResult('attack', '移动点数不足');
    }

    // ============ 效果系统集成 ============

    // 获取攻击者效果
    const attackerEffects = attacker.effectManager?.getActiveEffects() || List<Effect>();

    // 计算攻击者的战斗修正
    const attackerContext: CombatEffectContext = {
      isAttacker: true,
      attackType: 'melee',
      turnNumber: this.state.turnNumber,
    };
    const attackerModifiers = EffectCombatIntegration.calculateCombatModifiers(
      attackerEffects,
      attackerContext
    );

    // 获取目标效果
    const targetEffects = target.effectManager?.getActiveEffects() || List<Effect>();

    // 计算目标的战斗修正
    const targetContext: CombatEffectContext = {
      isAttacker: false,
      attackType: 'melee',
      turnNumber: this.state.turnNumber,
    };
    const targetModifiers = EffectCombatIntegration.calculateCombatModifiers(
      targetEffects,
      targetContext
    );

    // 应用命中修正
    const baseAccuracy = attacker.getMeleeAccuracy();
    const modifiedAccuracy = EffectCombatIntegration.applyHitModifiers(baseAccuracy, attackerModifiers);

    // 应用暴击率修正
    const baseCritChance = attacker.getCritChance();
    const modifiedCritChance = EffectCombatIntegration.applyCritChanceModifiers(baseCritChance, attackerModifiers);

    // 应用护甲修正到目标
    const targetBaseResistances = target.getResistances();
    const targetResistances = EffectCombatIntegration.calculateEffectResistances(
      targetEffects,
      targetBaseResistances
    );

    // 检查触发的攻击时效果
    const triggeredOnAttack = EffectCombatIntegration.checkTriggeredEffects(
      attackerEffects,
      'on_attack',
      attackerContext
    );

    // 创建攻击
    let attack: any;
    const weapon = attacker.weapon;
    const weaponSlot = (weapon as any)?.type?.weapon;
    let weaponDamage = weaponSlot?.damage || 3;

    // 应用伤害修正
    weaponDamage = EffectCombatIntegration.applyDamageModifiers(weaponDamage, attackerModifiers);

    if (request.attackType === 'cut') {
      attack = MeleeCombat.createCutAttack(weaponDamage, 0, 0);
    } else if (request.attackType === 'stab') {
      attack = MeleeCombat.createStabAttack(weaponDamage, 0, 0);
    } else {
      attack = MeleeCombat.createBashAttack(weaponDamage, 0, 0);
    }

    // 确定目标部位
    const targetParts = attacker.getTargetableBodyParts?.() || [createBodyPartId('TORSO')];
    const targetPart = request.aimForBodyPart || MeleeCombat.selectTargetBodyPart(
      targetParts,
      attacker.getMeleeAccuracy(),
      1, // 目标大小
      request.aimForBodyPart
    );

    // 执行攻击
    const result = MeleeCombat.executeMeleeAttackWithDefense(
      attacker,
      target,
      attack,
      [targetPart]
    );

    // 应用伤害
    const damageResult = this.applyDamageToTarget(target, result.attackResult.rawDamage, targetPart);

    // 更新目标状态
    const updatedTarget = this.updateCombatantAfterDamage(target, damageResult);
    let newCombatants = this.state.combatants.set(request.targetId, updatedTarget);

    // 消耗移动点数
    const updatedAttacker = attacker.consumeMovePoints(moveCost);
    newCombatants = newCombatants.set(request.attackerId, updatedAttacker);

    // 生成反馈
    const feedback = CombatFeedback.generateMeleeAttackFeedback(result);

    // 记录事件
    const event: CombatEvent = {
      id: `combat_event_${Date.now()}`,
      type: 'attack',
      timestamp: Date.now(),
      actorId: request.attackerId,
      targetId: request.targetId,
      data: { result, damageResult },
    };

    let newState = this.state
      .withCombatants(newCombatants)
      .withEventLog(this.state.eventLog.push(event));

    // 更新反馈管理器
    newState.feedbackManager.addEvent(feedback);
    newState = newState.withFeedbackManager(newState.feedbackManager);

    // 检查是否击杀
    if (damageResult.killed) {
      const killFeedback = CombatFeedback.generateKillFeedback(
        attacker.name,
        target.name,
        attacker.getWeaponName?.()
      );
      newState.feedbackManager.addEvent(killFeedback);
      newState = newState.withFeedbackManager(newState.feedbackManager);

      // 触发击杀效果
      const killContext: CombatEffectContext = {
        ...attackerContext,
        isCritical: result.attackResult.critical,
      };
      const triggeredOnKill = EffectCombatIntegration.checkTriggeredEffects(
        attackerEffects,
        'on_kill',
        killContext
      );
    } else {
      // 未击杀，检查命中效果
      if (result.attackResult.hitResult !== HitResult.MISS) {
        const hitContext: CombatEffectContext = {
          ...attackerContext,
          isCritical: result.attackResult.critical,
          isMiss: false,
        };
        const triggeredOnHit = EffectCombatIntegration.checkTriggeredEffects(
          attackerEffects,
          'on_hit',
          hitContext
        );
      } else {
        // 未命中，检查miss效果
        const missContext: CombatEffectContext = {
          ...attackerContext,
          isMiss: true,
        };
        const triggeredOnMiss = EffectCombatIntegration.checkTriggeredEffects(
          attackerEffects,
          'on_miss',
          missContext
        );
      }
    }

    // 检查格挡/闪避效果
    if (result.blockResult?.blocked) {
      const blockContext: CombatEffectContext = {
        isAttacker: false,
        attackType: 'melee',
        turnNumber: this.state.turnNumber,
      };
      const triggeredOnBlock = EffectCombatIntegration.checkTriggeredEffects(
        targetEffects,
        'on_block',
        blockContext
      );
    }

    if (result.dodgeResult?.dodged) {
      const dodgeContext: CombatEffectContext = {
        isAttacker: false,
        attackType: 'melee',
        turnNumber: this.state.turnNumber,
      };
      const triggeredOnDodge = EffectCombatIntegration.checkTriggeredEffects(
        targetEffects,
        'on_dodge',
        dodgeContext
      );
    }

    this.state = newState;

    return {
      success: true,
      actionType: 'melee_attack',
      feedback,
      endTurn: false,
      newState,
    };
  }

  // ============ 远程攻击 ============

  /**
   * 执行远程攻击
   */
  executeRangedAttack(request: RangedAttackRequest): CombatActionResult {
    const attacker = this.state.combatants.get(request.attackerId);
    const target = this.state.combatants.get(request.targetId);

    if (!attacker) {
      return this.createErrorResult('attack', '攻击者不存在');
    }
    if (!target) {
      return this.createErrorResult('attack', '目标不存在');
    }
    if (!attacker.isAlive || !target.isAlive) {
      return this.createErrorResult('attack', '攻击者或目标已死亡');
    }

    const weapon = attacker.weapon;
    if (!weapon?.type?.isGun?.()) {
      return this.createErrorResult('attack', '没有装备枪械');
    }

    // 检查弹药
    const weaponCharges = typeof weapon.charges === 'number' ? weapon.charges : 0;
    if (weaponCharges <= 0) {
      const feedback = CombatFeedback.generateWeaponEmptyFeedback(weapon.type.name);
      return {
        success: false,
        actionType: 'ranged_attack',
        feedback,
        endTurn: false,
        newState: this.state,
        error: '弹药不足',
      };
    }

    // ============ 效果系统集成 ============

    // 获取攻击者效果
    const attackerEffects = attacker.effectManager?.getActiveEffects() || List<Effect>();

    // 计算攻击者的战斗修正
    const attackerContext: CombatEffectContext = {
      isAttacker: true,
      attackType: 'ranged',
      turnNumber: this.state.turnNumber,
    };
    const attackerModifiers = EffectCombatIntegration.calculateCombatModifiers(
      attackerEffects,
      attackerContext
    );

    // 获取目标效果
    const targetEffects = target.effectManager?.getActiveEffects() || List<Effect>();

    // 计算目标的战斗修正
    const targetContext: CombatEffectContext = {
      isAttacker: false,
      attackType: 'ranged',
      turnNumber: this.state.turnNumber,
    };
    const targetModifiers = EffectCombatIntegration.calculateCombatModifiers(
      targetEffects,
      targetContext
    );

    // 检查触发的攻击时效果
    const triggeredOnAttack = EffectCombatIntegration.checkTriggeredEffects(
      attackerEffects,
      'on_attack',
      attackerContext
    );

    // 获取瞄准状态
    let aimState: AimState | null = null;
    if (request.aim) {
      aimState = this.state.aimStates.get(request.attackerId) || null;
    }

    // 创建攻击
    const gunSlot = weapon.type.gun;
    let gunDamage = gunSlot?.rangedDamage || 15;
    let dispersion = gunSlot?.dispersion || 180;
    const range = gunSlot?.range || 15;

    // 应用伤害修正
    gunDamage = EffectCombatIntegration.applyDamageModifiers(gunDamage, attackerModifiers);

    // 应用散布修正
    dispersion = EffectCombatIntegration.applyDispersionModifiers(dispersion, attackerModifiers);

    // 转换技能类型
    const skill = gunSlot?.skill;
    let combatSkill: CombatSkillId | null = null;
    if (skill) {
      combatSkill = createSkillId(skill.toString());
    }
    const skillLevel = combatSkill && attacker.getSkillLevel ? attacker.getSkillLevel(combatSkill) : 0;

    const attack = RangedCombat.createGunAttack(gunDamage, 0, dispersion, range, combatSkill, skillLevel);

    // 执行攻击
    const result = RangedCombat.executeRangedAttack(
      attacker,
      target,
      attack,
      request.distance,
      request.fireMode,
      aimState
    );

    // 消耗弹药
    const ammoConsumed = result.ammoConsumed;
    // 处理武器更新（支持 Immutable.Record 和普通对象）
    let updatedWeapon: Item;
    if (typeof (weapon as any).set === 'function') {
      updatedWeapon = (weapon as any).set('charges', this.getItemCharges(weapon) - ammoConsumed);
    } else {
      updatedWeapon = { ...weapon, charges: this.getItemCharges(weapon) - ammoConsumed } as Item;
    }
    const updatedAttacker: Combatant = {
      ...attacker,
      weapon: updatedWeapon,
    };

    // 应用伤害
    let totalDamage = 0;
    let killed = false;

    for (const shotResult of result.shotResults) {
      if (shotResult.hit && shotResult.bodyPart) {
        const damageInstance = new DamageInstance().addDamage(
          'BULLET' as DamageTypeId,
          shotResult.actualDamage,
          0
        );
        const damageResult = this.applyDamageToTarget(target, damageInstance, shotResult.bodyPart);
        totalDamage += damageResult.totalActualDamage;
        if (damageResult.killed) {
          killed = true;
        }
      }
    }

    // 更新目标状态
    let updatedTarget = target;
    if (totalDamage > 0 && result.shotResults.size > 0) {
      const firstShot = result.shotResults.first();
      if (firstShot?.hit && firstShot.bodyPart) {
        const damageInstance = new DamageInstance().addDamage(
          'BULLET' as DamageTypeId,
          result.totalDamage,
          0
        );
        const damageResult = DamageHandler.applyDamage(target, damageInstance, firstShot.bodyPart);
        updatedTarget = this.updateCombatantAfterDamage(target, damageResult);
      }
    }

    const newCombatants = this.state.combatants
      .set(request.attackerId, updatedAttacker)
      .set(request.targetId, updatedTarget);

    // 生成反馈
    const feedback = CombatFeedback.generateRangedAttackFeedback(result);

    // 记录事件
    const event: CombatEvent = {
      id: `combat_event_${Date.now()}`,
      type: 'attack',
      timestamp: Date.now(),
      actorId: request.attackerId,
      targetId: request.targetId,
      data: { result },
    };

    let newState = this.state
      .withCombatants(newCombatants)
      .withEventLog(this.state.eventLog.push(event));

    newState.feedbackManager.addEvent(feedback);
    newState = newState.withFeedbackManager(newState.feedbackManager);

    // ============ 效果触发处理 ============

    // 统计命中和未命中次数
    let hitCount = 0;
    let missCount = 0;
    for (const shotResult of result.shotResults) {
      if (shotResult.hit) {
        hitCount++;
      } else {
        missCount++;
      }
    }

    if (killed) {
      const killFeedback = CombatFeedback.generateKillFeedback(
        attacker.name,
        target.name,
        weapon.type.name
      );
      newState.feedbackManager.addEvent(killFeedback);
      newState = newState.withFeedbackManager(newState.feedbackManager);

      // 触发击杀效果
      const killContext: CombatEffectContext = {
        ...attackerContext,
      };
      const triggeredOnKill = EffectCombatIntegration.checkTriggeredEffects(
        attackerEffects,
        'on_kill',
        killContext
      );
    } else if (hitCount > 0) {
      // 有命中，触发命中效果
      const hitContext: CombatEffectContext = {
        ...attackerContext,
        isMiss: false,
      };
      const triggeredOnHit = EffectCombatIntegration.checkTriggeredEffects(
        attackerEffects,
        'on_hit',
        hitContext
      );
    }

    if (missCount > 0) {
      // 有未命中，触发miss效果
      const missContext: CombatEffectContext = {
        ...attackerContext,
        isMiss: true,
      };
      const triggeredOnMiss = EffectCombatIntegration.checkTriggeredEffects(
        attackerEffects,
        'on_miss',
        missContext
      );
    }

    this.state = newState;

    return {
      success: true,
      actionType: 'ranged_attack',
      feedback,
      endTurn: false,
      newState,
    };
  }

  /**
   * 开始瞄准
   */
  startAiming(attackerId: string, targetId: string, targetPart: BodyPartId | null): CombatManager {
    const aimState = RangedCombat.startAiming(targetId, targetPart);
    const newAimStates = this.state.aimStates.set(attackerId, aimState);
    this.state = this.state.withAimStates(newAimStates);
    return this;
  }

  /**
   * 继续瞄准
   */
  continueAiming(attackerId: string): CombatManager {
    const currentAimState = this.state.aimStates.get(attackerId);
    if (!currentAimState) {
      return this;
    }

    const newAimState = RangedCombat.continueAiming(currentAimState);
    const newAimStates = this.state.aimStates.set(attackerId, newAimState);
    this.state = this.state.withAimStates(newAimStates);
    return this;
  }

  // ============ 武器装填 ============

  /**
   * 装填武器
   */
  reloadWeapon(request: {
    combatantId: string;
    ammoItem?: Item;
    amount?: number;
  }): {
    success: boolean;
    amountLoaded: number;
    reloadTime: number;
    updatedWeapon?: Item;
    remainingAmmo?: Item;
    feedback: CombatFeedbackEvent;
    newState: CombatState;
    error?: string;
  } {
    const combatant = this.state.combatants.get(request.combatantId);
    if (!combatant) {
      return this.createReloadErrorResult('参与者不存在');
    }

    const weapon = combatant.weapon;
    if (!weapon) {
      return this.createReloadErrorResult('没有装备武器');
    }

    if (!weapon.type.isGun?.()) {
      return this.createReloadErrorResult('当前武器不是枪械');
    }

    // 检查是否已装满
    const magazineSizeRaw = weapon.type.gun?.magazineSize || 0;
    const magazineSize = typeof magazineSizeRaw === 'number' ? magazineSizeRaw : 0;
    const currentAmmo = this.getItemCharges(weapon);

    if (currentAmmo >= magazineSize) {
      return this.createReloadErrorResult('武器已装满');
    }

    // 计算装填时间
    const skillLevel = 0; // TODO: 从技能系统获取
    const reloadTime = this.calculateReloadTime(weapon, skillLevel);

    // 如果没有提供弹药物品，尝试自动查找
    let ammoItem = request.ammoItem;
    if (!ammoItem) {
      // TODO: 从物品栏中查找兼容的弹药
      return this.createReloadErrorResult('没有可用的弹药');
    }

    // 检查弹药兼容性
    const ammoType = ammoItem.type.ammo?.type;
    if (!ammoType || !weapon.type.gun?.ammo?.includes(ammoType)) {
      return this.createReloadErrorResult('弹药不兼容');
    }

    // 计算装填数量
    const needed = magazineSize - currentAmmo;
    const available = this.getItemCharges(ammoItem);
    const amountToLoad = request.amount ? Math.min(request.amount, needed) : Math.min(available, needed);

    if (amountToLoad <= 0) {
      return this.createReloadErrorResult('弹药不足');
    }

    // 更新武器弹药（支持 Immutable.Record 和普通对象）
    let updatedWeapon: Item;
    if (typeof (weapon as any).set === 'function') {
      updatedWeapon = (weapon as any).set('charges', currentAmmo + amountToLoad);
    } else {
      updatedWeapon = { ...weapon, charges: currentAmmo + amountToLoad } as Item;
    }

    // 更新弹药物品（支持 Immutable.Record 和普通对象）
    let remainingAmmo: Item;
    if (typeof (ammoItem as any).set === 'function') {
      remainingAmmo = (ammoItem as any).set('charges', available - amountToLoad);
    } else {
      remainingAmmo = { ...ammoItem, charges: available - amountToLoad } as Item;
    }

    // 更新战斗参与者
    const updatedCombatant: Combatant = {
      ...combatant,
      weapon: updatedWeapon,
    };

    const newCombatants = this.state.combatants.set(request.combatantId, updatedCombatant);
    let newState = this.state.withCombatants(newCombatants);

    // 生成反馈
    const feedback = CombatFeedback.generateReloadFeedback(
      combatant.name,
      weapon.type.name,
      amountToLoad,
      magazineSize
    );

    newState.feedbackManager.addEvent(feedback);
    newState = newState.withFeedbackManager(newState.feedbackManager);

    // 记录事件
    const event: CombatEvent = {
      id: `combat_event_${Date.now()}`,
      type: 'reload',
      timestamp: Date.now(),
      actorId: request.combatantId,
      data: { weapon: weapon.type.name, amountLoaded: amountToLoad },
    };

    newState = newState.withEventLog(this.state.eventLog.push(event));
    this.state = newState;

    return {
      success: true,
      amountLoaded: amountToLoad,
      reloadTime,
      updatedWeapon,
      remainingAmmo,
      feedback,
      newState,
    };
  }

  /**
   * 安全地获取物品 charges 数值
   */
  private getItemCharges(item: Item): number {
    return typeof item.charges === 'number' ? item.charges : 0;
  }

  /**
   * 获取武器弹匣容量
   */
  private getMagazineSize(weapon: Item): number {
    const magazineSizeRaw = weapon.type.gun?.magazineSize || 0;
    return typeof magazineSizeRaw === 'number' ? magazineSizeRaw : 0;
  }

  /**
   * 将 EffectIntensity 转换为数字
   */
  private effectIntensityToNumber(intensity: EffectIntensity): number {
    switch (intensity) {
      case 'minor': return 1;
      case 'moderate': return 2;
      case 'severe': return 3;
      case 'deadly': return 4;
      default: return 2;
    }
  }

  /**
   * 计算装填时间
   */
  private calculateReloadTime(weapon: Item, skillLevel: number): number {
    if (!weapon.type.isGun?.() || !weapon.type.gun) {
      return 1000;
    }

    const baseTime = weapon.type.gun.reloadTime || weapon.type.gun.reload || 1000;

    // 技能每级减少 5% 装填时间，最多减少 50%
    const skillBonus = Math.min(0.5, skillLevel * 0.05);

    return Math.floor(baseTime * (1 - skillBonus));
  }

  /**
   * 检查武器是否需要装填
   */
  needsReload(combatantId: string): boolean {
    const combatant = this.state.combatants.get(combatantId);
    if (!combatant || !combatant.weapon) {
      return false;
    }

    const weapon = combatant.weapon;
    if (!weapon.type.isGun?.()) {
      return false;
    }

    const magazineSize = this.getMagazineSize(weapon);
    return this.getItemCharges(weapon) < magazineSize;
  }

  /**
   * 获取武器弹药状态
   */
  getWeaponAmmoStatus(combatantId: string): { current: number; max: number; percentage: number } | null {
    const combatant = this.state.combatants.get(combatantId);
    if (!combatant || !combatant.weapon) {
      return null;
    }

    const weapon = combatant.weapon;
    if (!weapon.type.isGun?.()) {
      return null;
    }

    const current = this.getItemCharges(weapon);
    const max = this.getMagazineSize(weapon);

    return {
      current,
      max,
      percentage: max > 0 ? (current / max) * 100 : 0,
    };
  }

  /**
   * 创建装填错误结果
   */
  private createReloadErrorResult(error: string): ReloadActionResult {
    const message: FeedbackMessage = {
      id: `reload_error_${Date.now()}`,
      text: `装填失败: ${error}`,
      type: FeedbackType.SYSTEM_MESSAGE,
      priority: 5,
      relatedEntities: {},
      timestamp: Date.now(),
    };

    return {
      success: false,
      amountLoaded: 0,
      reloadTime: 0,
      feedback: {
        messages: [message],
        visuals: [],
        sounds: [],
      },
      newState: this.state,
      error,
    };
  }

  // ============ 伤害应用 ============

  /**
   * 应用伤害到目标
   */
  private applyDamageToTarget(
    target: Combatant,
    damage: DamageInstance,
    targetPart: BodyPartId
  ): DamageApplicationResult {
    return DamageHandler.applyDamage(target, damage, targetPart);
  }

  /**
   * 更新战斗参与者状态（受伤后）
   */
  private updateCombatantAfterDamage(
    combatant: Combatant,
    damageResult: DamageApplicationResult
  ): Combatant {
    // 更新HP
    const newCurrentHP = combatant.currentHP.withMutations(map => {
      for (const [part, newHP] of damageResult.currentHP.entries()) {
        map.set(part, newHP);
      }
    });

    // 检查死亡
    const isAlive = !damageResult.killed && combatant.isAlive;
    const canAct = isAlive && combatant.canAct;

    // 计算被吸收的伤害量（用于降低装备耐久度）
    const absorbedDamage = damageResult.totalRawDamage - damageResult.totalActualDamage;

    // 更新装备耐久度
    const newArmor = this.processEquipmentDurability(combatant, damageResult, absorbedDamage);

    return {
      ...combatant,
      currentHP: newCurrentHP,
      isAlive,
      canAct,
      armor: newArmor,
    };
  }

  /**
   * 处理装备耐久度降低
   *
   * @param combatant 战斗参与者
   * @param damageResult 伤害结果
   * @param absorbedDamage 被吸收的伤害量
   * @returns 更新后的护甲映射
   */
  private processEquipmentDurability(
    combatant: Combatant,
    damageResult: DamageApplicationResult,
    absorbedDamage: number
  ): Map<BodyPartId, Item> {
    let newArmor = combatant.armor;

    // 如果没有吸收伤害，不需要处理
    if (absorbedDamage <= 0) {
      return newArmor;
    }

    // 遍历受影响的身体部位
    for (const [bodyPart, partResult] of damageResult.bodyPartResults.entries()) {
      const armorItem = newArmor.get(bodyPart);
      if (!armorItem) continue;

      // 计算该部位吸收的伤害
      const partAbsorbed = partResult.rawDamage - partResult.finalDamage;
      if (partAbsorbed <= 0) continue;

      // 装备耐久度降低（吸收的伤害量的一半作为损坏值）
      const damageToAdd = Math.ceil(partAbsorbed * 0.5);
      let updatedArmor: Item;

      if (typeof (armorItem as any).set === 'function') {
        // Immutable.Record 或类似结构
        updatedArmor = (armorItem as any).set('damage', Math.min(4000, armorItem.damage + damageToAdd));
      } else {
        // 普通对象
        updatedArmor = { ...armorItem, damage: Math.min(4000, armorItem.damage + damageToAdd) } as Item;
      }

      newArmor = newArmor.set(bodyPart, updatedArmor);

      // 检查装备是否损坏（damage >= 4000）
      if (updatedArmor.damage >= 4000) {
        // 移除损坏的装备
        newArmor = newArmor.remove(bodyPart);
      }
    }

    return newArmor;
  }

  // ============ 效果系统集成 ============

  /**
   * 应用战斗效果到参与者
   */
  applyEffectToCombatant(
    combatantId: string,
    effect: Effect
  ): CombatActionResult {
    const combatant = this.state.combatants.get(combatantId);
    if (!combatant) {
      return this.createErrorResult('effect', '目标不存在');
    }
    if (!combatant.isAlive) {
      return this.createErrorResult('effect', '目标已死亡');
    }

    // 获取效果管理器
    const effectManager = combatant.effectManager;
    if (!effectManager) {
      return this.createErrorResult('effect', '目标没有效果管理器');
    }

    // 应用效果
    const effectTypeId = effect.definition.id;
    const updatedEffectManager = effectManager.applyEffect(effectTypeId, Date.now());

    // 检查效果是否被免疫
    const appliedEffect = updatedEffectManager.getEffect(effectTypeId);
    if (!appliedEffect && effectManager.getEffect(effectTypeId)) {
      // 效果原本存在但被移除，可能是免疫
      return this.createErrorResult('effect', '目标免疫此效果');
    }

    // 更新战斗参与者的效果管理器
    const updatedCombatant: Combatant = {
      ...combatant,
      effectManager: updatedEffectManager,
    };

    const newCombatants = this.state.combatants.set(combatantId, updatedCombatant);
    let newState = this.state.withCombatants(newCombatants);

    // 生成反馈
    const intensity = this.effectIntensityToNumber(effect.intensity);
    const feedback = CombatFeedback.generateEffectAppliedFeedback(
      combatant.name,
      effect.definition.name,
      intensity
    );

    // 记录事件
    const event: CombatEvent = {
      id: `combat_effect_${Date.now()}`,
      type: 'effect',
      timestamp: Date.now(),
      actorId: combatantId,
      data: { effectId: effectTypeId, intensity },
    };

    newState = newState.withEventLog(this.state.eventLog.push(event));

    // 检查是否有致命效果
    const killMessage = updatedEffectManager.getKillMessage();
    if (killMessage) {
      // 创建击杀反馈
      const killFeedback: CombatFeedbackEvent = {
        messages: [{
          id: `kill_${combatantId}_${Date.now()}`,
          text: killMessage,
          type: FeedbackType.KILL_BLOW,
          priority: 10,
          relatedEntities: { target: combatantId },
          timestamp: Date.now(),
        }],
        visuals: [],
        sounds: [],
      };
      newState.feedbackManager.addEvent(killFeedback);

      // 标记为死亡
      const deadCombatant: Combatant = {
        ...updatedCombatant,
        isAlive: false,
        canAct: false,
      };
      newState = newState.withCombatants(
        newState.combatants.set(combatantId, deadCombatant)
      );
    }

    this.state = newState;

    return {
      success: true,
      actionType: 'apply_effect',
      feedback,
      endTurn: false,
      newState,
    };
  }

  /**
   * 处理战斗开始时效果
   */
  processCombatStartEffects(): CombatManager {
    let newState = this.state;

    // 遍历所有战斗参与者，处理战斗开始时触发的效果
    for (const [combatantId, combatant] of this.state.combatants.entries()) {
      if (!combatant.isAlive) continue;

      const effectManager = combatant.effectManager;
      if (!effectManager) continue;

      const effects = effectManager.getActiveEffects();
      if (effects.isEmpty()) continue;

      // 检查是否有战斗开始时触发的效果
      const combatContext: CombatEffectContext = {
        isAttacker: true, // 战斗开始时，所有人都是潜在的攻击者
        turnNumber: this.state.turnNumber,
      };

      const triggeredEffects = EffectCombatIntegration.checkTriggeredEffects(
        effects,
        'on_attack', // 使用 on_attack 作为战斗开始的触发
        combatContext
      );

      // 处理触发的效果
      for (const effect of triggeredEffects) {
        // 生成反馈
        const feedback: CombatFeedbackEvent = {
          messages: [{
            id: `effect_start_${combatantId}_${Date.now()}`,
            text: `${combatant.name} 在战斗开始时触发 ${effect.definition.name} 效果`,
            type: FeedbackType.EFFECT_APPLIED,
            priority: 5,
            relatedEntities: { source: combatantId },
            timestamp: Date.now(),
          }],
          visuals: [],
          sounds: [],
        };
        newState.feedbackManager.addEvent(feedback);
      }

      // 更新效果管理器（处理效果tick）
      const updatedEffectManager = effectManager.update(Date.now());
      const updatedCombatant: Combatant = {
        ...combatant,
        effectManager: updatedEffectManager,
      };
      newState = newState.withCombatants(
        newState.combatants.set(combatantId, updatedCombatant)
      );
    }

    newState = newState.withFeedbackManager(newState.feedbackManager);
    this.state = newState;

    return this;
  }

  /**
   * 处理战斗结束时效果
   */
  processCombatEndEffects(): CombatManager {
    let newState = this.state;

    // 遍历所有战斗参与者，处理战斗结束时触发的效果
    for (const [combatantId, combatant] of this.state.combatants.entries()) {
      if (!combatant.isAlive) continue;

      const effectManager = combatant.effectManager;
      if (!effectManager) continue;

      // 移除所有战斗相关的临时效果
      const effects = effectManager.getActiveEffects();
      if (effects.isEmpty()) continue;

      // 移除标记为战斗结束即失效的效果
      let updatedEffectManager = effectManager;
      for (const effect of effects) {
        // 假设某些效果在战斗结束时会被移除
        // 例如：肾上腺素、狂暴等
        const shouldRemoveOnCombatEnd = effect.definition.id.toString().includes('adrenaline') ||
                                       effect.definition.id.toString().includes('berserk');

        if (shouldRemoveOnCombatEnd) {
          updatedEffectManager = updatedEffectManager.removeEffect(effect.definition.id);

          // 生成反馈
          const feedback: CombatFeedbackEvent = {
            messages: [{
              id: `effect_end_${combatantId}_${Date.now()}`,
              text: `${combatant.name} 的 ${effect.definition.name} 效果消失了`,
              type: FeedbackType.EFFECT_EXPIRED,
              priority: 5,
              relatedEntities: { source: combatantId },
              timestamp: Date.now(),
            }],
            visuals: [],
            sounds: [],
          };
          newState.feedbackManager.addEvent(feedback);
        }
      }

      const updatedCombatant: Combatant = {
        ...combatant,
        effectManager: updatedEffectManager,
      };
      newState = newState.withCombatants(
        newState.combatants.set(combatantId, updatedCombatant)
      );
    }

    newState = newState.withFeedbackManager(newState.feedbackManager);
    this.state = newState;

    return this;
  }

  // ============ 辅助方法 ============

  /**
   * 创建错误结果
   */
  private createErrorResult(actionType: string, error: string): CombatActionResult {
    return {
      success: false,
      actionType,
      feedback: {
        messages: [],
        visuals: [],
        sounds: [],
      },
      endTurn: false,
      newState: this.state,
      error,
    };
  }

  /**
   * 获取当前行动者
   */
  getCurrentActor(): Combatant | undefined {
    return this.state.combatants.get(this.state.currentActorId);
  }

  /**
   * 获取参与者
   */
  getCombatant(id: string): Combatant | undefined {
    return this.state.combatants.get(id);
  }

  /**
   * 获取所有参与者
   */
  getAllCombatants(): Map<string, Combatant> {
    return this.state.combatants;
  }

  /**
   * 获取某个队伍的所有参与者
   */
  getCombatantsByTeam(teamId: string): Combatant[] {
    return this.state.combatants
      .filter(c => c.teamId === teamId)
      .valueSeq()
      .toArray();
  }

  /**
   * 获取存活的参与者
   */
  getAliveCombatants(): Combatant[] {
    return this.state.combatants
      .filter(c => c.isAlive)
      .valueSeq()
      .toArray();
  }

  /**
   * 获取最近的敌人
   */
  getNearestEnemy(combatantId: string): Combatant | undefined {
    const combatant = this.state.combatants.get(combatantId);
    if (!combatant) return undefined;

    const enemies = this.state.combatants
      .filter(c => c.isAlive && c.teamId !== combatant.teamId)
      .valueSeq()
      .toArray();

    // TODO: 根据位置计算距离
    return enemies[0];
  }

  /**
   * 格式化战斗状态
   */
  formatCombatStatus(): string {
    const lines = [
      `=== 战斗状态 ===`,
      `战斗ID: ${this.state.combatId}`,
      `回合: ${this.state.turnNumber}`,
      `当前行动: ${this.state.currentActorId}`,
      `战斗结束: ${this.state.isCombatOver ? '是' : '否'}`,
      this.state.winningTeam ? `获胜队伍: ${this.state.winningTeam}` : '',
      '',
      '=== 参与者 ===',
    ];

    for (const [id, combatant] of this.state.combatants.entries()) {
      lines.push(
        `${id}: ${combatant.name} (${combatant.teamId}) - ${combatant.isAlive ? '存活' : '死亡'}`
      );
    }

    return lines.filter(line => line !== '').join('\n');
  }
}

// ============ 工厂函数 ============

/**
 * 创建战斗管理器
 */
export function createCombatManager(
  combatId?: string,
  combatants: Combatant[] = []
): CombatManager {
  const combatantsMap = Map<string, Combatant>(
    combatants.map(c => [c.id, c])
  );
  const actionQueue = List<string>(combatants.map(c => c.id));

  const manager = new CombatManager({
    combatId,
    combatants: combatantsMap,
    actionQueue,
  });

  return manager;
}

/**
 * 创建 1v1 战斗
 */
export function create1v1Combat(
  combatant1: Combatant,
  combatant2: Combatant
): CombatManager {
  return createCombatManager(undefined, [combatant1, combatant2]);
}
