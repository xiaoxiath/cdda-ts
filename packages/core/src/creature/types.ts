/**
 * 角色系统类型定义
 *
 * 定义角色相关的核心类型和枚举
 */

/**
 * 身体部位 ID
 */
export enum BodyPartId {
  TORSO = 0,   // 躯干
  HEAD,        // 头
  EYES,        // 眼
  MOUTH,       // 嘴
  ARM_L,       // 左臂
  ARM_R,       // 右臂
  HAND_L,      // 左手
  HAND_R,      // 右手
  LEG_L,       // 左腿
  LEG_R,       // 右腿
  FOOT_L,      // 左脚
  FOOT_R,      // 右脚
}

/**
 * 身体部位类型
 */
export enum BodyPartType {
  HEAD,      // 头部 - 盔甲位置，重要部位
  TORSO,     // 躯干 - 质量中心
  SENSOR,    // 传感器 - 提供视野
  MOUTH,     // 嘴 - 进食和尖叫
  ARM,       // 手臂 - 可操作对象
  HAND,      // 手 - 操作对象
  LEG,       // 腿 - 提供动力
  FOOT,      // 脚 - 平衡
  WING,      // 翅膀 - 减少坠落伤害
  TAIL,      // 尾巴 - 平衡或操作
  OTHER,     // 其他 - 角等通用肢体
}

/**
 * 角色大小
 */
export enum CreatureSize {
  TINY = 1,      // 松鼠、猫
  SMALL = 2,     // 拉布拉多、人类儿童
  MEDIUM = 3,    // 人类成人
  LARGE = 4,     // 熊、老虎
  HUGE = 5,      // 牛、驼鹿、修格斯
}

/**
 * 身体部位数据（简化版）
 */
export interface BodyPartData {
  readonly id: BodyPartId;
  readonly name: string;
  readonly type: BodyPartType;
  readonly baseHP: number;
  readonly currentHP: number;
}

/**
 * 角色属性
 */
export interface CharacterStats {
  readonly str: number;  // 力量
  readonly dex: number;  // 敏捷
  readonly int: number;  // 智力
  readonly per: number;  // 感知
}

/**
 * 角色类型
 */
export enum CreatureType {
  MONSTER = 'monster',
  CHARACTER = 'character',
  AVATAR = 'avatar',
  NPC = 'npc',
}
