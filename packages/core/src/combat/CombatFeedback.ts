/**
 * CombatFeedback - 战斗反馈系统
 *
 * 提供战斗事件的通知、消息生成和视觉反馈
 * 用于向玩家展示战斗过程中的重要信息
 */

import { List } from 'immutable';
import type {
  BodyPartId,
  DamageTypeId,
} from './types';
import { createBodyPartId } from './types';
import type { MeleeAttackResult } from './MeleeCombat';
import type { RangedAttackResult } from './RangedCombat';

// ============================================================================
// 反馈类型
// ============================================================================

/**
 * 反馈类型
 */
export enum FeedbackType {
  // 攻击相关
  ATTACK_HIT = 'ATTACK_HIT',
  ATTACK_CRITICAL = 'ATTACK_CRITICAL',
  ATTACK_MISS = 'ATTACK_MISS',
  ATTACK_BLOCKED = 'ATTACK_BLOCKED',
  ATTACK_DODGED = 'ATTACK_DODGED',

  // 伤害相关
  DAMAGE_DEALT = 'DAMAGE_DEALT',
  DAMAGE_TAKEN = 'DAMAGE_TAKEN',
  DAMAGE_BLOCKED = 'DAMAGE_BLOCKED',
  KILL_BLOW = 'KILL_BLOW',

  // 状态相关
  EFFECT_APPLIED = 'EFFECT_APPLIED',
  EFFECT_EXPIRED = 'EFFECT_EXPIRED',
  STATUS_CHANGE = 'STATUS_CHANGE',

  // 武器相关
  WEAPON_JAMMED = 'WEAPON_JAMMED',
  WEAPON_EMPTY = 'WEAPON_EMPTY',
  RELOAD_STARTED = 'RELOAD_STARTED',
  RELOAD_COMPLETE = 'RELOAD_COMPLETE',

  // 消息
  COMBAT_MESSAGE = 'COMBAT_MESSAGE',
  SYSTEM_MESSAGE = 'SYSTEM_MESSAGE',
}

// ============================================================================
// 反馈消息
// ============================================================================

/**
 * 反馈消息
 */
export interface FeedbackMessage {
  /** 消息ID */
  id: string;
  /** 消息类型 */
  type: FeedbackType;
  /** 消息文本 */
  text: string;
  /** 优先级 (0-10, 越高越重要) */
  priority: number;
  /** 相关实体 */
  relatedEntities: {
    source?: string;
    target?: string;
    weapon?: string;
  };
  /** 额外数据 */
  data?: Record<string, any>;
  /** 时间戳 */
  timestamp: number;
}

// ============================================================================
// 视觉反馈
// ============================================================================

/**
 * 视觉反馈效果
 */
export enum VisualEffect {
  // 命中效果
  HIT_SPARK = 'HIT_SPARK',
  HIT_BLOOD = 'HIT_BLOOD',
  HIT_SPARKS = 'HIT_SPARKS',

  // 武器效果
  MUZZLE_FLASH = 'MUZZLE_FLASH',
  SHELL_EJECTION = 'SHELL_EJECTION',
  BULLET_TRAIL = 'BULLET_TRAIL',

  // 状态效果
  CRITICAL_HIT = 'CRITICAL_HIT',
  BLOCK_EFFECT = 'BLOCK_EFFECT',
  DODGE_EFFECT = 'DODGE_EFFECT',

  // 伤害效果
  DAMAGE_NUMBER = 'DAMAGE_NUMBER',
  DAMAGE_TEXT = 'DAMAGE_TEXT',
}

/**
 * 视觉反馈数据
 */
export interface VisualFeedback {
  /** 效果类型 */
  effect: VisualEffect;
  /** 位置 */
  position: { x: number; y: number; z: number };
  /** 持续时间（毫秒） */
  duration: number;
  /** 效果参数 */
  parameters?: Record<string, any>;
  /** 颜色 */
  color?: string;
}

/**
 * 音效反馈
 */
export enum SoundEffect {
  // 近战
  MELEE_HIT = 'MELEE_HIT',
  MELEE_MISS = 'MELEE_MISS',
  MELEE_CRITICAL = 'MELEE_CRITICAL',

  // 远程
  GUNSHOT = 'GUNSHOT',
  GUNSHOT_SILENCED = 'GUNSHOT_SILENCED',
  BOLT_ACTION = 'BOLT_ACTION',
  RELOAD = 'RELOAD',
  EMPTY_CLICK = 'EMPTY_CLICK',

  // 伤害
  IMPACT_FLESH = 'IMPACT_FLESH',
  IMPACT_METAL = 'IMPACT_METAL',
  IMPACT_STONE = 'IMPACT_STONE',
}

/**
 * 音效反馈数据
 */
export interface SoundFeedback {
  /** 音效类型 */
  sound: SoundEffect;
  /** 音量 (0-1) */
  volume: number;
  /** 音源位置 */
  position?: { x: number; y: number; z: number };
  /** 音调变化 */
  pitch?: number;
}

// ============================================================================
// 完整反馈事件
// ============================================================================

/**
 * 战斗反馈事件
 */
export interface CombatFeedbackEvent {
  /** 消息反馈 */
  messages: FeedbackMessage[];
  /** 视觉反馈 */
  visuals: VisualFeedback[];
  /** 音效反馈 */
  sounds: SoundFeedback[];
}

// ============================================================================
// CombatFeedback 类
// ============================================================================

/**
 * CombatFeedback - 战斗反馈类
 *
 * 生成战斗过程中的各种反馈
 */
export class CombatFeedback {
  private static nextId = 0;

  // ============ 消息生成 ============

  /**
   * 生成近战攻击反馈
   */
  static generateMeleeAttackFeedback(result: MeleeAttackResult): CombatFeedbackEvent {
    const messages: FeedbackMessage[] = [];
    const visuals: VisualFeedback[] = [];
    const sounds: SoundFeedback[] = [];

    const { attackerId, targetId, weaponUsed, attackResult } = result;

    // 命中反馈
    if (result.attackResult.hitResult !== 'MISS' as any) {
      if (attackResult.critical) {
        messages.push(CombatFeedback.createMessage(
          FeedbackType.ATTACK_CRITICAL,
          `${attackerId} 对 ${targetId} 暴击！`,
          8,
          { source: attackerId, target: targetId, weapon: weaponUsed }
        ));
        visuals.push({
          effect: VisualEffect.CRITICAL_HIT,
          position: { x: 0, y: 0, z: 0 },
          duration: 500,
          color: '#ff0000',
        });
        sounds.push({
          sound: SoundEffect.MELEE_CRITICAL,
          volume: 1.0,
        });
      } else {
        messages.push(CombatFeedback.createMessage(
          FeedbackType.ATTACK_HIT,
          `${attackerId} 击中了 ${targetId}`,
          4,
          { source: attackerId, target: targetId, weapon: weaponUsed }
        ));
        sounds.push({
          sound: SoundEffect.MELEE_HIT,
          volume: 0.8,
        });
      }

      // 伤害反馈
      if (attackResult.actualDamage > 0) {
        const bodyPart = attackResult.bodyPart || '未知部位';
        messages.push(CombatFeedback.createMessage(
          FeedbackType.DAMAGE_DEALT,
          `${bodyPart} 受到 ${attackResult.actualDamage} 点伤害`,
          5,
          { target: targetId },
          { damage: attackResult.actualDamage, bodyPart }
        ));
        visuals.push({
          effect: VisualEffect.DAMAGE_NUMBER,
          position: { x: 0, y: 0, z: 0 },
          duration: 1000,
          parameters: { value: attackResult.actualDamage },
          color: '#ff4444',
        });
        visuals.push({
          effect: VisualEffect.HIT_BLOOD,
          position: { x: 0, y: 0, z: 0 },
          duration: 300,
        });
      }
    } else {
      messages.push(CombatFeedback.createMessage(
        FeedbackType.ATTACK_MISS,
        `${attackerId} 未命中 ${targetId}`,
        2,
        { source: attackerId, target: targetId }
      ));
      sounds.push({
        sound: SoundEffect.MELEE_MISS,
        volume: 0.5,
      });
    }

    // 格挡反馈
    if (result.blockResult?.blocked) {
      messages.push(CombatFeedback.createMessage(
        FeedbackType.ATTACK_BLOCKED,
        `${targetId} 用 ${result.blockResult.blockingWith} 格挡了攻击！`,
        6,
        { source: attackerId, target: targetId }
      ));
      visuals.push({
        effect: VisualEffect.BLOCK_EFFECT,
        position: { x: 0, y: 0, z: 0 },
        duration: 200,
        color: '#ffff00',
      });
    }

    // 闪避反馈
    if (result.dodgeResult?.dodged) {
      messages.push(CombatFeedback.createMessage(
        FeedbackType.ATTACK_DODGED,
        `${targetId} 向${result.dodgeResult.direction === 'down' ? '后' : '侧'}闪避！`,
        6,
        { source: attackerId, target: targetId }
      ));
      visuals.push({
        effect: VisualEffect.DODGE_EFFECT,
        position: { x: 0, y: 0, z: 0 },
        duration: 300,
        color: '#00ffff',
      });
    }

    return { messages, visuals, sounds };
  }

  /**
   * 生成远程攻击反馈
   */
  static generateRangedAttackFeedback(result: RangedAttackResult): CombatFeedbackEvent {
    const messages: FeedbackMessage[] = [];
    const visuals: VisualFeedback[] = [];
    const sounds: SoundFeedback[] = [];

    const { attackerId, targetId, weaponUsed, shotsFired, hits, totalDamage } = result;

    // 射击音效
    sounds.push({
      sound: SoundEffect.GUNSHOT,
      volume: 0.9,
    });

    // 枪口闪光
    visuals.push({
      effect: VisualEffect.MUZZLE_FLASH,
      position: { x: 0, y: 0, z: 0 },
      duration: 100,
      color: '#ffaa00',
    });

    // 总结消息
    if (shotsFired === 1) {
      if (hits > 0) {
        messages.push(CombatFeedback.createMessage(
          FeedbackType.ATTACK_HIT,
          `${attackerId} 用 ${weaponUsed} 击中 ${targetId}`,
          5,
          { source: attackerId, target: targetId, weapon: weaponUsed }
        ));

        if (totalDamage > 0) {
          messages.push(CombatFeedback.createMessage(
            FeedbackType.DAMAGE_DEALT,
            `${targetId} 受到 ${totalDamage} 点伤害`,
            5,
            { target: targetId },
            { damage: totalDamage }
          ));
        }
      } else {
        messages.push(CombatFeedback.createMessage(
          FeedbackType.ATTACK_MISS,
          `${attackerId} 未命中 ${targetId}`,
          2,
          { source: attackerId, target: targetId }
        ));
      }
    } else {
      messages.push(CombatFeedback.createMessage(
        FeedbackType.COMBAT_MESSAGE,
        `${attackerId} 用 ${weaponUsed} 发射 ${shotsFired} 发，命中 ${hits} 发`,
        4,
        { source: attackerId, weapon: weaponUsed }
      ));

      if (totalDamage > 0) {
        messages.push(CombatFeedback.createMessage(
          FeedbackType.DAMAGE_DEALT,
          `总计 ${totalDamage} 点伤害`,
          5,
          { target: targetId },
          { damage: totalDamage }
        ));
      }
    }

    return { messages, visuals, sounds };
  }

  // ============ 特殊反馈 ============

  /**
   * 生成击杀反馈
   */
  static generateKillFeedback(
    attackerId: string,
    targetId: string,
    weaponUsed?: string
  ): CombatFeedbackEvent {
    const messages: FeedbackMessage[] = [];
    const visuals: VisualFeedback[] = [];
    const sounds: SoundFeedback[] = [];

    const weaponText = weaponUsed ? ` 用 ${weaponUsed}` : '';
    messages.push(CombatFeedback.createMessage(
      FeedbackType.KILL_BLOW,
      `${attackerId}${weaponText} 击杀了 ${targetId}！`,
      10,
      { source: attackerId, target: targetId, weapon: weaponUsed }
    ));

    visuals.push({
      effect: VisualEffect.CRITICAL_HIT,
      position: { x: 0, y: 0, z: 0 },
      duration: 800,
      color: '#ff0000',
    });

    return { messages, visuals, sounds };
  }

  /**
   * 生成武器故障反馈
   */
  static generateWeaponJamFeedback(weaponName: string): CombatFeedbackEvent {
    const messages: FeedbackMessage[] = [];
    const sounds: SoundFeedback[] = [];

    messages.push(CombatFeedback.createMessage(
      FeedbackType.WEAPON_JAMMED,
      `${weaponName} 卡壳了！`,
      7,
      { weapon: weaponName }
    ));

    sounds.push({
      sound: SoundEffect.EMPTY_CLICK,
      volume: 0.7,
    });

    return { messages, visuals: [], sounds };
  }

  /**
   * 生成弹药耗尽反馈
   */
  static generateWeaponEmptyFeedback(weaponName: string): CombatFeedbackEvent {
    const messages: FeedbackMessage[] = [];
    const sounds: SoundFeedback[] = [];

    messages.push(CombatFeedback.createMessage(
      FeedbackType.WEAPON_EMPTY,
      `${weaponName} 弹药耗尽！`,
      6,
      { weapon: weaponName }
    ));

    sounds.push({
      sound: SoundEffect.EMPTY_CLICK,
      volume: 0.7,
    });

    return { messages, visuals: [], sounds };
  }

  /**
   * 生成效果应用反馈
   */
  static generateEffectAppliedFeedback(
    targetId: string,
    effectName: string,
    intensity: number
  ): CombatFeedbackEvent {
    const messages: FeedbackMessage[] = [];

    messages.push(CombatFeedback.createMessage(
      FeedbackType.EFFECT_APPLIED,
      `${targetId} 获得了 ${effectName} (${intensity})`,
      4,
      { target: targetId },
      { effect: effectName, intensity }
    ));

    return { messages, visuals: [], sounds: [] };
  }

  // ============ 辅助方法 ============

  /**
   * 创建反馈消息
   */
  private static createMessage(
    type: FeedbackType,
    text: string,
    priority: number,
    relatedEntities: { source?: string; target?: string; weapon?: string },
    data?: Record<string, any>
  ): FeedbackMessage {
    return {
      id: `feedback_${CombatFeedback.nextId++}`,
      type,
      text,
      priority,
      relatedEntities,
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * 格式化反馈事件为文本
   */
  static formatFeedbackEvent(event: CombatFeedbackEvent): string {
    const lines: string[] = [];

    if (event.messages.length > 0) {
      lines.push('=== 消息 ===');
      for (const msg of event.messages) {
        lines.push(`  [${FeedbackType[msg.type]}] ${msg.text}`);
      }
    }

    if (event.visuals.length > 0) {
      lines.push('=== 视觉效果 ===');
      for (const visual of event.visuals) {
        lines.push(`  ${VisualEffect[visual.effect]} - ${visual.duration}ms`);
      }
    }

    if (event.sounds.length > 0) {
      lines.push('=== 音效 ===');
      for (const sound of event.sounds) {
        lines.push(`  ${SoundEffect[sound.sound]} - 音量: ${sound.volume}`);
      }
    }

    return lines.join('\n');
  }
}

// ============================================================================
// 反馈管理器
// ============================================================================

/**
 * 反馈管理器
 *
 * 管理战斗反馈的队列和分发
 */
export class FeedbackManager {
  private messageQueue: FeedbackMessage[] = [];
  private readonly maxMessages: number;

  constructor(maxMessages: number = 100) {
    this.maxMessages = maxMessages;
  }

  /**
   * 添加反馈事件
   */
  addEvent(event: CombatFeedbackEvent): void {
    for (const message of event.messages) {
      this.messageQueue.push(message);
    }

    // 保持队列大小
    if (this.messageQueue.length > this.maxMessages) {
      this.messageQueue = this.messageQueue.slice(-this.maxMessages);
    }
  }

  /**
   * 获取所有消息
   */
  getMessages(): FeedbackMessage[] {
    return [...this.messageQueue];
  }

  /**
   * 获取高优先级消息
   */
  getPriorityMessages(minPriority: number = 5): FeedbackMessage[] {
    return this.messageQueue.filter(m => m.priority >= minPriority);
  }

  /**
   * 清除消息
   */
  clear(): void {
    this.messageQueue = [];
  }

  /**
   * 获取最近的N条消息
   */
  getRecentMessages(count: number): FeedbackMessage[] {
    return this.messageQueue.slice(-count);
  }
}
