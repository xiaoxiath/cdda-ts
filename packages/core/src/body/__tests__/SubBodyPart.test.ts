/**
 * SubBodyPart Tests - 子身体部位系统测试
 *
 * 测试子身体部位系统的功能
 */

import { describe, it, expect } from 'vitest';
import { Map } from 'immutable';
import {
  SubBodyPart,
  BODY_PART_RELATIONS,
  SUB_BODY_PART_PROPS,
  type BodyPartRelation,
  type BodyPartProps,
} from '../SubBodyPart';
import { BodyPartType, SubBodyPartType } from '../../combat/types';
import { createBodyPartId } from '../../damage/types';

describe('BODY_PART_RELATIONS', () => {
  it('应该包含所有主身体部位的关系', () => {
    expect(BODY_PART_RELATIONS.has(BodyPartType.ARM_L)).toBe(true);
    expect(BODY_PART_RELATIONS.has(BodyPartType.ARM_R)).toBe(true);
    expect(BODY_PART_RELATIONS.has(BodyPartType.LEG_L)).toBe(true);
    expect(BODY_PART_RELATIONS.has(BodyPartType.LEG_R)).toBe(true);
  });

  it('应该正确映射左臂的子部位', () => {
    const relation = BODY_PART_RELATIONS.get(BodyPartType.ARM_L);

    expect(relation).toBeDefined();
    expect(relation!.mainPart).toBe(BodyPartType.ARM_L);
    expect(relation!.subParts).toContain(SubBodyPartType.UPPER_ARM_L);
    expect(relation!.subParts).toContain(SubBodyPartType.LOWER_ARM_L);
    expect(relation!.subParts.length).toBe(2);
  });

  it('应该正确映射右臂的子部位', () => {
    const relation = BODY_PART_RELATIONS.get(BodyPartType.ARM_R);

    expect(relation).toBeDefined();
    expect(relation!.mainPart).toBe(BodyPartType.ARM_R);
    expect(relation!.subParts).toContain(SubBodyPartType.UPPER_ARM_R);
    expect(relation!.subParts).toContain(SubBodyPartType.LOWER_ARM_R);
  });

  it('应该正确映射左腿的子部位', () => {
    const relation = BODY_PART_RELATIONS.get(BodyPartType.LEG_L);

    expect(relation).toBeDefined();
    expect(relation!.mainPart).toBe(BodyPartType.LEG_L);
    expect(relation!.subParts).toContain(SubBodyPartType.UPPER_LEG_L);
    expect(relation!.subParts).toContain(SubBodyPartType.LOWER_LEG_L);
  });

  it('应该正确映射右腿的子部位', () => {
    const relation = BODY_PART_RELATIONS.get(BodyPartType.LEG_R);

    expect(relation).toBeDefined();
    expect(relation!.mainPart).toBe(BodyPartType.LEG_R);
    expect(relation!.subParts).toContain(SubBodyPartType.UPPER_LEG_R);
    expect(relation!.subParts).toContain(SubBodyPartType.LOWER_LEG_R);
  });
});

describe('SUB_BODY_PART_PROPS', () => {
  it('应该包含所有子部位的属性', () => {
    // 左臂
    expect(SUB_BODY_PART_PROPS.has(SubBodyPartType.UPPER_ARM_L)).toBe(true);
    expect(SUB_BODY_PART_PROPS.has(SubBodyPartType.LOWER_ARM_L)).toBe(true);

    // 右臂
    expect(SUB_BODY_PART_PROPS.has(SubBodyPartType.UPPER_ARM_R)).toBe(true);
    expect(SUB_BODY_PART_PROPS.has(SubBodyPartType.LOWER_ARM_R)).toBe(true);

    // 左腿
    expect(SUB_BODY_PART_PROPS.has(SubBodyPartType.UPPER_LEG_L)).toBe(true);
    expect(SUB_BODY_PART_PROPS.has(SubBodyPartType.LOWER_LEG_L)).toBe(true);

    // 右腿
    expect(SUB_BODY_PART_PROPS.has(SubBodyPartType.UPPER_LEG_R)).toBe(true);
    expect(SUB_BODY_PART_PROPS.has(SubBodyPartType.LOWER_LEG_R)).toBe(true);
  });

  it('应该正确设置上臂属性', () => {
    const upperArmL = SUB_BODY_PART_PROPS.get(SubBodyPartType.UPPER_ARM_L);

    expect(upperArmL).toBeDefined();
    expect(upperArmL!.maxHP).toBe(40);
    expect(upperArmL!.size).toBe(3);
    expect(upperArmL!.isLethal).toBe(false);
    expect(upperArmL!.canBeMissing).toBe(true);
    expect(upperArmL!.oppositeSide).toBe(SubBodyPartType.UPPER_ARM_R);
  });

  it('应该正确设置下臂属性', () => {
    const lowerArmL = SUB_BODY_PART_PROPS.get(SubBodyPartType.LOWER_ARM_L);

    expect(lowerArmL).toBeDefined();
    expect(lowerArmL!.maxHP).toBe(30);
    expect(lowerArmL!.size).toBe(2);
    expect(lowerArmL!.isLethal).toBe(false);
    expect(lowerArmL!.canBeMissing).toBe(true);
    expect(lowerArmL!.oppositeSide).toBe(SubBodyPartType.LOWER_ARM_R);
  });

  it('应该正确设置大腿属性', () => {
    const upperLegL = SUB_BODY_PART_PROPS.get(SubBodyPartType.UPPER_LEG_L);

    expect(upperLegL).toBeDefined();
    expect(upperLegL!.maxHP).toBe(50);
    expect(upperLegL!.size).toBe(4);
    expect(upperLegL!.isLethal).toBe(false);
    expect(upperLegL!.canBeMissing).toBe(true);
    expect(upperLegL!.oppositeSide).toBe(SubBodyPartType.UPPER_LEG_R);
  });

  it('应该正确设置小腿属性', () => {
    const lowerLegL = SUB_BODY_PART_PROPS.get(SubBodyPartType.LOWER_LEG_L);

    expect(lowerLegL).toBeDefined();
    expect(lowerLegL!.maxHP).toBe(40);
    expect(lowerLegL!.size).toBe(3);
    expect(lowerLegL!.isLethal).toBe(false);
    expect(lowerLegL!.canBeMissing).toBe(true);
    expect(lowerLegL!.oppositeSide).toBe(SubBodyPartType.LOWER_LEG_R);
  });

  it('腿部 HP 应该高于臂部', () => {
    const upperArmHP = SUB_BODY_PART_PROPS.get(SubBodyPartType.UPPER_ARM_L)!.maxHP;
    const upperLegHP = SUB_BODY_PART_PROPS.get(SubBodyPartType.UPPER_LEG_L)!.maxHP;

    expect(upperLegHP).toBeGreaterThan(upperArmHP);
  });

  it('上臂 HP 应该高于下臂', () => {
    const upperArmHP = SUB_BODY_PART_PROPS.get(SubBodyPartType.UPPER_ARM_L)!.maxHP;
    const lowerArmHP = SUB_BODY_PART_PROPS.get(SubBodyPartType.LOWER_ARM_L)!.maxHP;

    expect(upperArmHP).toBeGreaterThan(lowerArmHP);
  });
});

describe('SubBodyPart.getSubParts', () => {
  it('应该获取主部位的所有子部位', () => {
    const leftArmParts = SubBodyPart.getSubParts(BodyPartType.ARM_L);

    expect(leftArmParts).toHaveLength(2);
    expect(leftArmParts).toContain(SubBodyPartType.UPPER_ARM_L);
    expect(leftArmParts).toContain(SubBodyPartType.LOWER_ARM_L);
  });

  it('不支持的主部位应该返回空数组', () => {
    const headParts = SubBodyPart.getSubParts(BodyPartType.HEAD);

    expect(headParts).toHaveLength(0);
  });

  it('应该获取所有腿部的子部位', () => {
    const leftLegParts = SubBodyPart.getSubParts(BodyPartType.LEG_L);
    const rightLegParts = SubBodyPart.getSubParts(BodyPartType.LEG_R);

    expect(leftLegParts).toHaveLength(2);
    expect(rightLegParts).toHaveLength(2);
  });
});

describe('SubBodyPart.getMainPart', () => {
  it('应该获取子部位的主部位', () => {
    const mainPart = SubBodyPart.getMainPart(SubBodyPartType.UPPER_ARM_L);

    expect(mainPart).toBe(BodyPartType.ARM_L);
  });

  it('应该正确识别所有子部位的主部位', () => {
    expect(SubBodyPart.getMainPart(SubBodyPartType.LOWER_ARM_L)).toBe(BodyPartType.ARM_L);
    expect(SubBodyPart.getMainPart(SubBodyPartType.UPPER_ARM_R)).toBe(BodyPartType.ARM_R);
    expect(SubBodyPart.getMainPart(SubBodyPartType.LOWER_ARM_R)).toBe(BodyPartType.ARM_R);
    expect(SubBodyPart.getMainPart(SubBodyPartType.UPPER_LEG_L)).toBe(BodyPartType.LEG_L);
    expect(SubBodyPart.getMainPart(SubBodyPartType.LOWER_LEG_L)).toBe(BodyPartType.LEG_L);
    expect(SubBodyPart.getMainPart(SubBodyPartType.UPPER_LEG_R)).toBe(BodyPartType.LEG_R);
    expect(SubBodyPart.getMainPart(SubBodyPartType.LOWER_LEG_R)).toBe(BodyPartType.LEG_R);
  });

  it('未知子部位应该返回 null', () => {
    const mainPart = SubBodyPart.getMainPart('unknown' as SubBodyPartType);

    expect(mainPart).toBeNull();
  });
});

describe('SubBodyPart.getProps', () => {
  it('应该获取子部位的属性', () => {
    const props = SubBodyPart.getProps(SubBodyPartType.UPPER_ARM_L);

    expect(props).toBeDefined();
    expect(props!.maxHP).toBe(40);
    expect(props!.size).toBe(3);
  });

  it('未知子部位应该返回 undefined', () => {
    const props = SubBodyPart.getProps('unknown' as SubBodyPartType);

    expect(props).toBeUndefined();
  });
});

describe('SubBodyPart.getMaxHP', () => {
  it('应该获取子部位的最大 HP', () => {
    expect(SubBodyPart.getMaxHP(SubBodyPartType.UPPER_ARM_L)).toBe(40);
    expect(SubBodyPart.getMaxHP(SubBodyPartType.LOWER_ARM_L)).toBe(30);
    expect(SubBodyPart.getMaxHP(SubBodyPartType.UPPER_LEG_L)).toBe(50);
    expect(SubBodyPart.getMaxHP(SubBodyPartType.LOWER_LEG_L)).toBe(40);
  });

  it('未知子部位应该返回 0', () => {
    expect(SubBodyPart.getMaxHP('unknown' as SubBodyPartType)).toBe(0);
  });
});

describe('SubBodyPart.getSize', () => {
  it('应该获取子部位的大小', () => {
    expect(SubBodyPart.getSize(SubBodyPartType.UPPER_ARM_L)).toBe(3);
    expect(SubBodyPart.getSize(SubBodyPartType.LOWER_ARM_L)).toBe(2);
  });

  it('未知子部位应该返回 1', () => {
    expect(SubBodyPart.getSize('unknown' as SubBodyPartType)).toBe(1);
  });
});

describe('SubBodyPart.isLethal', () => {
  it('所有子部位都不应该是致命的', () => {
    expect(SubBodyPart.isLethal(SubBodyPartType.UPPER_ARM_L)).toBe(false);
    expect(SubBodyPart.isLethal(SubBodyPartType.LOWER_ARM_L)).toBe(false);
    expect(SubBodyPart.isLethal(SubBodyPartType.UPPER_LEG_L)).toBe(false);
    expect(SubBodyPart.isLethal(SubBodyPartType.LOWER_LEG_L)).toBe(false);
  });

  it('未知子部位应该返回 false', () => {
    expect(SubBodyPart.isLethal('unknown' as SubBodyPartType)).toBe(false);
  });
});

describe('SubBodyPart.canBeMissing', () => {
  it('所有子部位都应该可以缺失', () => {
    expect(SubBodyPart.canBeMissing(SubBodyPartType.UPPER_ARM_L)).toBe(true);
    expect(SubBodyPart.canBeMissing(SubBodyPartType.LOWER_ARM_L)).toBe(true);
    expect(SubBodyPart.canBeMissing(SubBodyPartType.UPPER_LEG_L)).toBe(true);
    expect(SubBodyPart.canBeMissing(SubBodyPartType.LOWER_LEG_L)).toBe(true);
  });

  it('未知子部位应该返回 false', () => {
    expect(SubBodyPart.canBeMissing('unknown' as SubBodyPartType)).toBe(false);
  });
});

describe('SubBodyPart.getOppositeSide', () => {
  it('应该获取对侧部位', () => {
    expect(SubBodyPart.getOppositeSide(SubBodyPartType.UPPER_ARM_L)).toBe(SubBodyPartType.UPPER_ARM_R);
    expect(SubBodyPart.getOppositeSide(SubBodyPartType.UPPER_ARM_R)).toBe(SubBodyPartType.UPPER_ARM_L);
    expect(SubBodyPart.getOppositeSide(SubBodyPartType.LOWER_ARM_L)).toBe(SubBodyPartType.LOWER_ARM_R);
    expect(SubBodyPart.getOppositeSide(SubBodyPartType.LOWER_ARM_R)).toBe(SubBodyPartType.LOWER_ARM_L);
    expect(SubBodyPart.getOppositeSide(SubBodyPartType.UPPER_LEG_L)).toBe(SubBodyPartType.UPPER_LEG_R);
    expect(SubBodyPart.getOppositeSide(SubBodyPartType.UPPER_LEG_R)).toBe(SubBodyPartType.UPPER_LEG_L);
    expect(SubBodyPart.getOppositeSide(SubBodyPartType.LOWER_LEG_L)).toBe(SubBodyPartType.LOWER_LEG_R);
    expect(SubBodyPart.getOppositeSide(SubBodyPartType.LOWER_LEG_R)).toBe(SubBodyPartType.LOWER_LEG_L);
  });
});

describe('SubBodyPart.isLeftSide 和 isRightSide', () => {
  it('应该正确识别左侧部位', () => {
    expect(SubBodyPart.isLeftSide(SubBodyPartType.UPPER_ARM_L)).toBe(true);
    expect(SubBodyPart.isLeftSide(SubBodyPartType.LOWER_ARM_L)).toBe(true);
    expect(SubBodyPart.isLeftSide(SubBodyPartType.UPPER_LEG_L)).toBe(true);
    expect(SubBodyPart.isLeftSide(SubBodyPartType.LOWER_LEG_L)).toBe(true);
    expect(SubBodyPart.isLeftSide(SubBodyPartType.UPPER_ARM_R)).toBe(false);
  });

  it('应该正确识别右侧部位', () => {
    expect(SubBodyPart.isRightSide(SubBodyPartType.UPPER_ARM_R)).toBe(true);
    expect(SubBodyPart.isRightSide(SubBodyPartType.LOWER_ARM_R)).toBe(true);
    expect(SubBodyPart.isRightSide(SubBodyPartType.UPPER_LEG_R)).toBe(true);
    expect(SubBodyPart.isRightSide(SubBodyPartType.LOWER_LEG_R)).toBe(true);
    expect(SubBodyPart.isRightSide(SubBodyPartType.UPPER_ARM_L)).toBe(false);
  });
});

describe('SubBodyPart.createId', () => {
  it('应该创建子部位 ID', () => {
    const id = SubBodyPart.createId(SubBodyPartType.UPPER_ARM_L);

    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });
});

describe('SubBodyPart.getAllSubPartTypes', () => {
  it('应该返回所有支持的子部位类型', () => {
    const allTypes = SubBodyPart.getAllSubPartTypes();

    expect(allTypes.length).toBeGreaterThan(0);
    expect(allTypes).toContain(SubBodyPartType.UPPER_ARM_L);
    expect(allTypes).toContain(SubBodyPartType.LOWER_ARM_L);
    expect(allTypes).toContain(SubBodyPartType.UPPER_ARM_R);
    expect(allTypes).toContain(SubBodyPartType.LOWER_ARM_R);
    expect(allTypes).toContain(SubBodyPartType.UPPER_LEG_L);
    expect(allTypes).toContain(SubBodyPartType.LOWER_LEG_L);
    expect(allTypes).toContain(SubBodyPartType.UPPER_LEG_R);
    expect(allTypes).toContain(SubBodyPartType.LOWER_LEG_R);
  });

  it('应该只返回子部位类型（UPPER_ 或 LOWER_ 开头）', () => {
    const allTypes = SubBodyPart.getAllSubPartTypes();

    for (const type of allTypes) {
      const typeStr = type.toString();
      expect(
        typeStr.startsWith('UPPER_') || typeStr.startsWith('LOWER_')
      ).toBe(true);
    }
  });
});

describe('SubBodyPart.distributeHP', () => {
  it('应该根据大小分配 HP', () => {
    const hpMap = SubBodyPart.distributeHP(70, BodyPartType.ARM_L);

    expect(hpMap.size).toBe(2);

    // 上臂大小为 3，下臂大小为 2，总大小为 5
    // 上臂应该获得 70 * 3/5 = 42
    // 下臂应该获得 70 * 2/5 = 28
    const values = Array.from(hpMap.values());
    expect(values.some(v => v === 42 || v === 41)).toBe(true); // 允许舍入误差
    expect(values.some(v => v === 28 || v === 29)).toBe(true);
  });

  it('不支持的主部位应该返回空 Map', () => {
    const hpMap = SubBodyPart.distributeHP(100, BodyPartType.HEAD);

    expect(hpMap.size).toBe(0);
  });

  it('腿部的 HP 分配应该正确', () => {
    const hpMap = SubBodyPart.distributeHP(90, BodyPartType.LEG_L);

    expect(hpMap.size).toBe(2);

    // 大腿大小为 4，小腿大小为 3，总大小为 7
    // 大腿应该获得 90 * 4/7 ≈ 51
    // 小腿应该获得 90 * 3/7 ≈ 39
    const values = Array.from(hpMap.values());
    // 由于 Math.floor 舍入，总和可能略小于输入
    expect(values.reduce((sum, v) => sum + v, 0)).toBeGreaterThanOrEqual(88);
  });
});

describe('SubBodyPart.calculateTotalHP', () => {
  it('应该计算所有子部位的总 HP', () => {
    const hpMap = Map([
      [SubBodyPart.createId(SubBodyPartType.UPPER_ARM_L), 42],
      [SubBodyPart.createId(SubBodyPartType.LOWER_ARM_L), 28],
    ]);

    const total = SubBodyPart.calculateTotalHP(hpMap);

    expect(total).toBe(70);
  });

  it('空 Map 应该返回 0', () => {
    const total = SubBodyPart.calculateTotalHP(Map());

    expect(total).toBe(0);
  });
});
