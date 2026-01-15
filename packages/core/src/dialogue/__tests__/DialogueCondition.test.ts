/**
 * DialogueCondition 单元测试
 */

import { describe, it, expect } from 'vitest';
import { DialogueCondition } from '../DialogueCondition';
import { MockTalker } from '../Talker';
import type { DialogueContext } from '../types';

describe('DialogueCondition', () => {
  let mockContext: DialogueContext;

  beforeEach(() => {
    const player = new MockTalker({
      name: 'Player',
      stats: { strength: 12, intelligence: 10, dexterity: 8 },
    });

    const npc = new MockTalker({
      name: 'NPC',
      attitude: 7,
    });

    mockContext = {
      player,
      npc,
      mission: null,
    };
  });

  describe('evaluate - 基础条件', () => {
    it('空条件应该返回 true', () => {
      expect(DialogueCondition.evaluate('', mockContext)).toBe(true);
      expect(DialogueCondition.evaluate('   ', mockContext)).toBe(true);
    });

    it('应该评估 u_has_mission', () => {
      const withMission = { ...mockContext, mission: { id: 'test' } };
      const withoutMission = { ...mockContext, mission: null };

      expect(DialogueCondition.evaluate('u_has_mission', withMission)).toBe(true);
      expect(DialogueCondition.evaluate('u_has_mission', withoutMission)).toBe(false);
    });

    it('应该评估 npc_is_friend', () => {
      const friendlyNpc = new MockTalker({ name: 'Friendly', attitude: 8 });
      const hostileNpc = new MockTalker({ name: 'Hostile', attitude: 2 });

      expect(DialogueCondition.evaluate('npc_is_friend', {
        ...mockContext,
        npc: friendlyNpc,
      })).toBe(true);

      expect(DialogueCondition.evaluate('npc_is_friend', {
        ...mockContext,
        npc: hostileNpc,
      })).toBe(false);
    });

    it('应该评估 npc_is_hostile', () => {
      const hostileNpc = new MockTalker({ name: 'Hostile', attitude: 1 });
      const neutralNpc = new MockTalker({ name: 'Neutral', attitude: 5 });

      expect(DialogueCondition.evaluate('npc_is_hostile', {
        ...mockContext,
        npc: hostileNpc,
      })).toBe(true);

      expect(DialogueCondition.evaluate('npc_is_hostile', {
        ...mockContext,
        npc: neutralNpc,
      })).toBe(false);
    });

    it('应该评估 u_stat_* 条件', () => {
      expect(DialogueCondition.evaluate('u_stat_strength', mockContext)).toBe(true);
      expect(DialogueCondition.evaluate('u_stat_intelligence', mockContext)).toBe(true);
      expect(DialogueCondition.evaluate('u_stat_dexterity', mockContext)).toBe(true);
    });
  });

  describe('evaluate - 逻辑运算符', () => {
    it('应该处理 and 运算符', () => {
      const result = DialogueCondition.evaluate(
        'u_stat_strength and u_stat_intelligence',
        mockContext
      );
      expect(result).toBe(true);
    });

    it('and 一方为假应该返回 false', () => {
      const weakPlayer = new MockTalker({
        name: 'Weak',
        stats: { strength: 0, intelligence: 10, dexterity: 8 },
      });

      const result = DialogueCondition.evaluate(
        'u_stat_strength and u_stat_intelligence',
        { ...mockContext, player: weakPlayer }
      );
      expect(result).toBe(false);
    });

    it('应该处理 or 运算符', () => {
      const result = DialogueCondition.evaluate(
        'u_stat_strength or u_has_mission',
        mockContext
      );
      expect(result).toBe(true);
    });

    it('or 双方为假应该返回 false', () => {
      const result = DialogueCondition.evaluate(
        'u_has_mission or at_unsafe_place',
        mockContext
      );
      expect(result).toBe(false);
    });

    it('应该处理 not 运算符', () => {
      const result = DialogueCondition.evaluate(
        'not u_has_mission',
        mockContext
      );
      expect(result).toBe(true);
    });

    it('not 应该反转真值', () => {
      const withMission = { ...mockContext, mission: { id: 'test' } };
      const result = DialogueCondition.evaluate(
        'not u_has_mission',
        withMission
      );
      expect(result).toBe(false);
    });

    it('应该处理复杂的逻辑表达式', () => {
      const result = DialogueCondition.evaluate(
        'u_stat_strength and not u_has_mission or u_stat_intelligence',
        mockContext
      );
      expect(result).toBe(true);
    });
  });

  describe('evaluate - 比较运算符', () => {
    it('应该处理 > 运算符', () => {
      expect(DialogueCondition.evaluate('u_stat_strength > 10', mockContext)).toBe(true);
      expect(DialogueCondition.evaluate('u_stat_strength > 15', mockContext)).toBe(false);
    });

    it('应该处理 < 运算符', () => {
      expect(DialogueCondition.evaluate('u_stat_strength < 15', mockContext)).toBe(true);
      expect(DialogueCondition.evaluate('u_stat_strength < 10', mockContext)).toBe(false);
    });

    it('应该处理 >= 运算符', () => {
      expect(DialogueCondition.evaluate('u_stat_strength >= 12', mockContext)).toBe(true);
      expect(DialogueCondition.evaluate('u_stat_strength >= 13', mockContext)).toBe(false);
    });

    it('应该处理 <= 运算符', () => {
      expect(DialogueCondition.evaluate('u_stat_strength <= 12', mockContext)).toBe(true);
      expect(DialogueCondition.evaluate('u_stat_strength <= 11', mockContext)).toBe(false);
    });

    it('应该处理 == 运算符', () => {
      expect(DialogueCondition.evaluate('u_stat_strength == 12', mockContext)).toBe(true);
      expect(DialogueCondition.evaluate('u_stat_strength == 10', mockContext)).toBe(false);
    });

    it('应该处理 != 运算符', () => {
      expect(DialogueCondition.evaluate('u_stat_strength != 10', mockContext)).toBe(true);
      expect(DialogueCondition.evaluate('u_stat_strength != 12', mockContext)).toBe(false);
    });
  });

  describe('evaluate - 括号', () => {
    it('应该处理括号内的表达式', () => {
      const result = DialogueCondition.evaluate(
        '(u_stat_strength or u_has_mission) and u_stat_intelligence',
        mockContext
      );
      expect(result).toBe(true);
    });

    it('应该正确处理嵌套括号', () => {
      const result = DialogueCondition.evaluate(
        '((u_stat_strength and u_stat_intelligence) or u_has_mission)',
        mockContext
      );
      expect(result).toBe(true);
    });
  });

  describe('validate', () => {
    it('空字符串应该有效', () => {
      expect(DialogueCondition.validate('')).toEqual({ valid: true });
    });

    it('有效的条件应该通过验证', () => {
      expect(DialogueCondition.validate('u_has_mission')).toEqual({ valid: true });
      expect(DialogueCondition.validate('u_stat_strength > 10')).toEqual({ valid: true });
    });

    it('不匹配的括号应该失败', () => {
      expect(DialogueCondition.validate('(u_has_mission')).toEqual({
        valid: false,
        error: '括号不匹配',
      });

      expect(DialogueCondition.validate('u_has_mission)')).toEqual({
        valid: false,
        error: '括号不匹配',
      });
    });

    it('正确的括号应该通过', () => {
      expect(DialogueCondition.validate('(u_has_mission)')).toEqual({ valid: true });
      expect(DialogueCondition.validate('(u_has_mission and u_stat_strength)')).toEqual({
        valid: true,
      });
    });
  });

  describe('getDependencies', () => {
    it('应该提取条件依赖', () => {
      const deps = DialogueCondition.getDependencies('u_has_mission and npc_is_friend');
      expect(deps).toContain('u_has_mission');
      expect(deps).toContain('npc_is_friend');
    });

    it('应该去重依赖', () => {
      const deps = DialogueCondition.getDependencies('u_has_mission and u_has_mission');
      expect(deps).toHaveLength(1);
    });

    it('应该提取所有类型的依赖', () => {
      const deps = DialogueCondition.getDependencies(
        'u_stat_strength and npc_has_weapon or is_day or season_summer'
      );
      expect(deps).toContain('u_stat_strength');
      expect(deps).toContain('npc_has_weapon');
      expect(deps).toContain('is_day');
      expect(deps).toContain('season_summer');
    });
  });

  describe('edge cases', () => {
    it('应该处理包含多余空格的条件', () => {
      // 没有 mission，所以 u_has_mission 是 false
      expect(DialogueCondition.evaluate('  u_has_mission  and  u_stat_strength  ', mockContext)).toBe(false);
    });

    it('应该处理单个条件', () => {
      expect(DialogueCondition.evaluate('u_stat_strength', mockContext)).toBe(true);
    });

    it('未知条件应该返回 false', () => {
      expect(DialogueCondition.evaluate('unknown_condition', mockContext)).toBe(false);
    });
  });
});
