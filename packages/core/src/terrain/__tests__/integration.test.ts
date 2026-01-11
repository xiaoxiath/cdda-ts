import { describe, it, expect } from 'vitest';
import { TerrainLoader } from '../TerrainLoader';
import { TerrainFlags, TerrainFlag } from '../types';

describe('Terrain Integration Tests', () => {
  /**
   * 集成测试：完整的地形加载和使用流程
   */
  describe('Terrain loading workflow', () => {
    it('should load and use terrain data', async () => {
      const loader = new TerrainLoader();

      // 加载测试数据
      const testData = await import('./test-data.json');
      const data = await loader.loadFromJson(testData.default);

      // 验证数据已加载
      expect(data.size()).toBeGreaterThan(0);

      // 查找地形
      const dirt = data.findByName('dirt');
      expect(dirt).toBeDefined();
      expect(dirt?.symbol).toBe('.');
      expect(dirt?.isTransparent()).toBe(true);
      expect(dirt?.isPassable()).toBe(true);

      // 测试墙
      const wall = data.findByName('wooden wall');
      expect(wall).toBeDefined();
      expect(wall?.symbol).toBe('#');
      expect(wall?.isTransparent()).toBe(false);
      expect(wall?.isPassable()).toBe(false);
      expect(wall?.isBashable()).toBe(true);

      // 测试门
      const door = data.findByName('closed door');
      expect(door).toBeDefined();
      expect(door?.canOpen()).toBe(true);

      // 测试连接组
      expect(wall?.getConnectGroup()).toBe('WALL');
      // Note: connects_to is not set in test data, only connect_groups
      expect(wall?.connectGroups.has('WALL')).toBe(true);
      expect(wall?.connectGroups.has('WOOD')).toBe(true);
    });

    it('should filter terrains by properties', async () => {
      const loader = new TerrainLoader();

      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 获取所有墙
      const walls = data.getWalls();
      expect(walls.length).toBeGreaterThan(0);
      expect(walls.every((w) => w.flags.isWall())).toBe(true);

      // 获取所有平坦地形
      const flat = data.getFlatTerrains();
      expect(flat.length).toBeGreaterThan(0);

      // 按标志过滤
      const transparent = data.filterByFlag('TRANSPARENT');
      expect(transparent.length).toBeGreaterThan(0);
    });

    it('should handle terrain transformations', async () => {
      const loader = new TerrainLoader();

      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 测试门的开/关转换
      const closedDoor = data.findByName('closed door');
      expect(closedDoor?.canOpen()).toBe(true);

      if (closedDoor?.open) {
        const openDoor = data.get(closedDoor.open);
        expect(openDoor?.name).toBe('open door');
        expect(openDoor?.canClose()).toBe(true);
      }

      // 测试破坏转换
      const wall = data.findByName('wooden wall');
      if (wall?.bash?.ter) {
        const afterBash = data.get(wall.bash.ter);
        expect(afterBash).toBeDefined();
      }
    });
  });

  /**
   * 使用场景测试
   */
  describe('Terrain usage scenarios', () => {
    it('should support building mechanics', async () => {
      const loader = new TerrainLoader();
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 玩家只能在平坦地形上建造
      const floor = data.findByName('floor');
      expect(floor?.canBuildOn()).toBe(true);

      const water = data.findByName('pool of water');
      expect(water?.canBuildOn()).toBe(false);

      const tree = data.findByName('tree');
      expect(tree?.canBuildOn()).toBe(false);
    });

    it('should support movement calculations', async () => {
      const loader = new TerrainLoader();
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 计算移动消耗
      const dirt = data.findByName('dirt');
      expect(dirt?.getMoveCost()).toBe(2);

      const floor = data.findByName('floor');
      expect(floor?.getMoveCost()).toBe(1);

      const wall = data.findByName('wooden wall');
      expect(wall?.getMoveCost()).toBe(0); // 不可通行
    });

    it('should support danger assessment', async () => {
      const loader = new TerrainLoader();
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 检查危险地形
      const water = data.findByName('pool of water');
      expect(water?.isDangerous()).toBe(true);

      const safe = data.findByName('dirt');
      expect(safe?.isDangerous()).toBe(false);
    });

    it('should support display rendering', async () => {
      const loader = new TerrainLoader();
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 获取渲染信息
      const dirt = data.findByName('dirt');
      const display = dirt?.getDisplayInfo();

      expect(display).toEqual({
        symbol: '.',
        color: 'brown',
        name: 'dirt',
      });
    });

    it('should support bash mechanics', async () => {
      const loader = new TerrainLoader();
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 测试破坏难度
      const wall = data.findByName('wooden wall');
      const difficulty = wall?.getBashDifficulty();

      expect(difficulty).toBe(30); // (20 + 40) / 2

      // 验证破坏信息
      expect(wall?.bash).toBeDefined();
      expect(wall?.bash?.sound).toBe('crash');
      expect(wall?.bash?.strMin).toBe(20);
      expect(wall?.bash?.strMax).toBe(40);
    });
  });

  /**
   * 性能测试
   */
  describe('Terrain performance', () => {
    it('should handle large datasets efficiently', async () => {
      const loader = new TerrainLoader();

      // 创建大量测试数据
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        type: 'terrain',
        id: `t_test_${i}`,
        name: `test terrain ${i}`,
        symbol: '.',
        color: 'white',
        flags: ['TRANSPARENT', 'FLAT'],
      }));

      const start = Date.now();
      await loader.loadFromJson(largeDataset);
      const duration = Date.now() - start;

      // 应该在合理时间内完成
      expect(duration).toBeLessThan(1000);
      expect(loader.getData().size()).toBe(1000);
    });

    it('should provide efficient lookups', async () => {
      const loader = new TerrainLoader();

      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 测试查找性能
      const iterations = 10000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        data.findBySymbol('.');
        data.findByName('dirt');
      }

      const duration = Date.now() - start;

      // 应该快速完成
      expect(duration).toBeLessThan(100);
    });
  });

  /**
   * 边界情况测试
   */
  describe('Terrain edge cases', () => {
    it('should handle missing optional fields', async () => {
      const loader = new TerrainLoader();

      const minimalTerrain = [
        {
          type: 'terrain',
          id: 't_minimal',
          name: 'minimal',
          symbol: '.',
          color: 'white',
        },
      ];

      const data = await loader.loadFromJson(minimalTerrain);
      const terrain = data.findByName('minimal');

      expect(terrain).toBeDefined();
      expect(terrain?.moveCost).toBe(2); // 默认值
      expect(terrain?.flags.size).toBe(0); // 空
    });

    it('should handle complex flag combinations', async () => {
      const loader = new TerrainLoader();

      const complexTerrain = [
        {
          type: 'terrain',
          id: 't_complex',
          name: 'complex',
          symbol: '#',
          color: 'gray',
          flags: [
            'TRANSPARENT',
            'FLAT',
            'INDOORS',
            'DARKNESS',
            'DIGGABLE',
            'FLAMMABLE',
          ],
        },
      ];

      const data = await loader.loadFromJson(complexTerrain);
      const terrain = data.findByName('complex');

      expect(terrain?.flags.size).toBe(6);
      expect(terrain?.isTransparent()).toBe(true);
      expect(terrain?.flags.isFlat()).toBe(true);
      expect(terrain?.flags.isIndoors()).toBe(true);
    });

    it('should handle invalid data gracefully', async () => {
      const loader = new TerrainLoader();

      const mixedData = [
        { type: 'terrain', id: 't_valid', name: 'valid', symbol: '.', color: 'white' },
        { type: 'furniture', id: 'f_invalid', name: 'invalid' }, // 错误类型
        { type: 'terrain', id: 't_incomplete', name: 'incomplete' }, // 缺少字段
        { type: 'terrain', id: 't_another', name: 'another', symbol: '"', color: 'green' },
      ];

      // 应该解析有效的地形，忽略无效的
      const data = await loader.loadFromJson(mixedData);

      expect(data.size()).toBeGreaterThanOrEqual(1);
    });
  });
});
