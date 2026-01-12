/**
 * Re-export TerrainId from coordinates for convenience
 */
export type { TerrainId } from '../coordinates/types';

/**
 * 地形标志枚举
 * 匹配 CDDA src/mapdata.h enum class ter_furn_flag
 * 完整实现所有 70+ 个标志
 */
export enum TerrainFlag {
  // ========================================
  // 基础属性标志 (Basic Properties)
  // ========================================
  /** 玩家和怪物可以看透/通过 */
  TRANSPARENT = 'TRANSPARENT',
  /** 必须与 TRANSPARENT 配对。允许光线通过，但阻挡视线 */
  TRANSLUCENT = 'TRANSLUCENT',
  /** 可燃 */
  FLAMMABLE = 'FLAMMABLE',
  /** 难以点燃，但仍可能 */
  FLAMMABLE_HARD = 'FLAMMABLE_HARD',
  /** 燃烧后变成灰烬而非瓦砾 */
  FLAMMABLE_ASH = 'FLAMMABLE_ASH',
  /** 平坦，玩家可以在上面建造和移动家具 */
  FLAT = 'FLAT',
  /** 容器，此方格上的物品在被拾取前隐藏 */
  CONTAINER = 'CONTAINER',
  /** 放置物品的有效地形 */
  PLACE_ITEM = 'PLACE_ITEM',
  /** 门，可以被打开（用于 NPC 寻路） */
  DOOR = 'DOOR',
  /** 可以被开锁 */
  LOCKED = 'LOCKED',
  /** 可以被撬锁 */
  PICKABLE = 'PICKABLE',
  /** 窗户 */
  WINDOW = 'WINDOW',

  // ========================================
  // 移动属性标志 (Movement Properties)
  // ========================================
  /** 阻挡移动，但不是墙（熔岩、水等） */
  LIQUID = 'LIQUID',
  /** 玩家和怪物可以游泳通过 */
  SWIMMABLE = 'SWIMMABLE',
  /** 深水 */
  DEEP_WATER = 'DEEP_WATER',
  /** 浅水 */
  SHALLOW_WATER = 'SHALLOW_WATER',
  /** 墙 */
  WALL = 'WALL',
  /** 细障碍物，即栅栏 */
  THIN_OBSTACLE = 'THIN_OBSTACLE',
  /** 可攀爬 */
  CLIMBABLE = 'CLIMBABLE',
  /** 锐利，可能对通过的玩家/怪物造成轻微伤害 */
  SHARP = 'SHARP',
  /** 粗糙，可能伤害玩家的脚 */
  ROUGH = 'ROUGH',
  /** 不稳定 */
  UNSTABLE = 'UNSTABLE',
  /** 小通道 */
  SMALL_PASSAGE = 'SMALL_PASSAGE',

  // ========================================
  // 环境属性标志 (Environmental Properties)
  // ========================================
  /** 室内，有屋顶覆盖，阻挡雨水、阳光等 */
  INDOORS = 'INDOORS',
  /** 黑暗环境 */
  DARKNESS = 'DARKNESS',
  /** 阳光照射 */
  SUN = 'SUN',
  /** 有屋顶，可阻挡雨水 */
  NO_RAIN = 'NO_RAIN',
  /** 可用于屋顶建造的边界 */
  SUPPORTS_ROOF = 'SUPPORTS_ROOF',
  /** 有可以坍塌的屋顶 */
  COLLAPSES = 'COLLAPSES',
  /** Z轴透明 */
  Z_TRANSPARENT = 'Z_TRANSPARENT',
  /** 从上方可见 */
  SEEN_FROM_ABOVE = 'SEEN_FROM_ABOVE',
  /** 上方有阳光屋顶 */
  SUN_ROOF_ABOVE = 'SUN_ROOF_ABOVE',

  // ========================================
  // 操作属性标志 (Interaction Properties)
  // ========================================
  /** 可用铲子挖掘 */
  DIGGABLE = 'DIGGABLE',
  /** 可用镐/电钻开采，但不一定支撑屋顶 */
  MINEABLE = 'MINEABLE',
  /** 可耕地 */
  PLOWABLE = 'PLOWABLE',
  /** 可种植 */
  PLANTABLE = 'PLANTABLE',
  /** 物品"掉落"到此空间 */
  NOITEM = 'NOITEM',
  /** 不能使用 'e' 检索物品，必须先砸开 */
  SEALED = 'SEALED',
  /** 阻挡风 */
  BLOCK_WIND = 'BLOCK_WIND',
  /** 阻挡门（增强地形抵抗破坏的能力） */
  BLOCKSDOOR = 'BLOCKSDOOR',
  /** 允许场效应 */
  ALLOW_FIELD_EFFECT = 'ALLOW_FIELD_EFFECT',
  /** 允许在开放空间放置 */
  ALLOW_ON_OPEN_AIR = 'ALLOW_ON_OPEN_AIR',

  // ========================================
  // 特殊属性标志 (Special Properties)
  // ========================================
  /** 真菌覆盖 */
  FUNGUS = 'FUNGUS',
  /** 灌木 */
  SHRUB = 'SHRUB',
  /** 幼树 */
  YOUNG = 'YOUNG',
  /** 树 */
  TREE = 'TREE',
  /** 有机家具 */
  ORGANIC = 'ORGANIC',
  /** 花 */
  FLOWER = 'FLOWER',
  /** 已收获，不会再结果实 */
  HARVESTED = 'HARVESTED',
  /** 墙的自动符号 */
  AUTO_WALL_SYMBOL = 'AUTO_WALL_SYMBOL',
  /** 与墙连接 */
  CONNECT_WITH_WALL = 'CONNECT_WITH_WALL',

  // ========================================
  // 视觉/感知属性标志 (Visual/Sensory Properties)
  // ========================================
  /** 在此瓷砖上视线减少到 1 */
  NO_SIGHT = 'NO_SIGHT',
  /** 此瓷砖上的气味（以及通过它扩散的气味）减少到 0。对气味的作用像墙一样 */
  NO_SCENT = 'NO_SCENT',
  /** 进一步减少气味，只有当也可破坏时才有效 */
  REDUCE_SCENT = 'REDUCE_SCENT',

  // ========================================
  // 功能属性标志 (Functional Properties)
  // ========================================
  /** 可以向下 */
  GOES_DOWN = 'GOES_DOWN',
  /** 可以向上 */
  GOES_UP = 'GOES_UP',
  /** 坡道 */
  RAMP = 'RAMP',
  /** 向下坡道 */
  RAMP_DOWN = 'RAMP_DOWN',
  /** 向上坡道 */
  RAMP_UP = 'RAMP_UP',
  /** 无地板 */
  NO_FLOOR = 'NO_FLOOR',
  /** 电梯 */
  ELEVATOR = 'ELEVATOR',
  /** 可作为计算机使用 */
  CONSOLE = 'CONSOLE',
  /** 玩家可以从这里发射架设的武器（例如 M2 勃朗宁） */
  MOUNTABLE = 'MOUNTABLE',
  /** 阻止火势蔓延（火盆、木炉等） */
  FIRE_CONTAINER = 'FIRE_CONTAINER',
  /** 防止烟雾产生，用于通风木炉等 */
  SUPPRESS_SMOKE = 'SUPPRESS_SMOKE',
  /** 允许气体不受阻碍地流动 */
  PERMEABLE = 'PERMEABLE',

  // ========================================
  // 建造属性标志 (Construction Properties)
  // ========================================
  /** 玩家可以不使用工具进行拆解 */
  EASY_DECONSTRUCT = 'EASY_DECONSTRUCT',
  /** 平坦硬表面（例如桌子，但不是椅子；树桩等） */
  FLAT_SURF = 'FLAT_SURF',
  /** 铁路 */
  RAIL = 'RAIL',
  /** 主要影响溜冰鞋的速度 */
  ROAD = 'ROAD',

  // ========================================
  // 危险属性标志 (Danger Properties)
  // ========================================
  /** 落到此处的物品被摧毁 */
  DESTROY_ITEM = 'DESTROY_ITEM',
  /** 设置警报时触发 */
  ALARMED = 'ALARMED',

  // ========================================
  // 连接属性标志 (Connection Properties)
  // ========================================
  /** 已连接 */
  CONNECTED = 'CONNECTED',
  /** 自动旋转 */
  AUTO_ROTATE = 'AUTO_ROTATE',

  // ========================================
  // 生物/环境属性标志 (Creature/Environment Properties)
  // ========================================
  /** 可钓鱼 */
  FISHABLE = 'FISHABLE',
  /** 可放牧 */
  GRAZABLE = 'GRAZABLE',
  /** 放牧动物不可食用 */
  GRAZER_INEDIBLE = 'GRAZER_INEDIBLE',
  /** 可浏览 */
  BROWSABLE = 'BROWSABLE',

  // ========================================
  // 植物属性标志 (Plant Properties)
  // ========================================
  /** 植物 */
  PLANT = 'PLANT',

  // ========================================
  // 隐藏属性标志 (Visibility Properties)
  // ========================================
  /** 此瓷砖上的生物不能被不相邻的其他生物看到 */
  HIDE_PLACE = 'HIDE_PLACE',

  // ========================================
  // 门属性标志 (Door Properties)
  // ========================================
  /** 如果是门（带有 'open' 或 'close' 字段），只有在内部时才能打开或关闭 */
  OPENCLOSE_INSIDE = 'OPENCLOSE_INSIDE',
}

/**
 * 地形标志集合
 * 匹配 CDDA enum_bitset<ter_furn_flag>
 */
export class TerrainFlags {
  private readonly _flags: Set<TerrainFlag>;

  constructor(flags?: TerrainFlag[]) {
    this._flags = new Set(flags);
    Object.freeze(this);
  }

  /**
   * 获取标志数量
   */
  get size(): number {
    return this._flags.size;
  }

  /**
   * 检查是否为空
   */
  isEmpty(): boolean {
    return this._flags.size === 0;
  }

  /**
   * 从 JSON 数组创建
   */
  static fromJson(json: string[]): TerrainFlags {
    const flags = json
      .map((s) => {
        const flag = Object.values(TerrainFlag).find((v) => v === s);
        return flag;
      })
      .filter((f): f is TerrainFlag => f !== undefined);

    return new TerrainFlags(flags);
  }

  /**
   * 获取所有标志
   */
  values(): TerrainFlag[] {
    return Array.from(this._flags);
  }

  /**
   * 检查是否有标志
   */
  hasFlag(flag: TerrainFlag): boolean {
    return this._flags.has(flag);
  }

  /**
   * 检查是否包含标志（Immutable.js Set 兼容）
   */
  has(flag: TerrainFlag): boolean {
    return this._flags.has(flag);
  }

  /**
   * 添加标志
   */
  add(flag: TerrainFlag): TerrainFlags {
    const newFlags = new Set(this._flags);
    newFlags.add(flag);
    return new TerrainFlags(Array.from(newFlags));
  }

  /**
   * 移除标志
   */
  remove(flag: TerrainFlag): TerrainFlags {
    const newFlags = new Set(this._flags);
    newFlags.delete(flag);
    return new TerrainFlags(Array.from(newFlags));
  }

  // ========================================
  // 便捷检查方法 (Convenience Check Methods)
  // ========================================

  /**
   * 检查是否透明
   */
  isTransparent(): boolean {
    return this.has(TerrainFlag.TRANSPARENT);
  }

  /**
   * 检查是否半透明
   */
  isTranslucent(): boolean {
    return this.has(TerrainFlag.TRANSLUCENT);
  }

  /**
   * 检查是否可通行
   */
  isPassable(): boolean {
    return !this.has(TerrainFlag.WALL) && !this.has(TerrainFlag.THIN_OBSTACLE);
  }

  /**
   * 检查是否平坦
   */
  isFlat(): boolean {
    return this.has(TerrainFlag.FLAT);
  }

  /**
   * 检查是否室内
   */
  isIndoors(): boolean {
    return this.has(TerrainFlag.INDOORS);
  }

  /**
   * 检查是否液体
   */
  isLiquid(): boolean {
    return this.has(TerrainFlag.LIQUID);
  }

  /**
   * 检查是否深水
   */
  isDeepWater(): boolean {
    return this.has(TerrainFlag.DEEP_WATER);
  }

  /**
   * 检查是否浅水
   */
  isShallowWater(): boolean {
    return this.has(TerrainFlag.SHALLOW_WATER);
  }

  /**
   * 检查是否可游泳
   */
  isSwimmable(): boolean {
    return this.has(TerrainFlag.SWIMMABLE);
  }

  /**
   * 检查是否可挖掘
   */
  isDiggable(): boolean {
    return this.has(TerrainFlag.DIGGABLE);
  }

  /**
   * 检查是否可开采
   */
  isMineable(): boolean {
    return this.has(TerrainFlag.MINEABLE);
  }

  /**
   * 检查是否墙
   */
  isWall(): boolean {
    return this.has(TerrainFlag.WALL);
  }

  /**
   * 检查是否门
   */
  isDoor(): boolean {
    return this.has(TerrainFlag.DOOR);
  }

  /**
   * 检查是否窗户
   */
  isWindow(): boolean {
    return this.has(TerrainFlag.WINDOW);
  }

  /**
   * 检查是否易燃
   */
  isFlammable(): boolean {
    return (
      this.has(TerrainFlag.FLAMMABLE) ||
      this.has(TerrainFlag.FLAMMABLE_HARD) ||
      this.has(TerrainFlag.FLAMMABLE_ASH)
    );
  }

  /**
   * 检查是否可攀爬
   */
  isClimbable(): boolean {
    return this.has(TerrainFlag.CLIMBABLE);
  }

  /**
   * 检查是否可向下
   */
  goesDown(): boolean {
    return this.has(TerrainFlag.GOES_DOWN);
  }

  /**
   * 检查是否可向上
   */
  goesUp(): boolean {
    return this.has(TerrainFlag.GOES_UP);
  }

  /**
   * 检查是否坡道
   */
  isRamp(): boolean {
    return this.has(TerrainFlag.RAMP);
  }

  /**
   * 检查是否树
   */
  isTree(): boolean {
    return this.has(TerrainFlag.TREE);
  }

  /**
   * 检查是否灌木
   */
  isShrub(): boolean {
    return this.has(TerrainFlag.SHRUB);
  }

  /**
   * 检查是否植物
   */
  isPlant(): boolean {
    return this.has(TerrainFlag.PLANT);
  }

  /**
   * 检查是否有屋顶
   */
  hasRoof(): boolean {
    return this.has(TerrainFlag.INDOORS) || this.has(TerrainFlag.NO_RAIN);
  }

  /**
   * 检查是否危险（深水、锐利、不稳定等）
   */
  isDangerous(): boolean {
    return (
      this.has(TerrainFlag.DEEP_WATER) ||
      this.has(TerrainFlag.SHARP) ||
      this.has(TerrainFlag.UNSTABLE) ||
      this.has(TerrainFlag.DESTROY_ITEM)
    );
  }

  /**
   * 转换为数组（用于序列化）
   */
  toArray(): TerrainFlag[] {
    return Array.from(this._flags);
  }

  /**
   * 转换为 JSON 数组（用于序列化）
   */
  toJson(): string[] {
    return this.toArray().map((f) => f.toString());
  }
}
