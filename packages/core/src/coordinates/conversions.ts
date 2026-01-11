import { Tripoint } from './Tripoint';
import { SCALE_CONSTANTS } from './types';

/**
 * 地图方块坐标转 Submap 坐标
 */
export function mapToSubmap(pos: Tripoint): Tripoint {
  return new Tripoint({
    x: Math.floor(pos.x / SCALE_CONSTANTS.SUBMAP_SIZE),
    y: Math.floor(pos.y / SCALE_CONSTANTS.SUBMAP_SIZE),
    z: pos.z,
  });
}

/**
 * Submap 坐标转地图方块坐标
 */
export function submapToMap(sm: Tripoint): Tripoint {
  return new Tripoint({
    x: sm.x * SCALE_CONSTANTS.SUBMAP_SIZE,
    y: sm.y * SCALE_CONSTANTS.SUBMAP_SIZE,
    z: sm.z,
  });
}

/**
 * Submap 内相对坐标
 */
export function inSubmapLocal(pos: Tripoint): Tripoint {
  return new Tripoint({
    x: ((pos.x % SCALE_CONSTANTS.SUBMAP_SIZE) + SCALE_CONSTANTS.SUBMAP_SIZE) % SCALE_CONSTANTS.SUBMAP_SIZE,
    y: ((pos.y % SCALE_CONSTANTS.SUBMAP_SIZE) + SCALE_CONSTANTS.SUBMAP_SIZE) % SCALE_CONSTANTS.SUBMAP_SIZE,
    z: pos.z,
  });
}

/**
 * 地图方块坐标转 OMT 坐标
 */
export function mapToOmt(pos: Tripoint): Tripoint {
  return new Tripoint({
    x: Math.floor(pos.x / SCALE_CONSTANTS.SUBMAP_SIZE_2),
    y: Math.floor(pos.y / SCALE_CONSTANTS.SUBMAP_SIZE_2),
    z: pos.z,
  });
}

/**
 * OMT 坐标转地图方块坐标
 */
export function omtToMap(omt: Tripoint): Tripoint {
  return new Tripoint({
    x: omt.x * SCALE_CONSTANTS.SUBMAP_SIZE_2,
    y: omt.y * SCALE_CONSTANTS.SUBMAP_SIZE_2,
    z: omt.z,
  });
}

/**
 * 坐标转换器
 */
export class CoordinateConverter {
  /**
   * 现实气泡坐标转绝对坐标
   */
  static bubToAbs(pos: Tripoint, absSub: Tripoint): Tripoint {
    return submapToMap(absSub).add(pos);
  }

  /**
   * 绝对坐标转现实气泡坐标
   */
  static absToBub(pos: Tripoint, absSub: Tripoint): Tripoint {
    const absMap = submapToMap(absSub);
    return new Tripoint({
      x: pos.x - absMap.x,
      y: pos.y - absMap.y,
      z: pos.z - absMap.z,
    });
  }
}
