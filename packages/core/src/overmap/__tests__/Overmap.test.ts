/**
 * Overmap 单元测试
 */

import { describe, it, expect } from 'vitest';
import { Overmap } from '../Overmap';
import { City } from '../City';
import { OmVisionLevel } from '../types';

describe('Overmap', () => {
  describe('create', () => {
    it('应该创建空的 Overmap', () => {
      const overmap = Overmap.create({ x: 0, y: 0 });

      expect(overmap.localPos).toEqual({ x: 0, y: 0 });
      expect(overmap.layers.length).toBe(21);
      expect(overmap.cities).toEqual([]);
      expect(overmap.radios).toEqual([]);
      expect(overmap.connections.size).toBe(0);
      expect(overmap.specials.size).toBe(0);
    });
  });

  describe('地形操作', () => {
    it('应该设置和获取地形', () => {
      const overmap = Overmap.create({ x: 0, y: 0 });
      const updated = overmap.setTerrain({ x: 10, y: 20, z: 0 }, 'forest');

      expect(updated.getTerrain({ x: 10, y: 20, z: 0 })).toBe('forest');
      expect(overmap.getTerrain({ x: 10, y: 20, z: 0 })).toBe('');
    });

    it('边界外应该返回空字符串', () => {
      const overmap = Overmap.create({ x: 0, y: 0 });

      expect(overmap.getTerrain({ x: 200, y: 20, z: 0 })).toBe('');
      expect(overmap.getTerrain({ x: 10, y: 20, z: 25 })).toBe('');
    });

    it('应该批量填充默认地形', () => {
      const overmap = Overmap.create({ x: 0, y: 0 });
      const filled = overmap.fillWithDefault('field');

      expect(filled.getTerrain({ x: 0, y: 0, z: 0 })).toBe('field');
      expect(filled.getTerrain({ x: 179, y: 179, z: 0 })).toBe('field');
      expect(filled.getTerrain({ x: 0, y: 0, z: 20 })).toBe('field');
    });

    it('应该查找所有指定地形的位置', () => {
      let overmap = Overmap.create({ x: 0, y: 0 });
      overmap = overmap.setTerrain({ x: 10, y: 10, z: 0 }, 'forest');
      overmap = overmap.setTerrain({ x: 20, y: 20, z: 0 }, 'forest');

      const positions = overmap.findTerrain('forest');

      expect(positions).toHaveLength(2);
      expect(positions).toContainEqual({ x: 10, y: 10 });
      expect(positions).toContainEqual({ x: 20, y: 20 });
    });

    it('应该查找随机地形位置', () => {
      let overmap = Overmap.create({ x: 0, y: 0 });
      overmap = overmap.setTerrain({ x: 50, y: 50, z: 0 }, 'forest');

      const position = overmap.findRandom('forest');

      expect(position).toEqual({ x: 50, y: 50 });
    });
  });

  describe('视野操作', () => {
    it('应该设置和获取视野等级', () => {
      const overmap = Overmap.create({ x: 0, y: 0 });
      const updated = overmap.setSeen({ x: 10, y: 20, z: 0 }, OmVisionLevel.FULL);

      expect(updated.getSeen({ x: 10, y: 20, z: 0 })).toBe(OmVisionLevel.FULL);
      expect(overmap.getSeen({ x: 10, y: 20, z: 0 })).toBe(OmVisionLevel.UNSEEN);
    });

    it('边界外应该返回 UNSEEN', () => {
      const overmap = Overmap.create({ x: 0, y: 0 });

      expect(overmap.getSeen({ x: 200, y: 20, z: 0 })).toBe(OmVisionLevel.UNSEEN);
    });

    it('应该检查视野等级', () => {
      let overmap = Overmap.create({ x: 0, y: 0 });
      overmap = overmap.setSeen({ x: 10, y: 20, z: 0 }, OmVisionLevel.DETAILS);

      expect(overmap.hasSeenLevel({ x: 10, y: 20, z: 0 }, OmVisionLevel.VAGUE)).toBe(true);
      expect(overmap.hasSeenLevel({ x: 10, y: 20, z: 0 }, OmVisionLevel.FULL)).toBe(false);
    });
  });

  describe('探索操作', () => {
    it('应该探索位置', () => {
      const overmap = Overmap.create({ x: 0, y: 0 });
      const updated = overmap.explore({ x: 10, y: 20, z: 0 });

      expect(updated.isExplored({ x: 10, y: 20, z: 0 })).toBe(true);
      expect(overmap.isExplored({ x: 10, y: 20, z: 0 })).toBe(false);
    });

    it('边界外应该返回 false', () => {
      const overmap = Overmap.create({ x: 0, y: 0 });

      expect(overmap.isExplored({ x: 200, y: 20, z: 0 })).toBe(false);
    });
  });

  describe('笔记操作', () => {
    const note = {
      text: 'Test note',
      position: { x: 10, y: 20, z: 0 },
      dangerous: false,
      dangerRadius: 0,
    };

    it('应该添加笔记', () => {
      const overmap = Overmap.create({ x: 0, y: 0 });
      const updated = overmap.addNote(note);

      expect(updated.hasNote({ x: 10, y: 20, z: 0 })).toBe(true);
      expect(overmap.hasNote({ x: 10, y: 20, z: 0 })).toBe(false);
    });

    it('应该移除笔记', () => {
      let overmap = Overmap.create({ x: 0, y: 0 });
      overmap = overmap.addNote(note);
      const updated = overmap.removeNote({ x: 10, y: 20, z: 0 });

      expect(updated.hasNote({ x: 10, y: 20, z: 0 })).toBe(false);
      expect(overmap.hasNote({ x: 10, y: 20, z: 0 })).toBe(true);
    });
  });

  describe('边界检查', () => {
    const overmap = Overmap.create({ x: 0, y: 0 });

    it('边界内位置应该有效', () => {
      expect(overmap.inBounds({ x: 0, y: 0, z: 0 })).toBe(true);
      expect(overmap.inBounds({ x: 179, y: 179, z: 20 })).toBe(true);
      expect(overmap.inBounds({ x: 90, y: 90, z: 10 })).toBe(true);
    });

    it('边界外位置应该无效', () => {
      expect(overmap.inBounds({ x: -1, y: 0, z: 0 })).toBe(false);
      expect(overmap.inBounds({ x: 0, y: -1, z: 0 })).toBe(false);
      expect(overmap.inBounds({ x: 180, y: 0, z: 0 })).toBe(false);
      expect(overmap.inBounds({ x: 0, y: 0, z: -1 })).toBe(false);
      expect(overmap.inBounds({ x: 0, y: 0, z: 21 })).toBe(false);
    });

    it('应该支持 clearance 参数', () => {
      expect(overmap.inBounds({ x: 0, y: 0, z: 0 }, 1)).toBe(false);
      expect(overmap.inBounds({ x: 5, y: 5, z: 0 }, 5)).toBe(true);
    });

    it('应该检查 2D 边界', () => {
      expect(overmap.inBounds2D(0, 0)).toBe(true);
      expect(overmap.inBounds2D(179, 179)).toBe(true);
      expect(overmap.inBounds2D(-1, 0)).toBe(false);
      expect(overmap.inBounds2D(0, -1)).toBe(false);
      expect(overmap.inBounds2D(180, 0)).toBe(false);
      expect(overmap.inBounds2D(0, 180)).toBe(false);
    });
  });

  describe('城市操作', () => {
    it('应该添加城市', () => {
      const overmap = Overmap.create({ x: 0, y: 0 });
      const city = City.fromPositionSize(90, 90, 10, 'Test City');
      const updated = overmap.addCity(city);

      expect(updated.cities).toHaveLength(1);
      expect(updated.cities[0]).toEqual(city);
    });

    it('应该检查位置是否在城市内', () => {
      let overmap = Overmap.create({ x: 0, y: 0 });
      const city = City.fromPositionSize(90, 90, 10, 'Test City');
      overmap = overmap.addCity(city);

      expect(overmap.isInCity({ x: 90, y: 90, z: 0 })).toBe(true);
      expect(overmap.isInCity({ x: 50, y: 50, z: 0 })).toBe(false);
    });

    it('没有城市时应该返回 null', () => {
      const overmap = Overmap.create({ x: 0, y: 0 });

      expect(overmap.getNearestCity({ x: 10, y: 10, z: 0 })).toBeNull();
    });

    it('应该获取最近的城市', () => {
      let overmap = Overmap.create({ x: 0, y: 0 });
      const city1 = City.fromPositionSize(50, 50, 5, 'City 1');
      const city2 = City.fromPositionSize(150, 150, 5, 'City 2');
      overmap = overmap.addCity(city1).addCity(city2);

      const nearest = overmap.getNearestCity({ x: 60, y: 60, z: 0 });

      expect(nearest).toEqual(city1);
    });
  });

  describe('序列化', () => {
    it('应该转换为 JSON', () => {
      const overmap = Overmap.create({ x: 5, y: 10 });

      const json = overmap.toJson();

      expect(json.localPos).toEqual({ x: 5, y: 10 });
      expect(json.layers).toHaveLength(21);
      expect(json.cities).toEqual([]);
    });

    it('应该从 JSON 创建', () => {
      const json = {
        localPos: { x: 5, y: 10 },
        layers: [
          {
            terrain: [['10,20', 'forest']],
            visible: [['10,20', 4]],
            explored: [['10,20', true]],
            notes: [],
            extras: [],
          },
        ],
        cities: [],
        radios: [],
        connections: [],
        specials: [],
      };

      const overmap = Overmap.fromJson(json);

      expect(overmap.localPos).toEqual({ x: 5, y: 10 });
      expect(overmap.getTerrain({ x: 10, y: 20, z: 0 })).toBe('forest');
      expect(overmap.getSeen({ x: 10, y: 20, z: 0 })).toBe(OmVisionLevel.FULL);
    });

    it('应该创建广播塔', () => {
      const tower = Overmap.createRadioTower(
        10,
        20,
        200,
        'Test message',
        'MESSAGE_BROADCAST' as any
      );

      expect(tower.position).toEqual({ x: 10, y: 20 });
      expect(tower.strength).toBe(200);
      expect(tower.message).toBe('Test message');
    });
  });

  describe('笔记范围查询', () => {
    it('应该查找范围内的笔记', () => {
      const note1 = {
        text: 'Note 1',
        position: { x: 50, y: 50, z: 0 },
        dangerous: false,
        dangerRadius: 0,
      };
      const note2 = {
        text: 'Note 2',
        position: { x: 60, y: 60, z: 0 },
        dangerous: false,
        dangerRadius: 0,
      };
      const note3 = {
        text: 'Note 3',
        position: { x: 100, y: 100, z: 0 },
        dangerous: false,
        dangerRadius: 0,
      };

      let overmap = Overmap.create({ x: 0, y: 0 });
      overmap = overmap.addNote(note1).addNote(note2).addNote(note3);

      const notes = overmap.findNotesInRange({ x: 55, y: 55, z: 0 }, 15);

      expect(notes).toHaveLength(2);
      expect(notes).toContainEqual(note1);
      expect(notes).toContainEqual(note2);
      expect(notes).not.toContainEqual(note3);
    });
  });
});
