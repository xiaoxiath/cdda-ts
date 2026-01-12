/**
 * OmTerrain (Overmap Terrain) 类
 *
 * 表示大地图上的一个地形类型，对应 CDDA 的 overmap_terrain JSON
 */

/**
 * Overmap Terrain 标志位
 */
export enum OmTerrainFlag {
  NO_ROTATE = 'NO_ROTATE',
  SHOULD_NOT_SPAWN = 'SHOULD_NOT_SPAWN',
  RISK_HIGH = 'RISK_HIGH',
  RISK_LOW = 'RISK_LOW',
  SIDEWALK = 'SIDEWALK',
  SOURCE_VEHICLES = 'SOURCE_VEHICLES',
  SOURCE_FABRICATION = 'SOURCE_FABRICATION',
  SOURCE_SAFETY = 'SOURCE_SAFETY',
  SOURCE_FOOD = 'SOURCE_FOOD',
  PP_GENERATE_RIOT_DAMAGE = 'PP_GENERATE_RIOT_DAMAGE',
  GENERIC_LOOT = 'GENERIC_LOOT',
  REQUIRES_PREDECESSOR = 'REQUIRES_PREDECESSOR',
}

/**
 * Overmap Terrain 定义接口（从 JSON 解析）
 */
export interface OmTerrainJson {
  readonly type: 'overmap_terrain'
  readonly abstract?: boolean
  readonly 'copy-from'?: string
  readonly id?: string | string[]
  readonly name?: string
  readonly sym?: string
  readonly color?: string
  readonly vision_levels?: string
  readonly see_cost?: string
  readonly travel_cost_type?: string
  readonly extras?: string
  readonly mondensity?: number
  readonly flags?: OmTerrainFlag[]
  readonly uniform_terrain?: string
  readonly mapgen?: unknown
  readonly mapgen_straight?: unknown
  readonly mapgen_curved?: unknown
  readonly mapgen_end?: unknown
  readonly mapgen_tee?: unknown
  readonly mapgen_four_way?: unknown
  readonly extend?: Partial<OmTerrainJson>
  readonly delete?: Partial<OmTerrainJson>
}

/**
 * Overmap Terrain 类
 *
 * 表示大地图上的一个地形类型
 */
export class OmTerrain {
  /**
   * 地形 ID（可能包含多个变体）
   */
  readonly ids: readonly string[]

  /**
   * 名称
   */
  readonly name: string

  /**
   * 显示符号
   */
  readonly symbol: string

  /**
   * 颜色
   */
  readonly color: string

  /**
   * 视觉等级
   */
  readonly visionLevels: string | null

  /**
   * 观察成本
   */
  readonly seeCost: string | null

  /**
   * 通行成本类型
   */
  readonly travelCostType: string | null

  /**
   * 额外内容 ID
   */
  readonly extras: string | null

  /**
   * 怪物密度
   */
  readonly mondensity: number

  /**
   * 标志位
   */
  readonly flags: ReadonlySet<OmTerrainFlag>

  /**
   * 统一地形（用于优化）
   * 如果整个 OMT 使用相同地形，存储此 terrain ID
   */
  readonly uniformTerrain: string | null

  /**
   * Mapgen ID（从 mapgen 字段解析）
   */
  readonly mapgenIds: Map<string, string>

  /**
   * 是否是抽象定义（不直接生成）
   */
  readonly isAbstract: boolean

  constructor(props: {
    ids?: string[]
    name?: string
    symbol?: string
    color?: string
    visionLevels?: string | null
    seeCost?: string | null
    travelCostType?: string | null
    extras?: string | null
    mondensity?: number
    flags?: OmTerrainFlag[]
    uniformTerrain?: string | null
    mapgenIds?: Map<string, string>
    isAbstract?: boolean
  }) {
    this.ids = props.ids || []
    this.name = props.name || ''
    this.symbol = props.symbol || '?'
    this.color = props.color || 'white'
    this.visionLevels = props.visionLevels || null
    this.seeCost = props.seeCost || null
    this.travelCostType = props.travelCostType || null
    this.extras = props.extras || null
    this.mondensity = props.mondensity ?? 0
    this.flags = new Set(props.flags || [])
    this.uniformTerrain = props.uniformTerrain || null
    this.mapgenIds = props.mapgenIds || new Map()
    this.isAbstract = props.isAbstract || false
  }

  /**
   * 检查是否有指定标志位
   */
  hasFlag(flag: OmTerrainFlag): boolean {
    return this.flags.has(flag)
  }

  /**
   * 检查是否可以旋转
   */
  canRotate(): boolean {
    return !this.flags.has(OmTerrainFlag.NO_ROTATE)
  }

  /**
   * 获取主要 ID（第一个 ID）
   */
  getPrimaryId(): string {
    return this.ids[0] || ''
  }

  /**
   * 检查是否包含指定 ID
   */
  hasId(id: string): boolean {
    return this.ids.includes(id)
  }

  /**
   * 从 JSON 创建 OmTerrain
   */
  static fromJson(json: OmTerrainJson): OmTerrain {
    const ids = typeof json.id === 'string' ? [json.id] : json.id || []
    const flags = new Set(json.flags || [])

    // 处理 extend 字段（复制并扩展）
    let finalFlags = flags
    if (json.extend?.flags) {
      finalFlags = new Set([...flags, ...json.extend.flags])
    }

    // 处理 delete 字段（移除标志）
    if (json.delete?.flags) {
      for (const flag of json.delete.flags) {
        finalFlags.delete(flag)
      }
    }

    // 解析 mapgen ID
    const mapgenIds = new Map<string, string>()

    // 辅助函数：从值中提取 mapgen ID
    const extractMapgenId = (val: unknown): string | null => {
      if (typeof val === 'string') return val
      if (typeof val === 'object' && val !== null) {
        const obj = val as Record<string, unknown>
        if (typeof obj.id === 'string') return obj.id
        if (Array.isArray(obj.mapgen)) {
          const first = obj.mapgen[0]
          if (typeof first === 'object' && first !== null) {
            const f = first as Record<string, unknown>
            if (typeof f.id === 'string') return f.id
          }
        }
      }
      return null
    }

    // 处理主 mapgen
    if (json.mapgen) {
      const mainId = extractMapgenId(json.mapgen)
      if (mainId) {
        mapgenIds.set('default', mainId)
      }
    }

    // 处理线性地形变体
    // 注意：这些字段不在 OmTerrainJson 类型定义中，需要用动态访问
    const variants = ['straight', 'curved', 'end', 'tee', 'four_way'] as const
    for (const variant of variants) {
      const key = `mapgen_${variant}`
      const val = (json as unknown as Record<string, unknown>)[key]
      if (val) {
        const id = extractMapgenId(val)
        if (id) {
          mapgenIds.set(variant, id)
        }
      }
    }

    return new OmTerrain({
      ids,
      name: json.name || '',
      symbol: json.sym || '?',
      color: json.color || 'white',
      visionLevels: json.vision_levels || null,
      seeCost: json.see_cost || null,
      travelCostType: json.travel_cost_type || null,
      extras: json.extras || null,
      mondensity: json.mondensity ?? 0,
      flags: Array.from(finalFlags),
      uniformTerrain: json.uniform_terrain || null,
      mapgenIds,
      isAbstract: !!json.abstract,
    })
  }

  /**
   * 创建副本并更新属性
   */
  with(props: Partial<ConstructorParameters<typeof OmTerrain>[0]>): OmTerrain {
    return new OmTerrain({
      ids: props.ids !== undefined ? [...props.ids] : [...this.ids],
      name: props.name !== undefined && props.name !== '' ? props.name : this.name,
      symbol: props.symbol !== undefined && props.symbol !== '' && props.symbol !== '?' ? props.symbol : this.symbol,
      color: props.color !== undefined && props.color !== '' && props.color !== 'white' ? props.color : this.color,
      visionLevels: props.visionLevels !== undefined ? props.visionLevels : (this.visionLevels || null),
      seeCost: props.seeCost !== undefined ? props.seeCost : this.seeCost,
      travelCostType: props.travelCostType !== undefined ? props.travelCostType : this.travelCostType,
      extras: props.extras !== undefined ? props.extras : this.extras,
      mondensity: props.mondensity !== undefined ? props.mondensity : this.mondensity,
      flags: props.flags !== undefined ? props.flags : Array.from(this.flags),
      uniformTerrain: props.uniformTerrain !== undefined ? props.uniformTerrain : this.uniformTerrain,
      mapgenIds: props.mapgenIds !== undefined ? props.mapgenIds : new Map(this.mapgenIds),
      isAbstract: props.isAbstract !== undefined ? props.isAbstract : this.isAbstract,
    })
  }
}
