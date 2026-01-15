/**
 * TalkTrial 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TalkTrial, createLieTrial, createPersuadeTrial, createIntimidateTrial } from '../TalkTrial';
import { TrialType } from '../types';
import { MockTalker } from '../Talker';
import type { DialogueContext } from '../types';

describe('TalkTrial', () => {
  let mockContext: DialogueContext;

  beforeEach(() => {
    // 创建模拟的对话上下文
    const player = new MockTalker({
      name: 'Player',
      stats: { strength: 10, intelligence: 12, dexterity: 10 },
      skills: new Map([['speech', 5]]),
    });

    const npc = new MockTalker({
      name: 'NPC',
      stats: { strength: 8, intelligence: 10, dexterity: 9 },
      attitude: 5,
    });

    mockContext = {
      player,
      npc,
      mission: null,
    };
  });

  describe('create', () => {
    it('应该创建欺骗检定', () => {
      const trial = TalkTrial.create({
        type: TrialType.LIE,
        difficulty: 5,
        successLine: '成功！',
        failureLine: '失败...',
      });

      expect(trial.type).toBe(TrialType.LIE);
      expect(trial.difficulty).toBe(5);
      expect(trial.successLine).toBe('成功！');
      expect(trial.failureLine).toBe('失败...');
    });

    it('应该创建说服检定', () => {
      const trial = TalkTrial.create({
        type: TrialType.PERSUADE,
        difficulty: 3,
        skill: 'speech' as any,
      });

      expect(trial.type).toBe(TrialType.PERSUADE);
      expect(trial.skill).toBe('speech');
    });
  });

  describe('fromJson', () => {
    it('应该从 JSON 创建检定', () => {
      const json = {
        type: 'LIE',
        difficulty: 5,
        success: '成功',
        failure: '失败',
      };

      const trial = TalkTrial.fromJson(json);

      expect(trial.type).toBe(TrialType.LIE);
      expect(trial.difficulty).toBe(5);
      expect(trial.successLine).toBe('成功');
      expect(trial.failureLine).toBe('失败');
    });

    it('应该处理大小写不敏感的类型', () => {
      const json = {
        type: 'lie',
        difficulty: 5,
      };

      const trial = TalkTrial.fromJson(json);

      expect(trial.type).toBe(TrialType.LIE);
    });
  });

  describe('execute - LIE', () => {
    it('应该执行欺骗检定', () => {
      const trial = TalkTrial.create({
        type: TrialType.LIE,
        difficulty: 0,
      });

      const result = trial.execute(mockContext);

      expect(['success', 'failure', 'partial']).toContain(result);
    });
  });

  describe('execute - PERSUADE', () => {
    it('应该执行说服检定', () => {
      const trial = TalkTrial.create({
        type: TrialType.PERSUADE,
        difficulty: 0,
      });

      const result = trial.execute(mockContext);

      expect(['success', 'failure', 'partial']).toContain(result);
    });
  });

  describe('execute - INTIMIDATE', () => {
    it('应该执行威吓检定', () => {
      const trial = TalkTrial.create({
        type: TrialType.INTIMIDATE,
        difficulty: 0,
      });

      const result = trial.execute(mockContext);

      expect(['success', 'failure', 'partial']).toContain(result);
    });
  });

  describe('execute - SKILL_CHECK', () => {
    it('应该执行技能检定', () => {
      const trial = TalkTrial.create({
        type: TrialType.SKILL_CHECK,
        difficulty: 3,
        skill: 'speech' as any,
      });

      const result = trial.execute(mockContext);

      expect(['success', 'failure', 'partial']).toContain(result);
    });

    it('没有技能时应该失败', () => {
      const player = new MockTalker({
        name: 'Player',
        skills: new Map(),
      });

      const context = { ...mockContext, player };

      const trial = TalkTrial.create({
        type: TrialType.SKILL_CHECK,
        difficulty: 0,
        skill: 'speech' as any,
      });

      const result = trial.execute(context);

      expect(result).toBe('failure');
    });
  });

  describe('getResultText', () => {
    it('应该返回成功文本', () => {
      const trial = TalkTrial.create({
        type: TrialType.LIE,
        successLine: '成功！',
      });

      expect(trial.getResultText('success')).toBe('成功！');
    });

    it('应该返回失败文本', () => {
      const trial = TalkTrial.create({
        type: TrialType.LIE,
        failureLine: '失败...',
      });

      expect(trial.getResultText('failure')).toBe('失败...');
    });

    it('应该返回部分成功文本', () => {
      const trial = TalkTrial.create({
        type: TrialType.LIE,
        partialLine: '部分成功',
      });

      expect(trial.getResultText('partial')).toBe('部分成功');
    });

    it('没有定义时应该返回默认文本', () => {
      const trial = TalkTrial.create({
        type: TrialType.LIE,
      });

      expect(trial.getResultText('success')).toBe('成功！');
      expect(trial.getResultText('failure')).toBe('失败...');
    });
  });

  describe('toJson', () => {
    it('应该转换为 JSON', () => {
      const trial = TalkTrial.create({
        type: TrialType.LIE,
        difficulty: 5,
        skill: 'speech' as any,
        condition: 'u_has_mission',
        successLine: '成功',
        failureLine: '失败',
      });

      const json = trial.toJson();

      expect(json.type).toBe(TrialType.LIE);
      expect(json.difficulty).toBe(5);
      expect(json.skill).toBe('speech');
      expect(json.condition).toBe('u_has_mission');
      expect(json.success).toBe('成功');
      expect(json.failure).toBe('失败');
    });
  });
});

describe('工厂函数', () => {
  describe('createLieTrial', () => {
    it('应该创建默认难度的欺骗检定', () => {
      const trial = createLieTrial();

      expect(trial.type).toBe(TrialType.LIE);
      expect(trial.difficulty).toBe(5);
      expect(trial.successLine).toBeTruthy();
      expect(trial.failureLine).toBeTruthy();
    });

    it('应该创建指定难度的欺骗检定', () => {
      const trial = createLieTrial(8);

      expect(trial.difficulty).toBe(8);
    });
  });

  describe('createPersuadeTrial', () => {
    it('应该创建说服检定', () => {
      const trial = createPersuadeTrial();

      expect(trial.type).toBe(TrialType.PERSUADE);
      expect(trial.successLine).toBeTruthy();
    });
  });

  describe('createIntimidateTrial', () => {
    it('应该创建威吓检定', () => {
      const trial = createIntimidateTrial();

      expect(trial.type).toBe(TrialType.INTIMIDATE);
      expect(trial.successLine).toBeTruthy();
    });
  });
});
