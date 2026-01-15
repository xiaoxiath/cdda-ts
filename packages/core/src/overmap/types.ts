/**
 * Overmap 类型定义
 *
 * 定义大地图系统的核心类型，与 Cataclysm-DDA 的 overmap.h 保持一致
 */

/**
 * 视野等级
 *
 * 对应 CDDA 的 om_vision_level
 */
export enum OmVisionLevel {
  /** 未知 - 没有任何信息 */
  UNSEEN = 0,
  /** 模糊 - 从快速一瞥中得到的粗略细节，如大致地理特征 */
  VAGUE = 1,
  /** 轮廓 - 从远处扫描，可以追踪道路、区分明显特征 */
  OUTLINES = 2,
  /** 详细 - 从远处的详细扫描，通用建筑类型、难以发现特征 */
  DETAILS = 3,
  /** 完全 - 该地块的所有信息 */
  FULL = 4,
}

/**
 * 方向 (用于旋转)
 */
export enum OmDirection {
  NORTH = 0,
  EAST = 1,
  SOUTH = 2,
  WEST = 3,
}

/**
 * Overmap 尺寸常量
 *
 * 与 CDDA 保持一致
 */
export const OMAPX = 180;
export const OMAPY = 180;
export const OVERMAP_LAYERS = 21;
export const OMT_TO_SUBMAP = 12; // 每个 OMT = 12 submap
export const OVERMAP_DEPTH = 10; // 地下层数

/**
 * 将 z 坐标转换为层数组索引
 */
export const Z_TO_INDEX = (z: number): number => z + OVERMAP_DEPTH;

/**
 * 将层数组索引转换为 z 坐标
 */
export const INDEX_TO_Z = (index: number): number => index - OVERMAP_DEPTH;

/**
 * OMT (局部 Overmap Terrain) 坐标
 * 范围: x, y: 0-179, z: 0-20
 */
export interface PointOMT {
  readonly x: number;
  readonly y: number;
}

/**
 * 三维 OMT 坐标
 */
export interface TripointOMT {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * 全局 Overmap 坐标 (2D)
 * 用于定位单个 overmap 在世界中的位置
 */
export interface PointAbsOM {
  readonly x: number;
  readonly y: number;
}

/**
 * 全局 Overmap Terrain 坐标 (3D)
 */
export interface TripointAbsOMT {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Overmap 笔记
 */
export interface OmNote {
  /** 笔记文本 */
  readonly text: string;
  /** 位置 */
  readonly position: TripointOMT;
  /** 是否标记为危险 */
  readonly dangerous: boolean;
  /** 危险半径 */
  readonly dangerRadius: number;
}

/**
 * Overmap 额外内容
 */
export interface OmExtra {
  /** 额外内容 ID (map_extra_id) */
  readonly id: string;
  /** 位置 */
  readonly position: PointOMT;
}

/**
 * 地图层属性
 */
export interface OvermapLayerProps {
  /** 地形数据 - key: "x,y", value: oter_id */
  readonly terrain: Map<string, string>;
  /** 可见性数据 - key: "x,y", value: 视野等级 */
  readonly visible: Map<string, OmVisionLevel>;
  /** 已探索数据 - key: "x,y", value: 是否已探索 */
  readonly explored: Map<string, boolean>;
  /** 笔记列表 */
  readonly notes: readonly OmNote[];
  /** 额外内容列表 */
  readonly extras: readonly OmExtra[];
}

/**
 * 无线电塔
 */
export interface RadioTower {
  /** 位置 */
  readonly position: PointOMT;
  /** 信号强度 */
  readonly strength: number;
  /** 类型 */
  readonly type: RadioType;
  /** 消息 */
  readonly message: string;
}

/**
 * 无线电类型
 */
export enum RadioType {
  /** 消息广播 */
  MESSAGE_BROADCAST = 'MESSAGE_BROADCAST',
  /** 天气广播 */
  WEATHER_RADIO = 'WEATHER_RADIO',
}

/**
 * Overmap 属性
 */
export interface OvermapProps {
  /** 此 overmap 在全局坐标中的位置 */
  readonly localPos: PointAbsOM;
  /** 所有层的数据 */
  readonly layers: readonly any[];
  /** 城市列表 */
  readonly cities: readonly any[];
  /** 无线电塔列表 */
  readonly radios: readonly RadioTower[];
  /** 连接点 - key: connection_id, value: 连接点列表 */
  readonly connections: Map<string, TripointOMT[]>;
  /** 特殊地点 - key: special_id, value: 位置 */
  readonly specials: Map<string, TripointOMT>;
}

/**
 * 城市
 */
export interface CityInterface {
  /** 位置 */
  readonly pos: PointOMT;
  /** 大小 */
  readonly size: number;
  /** 名称 */
  readonly name: string;
}

/**
 * Overmap 特殊地点配置
 */
export interface OvermapSpecialJson {
  readonly type: 'overmap_special';
  readonly id: string;
  readonly subtype?: 'fixed' | 'mutable';
  readonly locations: string[];
  readonly city_distance?: [number, number];
  readonly city_sizes?: [number, number];
  readonly occurrences?: [number, number];
  readonly flags?: string[];
  readonly rotate?: boolean;
  readonly overmaps?: OvermapSpecialEntry[];
  readonly connections?: SpecialConnection[];
}

/**
 * Overmap 特殊地点条目
 */
export interface OvermapSpecialEntry {
  readonly point: [number, number, number];
  readonly overmap: string;
  readonly locations?: string[];
}

/**
 * 特殊地点连接
 */
export interface SpecialConnection {
  readonly point: [number, number, number];
  readonly terrain: string;
  readonly connection: string;
  readonly from?: [number, number, number];
  readonly existing?: boolean;
}

/**
 * Overmap 连接配置
 */
export interface OvermapConnectionJson {
  readonly type: 'overmap_connection';
  readonly id: string;
  readonly subtypes: ConnectionSubtype[];
}

/**
 * 连接子类型
 */
export interface ConnectionSubtype {
  readonly terrain: string;
  readonly locations: string[];
  readonly basic_cost?: number;
  readonly flags?: string[];
}

/**
 * Overmap 位置配置
 */
export interface OvermapLocationJson {
  readonly type: 'overmap_location';
  readonly id: string;
  readonly terrains: string[];
}
