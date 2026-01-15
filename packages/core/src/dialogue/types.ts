/**
 * Dialogue (对话) 系统核心类型定义
 *
 * 提供对话系统使用的所有核心类型，包括 ID 类型、枚举和接口。
 * 对应 CDDA 的 talker.h 和 dialogue.h
 */

import type { Creature } from '../creature';
import type { SkillId } from '../skill';
import type { ItemTypeId } from '../item';

/** 对话主题 ID (Branded Type) */
export type TalkTopicId = string & { readonly __brand: unique symbol };

/** NPC 类 ID (Branded Type) */
export type NpcClassId = string & { readonly __brand: unique symbol };

/**
 * 技能检定类型
 * 对应 CDDA 的 trial_type
 */
export enum TrialType {
  /** 欺骗检定 */
  LIE = 'LIE',
  /** 说服检定 */
  PERSUADE = 'PERSUADE',
  /** 威吓检定 */
  INTIMIDATE = 'INTIMIDATE',
  /** 技能检定 */
  SKILL_CHECK = 'SKILL_CHECK',
  /** 条件检定 */
  CONDITION = 'CONDITION',
}

/**
 * 对话行动类型
 * 定义对话可以触发的行动
 */
export enum DialogueAction {
  /** 切换到新话题 */
  TOPIC = 'topic',
  /** 结束对话 */
  END = 'end',
  /** NPC 变为敌对 */
  HOSTILE = 'hostile',
  /** NPC 离开 */
  LEAVE = 'leave',
  /** 提供任务 */
  MISSION_OFFER = 'mission_offer',
  /** 开始交易 */
  TRADE = 'trade',
  /** 加入玩家队伍 */
  JOIN = 'join',
  /** 开始跟随 */
  FOLLOW = 'follow',
  /** 停止跟随 */
  STOP_FOLLOWING = 'stop_following',
}

/**
 * 技能检定结果
 */
export enum TrialResult {
  /** 成功 */
  SUCCESS = 'success',
  /** 失败 */
  FAILURE = 'failure',
  /** 部分成功 */
  PARTIAL = 'partial',
}

/**
 * Talker 类型
 * 标识对话参与者的类型
 */
export enum TalkerType {
  /** NPC */
  NPC = 'npc',
  /** 玩家 */
  PLAYER = 'player',
  /** 计算机 */
  COMPUTER = 'computer',
  /** 怪物 */
  MONSTER = 'monster',
}

/**
 * 对话变量上下文
 * 提供对话执行时需要的所有上下文信息
 */
export interface DialogueContext {
  /** 玩家角色 */
  readonly player: Creature;
  /** NPC 角色 */
  readonly npc: Creature;
  /** 当前任务 (可选) */
  readonly mission: unknown | null;
  /** 游戏时间 (可选) */
  readonly gameTime?: unknown;
}

/**
 * NPC 态度值范围
 * 0 = 敌对, 5 = 中立, 10 = 友好
 */
export type AttitudeValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * 对话话题类型
 */
export type TalkTopicType = 'chat' | 'shop' | 'mission' | 'misc';

/**
 * dynamic_line 替换标记
 */
export interface DynamicLineReplacements {
  /** 玩家名称 */
  readonly '<name>': string;
  /** NPC 名称 */
  readonly '<npc_name>': string;
  /** 第一人称名称 (NPC 用) */
  readonly '<my_name>': string;
  /** 玩家方位 */
  readonly '<your_dir>': string;
  /** NPC 方位 */
  readonly '<npc_dir>': string;
}

/**
 * 对话效果类型
 */
export interface DialogueEffect {
  /** 效果类型 */
  readonly type: string;
  /** 效果参数 */
  readonly params: Readonly<Record<string, unknown>>;
}

/**
 * 技能检定配置
 */
export interface TrialConfig {
  /** 检定类型 */
  readonly type: TrialType;
  /** 难度等级 (0-10) */
  readonly difficulty?: number;
  /** 相关技能 ID */
  readonly skill?: SkillId;
  /** 条件表达式 */
  readonly condition?: string;
  /** 成功时的对话 */
  readonly success?: string;
  /** 失败时的对话 */
  readonly failure?: string;
  /** 部分成功时的对话 */
  readonly partial?: string;
}

/**
 * 对话回应分支
 */
export interface ResponseBranch {
  /** 条件表达式 */
  readonly condition: string;
  /** 条件为真时的话题 */
  readonly trueTopic?: TalkTopicId;
  /** 条件为假时的话题 */
  readonly falseTopic?: TalkTopicId;
  /** 条件为真时的对话 */
  readonly trueDialogue?: string;
  /** 条件为假时的对话 */
  readonly falseDialogue?: string;
}

/**
 * 话题切换配置
 */
export interface TopicSwitch {
  /** 目标话题 ID */
  readonly topic: TalkTopicId;
  /** 切换原因 (显示给玩家) */
  readonly reason?: string;
}
