/**
 * OvermapLayer 单元测试
 */

import { describe, it, expect } from 'vitest';
import { OvermapLayer } from '../OvermapLayer';
import { OmVisionLevel } from '../types';

describe('OvermapLayer', () => {
  describe('create', () => {
    it('应该创建空的 OvermapLayer', () => {
      const layer = OvermapLayer.create();

      expect(layer.terrain.size).toBe(0);
      expect(layer.visible.size).toBe(0);
      expect(layer.explored.size).toBe(0);
      expect(layer.notes).toEqual([]);
      expect(layer.extras).toEqual([]);
    });
  });

  describe('地形操作', () => {
    it('应该设置和获取地形', () => {
      const layer = OvermapLayer.create();
      const updated = layer.setTerrain(10, 20, 'forest');

      expect(updated.getTerrain(10, 20)).toBe('forest');
      expect(layer.getTerrain(10, 20)).toBe(''); // 原实例不变
    });

    it('应该批量填充默认地形', () => {
      const layer = OvermapLayer.create();
      const filled = layer.fillWithDefault('field');

      expect(filled.getTerrain(0, 0)).toBe('field');
      expect(filled.getTerrain(179, 179)).toBe('field');
      expect(filled.terrain.size).toBe(180 * 180);
    });

    it('应该查找所有指定地形的位置', () => {
      let layer = OvermapLayer.create();
      layer = layer.setTerrain(10, 10, 'forest');
      layer = layer.setTerrain(20, 20, 'forest');
      layer = layer.setTerrain(30, 30, 'field');

      const positions = layer.findTerrain('forest');

      expect(positions).toHaveLength(2);
      expect(positions).toContainEqual({ x: 10, y: 10 });
      expect(positions).toContainEqual({ x: 20, y: 20 });
    });

    it('应该查找随机地形位置', () => {
      let layer = OvermapLayer.create();
      layer = layer.setTerrain(50, 50, 'forest');

      const position = layer.findRandomTerrain('forest');

      expect(position).toEqual({ x: 50, y: 50 });
    });

    it('没有地形时应该返回 null', () => {
      const layer = OvermapLayer.create();
      const position = layer.findRandomTerrain('forest');

      expect(position).toBeNull();
    });
  });

  describe('可见性操作', () => {
    it('应该设置和获取视野等级', () => {
      const layer = OvermapLayer.create();
      const updated = layer.setVisible(10, 20, OmVisionLevel.FULL);

      expect(updated.getVisible(10, 20)).toBe(OmVisionLevel.FULL);
    });

    it('默认视野等级应该是 UNSEEN', () => {
      const layer = OvermapLayer.create();

      expect(layer.getVisible(10, 20)).toBe(OmVisionLevel.UNSEEN);
    });

    it('应该检查视野等级', () => {
      let layer = OvermapLayer.create();
      layer = layer.setVisible(10, 20, OmVisionLevel.DETAILS);

      expect(layer.hasVisibleLevel(10, 20, OmVisionLevel.VAGUE)).toBe(true);
      expect(layer.hasVisibleLevel(10, 20, OmVisionLevel.FULL)).toBe(false);
    });
  });

  describe('探索状态操作', () => {
    it('应该设置和检查探索状态', () => {
      const layer = OvermapLayer.create();
      const updated = layer.setExplored(10, 20, true);

      expect(updated.isExplored(10, 20)).toBe(true);
      expect(layer.isExplored(10, 20)).toBe(false);
    });

    it('应该探索位置', () => {
      const layer = OvermapLayer.create();
      const updated = layer.explore(10, 20);

      expect(updated.isExplored(10, 20)).toBe(true);
    });

    it('默认应该是未探索', () => {
      const layer = OvermapLayer.create();

      expect(layer.isExplored(10, 20)).toBe(false);
    });

    it('应该计算已探索数量', () => {
      let layer = OvermapLayer.create();
      layer = layer.setExplored(10, 10, true);
      layer = layer.setExplored(20, 20, true);
      layer = layer.setExplored(30, 30, true);

      expect(layer.getExploredCount()).toBe(3);
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
      const layer = OvermapLayer.create();
      const updated = layer.addNote(note);

      expect(updated.notes).toHaveLength(1);
      expect(updated.notes[0]).toEqual(note);
      expect(layer.notes).toHaveLength(0);
    });

    it('应该获取笔记', () => {
      let layer = OvermapLayer.create();
      layer = layer.addNote(note);

      expect(layer.getNote(10, 20)).toEqual(note);
    });

    it('应该检查是否有笔记', () => {
      let layer = OvermapLayer.create();
      layer = layer.addNote(note);

      expect(layer.hasNote(10, 20)).toBe(true);
      expect(layer.hasNote(30, 40)).toBe(false);
    });

    it('应该移除笔记', () => {
      let layer = OvermapLayer.create();
      layer = layer.addNote(note);
      const updated = layer.removeNote(10, 20);

      expect(updated.hasNote(10, 20)).toBe(false);
      expect(layer.hasNote(10, 20)).toBe(true);
    });
  });

  describe('额外内容操作', () => {
    const extra = {
      id: 'extra_1',
      position: { x: 10, y: 20 },
    };

    it('应该添加额外内容', () => {
      const layer = OvermapLayer.create();
      const updated = layer.addExtra(extra);

      expect(updated.extras).toHaveLength(1);
      expect(updated.extras[0]).toEqual(extra);
    });

    it('应该获取额外内容', () => {
      let layer = OvermapLayer.create();
      layer = layer.addExtra(extra);

      expect(layer.getExtra(10, 20)).toEqual(extra);
    });

    it('应该检查是否有额外内容', () => {
      let layer = OvermapLayer.create();
      layer = layer.addExtra(extra);

      expect(layer.hasExtra(10, 20)).toBe(true);
      expect(layer.hasExtra(30, 40)).toBe(false);
    });

    it('应该移除额外内容', () => {
      let layer = OvermapLayer.create();
      layer = layer.addExtra(extra);
      const updated = layer.removeExtra({ x: 10, y: 20 });

      expect(updated.hasExtra(10, 20)).toBe(false);
    });
  });

  describe('序列化', () => {
    it('应该转换为 JSON', () => {
      let layer = OvermapLayer.create();
      layer = layer.setTerrain(10, 20, 'forest');
      layer = layer.setVisible(10, 20, OmVisionLevel.FULL);
      layer = layer.setExplored(10, 20, true);

      const json = layer.toJson();

      expect(json.terrain).toContainEqual(['10,20', 'forest']);
      expect(json.visible).toContainEqual(['10,20', OmVisionLevel.FULL]);
      expect(json.explored).toContainEqual(['10,20', true]);
    });

    it('应该从 JSON 创建', () => {
      const json = {
        terrain: [['10,20', 'forest']],
        visible: [['10,20', 4]],
        explored: [['10,20', true]],
        notes: [],
        extras: [],
      };

      const layer = OvermapLayer.fromJson(json);

      expect(layer.getTerrain(10, 20)).toBe('forest');
      expect(layer.getVisible(10, 20)).toBe(OmVisionLevel.FULL);
      expect(layer.isExplored(10, 20)).toBe(true);
    });
  });
});
