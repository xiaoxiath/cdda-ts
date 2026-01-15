/**
 * DialogueLoader - 对话数据加载器
 *
 * 从 JSON 文件加载对话数据，支持 copy-from 继承。
 * 对应 CDDA 的 JSON 加载系统。
 */

import type { TalkTopicId, NpcClassId } from './types';
import { TalkTopic, TalkTopicJson } from './TalkTopic';
import { NpcClass, NpcClassJson } from './NpcClass';
import { TalkResponseJson } from './TalkResponse';

/**
 * 对话 JSON 数据格式
 */
export interface DialogueJsonData {
  readonly type?: string;
  readonly talk_topics?: TalkTopicJson[];
  readonly npc_classes?: NpcClassJson[];
  readonly 'copy-from'?: string;
  readonly inherits?: string;
  readonly abstract?: boolean;
  readonly id?: string;
  readonly delete?: Record<string, unknown>;
  readonly extend?: Record<string, unknown>;
}

/**
 * DialogueLoader - 对话数据加载器
 *
 * 负责从 JSON 加载对话数据。
 */
export class DialogueLoader {
  private readonly topics: Map<TalkTopicId, TalkTopic>;
  private readonly npcClasses: Map<NpcClassId, NpcClass>;
  private readonly rawTopics: Map<string, TalkTopicJson>;
  private readonly rawNpcClasses: Map<string, NpcClassJson>;

  private constructor(
    topics: Map<TalkTopicId, TalkTopic>,
    npcClasses: Map<NpcClassId, NpcClass>,
    rawTopics: Map<string, TalkTopicJson>,
    rawNpcClasses: Map<string, NpcClassJson>
  ) {
    this.topics = topics;
    this.npcClasses = npcClasses;
    this.rawTopics = rawTopics;
    this.rawNpcClasses = rawNpcClasses;

    Object.freeze(this);
  }

  /**
   * 创建空的加载器
   */
  static create(): DialogueLoader {
    return new DialogueLoader(
      new Map(),
      new Map(),
      new Map(),
      new Map()
    );
  }

  /**
   * 加载 JSON 数据
   */
  loadData(data: DialogueJsonData | DialogueJsonData[]): DialogueLoader {
    const dataArray = Array.isArray(data) ? data : [data];

    // 三遍解析：处理 copy-from 继承
    const pass1 = this.processCopyFrom(dataArray);
    const pass2 = this.mergeExtensions(pass1);
    const pass3 = this.finalizeObjects(pass2);

    return this;
  }

  /**
   * 第一遍：处理 copy-from 继承
   */
  private processCopyFrom(data: DialogueJsonData[]): DialogueJsonData[] {
    const result: DialogueJsonData[] = [];
    const processed = new Set<string>();

    // 处理每个对象
    for (const item of data) {
      const id = item.id || item['copy-from'] || item.inherits;
      if (!id) {
        result.push(item);
        continue;
      }

      if (processed.has(id)) {
        continue; // 跳过已处理的
      }

      const processedItem = this.processSingleCopyFrom(item, new Set());
      result.push(processedItem);
      processed.add(id);
    }

    return result;
  }

  /**
   * 处理单个对象的 copy-from
   */
  private processSingleCopyFrom(
    item: DialogueJsonData,
    visited: Set<string>
  ): DialogueJsonData {
    const parentId = item['copy-from'] || item.inherits;

    if (!parentId) {
      return item;
    }

    // 检查循环引用
    if (visited.has(parentId)) {
      console.warn(`Circular inheritance detected: ${Array.from(visited).join(' -> ')} -> ${parentId}`);
      return item;
    }

    // 查找父对象
    const parent = this.findParentObject(parentId, item);
    if (!parent) {
      console.warn(`Parent object not found: ${parentId}`);
      return item;
    }

    // 递归处理父对象
    const processedParent = this.processSingleCopyFrom(parent, new Set([...visited, parentId]));

    // 合并属性
    return this.mergeObjects(item, processedParent);
  }

  /**
   * 查找父对象
   */
  private findParentObject(
    parentId: string,
    child: DialogueJsonData
  ): DialogueJsonData | null {
    // 在原始数据中查找
    if (child.type === 'talk_topic') {
      return this.rawTopics.get(parentId) || null;
    }
    if (child.type === 'npc_class') {
      return this.rawNpcClasses.get(parentId) || null;
    }

    // 根据 type 字段推断
    if (child.talk_topics) {
      return this.rawTopics.get(parentId) || null;
    }
    if (child.npc_classes) {
      return this.rawNpcClasses.get(parentId) || null;
    }

    return null;
  }

  /**
   * 合并对象（子对象覆盖父对象）
   */
  private mergeObjects(
    child: DialogueJsonData,
    parent: DialogueJsonData
  ): DialogueJsonData {
    const merged: DialogueJsonData = {
      ...parent,
      ...child,
    };

    // 处理数组字段（合并而非覆盖）
    if (parent.talk_topics && child.talk_topics) {
      merged.talk_topics = [...parent.talk_topics, ...child.talk_topics];
    }

    if (parent.npc_classes && child.npc_classes) {
      merged.npc_classes = [...parent.npc_classes, ...child.npc_classes];
    }

    // 处理 delete 字段
    if (child.delete) {
      for (const key in child.delete) {
        delete (merged as any)[key];
      }
    }

    // 处理 extend 字段
    if (child.extend) {
      for (const key in child.extend) {
        if (key in merged && Array.isArray((merged as any)[key])) {
          (merged as any)[key] = [...(merged as any)[key], ...(child.extend as any)[key]];
        } else {
          (merged as any)[key] = (child.extend as any)[key];
        }
      }
    }

    return merged;
  }

  /**
   * 第二遍：合并 extend 字段
   */
  private mergeExtensions(data: DialogueJsonData[]): DialogueJsonData[] {
    return data.map(item => {
      if (!item.extend) {
        return item;
      }

      const result: DialogueJsonData = { ...item };

      for (const key in item.extend) {
        if (key in result) {
          if (Array.isArray((result as any)[key])) {
            (result as any)[key] = [...(result as any)[key], ...(item.extend as any)[key]];
          } else if (typeof (result as any)[key] === 'object' && typeof (item.extend as any)[key] === 'object') {
            (result as any)[key] = { ...(result as any)[key], ...(item.extend as any)[key] };
          } else {
            (result as any)[key] = (item.extend as any)[key];
          }
        } else {
          (result as any)[key] = (item.extend as any)[key];
        }
      }

      delete (result as any).extend;
      return result;
    });
  }

  /**
   * 第三遍：最终化对象
   */
  private finalizeObjects(data: DialogueJsonData[]): DialogueJsonData[] {
    // 移除抽象定义
    return data.filter(item => !item.abstract);
  }

  /**
   * 构建话题和 NPC 类
   */
  build(data: DialogueJsonData[]): DialogueLoader {
    let newTopics = new Map(this.topics);
    let newNpcClasses = new Map(this.npcClasses);

    for (const item of data) {
      // 处理 talk_topics
      if (item.talk_topics) {
        for (const topicJson of item.talk_topics) {
          const topic = TalkTopic.fromJson(topicJson);
          newTopics.set(topic.id, topic);
        }
      }

      // 如果对象本身就是 talk_topic
      if (item.type === 'talk_topic' && item.id) {
        const topicJson = item as TalkTopicJson;
        const topic = TalkTopic.fromJson(topicJson);
        newTopics.set(topic.id, topic);
      }

      // 处理 npc_classes
      if (item.npc_classes) {
        for (const classJson of item.npc_classes) {
          try {
            const npcClass = NpcClass.fromJson(classJson);
            newNpcClasses.set(npcClass.id, npcClass);
          } catch (e) {
            // 跳过抽象类
            if ((e as Error).message.includes('abstract')) {
              continue;
            }
            throw e;
          }
        }
      }

      // 如果对象本身就是 npc_class
      if (item.type === 'npc_class' && item.id) {
        const classJson = item as NpcClassJson;
        try {
          const npcClass = NpcClass.fromJson(classJson);
          newNpcClasses.set(npcClass.id, npcClass);
        } catch (e) {
          if ((e as Error).message.includes('abstract')) {
            continue;
          }
          throw e;
        }
      }
    }

    return new DialogueLoader(
      newTopics,
      newNpcClasses,
      new Map(this.rawTopics),
      new Map(this.rawNpcClasses)
    );
  }

  /**
   * 获取话题
   */
  getTopic(topicId: TalkTopicId): TalkTopic | undefined {
    return this.topics.get(topicId);
  }

  /**
   * 获取所有话题
   */
  getAllTopics(): ReadonlyMap<TalkTopicId, TalkTopic> {
    return this.topics;
  }

  /**
   * 获取 NPC 类
   */
  getNpcClass(classId: NpcClassId): NpcClass | undefined {
    return this.npcClasses.get(classId);
  }

  /**
   * 获取所有 NPC 类
   */
  getAllNpcClasses(): ReadonlyMap<NpcClassId, NpcClass> {
    return this.npcClasses;
  }

  /**
   * 获取 NPC 类的对话话题
   */
  getDialogueForClass(npcClassId: NpcClassId): Map<TalkTopicId, TalkTopic> {
    const npcClass = this.npcClasses.get(npcClassId);
    if (!npcClass) {
      return new Map();
    }

    // 收集所有相关话题
    const topics = new Map<TalkTopicId, TalkTopic>();
    for (const topicId of npcClass.talkTopics) {
      const topic = this.topics.get(topicId);
      if (topic) {
        topics.set(topicId, topic);
      }
    }
    return topics;
  }

  /**
   * 从 JSON 字符串加载
   */
  static fromJsonString(jsonString: string): DialogueLoader {
    try {
      const data = JSON.parse(jsonString) as DialogueJsonData | DialogueJsonData[];
      const loader = DialogueLoader.create();
      const processed = loader.loadData(data);
      return processed.build(Array.isArray(data) ? data : [data]);
    } catch (e) {
      console.error('Failed to parse dialogue JSON:', e);
      return DialogueLoader.create();
    }
  }

  /**
   * 从 JSON 文件加载
   * 注意：这个方法在 Node.js 环境中使用，浏览器环境需要其他方式
   */
  static async fromJsonFile(filePath: string): Promise<DialogueLoader> {
    try {
      // 动态 import 以避免浏览器环境报错
      const fs = await import('fs/promises');
      const jsonString = await fs.readFile(filePath, 'utf-8');
      return DialogueLoader.fromJsonString(jsonString);
    } catch (e) {
      console.error(`Failed to load dialogue file: ${filePath}`, e);
      return DialogueLoader.create();
    }
  }

  /**
   * 合并多个加载器
   */
  merge(other: DialogueLoader): DialogueLoader {
    const mergedTopics = new Map(this.topics);
    const mergedNpcClasses = new Map(this.npcClasses);

    // 合并话题
    for (const [id, topic] of other.topics) {
      mergedTopics.set(id, topic);
    }

    // 合并 NPC 类
    for (const [id, npcClass] of other.npcClasses) {
      mergedNpcClasses.set(id, npcClass);
    }

    return new DialogueLoader(
      mergedTopics,
      mergedNpcClasses,
      new Map(this.rawTopics),
      new Map(this.rawNpcClasses)
    );
  }
}
