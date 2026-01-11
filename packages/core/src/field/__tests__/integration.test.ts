import { describe, it, expect, beforeEach } from 'vitest';
import { FieldTypeLoader } from '../FieldTypeLoader';
import { FieldEntry } from '../FieldEntry';
import { FieldTypeFlag } from '../types';

describe('Field Integration Tests', () => {
  let loader: FieldTypeLoader;

  beforeEach(() => {
    loader = new FieldTypeLoader();
  });

  /**
   * 集成测试：完整的场类型加载和使用流程
   */
  describe('Field type loading workflow', () => {
    it('should load and use field type data', async () => {
      const testData = await import('./test-data.json');
      const data = await loader.loadFromJson(testData.default);

      expect(data.size()).toBeGreaterThan(0);

      // 查找场类型
      const fire = data.get('fd_fire');
      expect(fire).toBeDefined();
      expect(fire?.id).toBe('fd_fire');
      expect(fire?.isFire()).toBe(true);
      expect(fire?.isDangerous()).toBe(true);

      // 测试烟雾
      const smoke = data.get('fd_smoke');
      expect(smoke).toBeDefined();
      expect(smoke?.isSmoke()).toBe(true);
      expect(smoke?.isGas()).toBe(true);

      // 测试血迹
      const blood = data.get('fd_blood');
      expect(blood).toBeDefined();
      expect(blood?.isLiquid()).toBe(true);
      expect(blood?.flags.has(FieldTypeFlag.BLOODY)).toBe(true);
    });

    it('should filter field types by properties', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 获取所有火场
      const fires = data.getFireFields();
      expect(fires.length).toBeGreaterThan(0);
      expect(fires.every((f) => f.isFire())).toBe(true);

      // 获取所有烟雾
      const smokes = data.getSmokeFields();
      expect(smokes.length).toBeGreaterThan(0);

      // 获取所有有毒场
      const toxic = data.getToxicFields();
      expect(toxic.length).toBeGreaterThan(0);
    });

    it('should create and manage field entries', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 创建火焰场实例
      const fireEntry = data.createEntry('fd_fire', 2);
      expect(fireEntry).toBeDefined();
      expect(fireEntry?.intensity).toBe(2);
      expect(fireEntry?.type).toBe('fd_fire');

      // 创建烟雾场实例
      const smokeEntry = data.createEntry('fd_smoke', 1);
      expect(smokeEntry).toBeDefined();
      expect(smokeEntry?.intensity).toBe(1);

      // 更新场实例
      if (fireEntry) {
        let updated = fireEntry;
        for (let i = 0; i < 5; i++) {
          updated = data.updateEntry(updated);
        }
        expect(updated.age).toBe(5);
      }
    });
  });

  /**
   * 使用场景测试
   */
  describe('Field usage scenarios', () => {
    it('should support fire mechanics', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();
      const fire = data.get('fd_fire');

      expect(fire?.canSpread()).toBe(true);
      expect(fire?.canIgnite()).toBe(true);
      expect(fire?.emitsLight()).toBe(true);
      expect(fire?.getLightModifier()).toBeGreaterThan(0);

      // 创建火焰场实例
      const entry = fire?.createEntry(3);
      expect(entry?.intensity).toBe(3);
      expect(entry?.isAlive).toBe(true);
    });

    it('should support visibility mechanics', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 测试透明场
      const smoke = data.get('fd_smoke');
      expect(smoke?.isTransparent()).toBe(true);
      expect(smoke?.blocksVision()).toBe(false);

      // 测试阻挡视线的场
      const web = data.get('fd_web');
      expect(web?.blocksVision()).toBe(false); // 网通常是透明的
    });

    it('should support damage mechanics', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 测试危险场
      const dangerous = data.getDangerousFields();
      expect(dangerous.length).toBeGreaterThan(0);

      dangerous.forEach((field) => {
        expect(field.isDangerous()).toBe(true);
        expect(field.getDangerLevel()).toBeGreaterThan(0);
      });

      // 测试酸场
      const acid = data.get('fd_acid');
      expect(acid?.isAcid()).toBe(true);
      expect(acid?.isDangerous()).toBe(true);
    });

    it('should support field decay', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 测试血迹衰减
      const blood = data.get('fd_blood');
      expect(blood?.shouldAccelerateDecay()).toBe(true);

      if (blood) {
        const entry = blood.createEntry(2);
        expect(entry?.decayTime).toBeGreaterThan(0);

        // 模拟衰减
        let current = entry;
        if (current) {
          for (let i = 0; i < blood.halfLife; i++) {
            current = data.updateEntry(current);
          }

          // 应该衰减了强度
          expect(current.intensity).toBeLessThan(entry.intensity);
        }
      }
    });

    it('should support field display', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      const fire = data.get('fd_fire');
      const entry = fire?.createEntry(2);

      if (entry) {
        const info = data.getEntryDisplayInfo(entry);

        expect(info?.symbol).toBeDefined();
        expect(info?.color).toBeDefined();
        expect(info?.name).toBeDefined();
        expect(info?.priority).toBeGreaterThan(0);
      }
    });

    it('should support field stacking and priority', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 创建多个场实例
      const fireEntry = data.createEntry('fd_fire', 1);
      const smokeEntry = data.createEntry('fd_smoke', 2);
      const toxicEntry = data.createEntry('fd_toxic_cloud', 1);

      if (fireEntry && smokeEntry && toxicEntry) {
        const entries = [smokeEntry, fireEntry, toxicEntry];

        // 合并（应该选择优先级最高的）
        const merged = data.mergeEntries(entries);

        // 火焰优先级最高（10）
        expect(merged?.type).toBe('fd_fire');
      }
    });
  });

  /**
   * 场的传播和扩散
   */
  describe('Field spread mechanics', () => {
    it('should support fire spread', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const fire = loader.getData().get('fd_fire');

      expect(fire?.canSpread()).toBe(true);
      expect(fire?.fireSpreadChance).toBeGreaterThan(0);

      // 模拟传播检查
      const spreadRoll = Math.random() * 100;
      if (fire && spreadRoll < fire.fireSpreadChance) {
        // 火焰传播
        const newFire = loader.getData().createEntry('fd_fire', 1);
        expect(newFire).toBeDefined();
      }
    });

    it('should support smoke diffusion', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const smoke = loader.getData().get('fd_smoke');

      expect(smoke?.flags.spreads()).toBe(false); // 烟雾不主动传播
      expect(smoke?.isGas()).toBe(true);
    });
  });

  /**
   * 环境效果测试
   */
  describe('Environmental effects', () => {
    it('should support light mechanics', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 发光场
      const lightEmitters = data.getLightEmitters();
      expect(lightEmitters.length).toBeGreaterThan(0);

      lightEmitters.forEach((field) => {
        expect(field.emitsLight()).toBe(true);
        expect(field.getLightModifier()).toBeGreaterThan(0);
      });

      // 吸收光的场
      // 大多数场不吸收光，但可以测试
      const allFields = data.getAll();
      const consumers = allFields.filter((f) => f.consumesLight());
    });

    it('should support phase interactions', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 液体场
      const liquids = data.getLiquidFields();
      liquids.forEach((field) => {
        expect(field.isLiquid()).toBe(true);
        expect(field.isGas()).toBe(false);
      });

      // 气体场
      const gases = data.getGasFields();
      gases.forEach((field) => {
        expect(field.isGas()).toBe(true);
        expect(field.isLiquid()).toBe(false);
      });
    });
  });

  /**
   * 性能测试
   */
  describe('Field performance', () => {
    it('should handle large datasets efficiently', async () => {
      // 创建大量测试数据
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        type: 'field_type',
        id: `fd_test_${i}`,
        name: `test field ${i}`,
        intensity_levels: [{ name: 'test', color: 'white' }],
        half_life: 1000,
        phase: 'gas',
      }));

      const start = Date.now();
      await loader.loadFromJson(largeDataset);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
      expect(loader.getData().size()).toBe(1000);
    });

    it('should provide efficient field updates', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      const entry = data.createEntry('fd_fire', 3);
      if (!entry) return;

      // 测试批量更新性能
      const iterations = 10000;
      const start = Date.now();

      let current = entry;
      for (let i = 0; i < iterations; i++) {
        current = data.updateEntry(current);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should efficiently merge multiple entries', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      const entries = [
        data.createEntry('fd_fire', 1),
        data.createEntry('fd_smoke', 2),
        data.createEntry('fd_toxic_cloud', 1),
        data.createEntry('fd_acid', 1),
        data.createEntry('fd_web', 2),
      ].filter((e): e is FieldEntry => e !== undefined);

      const start = Date.now();
      const merged = data.mergeEntries(entries);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10);
      expect(merged).toBeDefined();
    });
  });

  /**
   * 边界情况测试
   */
  describe('Field edge cases', () => {
    it('should handle missing optional fields', async () => {
      const minimalField = [
        {
          type: 'field_type',
          id: 'fd_minimal',
          intensity_levels: [{ name: 'minimal' }],
          half_life: 1000,
          phase: 'gas',
        },
      ];

      const data = await loader.loadFromJson(minimalField);
      const fieldType = data.get('fd_minimal');

      expect(fieldType).toBeDefined();
      expect(fieldType?.name).toBe('fd_minimal');
      expect(fieldType?.shouldDisplay()).toBe(true);
      expect(fieldType?.isTransparent()).toBe(true);
    });

    it('should handle complex intensity levels', async () => {
      const complexField = [
        {
          type: 'field_type',
          id: 'fd_complex',
          name: 'complex field',
          intensity_levels: [
            { name: 'weak', color: 'light_blue', symbol: ':' },
            { name: 'moderate', color: 'blue', symbol: ':' },
            { name: 'strong', color: 'dark_blue', symbol: ':' },
          ],
          half_life: 100,
          phase: 'liquid',
        },
      ];

      const data = await loader.loadFromJson(complexField);
      const fieldType = data.get('fd_complex');

      expect(fieldType?.getMaxIntensity()).toBe(3);
      expect(fieldType?.getIntensityName(1)).toBe('weak');
      expect(fieldType?.getIntensityColor(2)).toBe('blue');
      expect(fieldType?.getIntensitySymbol(3)).toBe(':');
    });

    it('should handle invalid data gracefully', async () => {
      const mixedData = [
        { type: 'field_type', id: 'fd_valid', intensity_levels: [{ name: 'valid' }], half_life: 100, phase: 'gas' },
        { type: 'furniture', id: 'f_invalid' }, // 错误类型
        { type: 'field_type', id: 'fd_incomplete' }, // 缺少字段
        { type: 'field_type', id: 'fd_another', intensity_levels: [{ name: 'another' }], half_life: 100, phase: 'liquid' },
      ];

      const data = await loader.loadFromJson(mixedData);

      expect(data.size()).toBeGreaterThanOrEqual(1);
    });

    it('should handle zero and negative values', async () => {
      const edgeField = [
        {
          type: 'field_type',
          id: 'fd_edge',
          name: 'edge case',
          intensity_levels: [{ name: 'edge' }],
          half_life: 0,
          phase: 'gas',
          light_emitted: 0,
          light_consumed: 0,
          danger_level: 0,
        },
      ];

      const data = await loader.loadFromJson(edgeField);
      const fieldType = data.get('fd_edge');

      expect(fieldType?.calculateDecayTime()).toBe(0);
      expect(fieldType?.emitsLight()).toBe(false);
      expect(fieldType?.consumesLight()).toBe(false);
      expect(fieldType?.isDangerous()).toBe(false);
    });

    it('should handle extreme durations', async () => {
      const durationField = [
        {
          type: 'field_type',
          id: 'fd_duration_test',
          name: 'duration test',
          intensity_levels: [{ name: 'test' }],
          half_life: '1 days',
          phase: 'gas',
        },
      ];

      const data = await loader.loadFromJson(durationField);
      const fieldType = data.get('fd_duration_test');

      // 1 天 = 518400 回合
      expect(fieldType?.halfLife).toBe(518400);
    });
  });

  /**
   * 场生命周期测试
   */
  describe('Field lifecycle', () => {
    it('should support complete field lifecycle', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();
      const blood = data.get('fd_blood');

      if (!blood) return;

      // 1. 创建
      let entry = blood.createEntry(3);
      expect(entry?.intensity).toBe(3);
      expect(entry?.isAlive).toBe(true);

      if (!entry) return;

      // 2. 衰减
      for (let i = 0; i < blood.halfLife && entry.intensity > 0; i++) {
        entry = data.updateEntry(entry);
      }

      expect(entry.intensity).toBeLessThan(3);
      expect(entry?.intensity).toBe(2);

      // 3. 继续衰减直到死亡
      while (entry?.checkAlive() && entry.intensity > 0) {
        entry = data.updateEntry(entry);
      }

      expect(entry?.isAlive).toBe(false);
    });

    it('should support field resurrection', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const data = loader.getData();

      // 创建一个死亡的场
      let entry = FieldEntry.create('fd_fire', 1);
      if (!entry) return;

      entry = entry.kill();
      expect(entry.checkAlive()).toBe(false);

      // 创建新的实例
      const newEntry = data.createEntry('fd_fire', 2);
      expect(newEntry?.checkAlive()).toBe(true);
      expect(newEntry?.intensity).toBe(2);
    });
  });

  /**
   * 统计信息测试
   */
  describe('Statistics', () => {
    it('should provide accurate statistics', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const stats = loader.getStats();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byPhase).toBeDefined();

      // 验证分类统计
      const allFields = loader.getData().getAll();

      expect(stats.fire).toBe(allFields.filter((f) => f.isFire()).length);
      expect(stats.smoke).toBe(allFields.filter((f) => f.isSmoke()).length);
      expect(stats.toxic).toBe(allFields.filter((f) => f.isToxic()).length);
      expect(stats.dangerous).toBe(allFields.filter((f) => f.isDangerous()).length);
      expect(stats.lightEmitters).toBe(allFields.filter((f) => f.emitsLight()).length);
    });

    it('should categorize fields by phase correctly', async () => {
      const testData = await import('./test-data.json');
      await loader.loadFromJson(testData.default);

      const stats = loader.getStats();

      expect(stats.byPhase).toHaveProperty('gas');
      expect(stats.byPhase).toHaveProperty('liquid');
      expect(stats.byPhase).toHaveProperty('plasma');
      expect(stats.byPhase).toHaveProperty('solid');
      expect(stats.byPhase).toHaveProperty('energy');
    });
  });
});
