/**
 * NpcClass - NPC 类定义
 *
 * 定义 NPC 的类型和行为模式。
 * 对应 CDDA 的 npc_class JSON 定义。
 */

import type { NpcClassId, TalkTopicId } from './types';

/**
 * NpcClass JSON 格式
 */
export interface NpcClassJson {
  readonly type: 'npc_class';
  readonly id: string;
  readonly name: string;
  readonly job_title?: string;
  readonly chat?: string[];
  readonly missions?: string[];
  readonly factions?: string[];
  readonly base_faction?: string;
  readonly shopkeeper?: boolean;
  readonly talk_topics?: string[];
  readonly inherits?: string;
  readonly delete?: Partial<NpcClassJson>;
  readonly extend?: Partial<NpcClassJson>;
}

/**
 * NpcClass - NPC 类定义
 *
 * 定义 NPC 的职业、行为和对话选项。
 */
export class NpcClass {
  readonly id: NpcClassId;
  readonly name: string;
  readonly jobTitle: string;
  readonly chat: readonly string[];
  readonly missions: readonly string[];
  readonly factions: readonly string[];
  readonly baseFaction: string;
  readonly shopkeeper: boolean;
  readonly talkTopics: readonly TalkTopicId[];

  private constructor(props: {
    id: NpcClassId;
    name: string;
    jobTitle?: string;
    chat?: readonly string[];
    missions?: readonly string[];
    factions?: readonly string[];
    baseFaction?: string;
    shopkeeper?: boolean;
    talkTopics?: readonly TalkTopicId[];
  }) {
    this.id = props.id;
    this.name = props.name;
    this.jobTitle = props.jobTitle || '';
    this.chat = props.chat || [];
    this.missions = props.missions || [];
    this.factions = props.factions || [];
    this.baseFaction = props.baseFaction || 'no_faction';
    this.shopkeeper = props.shopkeeper || false;
    this.talkTopics = props.talkTopics || [];

    Object.freeze(this);
  }

  /**
   * 创建 NpcClass
   */
  static create(props: {
    id: string;
    name: string;
    jobTitle?: string;
    chat?: string[];
    missions?: string[];
    factions?: string[];
    baseFaction?: string;
    shopkeeper?: boolean;
    talkTopics?: string[];
  }): NpcClass {
    return new NpcClass({
      id: props.id as NpcClassId,
      name: props.name,
      jobTitle: props.jobTitle,
      chat: props.chat,
      missions: props.missions,
      factions: props.factions,
      baseFaction: props.baseFaction,
      shopkeeper: props.shopkeeper,
      talkTopics: (props.talkTopics || []) as TalkTopicId[],
    });
  }

  /**
   * 从 JSON 创建 NpcClass
   */
  static fromJson(json: NpcClassJson): NpcClass {
    // 检查是否是抽象定义
    const isAbstract = !!json.abstract;

    if (isAbstract) {
      // 抽象类不直接实例化
      throw new Error(`Cannot instantiate abstract NPC class: ${json.id}`);
    }

    return new NpcClass({
      id: json.id as NpcClassId,
      name: json.name,
      jobTitle: json.job_title,
      chat: json.chat || [],
      missions: json.missions || [],
      factions: json.factions || [],
      baseFaction: json.base_faction || 'no_faction',
      shopkeeper: json.shopkeeper || false,
      talkTopics: (json.talk_topics || []).map(id => id as TalkTopicId),
    });
  }

  /**
   * 处理 copy-from 继承
   */
  static applyInheritance(
    json: NpcClassJson,
    baseClass: NpcClass
  ): NpcClassJson {
    if (!json['copy-from'] && !json.inherits) {
      return json;
    }

    const parentId = json['copy-from'] || json.inherits;
    if (typeof parentId !== 'string') {
      return json;
    }

    // 合并属性
    const merged: NpcClassJson = {
      ...json,
      id: json.id || parentId,
      name: json.name || baseClass.name,
      job_title: json.job_title || baseClass.jobTitle || undefined,
      chat: json.chat || baseClass.chat.length > 0 ? [...baseClass.chat] : undefined,
      missions: json.missions || baseClass.missions.length > 0 ? [...baseClass.missions] : undefined,
      factions: json.factions || baseClass.factions.length > 0 ? [...baseClass.factions] : undefined,
      base_faction: json.base_faction || baseClass.baseFaction || undefined,
      shopkeeper: json.shopkeeper ?? baseClass.shopkeeper,
      talk_topics: json.talk_topics || baseClass.talkTopics.length > 0 ? [...baseClass.talkTopics] : undefined,
    };

    // 处理 delete 字段
    if (json.delete) {
      for (const key in json.delete) {
        if (key in merged) {
          delete (merged as any)[key];
        }
      }
    }

    return merged;
  }

  /**
   * 检查是否是商店keeper
   */
  isShopkeeper(): boolean {
    return this.shopkeeper;
  }

  /**
   * 检查是否属于特定阵营
   */
  isInFaction(factionId: string): boolean {
    return this.factions.includes(factionId) || this.baseFaction === factionId;
  }

  /**
   * 获取显示名称
   */
  getDisplayName(): string {
    if (this.jobTitle) {
      return `${this.name} (${this.jobTitle})`;
    }
    return this.name;
  }

  /**
   * 获取随机聊天文本
   */
  getRandomChat(): string {
    if (this.chat.length === 0) {
      return '...';
    }
    return this.chat[Math.floor(Math.random() * this.chat.length)];
  }

  /**
   * 添加对话话题
   */
  addTalkTopic(topicId: TalkTopicId): NpcClass {
    return new NpcClass({
      id: this.id,
      name: this.name,
      jobTitle: this.jobTitle,
      chat: this.chat,
      missions: this.missions,
      factions: this.factions,
      baseFaction: this.baseFaction,
      shopkeeper: this.shopkeeper,
      talkTopics: [...this.talkTopics, topicId],
    });
  }

  /**
   * 移除对话话题
   */
  removeTalkTopic(topicId: TalkTopicId): NpcClass {
    return new NpcClass({
      id: this.id,
      name: this.name,
      jobTitle: this.jobTitle,
      chat: this.chat,
      missions: this.missions,
      factions: this.factions,
      baseFaction: this.baseFaction,
      shopkeeper: this.shopkeeper,
      talkTopics: this.talkTopics.filter(id => id !== topicId),
    });
  }

  /**
   * 转换为 JSON
   */
  toJson(): NpcClassJson {
    return {
      type: 'npc_class',
      id: this.id,
      name: this.name,
      job_title: this.jobTitle || undefined,
      chat: this.chat.length > 0 ? [...this.chat] : undefined,
      missions: this.missions.length > 0 ? [...this.missions] : undefined,
      factions: this.factions.length > 0 ? [...this.factions] : undefined,
      base_faction: this.baseFaction || undefined,
      shopkeeper: this.shopkeeper || undefined,
      talk_topics: this.talkTopics.length > 0 ? [...this.talkTopics] : undefined,
    };
  }
}

/**
 * 预定义的常见 NPC 类
 */
export const CommonNpcClasses = {
  /** 普通幸存者 */
  SURVIVOR: 'NC_SCAVENGER' as NpcClassId,
  /** 商人 */
  MERCHANT: 'NC_MERCHANT' as NpcClassId,
  /** 医生 */
  DOCTOR: 'NC_DOCTOR' as NpcClassId,
  /** 守卫 */
  GUARD: 'NC_GUARD' as NpcClassId,
  /** 强盗 */
  BANDIT: 'NC_BANDIT' as NpcClassId,
  /** 游侠 */
  RANGER: 'NC_RANGER' as NpcClassId,
  /** 流浪者 */
  VAGABOND: 'NC_VAGABOND' as NpcClassId,
  /** 农夫 */
  FARMER: 'NC_FARMER' as NpcClassId,
  /** 僧侣 */
  MONK: 'NC_MONK' as NpcClassId,
  /** 游击队员 */
  PARTISAN: 'NC_PARTISAN' as NpcClassId,
} as const;

/**
 * 创建默认的 NPC 类
 */
export function createDefaultNpcClasses(): Map<NpcClassId, NpcClass> {
  const classes = new Map<NpcClassId, NpcClass>();

  // 普通幸存者
  classes.set(CommonNpcClasses.SURVIVOR, NpcClass.create({
    id: CommonNpcClasses.SURVIVOR,
    name: '幸存者',
    jobTitle: '拾荒者',
    chat: [
      '你找到什么有用的东西了吗？',
      '这世界变得很危险...',
      '小心点，外面有很多威胁。',
    ],
    factions: ['neutral'],
    talkTopics: ['TALK_HELLO', 'TALK_STRANGER', 'TALK_DONE'],
  }));

  // 商人
  classes.set(CommonNpcClasses.MERCHANT, NpcClass.create({
    id: CommonNpcClasses.MERCHANT,
    name: '商人',
    jobTitle: '商贩',
    chat: [
      '想看点什么？',
      '我这有好东西，只要价格合适。',
      '以物易物，这就是现在的规则。',
    ],
    shopkeeper: true,
    talkTopics: ['TALK_HELLO', 'TALK_SHOP', 'TALK_DONE'],
  }));

  // 强盗
  classes.set(CommonNpcClasses.BANDIT, NpcClass.create({
    id: CommonNpcClasses.BANDIT,
    name: '强盗',
    chat: [
      '把东西都交出来！',
      '你的命比东西值钱，自己做决定。',
      '不想死就别动。',
    ],
    factions: ['bandit'],
    talkTopics: ['TALK_HOSTILE', 'TALK_DONE'],
  }));

  return classes;
}
