/**
 * EquipmentSlot - 装备槽类
 *
 * 参考 Cataclysm-DDA 的装备槽系统
 * 定义单个装备槽的属性和行为
 */

import { Set, List } from 'immutable';
import type {
  EquipmentSlotId,
  EquipmentSlotDefinition,
  EquipmentSlotType,
  EquipmentLayer,
  EquipmentItem,
} from './types';
import {
  createEquipmentSlotId,
  EquipmentLayer as EL,
  EquipmentSlotType as EST,
} from './types';

/**
 * EquipmentSlot - 装备槽类
 *
 * 定义角色可以装备物品的槽位
 */
export class EquipmentSlot {
  readonly id!: EquipmentSlotId;
  readonly type!: EquipmentSlotType;
  readonly name!: string;
  readonly description!: string;
  readonly validLayers!: Set<EquipmentLayer>;
  readonly capacity!: number;
  readonly required!: boolean;

  private constructor(definition: EquipmentSlotDefinition) {
    this.id = definition.id;
    this.type = definition.type;
    this.name = definition.name;
    this.description = definition.description;
    this.validLayers = Set(definition.validLayers);
    this.capacity = definition.capacity;
    this.required = definition.required;

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建装备槽
   */
  static create(definition: EquipmentSlotDefinition): EquipmentSlot {
    return new EquipmentSlot(definition);
  }

  /**
   * 创建头部槽位
   */
  static head(): EquipmentSlot {
    return EquipmentSlot.create({
      id: createEquipmentSlotId('head'),
      type: EST.HEAD,
      name: '头部',
      description: '头部装备槽（头盔、帽子等）',
      validLayers: [EL.HEAD_LAYER, EL.OUTER_LAYER],
      capacity: 1,
      required: false,
    });
  }

  /**
   * 创建眼睛槽位
   */
  static eyes(): EquipmentSlot {
    return EquipmentSlot.create({
      id: createEquipmentSlotId('eyes'),
      type: EST.EYES,
      name: '眼睛',
      description: '眼部装备槽（护目镜、眼镜等）',
      validLayers: [EL.HEAD_LAYER],
      capacity: 1,
      required: false,
    });
  }

  /**
   *创建嘴巴槽位
   */
  static mouth(): EquipmentSlot {
    return EquipmentSlot.create({
      id: createEquipmentSlotId('mouth'),
      type: EST.MOUTH,
      name: '嘴巴',
      description: '口部装备槽（面罩、口罩等）',
      validLayers: [EL.HEAD_LAYER],
      capacity: 1,
      required: false,
    });
  }

  /**
   * 创建耳朵槽位
   */
  static ears(): EquipmentSlot {
    return EquipmentSlot.create({
      id: createEquipmentSlotId('ears'),
      type: EST.EARS,
      name: '耳朵',
      description: '耳部装备槽（耳塞、耳机等）',
      validLayers: [EL.HEAD_LAYER],
      capacity: 2, // 可以戴两个耳塞
      required: false,
    });
  }

  /**
   * 创建颈部槽位
   */
  static neck(): EquipmentSlot {
    return EquipmentSlot.create({
      id: createEquipmentSlotId('neck'),
      type: EST.NECK,
      name: '颈部',
      description: '颈部装备槽（围巾、项链等）',
      validLayers: [EL.MID_LAYER, EL.OUTER_LAYER],
      capacity: 1,
      required: false,
    });
  }

  /**
   * 创建躯干外层槽位
   */
  static torsoOuter(): EquipmentSlot {
    return EquipmentSlot.create({
      id: createEquipmentSlotId('torso_outer'),
      type: EST.TORSO_OUTER,
      name: '躯干外层',
      description: '躯干外层装备槽（外套、盔甲等）',
      validLayers: [EL.OUTER_LAYER],
      capacity: 1,
      required: false,
    });
  }

  /**
   * 创建躯干中层槽位
   */
  static torsoMiddle(): EquipmentSlot {
    return EquipmentSlot.create({
      id: createEquipmentSlotId('torso_middle'),
      type: EST.TORSO_MIDDLE,
      name: '躯干中层',
      description: '躯干中层装备槽（衬衫、毛衣等）',
      validLayers: [EL.MID_LAYER],
      capacity: 1,
      required: false,
    });
  }

  /**
   * 创建躯干内层槽位
   */
  static torsoInner(): EquipmentSlot {
    return EquipmentSlot.create({
      id: createEquipmentSlotId('torso_inner'),
      type: EST.TORSO_INNER,
      name: '躯干内层',
      description: '躯干内层装备槽（内衣等）',
      validLayers: [EL.BASE_LAYER],
      capacity: 1,
      required: false,
    });
  }

  /**
   * 创建手部槽位
   */
  static hands(): EquipmentSlot {
    return EquipmentSlot.create({
      id: createEquipmentSlotId('hands'),
      type: EST.HANDS,
      name: '手部',
      description: '手部装备槽（手套等）',
      validLayers: [EL.MID_LAYER, EL.OUTER_LAYER],
      capacity: 1,
      required: false,
    });
  }

  /**
   * 创建手指槽位
   */
  static finger(): EquipmentSlot {
    return EquipmentSlot.create({
      id: createEquipmentSlotId('finger'),
      type: EST.FINGER,
      name: '手指',
      description: '手指装备槽（戒指等）',
      validLayers: [EL.MID_LAYER],
      capacity: 10, // 可以戴多个戒指
      required: false,
    });
  }

  /**
   * 创建手腕槽位
   */
  static wrist(): EquipmentSlot {
    return EquipmentSlot.create({
      id: createEquipmentSlotId('wrist'),
      type: EST.WRIST,
      name: '手腕',
      description: '手腕装备槽（手表、护腕等）',
      validLayers: [EL.MID_LAYER],
      capacity: 2, // 可以戴两个手表
      required: false,
    });
  }

  /**
   * 创建腿部槽位
   */
  static legs(): EquipmentSlot {
    return EquipmentSlot.create({
      id: createEquipmentSlotId('legs'),
      type: EST.LEGS,
      name: '腿部',
      description: '腿部装备槽（裤子、护腿等）',
      validLayers: [EL.MID_LAYER, EL.OUTER_LAYER],
      capacity: 1,
      required: false,
    });
  }

  /**
   * 创建脚部槽位
   */
  static feet(): EquipmentSlot {
    return EquipmentSlot.create({
      id: createEquipmentSlotId('feet'),
      type: EST.FEET,
      name: '脚部',
      description: '脚部装备槽（鞋子、靴子等）',
      validLayers: [EL.MID_LAYER, EL.OUTER_LAYER],
      capacity: 1,
      required: false,
    });
  }

  /**
   * 创建背部槽位
   */
  static back(): EquipmentSlot {
    return EquipmentSlot.create({
      id: createEquipmentSlotId('back'),
      type: EST.BACK,
      name: '背部',
      description: '背部装备槽（背包等）',
      validLayers: [EL.BELTED, EL.OUTER_LAYER],
      capacity: 1,
      required: false,
    });
  }

  /**
   * 创建腰部槽位
   */
  static waist(): EquipmentSlot {
    return EquipmentSlot.create({
      id: createEquipmentSlotId('waist'),
      type: EST.WAIST,
      name: '腰部',
      description: '腰部装备槽（腰带等）',
      validLayers: [EL.BELTED],
      capacity: 1,
      required: false,
    });
  }

  /**
   * 创建主手槽位
   */
  static handPrimary(): EquipmentSlot {
    return EquipmentSlot.create({
      id: createEquipmentSlotId('hand_primary'),
      type: EST.HAND_PRIMARY,
      name: '主手',
      description: '主手装备槽（武器、工具等）',
      validLayers: [EL.MID_LAYER],
      capacity: 1,
      required: false,
    });
  }

  /**
   * 创建副手槽位
   */
  static handSecondary(): EquipmentSlot {
    return EquipmentSlot.create({
      id: createEquipmentSlotId('hand_secondary'),
      type: EST.HAND_SECONDARY,
      name: '副手',
      description: '副手装备槽（武器、盾牌等）',
      validLayers: [EL.MID_LAYER],
      capacity: 1,
      required: false,
    });
  }

  // ========== 查询方法 ==========

  /**
   * 检查装备层是否有效
   */
  isValidLayer(layer: EquipmentLayer): boolean {
    return this.validLayers.includes(layer);
  }

  /**
   * 检查是否已满
   */
  isFull(currentCount: number): boolean {
    if (this.capacity === 0) return false; // 无限容量
    return currentCount >= this.capacity;
  }

  /**
   * 获取可用容量
   */
  getAvailableCapacity(currentCount: number): number {
    if (this.capacity === 0) return Infinity;
    return Math.max(0, this.capacity - currentCount);
  }

  /**
   * 获取显示名称
   */
  getDisplayName(): string {
    return `${this.name} (${this.getCapacityDescription()})`;
  }

  /**
   * 获取容量描述
   */
  getCapacityDescription(): string {
    if (this.capacity === 0) return '无限';
    return `${this.capacity} 个`;
  }

  // ========== 序列化 ==========

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      description: this.description,
      validLayers: this.validLayers.toArray(),
      capacity: this.capacity,
      required: this.required,
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>): EquipmentSlot {
    return EquipmentSlot.create({
      id: json.id as EquipmentSlotId,
      type: json.type as EquipmentSlotType,
      name: json.name as string,
      description: json.description as string,
      validLayers: json.validLayers as EquipmentLayer[],
      capacity: json.capacity as number,
      required: json.required as boolean,
    });
  }
}

// ============================================================================
// 预定义装备槽常量
// ============================================================================

/**
 * 预定义装备槽
 */
export const EquipmentSlots = {
  HEAD: EquipmentSlot.head(),
  EYES: EquipmentSlot.eyes(),
  MOUTH: EquipmentSlot.mouth(),
  EARS: EquipmentSlot.ears(),
  NECK: EquipmentSlot.neck(),
  TORSO_OUTER: EquipmentSlot.torsoOuter(),
  TORSO_MIDDLE: EquipmentSlot.torsoMiddle(),
  TORSO_INNER: EquipmentSlot.torsoInner(),
  HANDS: EquipmentSlot.hands(),
  FINGER: EquipmentSlot.finger(),
  WRIST: EquipmentSlot.wrist(),
  LEGS: EquipmentSlot.legs(),
  FEET: EquipmentSlot.feet(),
  BACK: EquipmentSlot.back(),
  WAIST: EquipmentSlot.waist(),
  HAND_PRIMARY: EquipmentSlot.handPrimary(),
  HAND_SECONDARY: EquipmentSlot.handSecondary(),
};

/**
 * 所有装备槽列表
 */
export const AllEquipmentSlots: EquipmentSlot[] = Object.values(EquipmentSlots);
