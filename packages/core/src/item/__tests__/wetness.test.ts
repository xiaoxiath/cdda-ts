/**
 * Wetness System Tests - 潮湿系统测试
 *
 * 测试物品潮湿系统的功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WetnessLevel,
  createWetnessData,
  getWetnessLevel,
  getWetnessLevelName,
  calculateWetnessEffect,
  updateWetness,
  addWetness,
  setWetness,
  isWet,
  isSoaked,
  getWetnessDescription,
  getMaterialDryFactor,
  getMaterialAbsorbFactor,
  calculateAbsorbedWetness,
  Wetness,
  BASE_DRY_RATE,
  WETNESS_WARMTH_PENALTY,
  WETNESS_WEIGHT_BONUS,
  type WetnessData,
} from '../wetness';

describe('WetnessLevel', () => {
  it('应该正确获取潮湿等级', () => {
    expect(getWetnessLevel(0)).toBe(WetnessLevel.BONE_DRY);
    expect(getWetnessLevel(5)).toBe(WetnessLevel.BONE_DRY);
    expect(getWetnessLevel(10)).toBe(WetnessLevel.DRY);
    expect(getWetnessLevel(25)).toBe(WetnessLevel.DRY);
    expect(getWetnessLevel(30)).toBe(WetnessLevel.DAMP);
    expect(getWetnessLevel(45)).toBe(WetnessLevel.DAMP);
    expect(getWetnessLevel(50)).toBe(WetnessLevel.WET);
    expect(getWetnessLevel(65)).toBe(WetnessLevel.WET);
    expect(getWetnessLevel(70)).toBe(WetnessLevel.SOAKED);
    expect(getWetnessLevel(85)).toBe(WetnessLevel.SOAKED);
    expect(getWetnessLevel(90)).toBe(WetnessLevel.DRENCHED);
    expect(getWetnessLevel(100)).toBe(WetnessLevel.DRENCHED);
  });

  it('应该正确获取潮湿等级名称', () => {
    expect(getWetnessLevelName(WetnessLevel.BONE_DRY)).toBe('骨干');
    expect(getWetnessLevelName(WetnessLevel.DRY)).toBe('干燥');
    expect(getWetnessLevelName(WetnessLevel.DAMP)).toBe('微湿');
    expect(getWetnessLevelName(WetnessLevel.WET)).toBe('潮湿');
    expect(getWetnessLevelName(WetnessLevel.SOAKED)).toBe('湿透');
    expect(getWetnessLevelName(WetnessLevel.DRENCHED)).toBe('滴水');
  });
});

describe('createWetnessData', () => {
  it('应该创建默认潮湿数据', () => {
    const data = createWetnessData();
    expect(data.current).toBe(0);
    expect(data.dryFactor).toBe(1.0);
    expect(data.envHumidity).toBe(0.5);
    expect(data.lastUpdate).toBeGreaterThan(0);
  });

  it('应该创建指定潮湿度的数据', () => {
    const data = createWetnessData(50);
    expect(data.current).toBe(50);
  });

  it('应该限制潮湿度在 0-100 范围内', () => {
    const data1 = createWetnessData(-10);
    expect(data1.current).toBe(0);

    const data2 = createWetnessData(150);
    expect(data2.current).toBe(100);
  });

  it('应该限制环境湿度在 0-1 范围内', () => {
    const data1 = createWetnessData(0, 1.0, -0.5);
    expect(data1.envHumidity).toBe(0);

    const data2 = createWetnessData(0, 1.0, 1.5);
    expect(data2.envHumidity).toBe(1);
  });
});

describe('calculateWetnessEffect', () => {
  it('应该正确计算保暖惩罚', () => {
    const effect = calculateWetnessEffect(50);
    const expectedWarmth = -50 * WETNESS_WARMTH_PENALTY;
    expect(effect.warmthModifier).toBeCloseTo(expectedWarmth);
  });

  it('应该正确计算重量修正', () => {
    const effect = calculateWetnessEffect(50);
    const expectedWeight = 50 * WETNESS_WEIGHT_BONUS;
    expect(effect.weightModifier).toBeCloseTo(expectedWeight);
  });

  it('应该正确计算舒适度惩罚', () => {
    const effect = calculateWetnessEffect(50);
    expect(effect.comfortModifier).toBeCloseTo(-0.5);
  });

  it('干燥物品应该没有影响', () => {
    const effect = calculateWetnessEffect(0);
    // JavaScript 中 -0 和 0 是不同的，使用 toBeCloseTo 或比较绝对值
    expect(Math.abs(effect.warmthModifier)).toBe(0);
    expect(Math.abs(effect.weightModifier)).toBe(0);
    expect(Math.abs(effect.comfortModifier)).toBe(0);
  });
});

describe('updateWetness', () => {
  it('应该随时间干燥物品', () => {
    const data = createWetnessData(50, 1.0, 0.5);
    const currentTime = data.lastUpdate;
    const oneHourLater = currentTime + 3600000; // 1小时后

    const updated = updateWetness(data, oneHourLater);

    // 物品应该变干燥
    expect(updated.current).toBeLessThan(data.current);
    expect(updated.lastUpdate).toBe(oneHourLater);
  });

  it('高湿度环境干燥更慢', () => {
    const data1 = createWetnessData(50, 1.0, 0.2); // 低湿度
    const data2 = createWetnessData(50, 1.0, 0.8); // 高湿度
    const currentTime = data1.lastUpdate;
    const tenHoursLater = currentTime + 36000000; // 10小时后

    const updated1 = updateWetness(data1, tenHoursLater);
    const updated2 = updateWetness(data2, tenHoursLater);

    // 低湿度环境干燥更快
    expect(updated1.current).toBeLessThan(updated2.current);
  });

  it('高干燥因子干燥更快', () => {
    const data1 = createWetnessData(50, 0.5, 0.5); // 低干燥因子
    const data2 = createWetnessData(50, 2.0, 0.5); // 高干燥因子
    const currentTime = data1.lastUpdate;
    const tenHoursLater = currentTime + 36000000; // 10小时后

    const updated1 = updateWetness(data1, tenHoursLater);
    const updated2 = updateWetness(data2, tenHoursLater);

    // 高干燥因子干燥更快
    expect(updated2.current).toBeLessThan(updated1.current);
  });

  it('不应该让潮湿度变成负数', () => {
    const data = createWetnessData(10, 1.0, 0.5);
    const tenHoursLater = data.lastUpdate + 36000000; // 10小时后

    const updated = updateWetness(data, tenHoursLater);

    expect(updated.current).toBeGreaterThanOrEqual(0);
    expect(updated.current).toBeLessThan(data.current);
  });
});

describe('addWetness', () => {
  it('应该增加潮湿度', () => {
    const data = createWetnessData(20);
    const updated = addWetness(data, 30);

    expect(updated.current).toBe(50);
  });

  it('应该限制最大潮湿度为 100', () => {
    const data = createWetnessData(80);
    const updated = addWetness(data, 30);

    expect(updated.current).toBe(100);
  });

  it('应该先更新现有状态再增加', () => {
    const data = createWetnessData(20);
    const currentTime = data.lastUpdate;
    const oneHourLater = currentTime + 3600000;

    // 先让物品干燥一些
    const dried = updateWetness(data, oneHourLater);
    // 再增加潮湿度
    const wet = addWetness(dried, 10, oneHourLater);

    // 结果应该比原始值低（因为干燥）+ 新增的潮湿度
    expect(wet.current).toBeLessThan(30);
    expect(wet.current).toBeGreaterThan(0);
  });
});

describe('setWetness', () => {
  it('应该设置指定的潮湿度', () => {
    const data = createWetnessData(20);
    const updated = setWetness(data, 75);

    expect(updated.current).toBe(75);
  });

  it('应该限制在 0-100 范围内', () => {
    const data = createWetnessData(50);

    const updated1 = setWetness(data, -10);
    expect(updated1.current).toBe(0);

    const updated2 = setWetness(data, 150);
    expect(updated2.current).toBe(100);
  });
});

describe('isWet 和 isSoaked', () => {
  it('应该正确判断是否潮湿', () => {
    const dry = createWetnessData(20);
    expect(isWet(dry)).toBe(false);

    const wet = createWetnessData(40);
    expect(isWet(wet)).toBe(true);
  });

  it('应该正确判断是否湿透', () => {
    const wet = createWetnessData(60);
    expect(isSoaked(wet)).toBe(false);

    const soaked = createWetnessData(80);
    expect(isSoaked(soaked)).toBe(true);
  });
});

describe('getWetnessDescription', () => {
  it('应该返回正确的描述', () => {
    const dry = createWetnessData(0);
    expect(getWetnessDescription(dry)).toBe('完全干燥');

    const damp = createWetnessData(40);
    expect(getWetnessDescription(damp)).toContain('微湿');

    const soaked = createWetnessData(75);
    expect(getWetnessDescription(soaked)).toContain('湿透');
  });

  it('应该包含百分比', () => {
    const data = createWetnessData(55);
    const desc = getWetnessDescription(data);
    expect(desc).toContain('55%');
  });
});

describe('Material Functions', () => {
  describe('getMaterialDryFactor', () => {
    it('应该返回正确的干燥因子', () => {
      expect(getMaterialDryFactor('steel')).toBeGreaterThan(getMaterialDryFactor('cotton'));
      expect(getMaterialDryFactor('iron')).toBe(2.0);
      expect(getMaterialDryFactor('cotton')).toBe(0.8);
      expect(getMaterialDryFactor('wool')).toBe(0.7);
      expect(getMaterialDryFactor('leather')).toBe(1.2);
    });

    it('未知材料应该返回默认值', () => {
      expect(getMaterialDryFactor('unknown')).toBe(1.0);
    });
  });

  describe('getMaterialAbsorbFactor', () => {
    it('应该返回正确的吸水因子', () => {
      expect(getMaterialAbsorbFactor('cotton')).toBeGreaterThan(getMaterialAbsorbFactor('steel'));
      expect(getMaterialAbsorbFactor('cotton')).toBe(1.0);
      expect(getMaterialAbsorbFactor('steel')).toBe(0.1);
      expect(getMaterialAbsorbFactor('leather')).toBe(0.6);
      expect(getMaterialAbsorbFactor('wood')).toBe(1.2);
    });

    it('未知材料应该返回中等值', () => {
      expect(getMaterialAbsorbFactor('unknown')).toBe(0.5);
    });
  });

  describe('calculateAbsorbedWetness', () => {
    it('应该根据材料计算吸水量', () => {
      const baseWetness = 50;

      // 棉花吸水多
      const cottonWetness = calculateAbsorbedWetness(baseWetness, 'cotton');
      expect(cottonWetness).toBe(50);

      // 钢铁吸水少
      const steelWetness = calculateAbsorbedWetness(baseWetness, 'steel');
      expect(steelWetness).toBe(5);

      // 皮革吸水中等
      const leatherWetness = calculateAbsorbedWetness(baseWetness, 'leather');
      expect(leatherWetness).toBe(30);
    });
  });
});

describe('Wetness 工具类', () => {
  it('应该创建潮湿数据', () => {
    const data = Wetness.create(30);
    expect(data.current).toBe(30);
    expect(data.dryFactor).toBe(1.0);
  });

  it('应该根据材料创建潮湿数据', () => {
    const steelData = Wetness.create(30, 'steel');
    const cottonData = Wetness.create(30, 'cotton');

    expect(steelData.dryFactor).toBeGreaterThan(cottonData.dryFactor);
  });

  it('应该计算保暖修正', () => {
    const warmth = Wetness.calculateWarmthModifier(50, 20);
    expect(warmth).toBeLessThan(20);
    expect(warmth).toBeCloseTo(20 + (50 * WETNESS_WARMTH_PENALTY * -1));
  });

  it('应该计算重量修正', () => {
    const weight = Wetness.calculateWeightModifier(50, 1000);
    expect(weight).toBeGreaterThan(1000);
  });

  it('应该更新潮湿数据', () => {
    const data = Wetness.create(50);
    const oneHourLater = Date.now() + 3600000;

    const updated = Wetness.update(data, oneHourLater);
    expect(updated.current).toBeLessThan(data.current);
  });

  it('应该浸湿物品', () => {
    const data = Wetness.create(20, 'cotton');
    const soaked = Wetness.soak(data, 30);

    expect(soaked.current).toBe(50);
  });

  it('应该干燥物品', () => {
    const data = Wetness.create(80);
    const dried = Wetness.dry(data, 30);

    expect(dried.current).toBe(50);
  });

  it('应该获取显示信息', () => {
    const data = Wetness.create(0);
    const info = Wetness.getInfo(data);

    expect(info).toContain('干燥');
  });
});
