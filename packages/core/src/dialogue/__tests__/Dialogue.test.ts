/**
 * Dialogue 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Dialogue, DialogueBuilder, createDialogueBuilder } from '../Dialogue';
import { TalkTopic, createGreetingTopic, createEndTopic } from '../TalkTopic';
import { TalkResponse, createTextResponse } from '../TalkResponse';
import { CommonTopics } from '../TalkTopic';
import { DialogueAction } from '../types';
import { MockTalker } from '../Talker';
import type { DialogueContext } from '../types';

describe('Dialogue', () => {
  let topics: Map<string, TalkTopic>;
  let mockContext: DialogueContext;

  beforeEach(() => {
    // 创建测试用的话题
    const helloTopic = createGreetingTopic(
      CommonTopics.HELLO,
      ['你好！', '欢迎！'],
      [
        createTextResponse('你好，再见', CommonTopics.DONE),
        createTextResponse('告诉我更多', 'TALK_MORE'),
      ]
    );

    const moreTopic = TalkTopic.create({
      id: 'TALK_MORE',
      dynamicLines: ['这是一个秘密...', '别告诉别人。'],
      responses: [
        createTextResponse('好的', CommonTopics.DONE),
      ],
    });

    const doneTopic = createEndTopic();

    topics = new Map([
      [CommonTopics.HELLO, helloTopic],
      ['TALK_MORE', moreTopic],
      [CommonTopics.DONE, doneTopic],
    ]);

    // 创建模拟上下文
    const player = new MockTalker({ name: 'Player' });
    const npc = new MockTalker({ name: 'NPC' });

    mockContext = {
      player,
      npc,
      mission: null,
    };
  });

  describe('create', () => {
    it('应该创建对话', () => {
      const dialogue = Dialogue.create(topics, CommonTopics.HELLO);

      expect(dialogue.getCurrentTopicId()).toBe(CommonTopics.HELLO);
      expect(dialogue.isEnded()).toBe(false);
    });

    it('应该从话题数组创建', () => {
      const topicArray = Array.from(topics.values());
      const dialogue = Dialogue.fromTopics(topicArray, CommonTopics.HELLO);

      expect(dialogue.getCurrentTopicId()).toBe(CommonTopics.HELLO);
    });
  });

  describe('getCurrentState', () => {
    it('应该获取当前对话状态', () => {
      const dialogue = Dialogue.create(topics, CommonTopics.HELLO);
      const state = dialogue.getCurrentState(mockContext);

      expect(state.currentTopic).toBe(CommonTopics.HELLO);
      expect(state.npcText).toBeTruthy();
      expect(state.responses.length).toBeGreaterThan(0);
      expect(state.ended).toBe(false);
    });

    it('不存在的话题应该返回省略号', () => {
      const dialogue = Dialogue.create(new Map(), 'UNKNOWN_TOPIC');
      const state = dialogue.getCurrentState(mockContext);

      expect(state.npcText).toBe('...');
      expect(state.responses).toEqual([]);
    });

    it('结束的对话应该返回空状态', () => {
      const dialogue = Dialogue.create(topics, CommonTopics.HELLO).end();
      const state = dialogue.getCurrentState(mockContext);

      expect(state.ended).toBe(true);
      expect(state.npcText).toBe('');
      expect(state.responses).toEqual([]);
    });
  });

  describe('selectResponse', () => {
    it('应该选择回应并切换话题', () => {
      const dialogue = Dialogue.create(topics, CommonTopics.HELLO);
      const state = dialogue.getCurrentState(mockContext);
      const response = state.responses[0];

      const newDialogue = dialogue.selectResponse(response, mockContext);

      expect(newDialogue.getCurrentTopicId()).toBe(CommonTopics.DONE);
    });

    it('应该处理结束对话的回应', () => {
      const dialogue = Dialogue.create(topics, CommonTopics.DONE);
      const state = dialogue.getCurrentState(mockContext);

      if (state.responses.length > 0) {
        const response = state.responses[0];
        const newDialogue = dialogue.selectResponse(response, mockContext);

        expect(newDialogue.isEnded()).toBe(true);
      }
    });

    it('不可用的回应不应该改变状态', () => {
      // 创建一个不可用的回应
      const unavailableResponse = TalkResponse.create({
        text: '不可用的选项',
        condition: 'u_has_mission', // 玩家没有任务
      });

      const dialogue = Dialogue.create(topics, CommonTopics.HELLO);

      const newDialogue = dialogue.selectResponse(unavailableResponse, mockContext);

      expect(newDialogue.getCurrentTopicId()).toBe(CommonTopics.HELLO);
    });

    it('应该返回新实例（不可变）', () => {
      const dialogue = Dialogue.create(topics, CommonTopics.HELLO);
      const state = dialogue.getCurrentState(mockContext);
      const response = state.responses[0];

      const newDialogue = dialogue.selectResponse(response, mockContext);

      expect(dialogue).not.toBe(newDialogue);
      expect(dialogue.getCurrentTopicId()).toBe(CommonTopics.HELLO);
      expect(newDialogue.getCurrentTopicId()).not.toBe(CommonTopics.HELLO);
    });
  });

  describe('switchTopic', () => {
    it('应该切换话题', () => {
      const dialogue = Dialogue.create(topics, CommonTopics.HELLO);
      const newDialogue = dialogue.switchTopic('TALK_MORE');

      expect(newDialogue.getCurrentTopicId()).toBe('TALK_MORE');
    });

    it('应该保持不可变性', () => {
      const dialogue = Dialogue.create(topics, CommonTopics.HELLO);
      const newDialogue = dialogue.switchTopic('TALK_MORE');

      expect(dialogue.getCurrentTopicId()).toBe(CommonTopics.HELLO);
    });
  });

  describe('end', () => {
    it('应该结束对话', () => {
      const dialogue = Dialogue.create(topics, CommonTopics.HELLO);
      const endedDialogue = dialogue.end();

      expect(endedDialogue.isEnded()).toBe(true);
    });

    it('应该保持不可变性', () => {
      const dialogue = Dialogue.create(topics, CommonTopics.HELLO);
      const endedDialogue = dialogue.end();

      expect(dialogue.isEnded()).toBe(false);
      expect(endedDialogue.isEnded()).toBe(true);
    });
  });

  describe('reset', () => {
    it('应该重置到初始话题', () => {
      const dialogue = Dialogue.create(topics, CommonTopics.HELLO)
        .switchTopic('TALK_MORE')
        .switchTopic(CommonTopics.DONE);

      const resetDialogue = dialogue.reset();

      expect(resetDialogue.getCurrentTopicId()).toBe(CommonTopics.HELLO);
      expect(resetDialogue.isEnded()).toBe(false);
    });
  });

  describe('hasTopic', () => {
    it('应该检查话题是否存在', () => {
      const dialogue = Dialogue.create(topics, CommonTopics.HELLO);

      expect(dialogue.hasTopic(CommonTopics.HELLO)).toBe(true);
      expect(dialogue.hasTopic('TALK_MORE')).toBe(true);
      expect(dialogue.hasTopic('UNKNOWN')).toBe(false);
    });
  });

  describe('getTopic', () => {
    it('应该获取话题', () => {
      const dialogue = Dialogue.create(topics, CommonTopics.HELLO);
      const topic = dialogue.getTopic(CommonTopics.HELLO);

      expect(topic).toBeDefined();
      expect(topic?.id).toBe(CommonTopics.HELLO);
    });

    it('不存在的话题应该返回 undefined', () => {
      const dialogue = Dialogue.create(topics, CommonTopics.HELLO);
      const topic = dialogue.getTopic('UNKNOWN');

      expect(topic).toBeUndefined();
    });
  });

  describe('addTopic', () => {
    it('应该添加话题', () => {
      const dialogue = Dialogue.create(new Map(), CommonTopics.HELLO);
      const newTopic = createGreetingTopic('NEW_TOPIC', ['你好！'], []);

      const newDialogue = dialogue.addTopic(newTopic);

      expect(newDialogue.hasTopic('NEW_TOPIC')).toBe(true);
      expect(dialogue.hasTopic('NEW_TOPIC')).toBe(false);
    });
  });

  describe('toJson', () => {
    it('应该转换为 JSON', () => {
      const dialogue = Dialogue.create(topics, CommonTopics.HELLO);
      const json = dialogue.toJson();

      expect(json.initialTopic).toBe(CommonTopics.HELLO);
      expect(json.currentTopic).toBe(CommonTopics.HELLO);
      expect(json.ended).toBe(false);
      expect(json.topics).toBeDefined();
      expect(json.topics.length).toBe(3);
    });
  });

  describe('fromJson', () => {
    it('应该从 JSON 创建', () => {
      const dialogue = Dialogue.create(topics, CommonTopics.HELLO);
      const json = dialogue.toJson();

      const restoredDialogue = Dialogue.fromJson(json);

      expect(restoredDialogue.getCurrentTopicId()).toBe(dialogue.getCurrentTopicId());
      expect(restoredDialogue.isEnded()).toBe(dialogue.isEnded());
    });
  });
});

describe('DialogueBuilder', () => {
  it('应该构建对话', () => {
    const builder = new DialogueBuilder();

    const helloTopic = createGreetingTopic(CommonTopics.HELLO, ['你好！'], []);
    const doneTopic = createEndTopic();

    const dialogue = builder
      .withInitialTopic(CommonTopics.HELLO)
      .addTopic(helloTopic)
      .addTopic(doneTopic)
      .build();

    expect(dialogue.getCurrentTopicId()).toBe(CommonTopics.HELLO);
    expect(dialogue.hasTopic(CommonTopics.HELLO)).toBe(true);
    expect(dialogue.hasTopic(CommonTopics.DONE)).toBe(true);
  });

  it('应该批量添加话题', () => {
    const topics = [
      createGreetingTopic(CommonTopics.HELLO, ['你好！'], []),
      createEndTopic(),
    ];

    const dialogue = createDialogueBuilder()
      .withInitialTopic(CommonTopics.HELLO)
      .addTopics(topics)
      .build();

    expect(dialogue.hasTopic(CommonTopics.HELLO)).toBe(true);
    expect(dialogue.hasTopic(CommonTopics.DONE)).toBe(true);
  });
});

describe('createDialogueBuilder', () => {
  it('应该创建对话构建器', () => {
    const builder = createDialogueBuilder();

    expect(builder).toBeInstanceOf(DialogueBuilder);
  });
});
