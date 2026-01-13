/**
 * SubBodyPart - 子身体部位系统
 *
 * 支持更精细的身体部位划分，包括大臂、小臂、大腿、小腿等
 * 参考 Cataclysm-DDA 的 bodypart.h
 */

import { Map, List } from 'immutable';
import type { BodyPartId } from '../damage/types';
import { BodyPartType, SubBodyPartType } from '../combat/types';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 子身体部位 ID
 */
export type SubBodyPartId = BodyPartId;

/**
 * 身体部位关系
 */
export interface BodyPartRelation {
  /** 主身体部位 */
  mainPart: BodyPartType;
  /** 子身体部位列表 */
  subParts: SubBodyPartType[];
}

/**
 * 身体部位属性
 */
export interface BodyPartProps {
  /** 最大 HP */
  maxHP: number;
  /** 大小（用于命中计算） */
  size: number;
  /** 是否是致命部位 */
  isLethal: boolean;
  /** 是否可以缺失 */
  canBeMissing: boolean;
  /** 对侧部位（用于左右对称） */
  oppositeSide?: SubBodyPartType;
}

// ============================================================================
// 身体部位定义和映射
// ============================================================================

/**
 * 身体部位到子部位的映射
 */
export const BODY_PART_RELATIONS: Map<BodyPartType, BodyPartRelation> = Map([
  // 左臂的子部位
  [BodyPartType.ARM_L, {
    mainPart: BodyPartType.ARM_L,
    subParts: [SubBodyPartType.UPPER_ARM_L, SubBodyPartType.LOWER_ARM_L],
  }],

  // 右臂的子部位
  [BodyPartType.ARM_R, {
    mainPart: BodyPartType.ARM_R,
    subParts: [SubBodyPartType.UPPER_ARM_R, SubBodyPartType.LOWER_ARM_R],
  }],

  // 左腿的子部位
  [BodyPartType.LEG_L, {
    mainPart: BodyPartType.LEG_L,
    subParts: [SubBodyPartType.UPPER_LEG_L, SubBodyPartType.LOWER_LEG_L],
  }],

  // 右腿的子部位
  [BodyPartType.LEG_R, {
    mainPart: BodyPartType.LEG_R,
    subParts: [SubBodyPartType.UPPER_LEG_R, SubBodyPartType.LOWER_LEG_R],
  }],
]);

/**
 * 子身体部位属性
 */
export const SUB_BODY_PART_PROPS: Map<SubBodyPartType, BodyPartProps> = Map([
  // 左臂子部位
  [SubBodyPartType.UPPER_ARM_L, {
    maxHP: 40,
    size: 3,
    isLethal: false,
    canBeMissing: true,
    oppositeSide: SubBodyPartType.UPPER_ARM_R,
  }],
  [SubBodyPartType.LOWER_ARM_L, {
    maxHP: 30,
    size: 2,
    isLethal: false,
    canBeMissing: true,
    oppositeSide: SubBodyPartType.LOWER_ARM_R,
  }],

  // 右臂子部位
  [SubBodyPartType.UPPER_ARM_R, {
    maxHP: 40,
    size: 3,
    isLethal: false,
    canBeMissing: true,
    oppositeSide: SubBodyPartType.UPPER_ARM_L,
  }],
  [SubBodyPartType.LOWER_ARM_R, {
    maxHP: 30,
    size: 2,
    isLethal: false,
    canBeMissing: true,
    oppositeSide: SubBodyPartType.LOWER_ARM_L,
  }],

  // 左腿子部位
  [SubBodyPartType.UPPER_LEG_L, {
    maxHP: 50,
    size: 4,
    isLethal: false,
    canBeMissing: true,
    oppositeSide: SubBodyPartType.UPPER_LEG_R,
  }],
  [SubBodyPartType.LOWER_LEG_L, {
    maxHP: 40,
    size: 3,
    isLethal: false,
    canBeMissing: true,
    oppositeSide: SubBodyPartType.LOWER_LEG_R,
  }],

  // 右腿子部位
  [SubBodyPartType.UPPER_LEG_R, {
    maxHP: 50,
    size: 4,
    isLethal: false,
    canBeMissing: true,
    oppositeSide: SubBodyPartType.UPPER_LEG_L,
  }],
  [SubBodyPartType.LOWER_LEG_R, {
    maxHP: 40,
    size: 3,
    isLethal: false,
    canBeMissing: true,
    oppositeSide: SubBodyPartType.LOWER_LEG_L,
  }],
]);

// ============================================================================
// 子身体部位工具类
// ============================================================================

/**
 * SubBodyPart - 子身体部位工具类
 *
 * 提供子身体部位相关的查询和计算功能
 */
export class SubBodyPart {
  /**
   * 获取主身体部位的所有子部位
   */
  static getSubParts(mainPart: BodyPartType): SubBodyPartType[] {
    const relation = BODY_PART_RELATIONS.get(mainPart);
    return relation?.subParts || [];
  }

  /**
   * 获取子身体部位的主部位
   */
  static getMainPart(subPart: SubBodyPartType): BodyPartType | null {
    for (const [mainPart, relation] of BODY_PART_RELATIONS.entries()) {
      if (relation.subParts.includes(subPart)) {
        return mainPart;
      }
    }
    return null;
  }

  /**
   * 获取子身体部位的属性
   */
  static getProps(subPart: SubBodyPartType): BodyPartProps | undefined {
    return SUB_BODY_PART_PROPS.get(subPart);
  }

  /**
   * 获取子身体部位的最大 HP
   */
  static getMaxHP(subPart: SubBodyPartType): number {
    return SUB_BODY_PART_PROPS.get(subPart)?.maxHP || 0;
  }

  /**
   * 获取子身体部位的大小
   */
  static getSize(subPart: SubBodyPartType): number {
    return SUB_BODY_PART_PROPS.get(subPart)?.size || 1;
  }

  /**
   * 检查是否是致命部位
   */
  static isLethal(subPart: SubBodyPartType): boolean {
    return SUB_BODY_PART_PROPS.get(subPart)?.isLethal || false;
  }

  /**
   * 检查是否可以缺失
   */
  static canBeMissing(subPart: SubBodyPartType): boolean {
    return SUB_BODY_PART_PROPS.get(subPart)?.canBeMissing || false;
  }

  /**
   * 获取对侧部位
   */
  static getOppositeSide(subPart: SubBodyPartType): SubBodyPartType | undefined {
    return SUB_BODY_PART_PROPS.get(subPart)?.oppositeSide;
  }

  /**
   * 检查是否是左侧部位
   */
  static isLeftSide(subPart: SubBodyPartType): boolean {
    return subPart.toString().endsWith('_L');
  }

  /**
   * 检查是否是右侧部位
   */
  static isRightSide(subPart: SubBodyPartType): boolean {
    return subPart.toString().endsWith('_R');
  }

  /**
   * 创建子身体部位 ID
   */
  static createId(subPart: SubBodyPartType): SubBodyPartId {
    return subPart.toString().toLowerCase() as BodyPartId;
  }

  /**
   * 获取所有支持的子身体部位类型
   */
  static getAllSubPartTypes(): SubBodyPartType[] {
    return Object.values(SubBodyPartType).filter(
      type => typeof type === 'string' && (
        type.startsWith('UPPER_') || type.startsWith('LOWER_')
      )
    ) as SubBodyPartType[];
  }

  /**
   * 根据主部位 HP 计算子部位 HP 分布
   *
   * @param mainPartHP 主部位的 HP
   * @param mainPart 主部位类型
   * @returns 子部位 HP 映射
   */
  static distributeHP(
    mainPartHP: number,
    mainPart: BodyPartType
  ): Map<SubBodyPartId, number> {
    const subParts = SubBodyPart.getSubParts(mainPart);
    if (subParts.length === 0) {
      return Map();
    }

    let result = Map<SubBodyPartId, number>();
    let totalSize = 0;

    // 计算总大小
    for (const subPart of subParts) {
      totalSize += SubBodyPart.getSize(subPart);
    }

    // 按比例分配 HP
    for (const subPart of subParts) {
      const size = SubBodyPart.getSize(subPart);
      const ratio = size / totalSize;
      const hp = Math.floor(mainPartHP * ratio);
      result = result.set(SubBodyPart.createId(subPart), hp);
    }

    return result;
  }

  /**
   * 计算子身体部位的合计 HP
   *
   * @param subPartHP 子部位 HP 映射
   * @returns 合计 HP
   */
  static calculateTotalHP(subPartHP: Map<SubBodyPartId, number>): number {
    let total = 0;
    for (const hp of subPartHP.values()) {
      total += hp;
    }
    return total;
  }
}
