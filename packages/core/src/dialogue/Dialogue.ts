/**
 * Dialogue - 对话管理器
 *
 * 管理对话的核心类，处理对话流程、话题切换和回应选择。
 * 对应 CDDA 的 dialogue 类。
 */

import type { DialogueContext, TalkTopicId } from './types';
import { TalkTopic } from './TalkTopic';
import { TalkResponse, TalkResponseJson } from './TalkResponse';
import { TalkTrial } from './TalkTrial';
import { DialogueCondition } from './DialogueCondition';
import { DialogueEffects, EffectResult } from './DialogueEffects';
import { DialogueAction } from './types';

/**
 * 对话状态
 */
export interface DialogueState {
  /** 当前话题 ID */
  readonly currentTopic: TalkTopicId;
  /** NPC 文本 */
  readonly npcText: string;
  /** 可用的回应选项 */
  readonly responses: TalkResponse[];
  /** 对话是否已结束 */
  readonly ended: boolean;
}

/**
 * Dialogue - 对话管理器
 *
 * 管理对话流程的核心类。
 */
export class Dialogue {
  private readonly topics: Map<TalkTopicId, TalkTopic>;
  private readonly initialTopic: TalkTopicId;
  private readonly currentTopic: TalkTopicId;
  private readonly ended: boolean;

  constructor(
    topics: Map<TalkTopicId, TalkTopic>,
    initialTopic: TalkTopicId,
    currentTopic?: TalkTopicId,
    ended: boolean = false
  ) {
    this.topics = new Map(topics);
    this.initialTopic = initialTopic;
    this.currentTopic = currentTopic || initialTopic;
    this.ended = ended;

    Object.freeze(this);
  }

  /**
   * 创建对话
   */
  static create(
    topics: Map<TalkTopicId, TalkTopic>,
    initialTopic: TalkTopicId
  ): Dialogue {
    return new Dialogue(topics, initialTopic);
  }

  /**
   * 从话题数组创建对话
   */
  static fromTopics(topics: TalkTopic[], initialTopic: TalkTopicId): Dialogue {
    const topicMap = new Map(topics.map(t => [t.id, t]));
    return new Dialogue(topicMap, initialTopic);
  }

  /**
   * 获取当前对话内容
   */
  getCurrentState(ctx: DialogueContext): DialogueState {
    if (this.ended) {
      return {
        currentTopic: this.currentTopic,
        npcText: '',
        responses: [],
        ended: true,
      };
    }

    const topic = this.topics.get(this.currentTopic);
    if (!topic) {
      return {
        currentTopic: this.currentTopic,
        npcText: '...',
        responses: [],
        ended: false,
      };
    }

    return {
      currentTopic: this.currentTopic,
      npcText: topic.getGreeting(ctx),
      responses: topic.getAvailableResponses(ctx),
      ended: false,
    };
  }

  /**
   * 玩家选择回应
   * 返回新的 Dialogue 实例（不可变）
   */
  selectResponse(response: TalkResponse, ctx: DialogueContext): Dialogue {
    // 检查回应是否可用
    if (!response.isAvailable(ctx)) {
      return this;
    }

    // 处理检定
    let finalResponse = response;
    if (response.hasTrial()) {
      const trialResult = response.trial!.execute(ctx);
      finalResponse = this.handleTrialResult(response, trialResult);
    }

    // 执行效果
    if (finalResponse.effects.length > 0) {
      this.executeEffects(finalResponse.effects, ctx);
    }

    // 执行行动
    if (finalResponse.hasAction()) {
      this.executeAction(finalResponse.action!, ctx);
    }

    // 处理话题切换
    const targetTopic = finalResponse.getTargetTopic(ctx);
    if (targetTopic) {
      return this.withTopic(targetTopic);
    }

    // 如果没有话题切换，检查是否应该结束对话
    if (finalResponse.action === DialogueAction.END) {
      return this.withEnded(true);
    }

    return this;
  }

  /**
   * 处理检定结果
   */
  private handleTrialResult(
    response: TalkResponse,
    result: string
  ): TalkResponse {
    // 根据检定结果，可能需要修改响应
    // 简化版本：直接返回原响应
    // 完整版本可能需要根据成功/失败切换到不同话题
    return response;
  }

  /**
   * 执行对话效果
   */
  private executeEffects(effects: readonly string[], ctx: DialogueContext): void {
    for (const effect of effects) {
      DialogueEffects.execute(effect, ctx);
    }
  }

  /**
   * 执行对话行动
   */
  private executeAction(action: DialogueAction, ctx: DialogueContext): void {
    switch (action) {
      case DialogueAction.HOSTILE:
        DialogueEffects.execute('npc_hostile', ctx);
        break;

      case DialogueAction.LEAVE:
        DialogueEffects.execute('npc_leave', ctx);
        break;

      case DialogueAction.JOIN:
        DialogueEffects.execute('npc_join', ctx);
        break;

      case DialogueAction.FOLLOW:
        DialogueEffects.execute('npc_follow', ctx);
        break;

      case DialogueAction.STOP_FOLLOWING:
        DialogueEffects.execute('npc_stop_follow', ctx);
        break;

      case DialogueAction.TRADE:
        DialogueEffects.execute('start_trade', ctx);
        break;

      case DialogueAction.MISSION_OFFER:
        DialogueEffects.execute('mission_offer', ctx);
        break;

      default:
        break;
    }
  }

  /**
   * 切换到新话题
   */
  switchTopic(topicId: TalkTopicId): Dialogue {
    return this.withTopic(topicId);
  }

  /**
   * 结束对话
   */
  end(): Dialogue {
    return this.withEnded(true);
  }

  /**
   * 检查对话是否已结束
   */
  isEnded(): boolean {
    return this.ended;
  }

  /**
   * 获取当前话题 ID
   */
  getCurrentTopicId(): TalkTopicId {
    return this.currentTopic;
  }

  /**
   * 获取话题
   */
  getTopic(topicId: TalkTopicId): TalkTopic | undefined {
    return this.topics.get(topicId);
  }

  /**
   * 检查话题是否存在
   */
  hasTopic(topicId: TalkTopicId): boolean {
    return this.topics.has(topicId);
  }

  /**
   * 添加话题
   */
  addTopic(topic: TalkTopic): Dialogue {
    const newTopics = new Map(this.topics);
    newTopics.set(topic.id, topic);
    return new Dialogue(newTopics, this.initialTopic, this.currentTopic, this.ended);
  }

  /**
   * 创建切换到新话题的副本
   */
  private withTopic(topicId: TalkTopicId): Dialogue {
    // 如果切换到结束话题，标记为已结束
    const isEnd = topicId === 'TALK_DONE' || topicId === 'TALK_END';

    return new Dialogue(
      this.topics,
      this.initialTopic,
      topicId,
      isEnd
    );
  }

  /**
   * 创建结束状态的副本
   */
  private withEnded(ended: boolean): Dialogue {
    return new Dialogue(
      this.topics,
      this.initialTopic,
      this.currentTopic,
      ended
    );
  }

  /**
   * 重置对话到初始话题
   */
  reset(): Dialogue {
    return new Dialogue(
      this.topics,
      this.initialTopic,
      this.initialTopic,
      false
    );
  }

  /**
   * 转换为 JSON
   */
  toJson(): object {
    return {
      initialTopic: this.initialTopic,
      currentTopic: this.currentTopic,
      ended: this.ended,
      topics: Array.from(this.topics.entries()).map(([id, topic]) => ({
        id,
        topic: topic.toJson(),
      })),
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: any): Dialogue {
    const topics = new Map<TalkTopicId, TalkTopic>();

    if (json.topics && Array.isArray(json.topics)) {
      for (const item of json.topics) {
        const topic = TalkTopic.fromJson(item.topic);
        topics.set(item.id, topic);
      }
    }

    return new Dialogue(
      topics,
      json.initialTopic,
      json.currentTopic,
      json.ended || false
    );
  }
}

/**
 * 对话构建器
 * 用于构建复杂的对话流程
 */
export class DialogueBuilder {
  private topics: Map<TalkTopicId, TalkTopic> = new Map();
  private initialTopic: TalkTopicId = 'TALK_HELLO' as TalkTopicId;

  /**
   * 设置初始话题
   */
  withInitialTopic(topicId: TalkTopicId): this {
    this.initialTopic = topicId;
    return this;
  }

  /**
   * 添加话题
   */
  addTopic(topic: TalkTopic): this {
    this.topics.set(topic.id, topic);
    return this;
  }

  /**
   * 批量添加话题
   */
  addTopics(topics: TalkTopic[]): this {
    for (const topic of topics) {
      this.topics.set(topic.id, topic);
    }
    return this;
  }

  /**
   * 构建对话
   */
  build(): Dialogue {
    return new Dialogue(this.topics, this.initialTopic);
  }
}

/**
 * 创建对话构建器
 */
export function createDialogueBuilder(): DialogueBuilder {
  return new DialogueBuilder();
}
