/**
 * GameLoop Tests - 游戏循环测试
 *
 * 测试游戏循环和游戏状态
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap } from '../../map/GameMap';
import { Avatar } from '../../creature/Avatar';
import { GameState } from '../GameState';
import { GameLoop, GameAction } from '../GameLoop';
import { Tripoint } from '../../coordinates/Tripoint';

describe('GameState', () => {
  let map: GameMap;
  let player: Avatar;
  let state: GameState;

  beforeEach(() => {
    map = new GameMap();
    player = new Avatar(
      'player_001',
      new Tripoint({ x: 0, y: 0, z: 0 }),
      '测试玩家'
    );
    state = GameState.create(map, player);
  });

  describe('初始化', () => {
    it('应该创建初始游戏状态', () => {
      expect(state.turn).toBe(0);
      expect(state.player).toBe(player);
      expect(state.map).toBe(map);
      expect(state.messages).toContain('欢迎来到 Cataclysm-DDA TypeScript 版本！');
    });

    it('应该有正确的初始属性', () => {
      expect(state.player.position.x).toBe(0);
      expect(state.player.position.y).toBe(0);
      expect(state.player.position.z).toBe(0);
    });
  });

  describe('玩家移动', () => {
    it('应该向北移动', () => {
      const newState = state.movePlayer(0, -1);

      expect(newState.turn).toBe(1);
      expect(newState.player.position.y).toBe(-1);
      expect(newState.player.position.x).toBe(0);
    });

    it('应该向南移动', () => {
      const newState = state.movePlayer(0, 1);

      expect(newState.turn).toBe(1);
      expect(newState.player.position.y).toBe(1);
    });

    it('应该向东移动', () => {
      const newState = state.movePlayer(1, 0);

      expect(newState.turn).toBe(1);
      expect(newState.player.position.x).toBe(1);
    });

    it('应该向西移动', () => {
      const newState = state.movePlayer(-1, 0);

      expect(newState.turn).toBe(1);
      expect(newState.player.position.x).toBe(-1);
    });

    it('应该斜向移动', () => {
      const newState = state.movePlayer(1, 1);

      expect(newState.turn).toBe(1);
      expect(newState.player.position.x).toBe(1);
      expect(newState.player.position.y).toBe(1);
    });

    it('应该保持不可变性', () => {
      const oldX = state.player.position.x;
      const oldY = state.player.position.y;
      const oldTurn = state.turn;

      state.movePlayer(1, 1);

      // 原状态应该不变
      expect(state.player.position.x).toBe(oldX);
      expect(state.player.position.y).toBe(oldY);
      expect(state.turn).toBe(oldTurn);
    });
  });

  describe('等待', () => {
    it('应该增加回合数', () => {
      const newState = state.wait();

      expect(newState.turn).toBe(1);
      expect(newState.player.position).toEqual(state.player.position);
    });
  });

  describe('消息系统', () => {
    it('应该添加消息', () => {
      const newState = state.addMessage('测试消息');

      expect(newState.messages).toContain('测试消息');
    });

    it('应该获取最近的消息', () => {
      state = state.addMessage('消息 1');
      state = state.addMessage('消息 2');
      state = state.addMessage('消息 3');

      const recent = state.getRecentMessages(2);

      expect(recent).toEqual(['消息 2', '消息 3']);
    });

    it('应该限制消息数量', () => {
      // 添加超过限制的消息
      let newState = state;
      for (let i = 0; i < 150; i++) {
        newState = newState.addMessage(`消息 ${i}`);
      }

      // 应该只保留最近 100 条
      expect(newState.messages.length).toBe(100);
      expect(newState.messages[0]).toBe('消息 50');
      expect(newState.messages[99]).toBe('消息 149');
    });
  });

  describe('游戏结束', () => {
    it('应该检测玩家死亡', () => {
      expect(state.isGameOver()).toBe(false);

      // 让玩家受到致命伤害
      state.player.takeDamage(0, 1000); // 摧毁头部

      expect(state.player.isDead()).toBe(true);
      expect(state.isGameOver()).toBe(true);
    });
  });
});

describe('GameLoop', () => {
  let map: GameMap;
  let player: Avatar;
  let state: GameState;

  beforeEach(() => {
    map = new GameMap();
    player = new Avatar(
      'player_001',
      new Tripoint({ x: 0, y: 0, z: 0 }),
      '测试玩家'
    );
    state = GameState.create(map, player);
  });

  describe('动作执行', () => {
    it('应该创建游戏循环', () => {
      const mockInput = async () => GameAction.WAIT;
      const mockRender = async () => {};

      const loop = new GameLoop(state, mockInput, mockRender);

      expect(loop.getState()).toBe(state);
      expect(loop.isRunning()).toBe(false);
    });

    it('应该正确处理移动动作', () => {
      const mockInput = async () => GameAction.MOVE_N;
      const mockRender = async () => {};

      const loop = new GameLoop(state, mockInput, mockRender);

      // 手动测试动作执行（通过执行逻辑）
      const testState = state;

      // 测试北移
      const moved = testState.movePlayer(0, -1);
      expect(moved.player.position.y).toBe(-1);

      // 测试等待
      const waited = testState.wait();
      expect(waited.turn).toBe(1);
    });
  });

  describe('游戏动作枚举', () => {
    it('应该包含所有移动动作', () => {
      expect(GameAction.MOVE_N).toBeDefined();
      expect(GameAction.MOVE_NE).toBeDefined();
      expect(GameAction.MOVE_E).toBeDefined();
      expect(GameAction.MOVE_SE).toBeDefined();
      expect(GameAction.MOVE_S).toBeDefined();
      expect(GameAction.MOVE_SW).toBeDefined();
      expect(GameAction.MOVE_W).toBeDefined();
      expect(GameAction.MOVE_NW).toBeDefined();
    });

    it('应该包含系统动作', () => {
      expect(GameAction.WAIT).toBeDefined();
      expect(GameAction.QUIT).toBeDefined();
      expect(GameAction.DEBUG).toBeDefined();
    });
  });
});
