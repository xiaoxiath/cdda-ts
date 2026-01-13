/**
 * Material 和 EquipmentCondition 系统单元测试
 *
 * 测试装备材料系统、潮湿系统和耐久度系统
 */

import { describe, it, expect } from 'vitest';
import { List } from 'immutable';
import {
  MaterialDefinition,
  MaterialDefinitions,
} from '../Material';
import {
  EquipmentCondition,
} from '../EquipmentCondition';
import {
  WetnessLevel,
  EquipmentItemExtended,
} from '../types';
import { DamageType } from '../../damage/types';

describe('Material 系统', () => {
  describe('MaterialDefinition', () => {
    it('应该创建金属材料', () => {
      const iron = MaterialDefinitions.IRON;

      expect(iron.id).toBe('material_iron');
      expect(iron.name).toBe('iron');
      expect(iron.displayName).toBe('铁');
      expect(iron.isMetal).toBe(true);
      expect(iron.isOrganic).toBe(false);
      expect(iron.properties.density).toBe(7.8);
    });

    it('应该创建布料材料', () => {
      const cotton = MaterialDefinitions.COTTON;

      expect(cotton.id).toBe('material_cotton');
      expect(cotton.name).toBe('cotton');
      expect(cotton.displayName).toBe('棉布');
      expect(cotton.isMetal).toBe(false);
      expect(cotton.isOrganic).toBe(true);
      expect(cotton.properties.flexibility).toBe(0.9);
    });

    it('应该创建塑料材料', () => {
      const plastic = MaterialDefinitions.PLASTIC;

      expect(plastic.id).toBe('material_plastic');
      expect(plastic.name).toBe('plastic');
      expect(plastic.displayName).toBe('塑料');
      expect(plastic.isMetal).toBe(false);
      expect(plastic.isOrganic).toBe(false);
    });

    it('应该计算有效厚度', () => {
      const steel = MaterialDefinitions.STEEL;

      const normalThickness = steel.calculateEffectiveThickness(2, 1.0);
      const highQualityThickness = steel.calculateEffectiveThickness(2, 1.5);
      const lowQualityThickness = steel.calculateEffectiveThickness(2, 0.5);

      expect(highQualityThickness).toBeGreaterThan(normalThickness);
      expect(normalThickness).toBeGreaterThan(lowQualityThickness);
    });

    it('应该获取伤害类型抗性', () => {
      const steel = MaterialDefinitions.STEEL;

      expect(steel.getResistanceForDamageType(DamageType.BASH)).toBe(0.9);
      expect(steel.getResistanceForDamageType(DamageType.CUT)).toBe(0.8);
      expect(steel.getResistanceForDamageType(DamageType.STAB)).toBe(0.7);
      expect(steel.getResistanceForDamageType('bash' as DamageType)).toBe(0.9);
    });

    it('应该计算重量修正', () => {
      const steel = MaterialDefinitions.STEEL;
      const cotton = MaterialDefinitions.COTTON;

      const steelWeight = steel.calculateWeight(1000);
      const cottonWeight = cotton.calculateWeight(1000);

      // 钢的密度比棉布大，所以重量更重
      expect(steelWeight).toBeGreaterThan(cottonWeight);
    });

    it('应该检查易燃性', () => {
      const cotton = MaterialDefinitions.COTTON;
      const steel = MaterialDefinitions.STEEL;

      expect(cotton.isFlammable()).toBe(true);
      expect(steel.isFlammable()).toBe(false);
    });

    it('应该检查导电性', () => {
      const copper = MaterialDefinitions.COPPER;
      const cotton = MaterialDefinitions.COTTON;

      expect(copper.isConductive()).toBe(true);
      expect(cotton.isConductive()).toBe(false);
    });

    it('应该计算退化修正值', () => {
      const steel = MaterialDefinitions.STEEL;

      const normalModifier = steel.getDegradationModifier(20, 0);
      const hotModifier = steel.getDegradationModifier(35, 0);
      const wetModifier = steel.getDegradationModifier(20, 0.8);
      const wetHotModifier = steel.getDegradationModifier(35, 0.8);

      // 高温会降低修正值
      expect(hotModifier).toBeLessThanOrEqual(normalModifier);
      // 潮湿会降低修正值
      expect(wetModifier).toBeLessThanOrEqual(normalModifier);
      // 高温加潮湿应该最低
      expect(wetHotModifier).toBeLessThanOrEqual(hotModifier);
      expect(wetHotModifier).toBeLessThanOrEqual(wetModifier);
    });

    it('应该获取显示描述', () => {
      const iron = MaterialDefinitions.IRON;
      const desc = iron.getDisplayDescription();

      expect(desc).toContain('铁');
      expect(desc).toContain('刚性');
      expect(desc).toContain('密度');
      expect(desc).toContain('钝击');
      expect(desc).toContain('类型: 金属');
    });
  });

  describe('预定义材料', () => {
    it('应该包含所有金属材料', () => {
      expect(MaterialDefinitions.IRON).toBeDefined();
      expect(MaterialDefinitions.STEEL).toBeDefined();
      expect(MaterialDefinitions.COPPER).toBeDefined();
    });

    it('应该包含所有布料材料', () => {
      expect(MaterialDefinitions.COTTON).toBeDefined();
      expect(MaterialDefinitions.WOOL).toBeDefined();
      expect(MaterialDefinitions.LEATHER).toBeDefined();
      expect(MaterialDefinitions.DENIM).toBeDefined();
    });

    it('应该包含所有塑料材料', () => {
      expect(MaterialDefinitions.PLASTIC).toBeDefined();
      expect(MaterialDefinitions.KEVLAR).toBeDefined();
    });

    it('应该包含所有有机材料', () => {
      expect(MaterialDefinitions.BONE).toBeDefined();
      expect(MaterialDefinitions.WOOD).toBeDefined();
    });

    it('凯夫拉应该有高抗性', () => {
      const kevlar = MaterialDefinitions.KEVLAR;

      expect(kevlar.getResistanceForDamageType(DamageType.CUT)).toBe(0.8);
      expect(kevlar.getResistanceForDamageType(DamageType.STAB)).toBe(0.9);
      expect(kevlar.getResistanceForDamageType(DamageType.BULLET)).toBe(0.9);
    });

    it('羊毛应该有高保暖性', () => {
      const wool = MaterialDefinitions.WOOL;

      expect(wool.properties.thermalConductivity).toBeLessThan(0.1);
      expect(wool.getResistanceForDamageType('cold' as DamageType)).toBe(0.7);
    });
  });
});

describe('EquipmentCondition 系统', () => {
  describe('潮湿系统', () => {
    it('应该创建初始潮湿数据', () => {
      const wetness = EquipmentCondition.createInitialWetness();

      expect(wetness.currentWetness).toBe(0);
      expect(wetness.maxWetness).toBe(100);
      expect(wetness.dryRate).toBe(5);
      expect(wetness.lastUpdate).toBeGreaterThan(0);
    });

    it('应该增加潮湿值', () => {
      const wetness = EquipmentCondition.createInitialWetness();
      const wet = EquipmentCondition.addWetness(wetness, 30);

      expect(wet.currentWetness).toBe(30);
    });

    it('应该限制最大潮湿值', () => {
      const wetness = EquipmentCondition.createInitialWetness(100);
      const soaked = EquipmentCondition.addWetness(wetness, 200);

      expect(soaked.currentWetness).toBe(100);
    });

    it('应该更新潮湿值（干燥）', () => {
      const wetness = EquipmentCondition.createInitialWetness(100);
      const wet = EquipmentCondition.addWetness(wetness, 50);

      // 模拟时间流逝（通过修改 lastUpdate 时间戳）
      const timePassedWetness = {
        ...wet,
        lastUpdate: Date.now() - 60 * 1000, // 1 分钟前
      };
      const dry = EquipmentCondition.updateWetness(timePassedWetness, 20);

      expect(dry.currentWetness).toBeLessThan(wet.currentWetness);
      expect(dry.currentWetness).toBeCloseTo(45, 1); // 50 - 5 = 45
    });

    it('高温应该加速干燥', () => {
      const wetness = EquipmentCondition.createInitialWetness(100);
      const wet = EquipmentCondition.addWetness(wetness, 50);

      // 模拟时间流逝
      const timePassedWetness = {
        ...wet,
        lastUpdate: Date.now() - 60 * 1000, // 1 分钟前
      };
      const normalDry = EquipmentCondition.updateWetness(timePassedWetness, 20);
      const hotDry = EquipmentCondition.updateWetness(timePassedWetness, 30);

      expect(hotDry.currentWetness).toBeLessThanOrEqual(normalDry.currentWetness);
    });

    it('应该获取潮湿等级', () => {
      const dry = EquipmentCondition.createInitialWetness(100);
      const damp = EquipmentCondition.addWetness(dry, 20);
      const wet = EquipmentCondition.addWetness(damp, 30); // 50
      const soaked = EquipmentCondition.addWetness(wet, 30); // 80
      const drenched = EquipmentCondition.addWetness(soaked, 20); // 100

      expect(EquipmentCondition.getWetnessLevel(dry)).toBe(WetnessLevel.DRY);
      expect(EquipmentCondition.getWetnessLevel(damp)).toBe(WetnessLevel.DAMP);
      expect(EquipmentCondition.getWetnessLevel(wet)).toBe(WetnessLevel.WET);
      expect(EquipmentCondition.getWetnessLevel(soaked)).toBe(WetnessLevel.SOAKED);
      expect(EquipmentCondition.getWetnessLevel(drenched)).toBe(WetnessLevel.DRENCHED);
    });

    it('潮湿应该降低保暖值', () => {
      const wetness = EquipmentCondition.createInitialWetness(100);
      const dry = { ...wetness, currentWetness: 0 };
      const soaked = { ...wetness, currentWetness: 80 };

      const dryWarmth = EquipmentCondition.applyWetnessToWarmth(20, dry);
      const soakedWarmth = EquipmentCondition.applyWetnessToWarmth(20, soaked);

      expect(soakedWarmth).toBeLessThan(dryWarmth);
    });

    it('潮湿应该增加重量', () => {
      const wetness = EquipmentCondition.createInitialWetness(100);
      const dry = { ...wetness, currentWetness: 0 };
      const soaked = { ...wetness, currentWetness: 100 };

      const dryWeight = EquipmentCondition.applyWetnessToWeight(1000, dry);
      const soakedWeight = EquipmentCondition.applyWetnessToWeight(1000, soaked);

      expect(soakedWeight).toBeGreaterThan(dryWeight);
    });
  });

  describe('耐久度系统', () => {
    it('应该创建初始耐久度数据', () => {
      const durability = EquipmentCondition.createInitialDurability();

      expect(durability.currentDurability).toBe(100);
      expect(durability.maxDurability).toBe(100);
      expect(durability.isBroken).toBe(false);
      expect(durability.damageHistory.isEmpty()).toBe(true);
    });

    it('应该造成装备损坏', () => {
      const durability = EquipmentCondition.createInitialDurability();
      const damaged = EquipmentCondition.damageEquipment(
        durability,
        30,
        DamageType.BASH,
        'test',
        1.0
      );

      expect(damaged.currentDurability).toBe(70);
      expect(damaged.isBroken).toBe(false);
      expect(damaged.damageHistory.size).toBe(1);
    });

    it('应该标记损坏装备', () => {
      const durability = EquipmentCondition.createInitialDurability();
      const broken = EquipmentCondition.damageEquipment(
        durability,
        150,
        DamageType.BASH,
        'test',
        1.0
      );

      expect(broken.currentDurability).toBe(0);
      expect(broken.isBroken).toBe(true);
    });

    it('应该应用退化修正', () => {
      const durability = EquipmentCondition.createInitialDurability();

      const normalDamage = EquipmentCondition.damageEquipment(
        durability,
        10,
        DamageType.BASH,
        'test',
        1.0
      );

      const highDegradationDamage = EquipmentCondition.damageEquipment(
        durability,
        10,
        DamageType.BASH,
        'test',
        2.0
      );

      expect(highDegradationDamage.currentDurability).toBeLessThan(
        normalDamage.currentDurability
      );
    });

    it('应该修复装备', () => {
      const durability = EquipmentCondition.createInitialDurability();
      const damaged = EquipmentCondition.damageEquipment(
        durability,
        50,
        DamageType.BASH,
        'test',
        1.0
      );
      expect(damaged.currentDurability).toBe(50);
      expect(damaged.isBroken).toBe(false);

      const repaired = EquipmentCondition.repairEquipment(damaged, 30);

      expect(repaired.currentDurability).toBe(80);
      expect(repaired.isBroken).toBe(false);
    });

    it('应该限制修复到最大值', () => {
      const durability = EquipmentCondition.createInitialDurability();
      const damaged = EquipmentCondition.damageEquipment(
        durability,
        20,
        DamageType.BASH,
        'test',
        1.0
      );

      const repaired = EquipmentCondition.repairEquipment(damaged, 50);

      expect(repaired.currentDurability).toBe(100);
    });

    it('修复应该重置损坏状态', () => {
      const durability = EquipmentCondition.createInitialDurability();
      const broken = EquipmentCondition.damageEquipment(
        durability,
        150,
        DamageType.BASH,
        'test',
        1.0
      );

      expect(broken.isBroken).toBe(true);

      const repaired = EquipmentCondition.repairEquipment(broken, 50);

      expect(repaired.isBroken).toBe(false);
    });

    it('应该计算状态修正值', () => {
      const durability = EquipmentCondition.createInitialDurability();

      const perfect = EquipmentCondition.getConditionModifier({
        ...durability,
        currentDurability: 100,
      });
      const good = EquipmentCondition.getConditionModifier({
        ...durability,
        currentDurability: 70,
      });
      const poor = EquipmentCondition.getConditionModifier({
        ...durability,
        currentDurability: 30,
      });
      const bad = EquipmentCondition.getConditionModifier({
        ...durability,
        currentDurability: 5,
      });

      expect(perfect).toBe(1.0);
      expect(good).toBeGreaterThan(poor);
      expect(poor).toBeGreaterThan(bad);
      expect(bad).toBeLessThan(0.5);
    });

    it('损坏装备的状态修正应为 0', () => {
      const durability = EquipmentCondition.createInitialDurability(100);
      const broken = EquipmentCondition.damageEquipment(
        durability,
        200,
        DamageType.BASH,
        'test',
        1.0
      );

      expect(EquipmentCondition.getConditionModifier(broken)).toBe(0);
    });

    it('应该检查是否损坏', () => {
      const durability = EquipmentCondition.createInitialDurability();
      const damaged = EquipmentCondition.damageEquipment(
        durability,
        50,
        DamageType.BASH,
        'test',
        1.0
      );
      const broken = EquipmentCondition.damageEquipment(
        durability,
        150,
        DamageType.BASH,
        'test',
        1.0
      );

      expect(EquipmentCondition.isBroken(damaged)).toBe(false);
      expect(EquipmentCondition.isBroken(broken)).toBe(true);
    });

    it('应该获取耐久度描述', () => {
      const durability = EquipmentCondition.createInitialDurability();

      const perfect = EquipmentCondition.getDurabilityDescription({
        ...durability,
        currentDurability: 100,
      });
      const good = EquipmentCondition.getDurabilityDescription({
        ...durability,
        currentDurability: 75,
      });
      const fair = EquipmentCondition.getDurabilityDescription({
        ...durability,
        currentDurability: 50,
      });
      const poor = EquipmentCondition.getDurabilityDescription({
        ...durability,
        currentDurability: 30,
      });
      const bad = EquipmentCondition.getDurabilityDescription({
        ...durability,
        currentDurability: 15,
      });

      expect(perfect).toBe('完好');
      expect(good).toBe('轻微磨损');
      expect(fair).toBe('磨损');
      expect(poor).toBe('严重磨损');
      expect(bad).toBe('即将损坏');
    });
  });

  describe('综合状态管理', () => {
    it('应该更新装备状态', () => {
      const item: EquipmentItemExtended = {
        itemId: 'test_item',
        itemName: '测试物品',
        layer: 'OUTER_LAYER' as any,
        covers: [] as any,
        armor: {
          coverage: 0,
          thickness: 0,
          envProtection: 0,
          resistances: List(),
          rigid: false,
        },
        encumbrance: 0,
        warmth: 20,
        weight: 1000,
        occupiesSlots: [],
        wetness: EquipmentCondition.createInitialWetness(100),
        durability: EquipmentCondition.createInitialDurability(100),
        materialDefinition: MaterialDefinitions.COTTON,
        degradationModifier: 1.0,
      };

      // 增加潮湿
      let updated = { ...item };
      updated.wetness = EquipmentCondition.addWetness(item.wetness!, 50);

      // 模拟时间流逝（通过修改 lastUpdate 时间戳）
      updated.wetness = {
        ...updated.wetness!,
        lastUpdate: Date.now() - 60 * 1000, // 1 分钟前
      };

      // 更新状态
      updated = EquipmentCondition.updateCondition(updated, 25);

      expect(updated.wetness!.currentWetness).toBeLessThan(50); // 干燥了
    });

    it('潮湿应该导致装备退化', () => {
      const item: EquipmentItemExtended = {
        itemId: 'test_item',
        itemName: '测试物品',
        layer: 'OUTER_LAYER' as any,
        covers: [] as any,
        armor: {
          coverage: 0,
          thickness: 0,
          envProtection: 0,
          resistances: List(),
          rigid: false,
        },
        encumbrance: 0,
        warmth: 20,
        weight: 1000,
        occupiesSlots: [],
        wetness: EquipmentCondition.createInitialWetness(100),
        durability: EquipmentCondition.createInitialDurability(100),
        materialDefinition: MaterialDefinitions.COTTON,
        degradationModifier: 1.0,
      };

      // 增加潮湿
      let wet = { ...item };
      wet.wetness = EquipmentCondition.addWetness(item.wetness!, 80);

      // 更新状态，潮湿应该导致退化
      const updated = EquipmentCondition.updateCondition(wet, 20);

      expect(updated.durability!.currentDurability).toBeLessThan(100);
    });

    it('应该检查装备是否可用', () => {
      const item: EquipmentItemExtended = {
        itemId: 'test_item',
        itemName: '测试物品',
        layer: 'OUTER_LAYER' as any,
        covers: [] as any,
        armor: {
          coverage: 0,
          thickness: 0,
          envProtection: 0,
          resistances: List(),
          rigid: false,
        },
        encumbrance: 0,
        warmth: 20,
        weight: 1000,
        occupiesSlots: [],
        wetness: EquipmentCondition.createInitialWetness(100),
        durability: EquipmentCondition.createInitialDurability(100),
        materialDefinition: MaterialDefinitions.COTTON,
        degradationModifier: 1.0,
      };

      // 完好状态
      expect(EquipmentCondition.isUsable(item)).toBe(true);

      // 损坏状态
      const brokenItem = {
        ...item,
        durability: EquipmentCondition.damageEquipment(
          item.durability!,
          150,
          DamageType.BASH,
          'test',
          1.0
        ),
      };
      expect(EquipmentCondition.isUsable(brokenItem)).toBe(false);

      // 导电装备在湿透时失效
      const electronicItem = {
        ...item,
        materialDefinition: MaterialDefinitions.COPPER,
        wetness: EquipmentCondition.addWetness(item.wetness!, 95),
      };
      expect(EquipmentCondition.isUsable(electronicItem)).toBe(false);
    });

    it('应该获取完整状态描述', () => {
      const item: EquipmentItemExtended = {
        itemId: 'test_item',
        itemName: '测试物品',
        layer: 'OUTER_LAYER' as any,
        covers: [] as any,
        armor: {
          coverage: 0,
          thickness: 0,
          envProtection: 0,
          resistances: List(),
          rigid: false,
        },
        encumbrance: 0,
        warmth: 20,
        weight: 1000,
        occupiesSlots: [],
        wetness: EquipmentCondition.createInitialWetness(100),
        durability: EquipmentCondition.createInitialDurability(100),
        materialDefinition: MaterialDefinitions.COTTON,
        degradationModifier: 1.0,
      };

      let desc = EquipmentCondition.getConditionDescription(item);
      // 包含耐久度百分比
      expect(desc).toContain('完好');
      expect(desc).toContain('100%');

      // 损坏
      const damagedItem = {
        ...item,
        durability: EquipmentCondition.damageEquipment(
          item.durability!,
          50,
          DamageType.BASH,
          'test',
          1.0
        ),
      };
      desc = EquipmentCondition.getConditionDescription(damagedItem);
      expect(desc).toContain('磨损');

      // 潮湿
      const wetItem = {
        ...item,
        wetness: EquipmentCondition.addWetness(item.wetness!, 50),
      };
      desc = EquipmentCondition.getConditionDescription(wetItem);
      expect(desc).toContain('潮湿');

      // 既潮湿又损坏
      const wetAndDamaged = {
        ...wetItem,
        durability: EquipmentCondition.damageEquipment(
          item.durability!,
          30,
          DamageType.BASH,
          'test',
          1.0
        ),
      };
      desc = EquipmentCondition.getConditionDescription(wetAndDamaged);
      expect(desc).toContain('潮湿');
      expect(desc).toContain('磨损');
    });
  });
});
