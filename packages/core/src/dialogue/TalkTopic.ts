/**
 * TalkTopic - 对话主题
 *
 * 表示对话中的一个主题，包含 NPC 的开场白和可用的玩家回应选项。
 * 对应 CDDA 的 talk_topic JSON 定义。
 */

import type { DialogueContext, TalkTopicId, TalkTopicType } from './types';
import { TalkResponse, TalkResponseJson } from './TalkResponse';

/**
 * TalkTopic JSON 格式
 */
export interface TalkTopicJson {
  readonly id: string;
  readonly type?: TalkTopicType;
  readonly dynamic_line?: string | string[];
  readonly responses?: TalkResponseJson[];
}

/**
 * TalkTopic - 对话主题
 *
 * 代表对话中的一个状态或话题，包含 NPC 会说的话和玩家可以选择的回应。
 */
export class TalkTopic {
  readonly id: TalkTopicId;
  readonly type: TalkTopicType;
  readonly dynamicLines: readonly string[];
  readonly responses: readonly TalkResponse[];

  private constructor(props: {
    id: TalkTopicId;
    type?: TalkTopicType;
    dynamicLines?: readonly string[];
    responses?: readonly TalkResponse[];
  }) {
    this.id = props.id;
    this.type = props.type || 'misc';
    this.dynamicLines = props.dynamicLines || [];
    this.responses = props.responses || [];

    Object.freeze(this);
  }

  /**
   * 创建 TalkTopic
   */
  static create(props: {
    id: string;
    type?: TalkTopicType;
    dynamicLines?: string | string[];
    responses?: TalkResponse[];
  }): TalkTopic {
    const lines = typeof props.dynamicLines === 'string'
      ? [props.dynamicLines]
      : props.dynamicLines || [];

    return new TalkTopic({
      id: props.id as TalkTopicId,
      type: props.type,
      dynamicLines: lines,
      responses: props.responses,
    });
  }

  /**
   * 从 JSON 创建 TalkTopic
   */
  static fromJson(json: TalkTopicJson): TalkTopic {
    const lines = typeof json.dynamic_line === 'string'
      ? [json.dynamic_line]
      : json.dynamic_line || [];

    const responses = (json.responses || []).map(TalkResponse.fromJson);

    return new TalkTopic({
      id: json.id as TalkTopicId,
      type: json.type,
      dynamicLines: lines,
      responses,
    });
  }

  /**
   * 获取 NPC 的开场白
   * 从 dynamic_lines 中随机选择一个，并处理 dynamic_line 标记
   */
  getGreeting(ctx: DialogueContext): string {
    if (this.dynamicLines.length === 0) {
      return '...';
    }

    const template = this.dynamicLines[Math.floor(Math.random() * this.dynamicLines.length)];
    return this.resolveTemplate(template, ctx);
  }

  /**
   * 解析 dynamic_line 模板
   */
  private resolveTemplate(template: string, ctx: DialogueContext): string {
    let result = template;

    // 替换玩家名称
    result = result.replace(/<name>/g, ctx.player.getName?.() ?? 'you');
    result = result.replace(/<your_name>/g, ctx.player.getName?.() ?? 'you');

    // 替换 NPC 名称
    result = result.replace(/<npc_name>/g, ctx.npc.getName?.() ?? 'they');
    result = result.replace(/<my_name>/g, ctx.npc.getName?.() ?? 'they');

    // 替换方位
    result = result.replace(/<your_dir>/g, this.getDirection(ctx, true));
    result = result.replace(/<npc_dir>/g, this.getDirection(ctx, false));

    // 替换地点
    result = result.replace(/<location>/g, this.getLocation(ctx));

    return result;
  }

  /**
   * 获取方向描述
   */
  private getDirection(ctx: DialogueContext, isPlayer: boolean): string {
    // 简化版本，实际需要计算相对方向
    return isPlayer ? '你的方向' : '他的方向';
  }

  /**
   * 获取地点描述
   */
  private getLocation(ctx: DialogueContext): string {
    // 简化版本，实际需要获取当前位置的地形信息
    return '这里';
  }

  /**
   * 获取所有可用的回应选项
   * 过滤掉不满足条件的回应
   */
  getAvailableResponses(ctx: DialogueContext): TalkResponse[] {
    return this.responses.filter(response => response.isAvailable(ctx));
  }

  /**
   * 获取指定回应
   */
  getResponse(index: number): TalkResponse | undefined {
    return this.responses[index];
  }

  /**
   * 获取回应数量
   */
  getResponseCount(): number {
    return this.responses.length;
  }

  /**
   * 检查是否有回应
   */
  hasResponses(): boolean {
    return this.responses.length > 0;
  }

  /**
   * 检查是否是特定类型的话题
   */
  isType(type: TalkTopicType): boolean {
    return this.type === type;
  }

  /**
   * 添加回应
   * 返回新的 TalkTopic 实例（不可变）
   */
  addResponse(response: TalkResponse): TalkTopic {
    return new TalkTopic({
      id: this.id,
      type: this.type,
      dynamicLines: this.dynamicLines,
      responses: [...this.responses, response],
    });
  }

  /**
   * 移除回应
   * 返回新的 TalkTopic 实例（不可变）
   */
  removeResponse(index: number): TalkTopic {
    const newResponses = this.responses.filter((_, i) => i !== index);
    return new TalkTopic({
      id: this.id,
      type: this.type,
      dynamicLines: this.dynamicLines,
      responses: newResponses,
    });
  }

  /**
   * 转换为 JSON
   */
  toJson(): TalkTopicJson {
    return {
      id: this.id,
      type: this.type,
      dynamic_line: this.dynamicLines.length === 1
        ? this.dynamicLines[0]
        : Array.from(this.dynamicLines),
      responses: this.responses.map(r => r.toJson()),
    };
  }
}

/**
 * 创建简单的问候话题
 */
export function createGreetingTopic(
  id: string,
  greetingLines: string[],
  responses: TalkResponse[]
): TalkTopic {
  return TalkTopic.create({
    id,
    type: 'chat',
    dynamicLines: greetingLines,
    responses,
  });
}

/**
 * 创建结束对话话题
 */
export function createEndTopic(id: string = 'TALK_DONE'): TalkTopic {
  return TalkTopic.create({
    id,
    type: 'misc',
    dynamicLines: ['再见。', '好的，再见。', '我们以后再聊。'],
    responses: [],
  });
}

/**
 * 创建商店话题
 */
export function createShopTopic(id: string = 'TALK_SHOP'): TalkTopic {
  return TalkTopic.create({
    id,
    type: 'shop',
    dynamicLines: ['你想看点什么？', '欢迎光临！'],
    responses: [], // 由调用者添加具体的交易选项
  });
}

/**
 * 预定义的常见话题 ID
 */
export const CommonTopics = {
  /** 初始问候 */
  HELLO: 'TALK_HELLO' as TalkTopicId,
  /** 结束对话 */
  DONE: 'TALK_DONE' as TalkTopicId,
  /** 陌生人 */
  STRANGER: 'TALK_STRANGER' as TalkTopicId,
  /** 陌生人中立 */
  STRANGER_NEUTRAL: 'TALK_STRANGER_NEUTRAL' as TalkTopicId,
  /** 陌生人友好 */
  STRANGER_FRIENDLY: 'TALK_STRANGER_FRIENDLY' as TalkTopicId,
  /** 友人守卫 */
  FRIEND_GUARD: 'TALK_FRIEND_GUARD' as TalkTopicId,
  /** 领袖 */
  LEADER: 'TALK_LEADER' as TalkTopicId,
  /** 商店 */
  SHOP: 'TALK_SHOP' as TalkTopicId,
  /** 任务 */
  MISSION: 'TALK_MISSION' as TalkTopicId,
  /** 加入 */
  JOIN: 'TALK_JOIN' as TalkTopicId,
  /** 跟随 */
  FOLLOW: 'TALK_FOLLOW' as TalkTopicId,
  /** 交易 */
  TRADE: 'TALK_TRADE' as TalkTopicId,
} as const;
