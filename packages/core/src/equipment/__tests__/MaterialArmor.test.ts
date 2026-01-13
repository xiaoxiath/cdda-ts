/**
 * MaterialArmor Tests - 材料护甲系统测试
 *
 * 测试材料系统与护甲的集成功能
 */

import { describe, it, expect } from 'vitest';
import { Map } from 'immutable';
import {
  MaterialArmor,
  calculateEffectiveArmor,
  calculateMaterialThickness,
  calculateCutResistance,
  calculateStabResistance,
  calculateBashResistance,
  calculateMaterialResistance,
  calculateEnvProtection,
  getMaterialsByIds,
  getCommonArmorData,
  MaterialCombinations,
  MaterialDefinitions,
  type MaterialArmorData,
  type EffectiveArmor,
} from '../MaterialArmor';

describe('calculateMaterialThickness', () => {
  it('应该计算有效厚度', () => {
    const steel = MaterialDefinitions.STEEL;
    const thickness = calculateMaterialThickness([steel], 5);

    // 钢铁硬度高，有效厚度应该大于基础厚度
    expect(thickness).toBeGreaterThan(5);
  });

  it('空材料列表应该返回基础厚度', () => {
    const thickness = calculateMaterialThickness([], 5);
    expect(thickness).toBe(5);
  });

  it('高硬度材料应该增加有效厚度', () => {
    const steel = MaterialDefinitions.STEEL;
    const cotton = MaterialDefinitions.COTTON;

    const steelThickness = calculateMaterialThickness([steel], 5);
    const cottonThickness = calculateMaterialThickness([cotton], 5);

    expect(steelThickness).toBeGreaterThan(cottonThickness);
  });
});

describe('calculateCutResistance', () => {
  it('应该计算切割阻力', () => {
    const steel = MaterialDefinitions.STEEL;
    const resistance = calculateCutResistance([steel], 5);

    // 钢铁对切割有很好的阻力
    expect(resistance).toBeGreaterThan(0);
  });

  it('高硬度和高密度应该增加切割阻力', () => {
    const steel = MaterialDefinitions.STEEL;
    const cotton = MaterialDefinitions.COTTON;

    const steelResistance = calculateCutResistance([steel], 5);
    const cottonResistance = calculateCutResistance([cotton], 5);

    expect(steelResistance).toBeGreaterThan(cottonResistance);
  });

  it('厚度应该增加切割阻力', () => {
    const steel = MaterialDefinitions.STEEL;

    const thinResistance = calculateCutResistance([steel], 2);
    const thickResistance = calculateCutResistance([steel], 10);

    expect(thickResistance).toBeGreaterThan(thinResistance);
  });
});

describe('calculateStabResistance', () => {
  it('应该计算穿刺阻力', () => {
    const steel = MaterialDefinitions.STEEL;
    const resistance = calculateStabResistance([steel], 5);

    expect(resistance).toBeGreaterThan(0);
  });

  it('硬度是穿刺阻力的主要因素', () => {
    const steel = MaterialDefinitions.STEEL;
    const leather = MaterialDefinitions.LEATHER;

    const steelResistance = calculateStabResistance([steel], 5);
    const leatherResistance = calculateStabResistance([leather], 5);

    expect(steelResistance).toBeGreaterThan(leatherResistance);
  });
});

describe('calculateBashResistance', () => {
  it('应该计算钝击阻力', () => {
    const steel = MaterialDefinitions.STEEL;
    const resistance = calculateBashResistance([steel], 5, true);

    expect(resistance).toBeGreaterThan(0);
  });

  it('柔性材料对钝击有更好的吸收能力', () => {
    const leather = MaterialDefinitions.LEATHER;

    const rigidResistance = calculateBashResistance([leather], 5, true);
    const flexibleResistance = calculateBashResistance([leather], 5, false);

    expect(flexibleResistance).toBeGreaterThan(rigidResistance);
  });

  it('高密度应该增加钝击阻力', () => {
    const steel = MaterialDefinitions.STEEL;
    const cotton = MaterialDefinitions.COTTON;

    const steelResistance = calculateBashResistance([steel], 5, true);
    const cottonResistance = calculateBashResistance([cotton], 5, true);

    expect(steelResistance).toBeGreaterThan(cottonResistance);
  });
});

describe('calculateMaterialResistance', () => {
  it('应该计算对特定伤害类型的抗性', () => {
    const steel = MaterialDefinitions.STEEL;
    const cutResist = calculateMaterialResistance([steel], 'CUT', 5);
    const bashResist = calculateMaterialResistance([steel], 'BASH', 5);

    expect(cutResist).toBeGreaterThan(0);
    expect(bashResist).toBeGreaterThan(0);
  });

  it('空材料列表应该返回 0 抗性', () => {
    const resist = calculateMaterialResistance([], 'CUT', 5);
    expect(resist).toBe(0);
  });

  it('厚度应该增加抗性', () => {
    const steel = MaterialDefinitions.STEEL;

    const thinResist = calculateMaterialResistance([steel], 'CUT', 2);
    const thickResist = calculateMaterialResistance([steel], 'CUT', 10);

    expect(thickResist).toBeGreaterThan(thinResist);
  });
});

describe('calculateEnvProtection', () => {
  it('应该计算环境保护', () => {
    const steel = MaterialDefinitions.STEEL;
    const protection = calculateEnvProtection([steel], 80, 5);

    expect(protection).toBeGreaterThan(0);
    expect(protection).toBeLessThanOrEqual(80);
  });

  it('厚度应该增加环境保护', () => {
    const leather = MaterialDefinitions.LEATHER;

    const thinProtection = calculateEnvProtection([leather], 80, 1);
    const thickProtection = calculateEnvProtection([leather], 80, 10);

    expect(thickProtection).toBeGreaterThan(thinProtection);
  });

  it('高密度材料应该提供更好的环境保护', () => {
    const steel = MaterialDefinitions.STEEL;
    const cotton = MaterialDefinitions.COTTON;

    const steelProtection = calculateEnvProtection([steel], 80, 5);
    const cottonProtection = calculateEnvProtection([cotton], 80, 5);

    expect(steelProtection).toBeGreaterThan(cottonProtection);
  });
});

describe('calculateEffectiveArmor', () => {
  it('应该计算完整的护甲数据', () => {
    const materials = getMaterialsByIds(['steel']);
    const armorData: MaterialArmorData = {
      materials,
      thickness: 5,
      coverage: 80,
      rigid: true,
      layers: 1,
    };

    const armor = calculateEffectiveArmor(armorData);

    expect(armor.cutResistance).toBeGreaterThan(0);
    expect(armor.stabResistance).toBeGreaterThan(0);
    expect(armor.bashResistance).toBeGreaterThan(0);
    expect(armor.effectiveThickness).toBeGreaterThan(0);
    expect(armor.envProtection).toBeGreaterThan(0);
    expect(armor.resistances.size).toBeGreaterThan(0);
  });

  it('应该包含所有伤害类型的抗性', () => {
    const materials = getMaterialsByIds(['steel', 'kevlar']);
    const armorData: MaterialArmorData = {
      materials,
      thickness: 5,
      coverage: 80,
      rigid: true,
      layers: 2,
    };

    const armor = calculateEffectiveArmor(armorData);

    expect(armor.resistances.has('CUT')).toBe(true);
    expect(armor.resistances.has('STAB')).toBe(true);
    expect(armor.resistances.has('BASH')).toBe(true);
    expect(armor.resistances.has('BULLET')).toBe(true);
    expect(armor.resistances.has('HEAT')).toBe(true);
    expect(armor.resistances.has('COLD')).toBe(true);
    expect(armor.resistances.has('ACID')).toBe(true);
    expect(armor.resistances.has('ELECTRIC')).toBe(true);
    expect(armor.resistances.has('BIAS')).toBe(true);
  });
});

describe('getMaterialsByIds', () => {
  it('应该根据 ID 获取材料', () => {
    const materials = getMaterialsByIds(['steel', 'cotton']);

    expect(materials.length).toBe(2);
    expect(materials[0].id).toContain('steel');
    expect(materials[1].id).toContain('cotton');
  });

  it('未知 ID 应该被忽略', () => {
    const materials = getMaterialsByIds(['steel', 'unknown', 'cotton']);

    expect(materials.length).toBeLessThanOrEqual(2);
  });

  it('空列表应该返回空数组', () => {
    const materials = getMaterialsByIds([]);
    expect(materials.length).toBe(0);
  });
});

describe('MaterialArmor 工具类', () => {
  describe('calculateFromIds', () => {
    it('应该根据材料 ID 计算护甲', () => {
      const armor = MaterialArmor.calculateFromIds(
        ['steel'],
        5,
        80,
        true,
        1
      );

      expect(armor.cutResistance).toBeGreaterThan(0);
      expect(armor.effectiveThickness).toBeGreaterThan(0);
    });

    it('多层材料应该有更好的防护', () => {
      const singleLayer = MaterialArmor.calculateFromIds(
        ['cotton'],
        2,
        80,
        false,
        1
      );

      const multiLayer = MaterialArmor.calculateFromIds(
        ['cotton', 'leather'],
        4,
        80,
        false,
        2
      );

      // 多层应该提供更好的防护
      const singleAvg = (singleLayer.cutResistance + singleLayer.bashResistance) / 2;
      const multiAvg = (multiLayer.cutResistance + multiLayer.bashResistance) / 2;

      expect(multiAvg).toBeGreaterThanOrEqual(singleAvg);
    });
  });

  describe('getArmorQuality', () => {
    it('应该正确评估护甲质量', () => {
      const poorArmor: EffectiveArmor = {
        resistances: Map(),
        effectiveThickness: 1,
        envProtection: 10,
        cutResistance: 2,
        stabResistance: 2,
        bashResistance: 2,
      };

      const goodArmor: EffectiveArmor = {
        resistances: Map(),
        effectiveThickness: 5,
        envProtection: 50,
        cutResistance: 15,
        stabResistance: 15,
        bashResistance: 15,
      };

      // 平均抗性为 2，应该返回 "极差"
      expect(MaterialArmor.getArmorQuality(poorArmor)).toBe('极差');
      // 平均抗性为 15，应该返回 "良好"
      expect(MaterialArmor.getArmorQuality(goodArmor)).toBe('良好');
    });
  });

  describe('compareArmor', () => {
    it('应该比较两个护甲的优劣', () => {
      const armor1: EffectiveArmor = {
        resistances: Map(),
        effectiveThickness: 2,
        envProtection: 20,
        cutResistance: 5,
        stabResistance: 5,
        bashResistance: 5,
      };

      const armor2: EffectiveArmor = {
        resistances: Map(),
        effectiveThickness: 5,
        envProtection: 50,
        cutResistance: 15,
        stabResistance: 15,
        bashResistance: 15,
      };

      const comparison = MaterialArmor.compareArmor(armor1, armor2);

      // armor2 应该更好，所以结果应该是负数
      expect(comparison).toBeLessThan(0);
    });

    it('相同护甲应该返回 0', () => {
      const armor: EffectiveArmor = {
        resistances: Map(),
        effectiveThickness: 3,
        envProtection: 30,
        cutResistance: 10,
        stabResistance: 10,
        bashResistance: 10,
      };

      const comparison = MaterialArmor.compareArmor(armor, armor);

      expect(comparison).toBe(0);
    });
  });

  describe('describeArmor', () => {
    it('应该生成护甲描述', () => {
      const armor = MaterialArmor.calculateFromIds(
        ['steel'],
        5,
        80,
        true,
        1
      );

      const description = MaterialArmor.describeArmor(armor);

      expect(description).toContain('质量');
      expect(description).toContain('切割抗性');
      expect(description).toContain('穿刺抗性');
      expect(description).toContain('钝击抗性');
      expect(description).toContain('有效厚度');
      expect(description).toContain('环境保护');
    });
  });
});

describe('MaterialCombinations', () => {
  it('应该包含所有预定义组合', () => {
    expect(MaterialCombinations.CLOTH).toEqual(['cotton']);
    expect(MaterialCombinations.LEATHER).toEqual(['leather']);
    expect(MaterialCombinations.STEEL_PLATE).toEqual(['steel']);
    expect(MaterialCombinations.COMPOSITE).toEqual(['kevlar', 'steel']);
  });
});

describe('getCommonArmorData', () => {
  it('应该计算常见组合的护甲', () => {
    const clothArmor = getCommonArmorData('CLOTH', 2, 80, false);

    expect(clothArmor.cutResistance).toBeGreaterThan(0);
    expect(clothArmor.effectiveThickness).toBeGreaterThan(0);
  });

  it('不同组合应该有不同的防护特性', () => {
    const cloth = getCommonArmorData('CLOTH', 2, 80, false);
    const steel = getCommonArmorData('STEEL_PLATE', 5, 80, true);

    // 钢板应该比布料防护更好
    expect(steel.cutResistance).toBeGreaterThan(cloth.cutResistance);
    expect(steel.stabResistance).toBeGreaterThan(cloth.stabResistance);
    expect(steel.bashResistance).toBeGreaterThan(cloth.bashResistance);
  });

  it('复合材料应该结合各材料的优点', () => {
    const single = getCommonArmorData('KEVLAR', 3, 80, false);
    const composite = getCommonArmorData('COMPOSITE', 5, 80, true);

    // 复合材料应该提供更好的综合防护
    const compositeAvg = (
      composite.cutResistance +
      composite.stabResistance +
      composite.bashResistance
    ) / 3;

    const singleAvg = (
      single.cutResistance +
      single.stabResistance +
      single.bashResistance
    ) / 3;

    expect(compositeAvg).toBeGreaterThanOrEqual(singleAvg);
  });
});
