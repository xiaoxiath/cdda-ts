import { Point } from './Point';
import { Tripoint } from './Tripoint';

/**
 * 螺旋搜索工具
 * 匹配 CDDA point.h/point.cpp 中的 closest_points_first 实现
 */

/**
 * 计算从 min_dist 到 max_dist 的正方形中的瓦片数量
 * 匹配 CDDA point.cpp::rectangle_size()
 * @param min_dist 最小距离
 * @param max_dist 最大距离
 * @returns 瓦片数量，如果 min_dist > max_dist 则返回 null
 */
export function rectangleSize(min_dist: number, max_dist: number): number | null {
  min_dist = Math.max(min_dist, 0);
  max_dist = Math.max(max_dist, 0);

  if (min_dist > max_dist) {
    return null;
  }

  const min_edge = min_dist * 2 + 1;
  const max_edge = max_dist * 2 + 1;

  // 公式: max_edge^2 - (min_edge - 2)^2 + (min_dist == 0 ? 1 : 0)
  const n = max_edge * max_edge - (min_edge - 2) * (min_edge - 2) + (min_dist === 0 ? 1 : 0);
  return n;
}

/**
 * 使用螺旋模式查找第一个满足条件的点
 * 匹配 CDDA point.h::find_point_closest_first()
 * @param center 中心点
 * @param min_dist 最小距离
 * @param max_dist 最大距离
 * @param predicate_fn 谓词函数，返回 true 表示找到目标点
 * @returns 找到的点或 null
 */
export function findPointClosestFirst(
  center: Point,
  min_dist: number,
  max_dist: number,
  predicate_fn: (p: Point) => boolean
): Point | null;

export function findPointClosestFirst(
  center: Tripoint,
  min_dist: number,
  max_dist: number,
  predicate_fn: (p: Tripoint) => boolean
): Tripoint | null;

export function findPointClosestFirst(
  center: Point | Tripoint,
  min_dist: number,
  max_dist: number,
  predicate_fn: (p: Point | Tripoint) => boolean
): Point | Tripoint | null {
  const n = rectangleSize(min_dist, max_dist);

  if (n === null) {
    return null;
  }

  const is_center_included = min_dist === 0;

  // 如果包含中心点且满足条件
  if (is_center_included && predicate_fn(center)) {
    return center;
  }

  // 初始化螺旋起点
  const x_init = Math.max(min_dist, 1);
  let px = x_init;
  let py = 1 - x_init;

  // 初始方向：向东
  let dx = 1;
  let dy = 0;

  // 跳过中心点（如果包含）
  for (let i = is_center_included ? 1 : 0; i < n; i++) {
    let next: Point | Tripoint;

    if (center instanceof Point) {
      next = new Point({ x: center.x + px, y: center.y + py });
    } else {
      next = new Tripoint({ x: center.x + px, y: center.y + py, z: center.z });
    }

    if (predicate_fn(next)) {
      return next;
    }

    // 检查是否需要转向（螺旋算法的关键）
    if (px === py || (px < 0 && px === -py) || (px > 0 && px === 1 - py)) {
      // 交换 dx 和 dy，然后反转 dx
      const temp = dx;
      dx = dy;
      dy = temp;
      dx = -dx;
    }

    px += dx;
    py += dy;
  }

  return null;
}

/**
 * 返回从 min_dist 到 max_dist 的螺旋模式中的所有点
 * 匹配 CDDA point.cpp::closest_points_first()
 * @param center 中心点
 * @param max_dist 最大距离
 * @returns 点数组（按距离排序）
 */
export function closestPointsFirst(center: Point, max_dist: number): Point[];
export function closestPointsFirst(center: Tripoint, max_dist: number): Tripoint[];
export function closestPointsFirst(
  center: Point | Tripoint,
  max_dist: number
): (Point | Tripoint)[] {
  return closestPointsFirstRange(center, 0, max_dist);
}

/**
 * 返回从 min_dist 到 max_dist 的螺旋模式中的所有点
 * @param center 中心点
 * @param min_dist 最小距离
 * @param max_dist 最大距离
 * @returns 点数组（按距离排序）
 */
export function closestPointsFirstRange(
  center: Point,
  min_dist: number,
  max_dist: number
): Point[];
export function closestPointsFirstRange(
  center: Tripoint,
  min_dist: number,
  max_dist: number
): Tripoint[];
export function closestPointsFirstRange(
  center: Point | Tripoint,
  min_dist: number,
  max_dist: number
): (Point | Tripoint)[] {
  const n = rectangleSize(min_dist, max_dist);

  if (n === null) {
    return [];
  }

  const result: (Point | Tripoint)[] = [];
  result.length = n;

  const is_center_included = min_dist === 0;

  // 添加中心点（如果包含）
  let index = 0;
  if (is_center_included) {
    result[index++] = center;
  }

  // 初始化螺旋起点
  const x_init = Math.max(min_dist, 1);
  let px = x_init;
  let py = 1 - x_init;

  // 初始方向：向东
  let dx = 1;
  let dy = 0;

  // 遍历所有点
  for (let i = is_center_included ? 1 : 0; i < n; i++) {
    let next: Point | Tripoint;

    if (center instanceof Point) {
      next = new Point({ x: center.x + px, y: center.y + py });
    } else {
      next = new Tripoint({ x: center.x + px, y: center.y + py, z: center.z });
    }

    result[index++] = next;

    // 检查是否需要转向
    if (px === py || (px < 0 && px === -py) || (px > 0 && px === 1 - py)) {
      const temp = dx;
      dx = dy;
      dy = temp;
      dx = -dx;
    }

    px += dx;
    py += dy;
  }

  return result;
}

/**
 * 查找第一个满足条件的点（仅指定最大距离）
 * @param center 中心点
 * @param max_dist 最大距离
 * @param predicate_fn 谓词函数
 * @returns 找到的点或 null
 */
export function findPointClosestFirstMax(
  center: Point,
  max_dist: number,
  predicate_fn: (p: Point) => boolean
): Point | null;
export function findPointClosestFirstMax(
  center: Tripoint,
  max_dist: number,
  predicate_fn: (p: Tripoint) => boolean
): Tripoint | null;
export function findPointClosestFirstMax(
  center: Point | Tripoint,
  max_dist: number,
  predicate_fn: (p: Point | Tripoint) => boolean
): Point | Tripoint | null {
  return findPointClosestFirst(center, 0, max_dist, predicate_fn);
}
