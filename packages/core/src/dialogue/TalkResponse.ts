/**
 * TalkResponse - 对话回应
 *
 * 表示对话中玩家的回应选项，包含文本、条件、检定和效果等。
 */

import type { DialogueContext, ResponseBranch, TopicSwitch, DialogueAction, TalkTopicId } from './types';
import { DialogueAction as DialogueActionEnum } from './types';
import { TalkTrial, TalkTrialJson } from './TalkTrial';
import { DialogueCondition } from './DialogueCondition';

/**
 * TalkResponse JSON 格式
 */
export interface TalkResponseJson {
  readonly text?: string | string[];
  readonly truefalse?: {
    readonly condition: string;
    readonly true_topic?: string;
    readonly false_topic?: string;
    readonly true_dialogue?: string;
    readonly false_dialogue?: string;
  };
  readonly switch?: {
    readonly topic: string;
    readonly reason?: string;
  };
  readonly trial?: TalkTrialJson;
  readonly effect?: string[];
  readonly action?: DialogueAction | string;
}

/**
 * TalkResponse - 对话回应
 *
 * 代表对话中一个可选的玩家回应。
 */
export class TalkResponse {
  readonly text: readonly string[];
  readonly condition?: string;
  readonly trueTopic?: TalkTopicId;
  readonly falseTopic?: TalkTopicId;
  readonly trueText?: string;
  readonly falseText?: string;
  readonly switchTopic?: TalkTopicId;
  readonly switchReason?: string;
  readonly trial?: TalkTrial;
  readonly effects: readonly string[];
  readonly action?: DialogueAction;

  private constructor(props: {
    text?: readonly string[];
    condition?: string;
    trueTopic?: TalkTopicId;
    falseTopic?: TalkTopicId;
    trueText?: string;
    falseText?: string;
    switchTopic?: TalkTopicId;
    switchReason?: string;
    trial?: TalkTrial;
    effects?: readonly string[];
    action?: DialogueAction;
  }) {
    this.text = props.text || [];
    this.condition = props.condition;
    this.trueTopic = props.trueTopic;
    this.falseTopic = props.falseTopic;
    this.trueText = props.trueText;
    this.falseText = props.falseText;
    this.switchTopic = props.switchTopic;
    this.switchReason = props.switchReason;
    this.trial = props.trial;
    this.effects = props.effects || [];
    this.action = props.action;

    Object.freeze(this);
  }

  /**
   * 创建 TalkResponse
   */
  static create(props: {
    text?: string | string[];
    condition?: string;
    switchTopic?: TalkTopicId;
    switchReason?: string;
    trial?: TalkTrial;
    effects?: string[];
    action?: DialogueAction;
  }): TalkResponse {
    const texts = typeof props.text === 'string'
      ? [props.text]
      : props.text || [];

    return new TalkResponse({
      text: texts,
      condition: props.condition,
      switchTopic: props.switchTopic,
      switchReason: props.switchReason,
      trial: props.trial,
      effects: props.effects,
      action: props.action,
    });
  }

  /**
   * 从 JSON 创建 TalkResponse
   */
  static fromJson(json: TalkResponseJson): TalkResponse {
    // 处理 text 可以是字符串或数组
    const texts = typeof json.text === 'string'
      ? [json.text]
      : json.text || [];

    // 处理 truefalse 条件分支
    let trueTopic: TalkTopicId | undefined;
    let falseTopic: TalkTopicId | undefined;
    let condition: string | undefined;
    if (json.truefalse) {
      condition = json.truefalse.condition;
      trueTopic = json.truefalse.true_topic as TalkTopicId;
      falseTopic = json.truefalse.false_topic as TalkTopicId;
    }

    // 处理 switch
    let switchTopic: TalkTopicId | undefined;
    let switchReason: string | undefined;
    if (json.switch) {
      switchTopic = json.switch.topic as TalkTopicId;
      switchReason = json.switch.reason;
    }

    // 处理 action 字符串转换为枚举
    let action: DialogueAction | undefined;
    if (json.action) {
      const actionStr = json.action.toUpperCase();
      if (Object.values(DialogueActionEnum).includes(actionStr as DialogueAction)) {
        action = actionStr as DialogueAction;
      }
    }

    return new TalkResponse({
      text: texts,
      condition,
      trueTopic,
      falseTopic,
      trueText: json.truefalse?.true_dialogue,
      falseText: json.truefalse?.false_dialogue,
      switchTopic,
      switchReason,
      trial: json.trial ? TalkTrial.fromJson(json.trial) : undefined,
      effects: json.effect || [],
      action,
    });
  }

  /**
   * 获取显示文本（处理 dynamic_line）
   */
  getDisplayText(ctx: DialogueContext): string {
    if (this.text.length === 0) return '';

    // 从文本数组中随机选择
    const template = this.text[Math.floor(Math.random() * this.text.length)];
    return this.resolveDynamicLine(template, ctx);
  }

  /**
   * 解析 dynamic_line 标记
   */
  private resolveDynamicLine(template: string, ctx: DialogueContext): string {
    let result = template;

    // 替换常见的 dynamic_line 标记
    result = result.replace(/<name>/g, ctx.player.getName?.() ?? 'you');
    result = result.replace(/<npc_name>/g, ctx.npc.getName?.() ?? 'they');
    result = result.replace(/<my_name>/g, ctx.npc.getName?.() ?? 'they');
    result = result.replace(/<your_dir>/g, 'your direction');
    result = result.replace(/<npc_dir>/g, 'their direction');

    return result;
  }

  /**
   * 检查此回应是否可用
   */
  isAvailable(ctx: DialogueContext): boolean {
    if (!this.condition) return true;

    return DialogueCondition.evaluate(this.condition, ctx);
  }

  /**
   * 检查是否有检定
   */
  hasTrial(): boolean {
    return this.trial !== undefined;
  }

  /**
   * 检查是否有话题切换
   */
  hasSwitch(): boolean {
    return this.switchTopic !== undefined;
  }

  /**
   * 检查是否有条件分支
   */
  hasBranch(): boolean {
    return this.trueTopic !== undefined || this.falseTopic !== undefined;
  }

  /**
   * 检查是否有行动
   */
  hasAction(): boolean {
    return this.action !== undefined;
  }

  /**
   * 获取目标话题 ID
   * 如果有条件分支，根据条件返回相应的话题
   */
  getTargetTopic(ctx: DialogueContext): TalkTopicId | undefined {
    if (this.switchTopic) {
      return this.switchTopic;
    }

    if (this.hasBranch()) {
      // 这里需要评估条件
      // const conditionMet = DialogueCondition.evaluate(this.condition || '', ctx);
      // return conditionMet ? this.trueTopic : this.falseTopic;
      return this.trueTopic;
    }

    return undefined;
  }

  /**
   * 转换为 JSON
   */
  toJson(): TalkResponseJson {
    const json: TalkResponseJson = {
      text: this.text.length === 1 ? this.text[0] : Array.from(this.text),
    };

    if (this.trueTopic || this.falseTopic) {
      json.truefalse = {
        condition: this.condition || '',
        true_topic: this.trueTopic,
        false_topic: this.falseTopic,
        true_dialogue: this.trueText,
        false_dialogue: this.falseText,
      };
    }

    if (this.switchTopic) {
      json.switch = {
        topic: this.switchTopic,
        reason: this.switchReason,
      };
    }

    if (this.trial) {
      json.trial = this.trial.toJson();
    }

    if (this.effects.length > 0) {
      json.effect = Array.from(this.effects);
    }

    if (this.action) {
      json.action = this.action;
    }

    return json;
  }
}

/**
 * 创建简单的文本回应
 */
export function createTextResponse(text: string, switchTopic?: TalkTopicId): TalkResponse {
  return TalkResponse.create({
    text,
    switchTopic,
  });
}

/**
 * 创建带检定的回应
 */
export function createTrialResponse(
  text: string,
  trial: TalkTrial,
  successTopic: TalkTopicId,
  failureTopic?: TalkTopicId
): TalkResponse {
  // 注意：这个简化版本不直接支持条件分支
  // 完整版本需要更复杂的逻辑
  return TalkResponse.create({
    text,
    trial,
    switchTopic: successTopic,
  });
}

/**
 * 创建带行动的回应
 */
export function createActionResponse(
  text: string,
  action: DialogueAction,
  switchTopic?: TalkTopicId
): TalkResponse {
  return TalkResponse.create({
    text,
    action,
    switchTopic,
  });
}
