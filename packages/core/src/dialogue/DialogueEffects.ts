/**
 * DialogueEffects - 对话效果处理
 *
 * 处理对话中触发各种游戏效果的系统。
 * 对应 CDDA 的对话效果系统。
 */

import type { DialogueContext, DialogueEffect } from './types';
import { DialogueAction } from './types';

/**
 * 效果执行结果
 */
export interface EffectResult {
  readonly success: boolean;
  readonly message?: string;
}

/**
 * DialogueEffects - 对话效果处理器
 *
 * 负责执行对话中定义的各种效果。
 */
export class DialogueEffects {
  /**
   * 执行效果字符串
   * @param effect - 效果字符串，如 "npc_attitude +1", "u_learn skill:speech"
   * @param ctx - 对话上下文
   * @returns 执行结果
   */
  static execute(effect: string, ctx: DialogueContext): EffectResult {
    if (!effect || effect.trim() === '') {
      return { success: true };
    }

    const trimmed = effect.trim();

    // 分析效果类型
    if (trimmed.startsWith('npc_attitude')) {
      return this.modNpcAttitude(trimmed, ctx);
    }

    if (trimmed.startsWith('u_learn')) {
      return this.learnSkill(trimmed, ctx);
    }

    if (trimmed.startsWith('u_teach')) {
      return this.teachSkill(trimmed, ctx);
    }

    if (trimmed.startsWith('u_add_item')) {
      return this.addItem(trimmed, ctx);
    }

    if (trimmed.startsWith('u_remove_item')) {
      return this.removeItem(trimmed, ctx);
    }

    if (trimmed.startsWith('npc_add_item')) {
      return this.addNpcItem(trimmed, ctx);
    }

    if (trimmed.startsWith('mission')) {
      return this.handleMission(trimmed, ctx);
    }

    if (trimmed === 'start_trade') {
      return this.startTrade(ctx);
    }

    if (trimmed === 'end_conversation') {
      return { success: true, message: '对话结束' };
    }

    if (trimmed === 'npc_hostile') {
      return this.makeHostile(ctx);
    }

    if (trimmed === 'npc_friendly') {
      return this.makeFriendly(ctx);
    }

    if (trimmed === 'npc_leave') {
      return this.makeLeave(ctx);
    }

    if (trimmed === 'npc_follow') {
      return this.makeFollow(ctx);
    }

    if (trimmed === 'npc_stop_follow') {
      return this.stopFollow(ctx);
    }

    if (trimmed === 'npc_join') {
      return this.makeJoin(ctx);
    }

    // 未知效果
    return { success: false, message: `未知效果: ${effect}` };
  }

  /**
   * 修改 NPC 态度
   * 格式: "npc_attitude +1", "npc_attitude -2", "npc_attitude = 5"
   */
  private static modNpcAttitude(effect: string, ctx: DialogueContext): EffectResult {
    const npc = ctx.npc as { modAttitude?: (delta: number) => void; setAttitude?: (value: number) => void };

    if (effect.includes('=')) {
      const value = parseInt(effect.split('=')[1].trim());
      if (!isNaN(value)) {
        npc.setAttitude?.(value);
        return { success: true, message: `NPC 态度设置为 ${value}` };
      }
    } else if (effect.includes('+')) {
      const delta = parseInt(effect.split('+')[1].trim());
      if (!isNaN(delta)) {
        npc.modAttitude?.(delta);
        return { success: true, message: `NPC 态度增加 ${delta}` };
      }
    } else if (effect.includes('-')) {
      const delta = parseInt(effect.split('-')[1].trim());
      if (!isNaN(delta)) {
        npc.modAttitude?.(-delta);
        return { success: true, message: `NPC 态度减少 ${delta}` };
      }
    }

    return { success: false, message: '无效的态度效果格式' };
  }

  /**
   * 学习技能
   * 格式: "u_learn skill:speech:2", "u_learn martial:karate"
   */
  private static learnSkill(effect: string, ctx: DialogueContext): EffectResult {
    // 解析: "u_learn skill:演讲:2"
    const match = effect.match(/u_learn\s+(\w+):(\w+)(?::(\d+))?/);
    if (match) {
      const [, type, name, levelStr] = match;
      const level = levelStr ? parseInt(levelStr) : 1;

      // 这里需要与技能系统集成
      // ctx.player.learnSkill(name, level);

      return { success: true, message: `学会了 ${name} (等级 ${level})` };
    }

    return { success: false, message: '无效的技能学习效果格式' };
  }

  /**
   * 教授技能
   * 格式: "u_teach skill:speech:2"
   */
  private static teachSkill(effect: string, ctx: DialogueContext): EffectResult {
    // 与 learn 类似，但会触发训练界面
    const match = effect.match(/u_teach\s+(\w+):(\w+)(?::(\d+))?/);
    if (match) {
      const [, type, name, levelStr] = match;
      const level = levelStr ? parseInt(levelStr) : 1;

      // 这里需要与技能训练系统集成

      return { success: true, message: `${name} 训练到等级 ${level}` };
    }

    return { success: false, message: '无效的技能教授效果格式' };
  }

  /**
   * 添加物品到玩家背包
   * 格式: "u_add_item bottle_water:3", "u_add_item pistol"
   */
  private static addItem(effect: string, ctx: DialogueContext): EffectResult {
    const match = effect.match(/u_add_item\s+(\w+)(?::(\d+))?/);
    if (match) {
      const [, itemId, countStr] = match;
      const count = countStr ? parseInt(countStr) : 1;

      // 这里需要与物品系统集成
      // ctx.player.inventory.add(itemId, count);

      return { success: true, message: `获得了 ${itemId} x${count}` };
    }

    return { success: false, message: '无效的添加物品效果格式' };
  }

  /**
   * 从玩家背包移除物品
   * 格式: "u_remove_item bottle_water:3"
   */
  private static removeItem(effect: string, ctx: DialogueContext): EffectResult {
    const match = effect.match(/u_remove_item\s+(\w+)(?::(\d+))?/);
    if (match) {
      const [, itemId, countStr] = match;
      const count = countStr ? parseInt(countStr) : 1;

      // 这里需要与物品系统集成
      // const removed = ctx.player.inventory.remove(itemId, count);

      return { success: true, message: `失去了 ${itemId} x${count}` };
    }

    return { success: false, message: '无效的移除物品效果格式' };
  }

  /**
   * 添加物品到 NPC
   * 格式: "npc_add_item weapon:shotgun"
   */
  private static addNpcItem(effect: string, ctx: DialogueContext): EffectResult {
    const match = effect.match(/npc_add_item\s+(\w+):(\w+)/);
    if (match) {
      const [, type, itemId] = match;

      // 这里需要与物品系统集成

      return { success: true, message: `NPC 获得了 ${itemId}` };
    }

    return { success: false, message: '无效的 NPC 添加物品效果格式' };
  }

  /**
   * 处理任务相关效果
   * 格式: "mission_offer", "mission_assign", "mission_complete"
   */
  private static handleMission(effect: string, ctx: DialogueContext): EffectResult {
    if (effect === 'mission_offer') {
      // 提供任务
      return { success: true, message: '任务已提供' };
    }

    if (effect === 'mission_assign') {
      // 分配任务
      return { success: true, message: '任务已分配' };
    }

    if (effect === 'mission_complete') {
      // 完成任务
      return { success: true, message: '任务已完成' };
    }

    if (effect === 'mission_fail') {
      // 任务失败
      return { success: true, message: '任务已失败' };
    }

    return { success: false, message: '无效的任务效果' };
  }

  /**
   * 开始交易
   */
  private static startTrade(ctx: DialogueContext): EffectResult {
    // 这里需要与交易系统集成
    return { success: true, message: '开始交易' };
  }

  /**
   * 使 NPC 变为敌对
   */
  private static makeHostile(ctx: DialogueContext): EffectResult {
    const npc = ctx.npc as { setAttitude?: (value: number) => void };
    npc.setAttitude?.(0);
    return { success: true, message: 'NPC 变为敌对' };
  }

  /**
   * 使 NPC 变为友好
   */
  private static makeFriendly(ctx: DialogueContext): EffectResult {
    const npc = ctx.npc as { setAttitude?: (value: number) => void };
    npc.setAttitude?.(10);
    return { success: true, message: 'NPC 变为友好' };
  }

  /**
   * NPC 离开
   */
  private static makeLeave(ctx: DialogueContext): EffectResult {
    // 这里需要与 AI 系统集成
    // 让 NPC 走开
    return { success: true, message: 'NPC 离开' };
  }

  /**
   * NPC 跟随玩家
   */
  private static makeFollow(ctx: DialogueContext): EffectResult {
    // 这里需要与 AI 系统集成
    return { success: true, message: 'NPC 开始跟随' };
  }

  /**
   * NPC 停止跟随
   */
  private static stopFollow(ctx: DialogueContext): EffectResult {
    // 这里需要与 AI 系统集成
    return { success: true, message: 'NPC 停止跟随' };
  }

  /**
   * NPC 加入队伍
   */
  private static makeJoin(ctx: DialogueContext): EffectResult {
    // 这里需要与队伍系统集成
    return { success: true, message: 'NPC 加入队伍' };
  }

  /**
   * 执行多个效果
   */
  static executeAll(effects: readonly string[], ctx: DialogueContext): EffectResult[] {
    return effects.map(effect => this.execute(effect, ctx));
  }

  /**
   * 解析效果字符串为结构化对象
   */
  static parse(effect: string): DialogueEffect | null {
    const trimmed = effect.trim();

    // npc_attitude +1
    const attitudeMatch = trimmed.match(/^npc_attitude\s*([+=-])\s*(\d+)$/);
    if (attitudeMatch) {
      return {
        type: 'mod_attitude',
        params: {
          operator: attitudeMatch[1],
          value: parseInt(attitudeMatch[2]),
        },
      };
    }

    // u_learn skill:name:level
    const learnMatch = trimmed.match(/^u_learn\s+(\w+):(\w+)(?::(\d+))?$/);
    if (learnMatch) {
      return {
        type: 'learn_skill',
        params: {
          category: learnMatch[1],
          skill: learnMatch[2],
          level: learnMatch[3] ? parseInt(learnMatch[3]) : 1,
        },
      };
    }

    return null;
  }
}

/**
 * 创建效果执行器实例
 */
export function createEffectExecutor(): (effect: string, ctx: DialogueContext) => EffectResult {
  return (effect: string, ctx: DialogueContext) => DialogueEffects.execute(effect, ctx);
}
