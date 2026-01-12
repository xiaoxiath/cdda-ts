import { describe, it, expect, beforeEach } from 'vitest';
import { FurnitureLoader } from '../FurnitureLoader';
import { FurnitureFlags, FurnitureFlag } from '../types';

describe('Furniture Integration Tests', () => {
  let loader: FurnitureLoader;

  beforeEach(() => {
    loader = new FurnitureLoader();
  });

  /**
   * 集成测试：完整的家具加载和使用流程
   */
  describe('Furniture loading workflow', () => {
    it('should load and use furniture data', async () => {
      const testData = await import('./test-data.json');
      const data = await loader.loadFromJson(testData.default);

      expect(data.size()).toBeGreaterThan(0);

      // 查找家具
      const chair = data.findByName('chair');
      expect(chair).toBeDefined();
      expect(chair?.symbol).toBe('_');
      expect(chair?.isSittable()).toBe(true);
      expect(chair?.getComfort()).toBe(1);

      // 测试工作台
      const workbench = data.findByName('workbench');
      expect(workbench).toBeDefined();
      expect(workbench?.isWorkbench()).toBe(true);
      expect(workbench?.getWorkbenchMultiplier()).toBeGreaterThan(0);

      // 测试植物
      const sapling = data.findByName('sapling');
      expect(sapling).toBeDefined();
      expect(sapling?.isPlant()).toBe(true);
      expect(sapling?.getPlantTransform()).toBeDefined();
    });

    it('should filter furnitures by properties', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 获取所有工作台
      const workbenches = data.getWorkbenches();
      expect(workbenches.length).toBeGreaterThan(0);
      expect(workbenches.every((w) => w.isWorkbench())).toBe(true);

      // 获取所有可坐家具
      const sittable = data.getSittable();
      expect(sittable.length).toBeGreaterThan(0);

      // 获取所有容器
      const containers = data.getContainers();
      expect(containers.length).toBeGreaterThan(0);
    });

    it('should handle furniture transformations', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 测试植物生长
      const sapling = data.findByName('sapling');
      if (sapling?.plant) {
        // 植物有变换目标和基础形态
        expect(sapling.getPlantTransform()).toBeDefined();
        expect(sapling.getPlantBase()).toBeDefined();
      }
    });
  });

  /**
   * 使用场景测试
   */
  describe('Furniture usage scenarios', () => {
    it('should support crafting mechanics', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 测试工作台倍率
      const workbench = data.findByName('workbench');
      expect(workbench?.getWorkbenchMultiplier()).toBeGreaterThan(0);
      expect(workbench?.getAllowedMass()).toBeGreaterThanOrEqual(0);
      expect(workbench?.getAllowedVolume()).toBeGreaterThanOrEqual(0);

      // 测试烤箱工作台
      const oven = data.findByName('oven');
      expect(oven?.isWorkbench()).toBe(true);
      expect(oven?.emitsLight()).toBe(true);
    });

    it('should support storage mechanics', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 测试容器
      const crate = data.findByName('crate');
      expect(crate?.isContainer()).toBe(true);
      expect(crate?.maxVolume).toBe(60000);

      // 测试货架
      const rack = data.findByName('rack');
      expect(rack?.maxVolume).toBe(1000);
    });

    it('should support comfort mechanics', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 测试舒适度排序
      const byComfort = data.sortByComfort();
      expect(byComfort[0].name).toBe('bed');
      expect(byComfort[0].getComfort()).toBe(10);

      const chair = data.findByName('chair');
      expect(chair?.getComfort()).toBe(1);

      const ash = data.findByName('ash');
      expect(ash?.getComfort()).toBe(-2);
    });

    it('should support movement mechanics', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 测试移动消耗修正
      const chair = data.findByName('chair');
      expect(chair?.getMoveCostModifier()).toBe(1);

      const crate = data.findByName('crate');
      expect(crate?.getMoveCostModifier()).toBe(2);

      // 测试所需力量
      const table = data.findByName('table');
      expect(table?.requiresMoving()).toBe(true);
      expect(table?.getRequiredStrength()).toBe(15);
    });

    it('should support light mechanics', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 测试发光家具
      const lamp = data.findByName('lamp');
      expect(lamp?.emitsLight()).toBe(true);
      expect(lamp?.getLight()).toBe(5);

      const oven = data.findByName('oven');
      expect(oven?.emitsLight()).toBe(true);
      expect(oven?.emitsField('fd_fire')).toBe(true);

      // 获取所有发光家具
      const emitters = data.getLightEmitters();
      expect(emitters.length).toBeGreaterThan(0);
    });

    it('should support bash mechanics', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 测试破坏难度
      const chair = data.findByName('chair');
      expect(chair?.isBashable()).toBe(true);
      expect(chair?.getBashDifficulty()).toBe(3); // (2 + 4) / 2

      const table = data.findByName('table');
      expect(table?.getBashDifficulty()).toBe(6); // (4 + 8) / 2

      const workbench = data.findByName('workbench');
      expect(workbench?.getBashDifficulty()).toBe(35); // (20 + 50) / 2
    });

    it('should support deconstruct mechanics', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 测试可拆解家具
      const support = data.findByName('wooden support');
      expect(support?.isDeconstructable()).toBe(true);
      expect(support?.deconstruct?.time).toBe(50);

      const crate = data.findByName('crate');
      expect(crate?.isDeconstructable()).toBe(true);
    });

    it('should support vision mechanics', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 测试透明家具
      const chair = data.findByName('chair');
      expect(chair?.blocksVision()).toBe(false);

      // 测试阻挡视线的家具
      const blockers = data.getVisionBlockers();
      // 大多数家具应该透明
      const transparent = data.getAll().filter((f) => f.isTransparent());
      expect(transparent.length).toBeGreaterThan(0);
    });

    it('should support door interactions', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 测试阻挡门的家具
      const doorFrame = data.findByName('door frame');
      expect(doorFrame?.blocksDoor()).toBe(true);
    });
  });

  /**
   * 性能测试
   */
  describe('Furniture performance', () => {
    it('should handle large datasets efficiently', async () => {
      // 创建大量测试数据
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        type: 'furniture',
        id: `f_test_${i}`,
        name: `test furniture ${i}`,
        symbol: '&',
        color: 'white',
        flags: ['TRANSPARENT'],
      }));

      const start = Date.now();
      await loader.loadFromJson(largeDataset);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
      expect(loader.getData().size()).toBe(1000);
    });

    it('should provide efficient lookups', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 测试查找性能
      const iterations = 10000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        data.findBySymbol('_');
        data.findByName('chair');
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });

  /**
   * 边界情况测试
   */
  describe('Furniture edge cases', () => {
    it('should handle missing optional fields', async () => {
      const minimalFurniture = [
        {
          type: 'furniture',
          id: 'f_minimal',
          name: 'minimal',
          symbol: '&',
          color: 'white',
        },
      ];

      const data = await loader.loadFromJson(minimalFurniture);
      const furniture = data.getAll()[0];

      expect(furniture).toBeDefined();
      expect(furniture.moveCost).toBe(0);
      expect(furniture.comfort).toBe(0);
      expect(furniture.flags.size).toBe(0);
    });

    it('should handle complex flag combinations', async () => {
      const complexFurniture = [
        {
          type: 'furniture',
          id: 'f_complex',
          name: 'complex',
          symbol: '&',
          color: 'gray',
          flags: ['TRANSPARENT', 'WORKBENCH', 'FLAT', 'OPERABLE'],
        },
      ];

      const data = await loader.loadFromJson(complexFurniture);
      const furniture = data.findByName('complex');

      expect(furniture?.flags.size).toBe(4);
      expect(furniture?.isTransparent()).toBe(true);
    });

    it('should handle invalid data gracefully', async () => {
      const mixedData = [
        { type: 'furniture', id: 'f_valid', name: 'valid', symbol: '_', color: 'white' },
        { type: 'terrain', id: 't_invalid', name: 'invalid' }, // 错误类型
        { type: 'furniture', id: 'f_incomplete', name: 'incomplete' }, // 缺少字段
        { type: 'furniture', id: 'f_another', name: 'another', symbol: '&', color: 'gray' },
      ];

      const data = await loader.loadFromJson(mixedData);

      expect(data.size()).toBeGreaterThanOrEqual(1);
    });

    it('should handle zero values correctly', async () => {
      const zeroFurniture = [
        {
          type: 'furniture',
          id: 'f_zero',
          name: 'zero values',
          symbol: '&',
          color: 'white',
          comfort: 0,
          required_str: 0,
          mass: 0,
          volume: 0,
          emitted_light: 0,
        },
      ];

      const data = await loader.loadFromJson(zeroFurniture);
      const furniture = data.findByName('zero values');

      expect(furniture?.getComfort()).toBe(0);
      expect(furniture?.requiresMoving()).toBe(false);
      expect(furniture?.emitsLight()).toBe(false);
    });
  });

  /**
   * 工作台功能测试
   */
  describe('Workbench features', () => {
    it('should support different workbench types', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();
      const workbenches = data.getWorkbenches();

      expect(workbenches.length).toBeGreaterThan(0);

      // 验证工作台属性
      workbenches.forEach((wb) => {
        expect(wb.isWorkbench()).toBe(true);
        expect(wb.getWorkbenchInfo()).toBeDefined();
      });
    });

    it('should support skill multipliers', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const workbench = loader.getData().findByName('workbench');

      expect(workbench?.getWorkbenchMultiplier()).toBeGreaterThan(0);
      expect(workbench?.getAllowedMass()).toBeGreaterThanOrEqual(0);
      expect(workbench?.getAllowedVolume()).toBeGreaterThanOrEqual(0);
    });

    it('should support workbench requirements', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const workbench = loader.getData().findByName('workbench');
      const wbInfo = workbench?.getWorkbenchInfo();

      expect(wbInfo?.multiplier).toBeGreaterThan(0);
      expect(workbench?.getMass()).toBeGreaterThan(0);
    });
  });

  /**
   * 植物功能测试
   */
  describe('Plant features', () => {
    it('should support plant growth stages', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const sapling = loader.getData().findByName('sapling');

      expect(sapling?.isPlant()).toBe(true);

      // 测试植物属性
      expect(sapling?.getPlantTransform()).toBeDefined();
      expect(sapling?.getPlantBase()).toBeDefined();
      expect(sapling?.getGrowthMultiplier()).toBeGreaterThan(0);
      expect(sapling?.getHarvestMultiplier()).toBeGreaterThan(0);
    });

    it('should support harvest multipliers', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const sapling = loader.getData().findByName('sapling');
      const plantData = sapling?.getPlantData();

      expect(plantData?.growthMultiplier).toBeDefined();
      expect(plantData?.harvestMultiplier).toBeDefined();
    });
  });
});
