/**
 * OmTerrain 单元测试
 *
 * 使用真实的 CDDA 数据进行测试
 */

import { describe, it, expect } from 'vitest'
import { OmTerrain, OmTerrainFlag, type OmTerrainJson } from '../OmTerrain'
import { OmTerrainLoader } from '../OmTerrainLoader'

describe('OmTerrain', () => {
  describe('基础功能', () => {
    it('应该正确创建简单的 terrain', () => {
      const terrain = new OmTerrain({
        ids: ['test_terrain'],
        name: 'Test Terrain',
        symbol: 'T',
        color: 'red',
      })

      expect(terrain.ids).toEqual(['test_terrain'])
      expect(terrain.name).toBe('Test Terrain')
      expect(terrain.symbol).toBe('T')
      expect(terrain.color).toBe('red')
    })

    it('应该支持多个 ID', () => {
      const terrain = new OmTerrain({
        ids: ['test_1', 'test_2', 'test_3'],
        name: 'Multi ID Terrain',
      })

      expect(terrain.ids).toEqual(['test_1', 'test_2', 'test_3'])
      expect(terrain.hasId('test_1')).toBe(true)
      expect(terrain.hasId('test_2')).toBe(true)
      expect(terrain.hasId('test_3')).toBe(true)
      expect(terrain.hasId('test_4')).toBe(false)
    })

    it('应该正确检查标志位', () => {
      const terrain = new OmTerrain({
        ids: ['test'],
        flags: [OmTerrainFlag.NO_ROTATE, OmTerrainFlag.RISK_LOW],
      })

      expect(terrain.hasFlag(OmTerrainFlag.NO_ROTATE)).toBe(true)
      expect(terrain.hasFlag(OmTerrainFlag.RISK_LOW)).toBe(true)
      expect(terrain.hasFlag(OmTerrainFlag.RISK_HIGH)).toBe(false)
    })

    it('应该正确判断是否可以旋转', () => {
      const noRotate = new OmTerrain({
        ids: ['no_rotate'],
        flags: [OmTerrainFlag.NO_ROTATE],
      })

      const canRotate = new OmTerrain({
        ids: ['can_rotate'],
        flags: [],
      })

      expect(noRotate.canRotate()).toBe(false)
      expect(canRotate.canRotate()).toBe(true)
    })

    it('应该支持 mapgen IDs', () => {
      const terrain = new OmTerrain({
        ids: ['test'],
        mapgenIds: new Map([
          ['default', 'test_mapgen'],
          ['straight', 'test_mapgen_straight'],
        ]),
      })

      expect(terrain.mapgenIds.get('default')).toBe('test_mapgen')
      expect(terrain.mapgenIds.get('straight')).toBe('test_mapgen_straight')
    })

    it('应该支持 with() 方法创建副本', () => {
      const original = new OmTerrain({
        ids: ['original'],
        name: 'Original',
        symbol: 'O',
        color: 'blue',
      })

      const modified = original.with({
        name: 'Modified',
        color: 'red',
      })

      expect(original.name).toBe('Original')
      expect(original.color).toBe('blue')

      expect(modified.name).toBe('Modified')
      expect(modified.color).toBe('red')
      expect(modified.symbol).toBe('O') // 未修改的属性保持原值
    })
  })

  describe('从 JSON 解析', () => {
    it('应该正确解析简单的 JSON', () => {
      const json: OmTerrainJson = {
        type: 'overmap_terrain',
        id: 'simple_terrain',
        name: 'Simple Terrain',
        sym: 'S',
        color: 'green',
      }

      const terrain = OmTerrain.fromJson(json)

      expect(terrain.ids).toEqual(['simple_terrain'])
      expect(terrain.name).toBe('Simple Terrain')
      expect(terrain.symbol).toBe('S')
      expect(terrain.color).toBe('green')
    })

    it('应该正确解析多个 ID', () => {
      const json: OmTerrainJson = {
        type: 'overmap_terrain',
        id: ['terrain_1', 'terrain_2'],
        name: 'Multi Terrain',
        sym: 'M',
        color: 'yellow',
      }

      const terrain = OmTerrain.fromJson(json)

      expect(terrain.ids).toEqual(['terrain_1', 'terrain_2'])
    })

    it('应该正确解析标志位', () => {
      const json: OmTerrainJson = {
        type: 'overmap_terrain',
        id: 'flagged_terrain',
        name: 'Flagged Terrain',
        sym: 'F',
        color: 'red',
        flags: [OmTerrainFlag.NO_ROTATE, OmTerrainFlag.SHOULD_NOT_SPAWN],
      }

      const terrain = OmTerrain.fromJson(json)

      expect(terrain.hasFlag(OmTerrainFlag.NO_ROTATE)).toBe(true)
      expect(terrain.hasFlag(OmTerrainFlag.SHOULD_NOT_SPAWN)).toBe(true)
    })

    it('应该正确解析 snake_case 字段', () => {
      const json: OmTerrainJson = {
        type: 'overmap_terrain',
        id: 'snake_case_terrain',
        name: 'Snake Case',
        sym: 'S',
        color: 'blue',
        vision_levels: 'open_land',
        see_cost: 'spaced_high',
        travel_cost_type: 'forest',
        uniform_terrain: 't_grass',
      }

      const terrain = OmTerrain.fromJson(json)

      expect(terrain.visionLevels).toBe('open_land')
      expect(terrain.seeCost).toBe('spaced_high')
      expect(terrain.travelCostType).toBe('forest')
      expect(terrain.uniformTerrain).toBe('t_grass')
    })

    it('应该正确解析 mapgen 字段', () => {
      const json: OmTerrainJson = {
        type: 'overmap_terrain',
        id: 'mapgen_terrain',
        name: 'Mapgen Terrain',
        sym: 'M',
        color: 'white',
        mapgen: { id: 'test_mapgen' },
      }

      const terrain = OmTerrain.fromJson(json)

      expect(terrain.mapgenIds.get('default')).toBe('test_mapgen')
    })

    it('应该正确解析 mapgen 变体', () => {
      const json: OmTerrainJson = {
        type: 'overmap_terrain',
        id: 'variant_terrain',
        name: 'Variant Terrain',
        sym: 'V',
        color: 'cyan',
        mapgen_straight: { id: 'variant_straight' },
        mapgen_curved: { id: 'variant_curved' },
      }

      const terrain = OmTerrain.fromJson(json)

      expect(terrain.mapgenIds.get('straight')).toBe('variant_straight')
      expect(terrain.mapgenIds.get('curved')).toBe('variant_curved')
    })

    it('应该正确标记抽象定义', () => {
      const json: OmTerrainJson = {
        type: 'overmap_terrain',
        abstract: true,
        name: 'Abstract Terrain',
        sym: 'A',
        color: 'gray',
      }

      const terrain = OmTerrain.fromJson(json)

      expect(terrain.isAbstract).toBe(true)
    })
  })
})

describe('OmTerrainLoader', () => {
  it('应该正确添加和获取 terrain', () => {
    const loader = new OmTerrainLoader()

    const terrain1 = new OmTerrain({ ids: ['test1'], name: 'Test 1' })
    const terrain2 = new OmTerrain({ ids: ['test2'], name: 'Test 2' })

    loader.add(terrain1)
    loader.add(terrain2)

    expect(loader.get('test1')).toBe(terrain1)
    expect(loader.get('test2')).toBe(terrain2)
    expect(loader.get('test3')).toBeUndefined()
  })

  it('应该正确处理多个 ID', () => {
    const loader = new OmTerrainLoader()

    const terrain = new OmTerrain({
      ids: ['multi1', 'multi2', 'multi3'],
      name: 'Multi ID',
    })

    loader.add(terrain)

    // 所有 ID 都应该能找到同一个 terrain
    expect(loader.get('multi1')).toBe(terrain)
    expect(loader.get('multi2')).toBe(terrain)
    expect(loader.get('multi3')).toBe(terrain)
  })

  it('应该正确处理 copy-from', () => {
    const loader = new OmTerrainLoader()

    // 先加载基础定义
    loader.loadFromJsonArray([
      {
        type: 'overmap_terrain',
        id: 'base_terrain',
        name: 'Base Terrain',
        sym: 'B',
        color: 'blue',
        flags: [OmTerrainFlag.RISK_LOW],
      },
    ])

    // 再加载派生定义
    loader.loadFromJsonArray([
      {
        type: 'overmap_terrain',
        id: 'derived_terrain',
        'copy-from': 'base_terrain',
        name: 'Derived Terrain',
        color: 'red',
        flags: [OmTerrainFlag.RISK_HIGH],
      },
    ])

    const derived = loader.get('derived_terrain')

    expect(derived).toBeDefined()
    expect(derived!.name).toBe('Derived Terrain') // 使用新名称
    expect(derived!.color).toBe('red') // 使用新颜色
    expect(derived!.symbol).toBe('B') // 继承符号
    expect(derived!.hasFlag(OmTerrainFlag.RISK_HIGH)).toBe(true) // 使用新标志
  })

  it('应该正确处理 extend 字段', () => {
    const loader = new OmTerrainLoader()

    loader.loadFromJsonArray([
      {
        type: 'overmap_terrain',
        id: 'extend_terrain',
        name: 'Extend Terrain',
        sym: 'E',
        color: 'green',
        flags: [OmTerrainFlag.NO_ROTATE],
        extend: {
          flags: [OmTerrainFlag.SOURCE_SAFETY],
        },
      },
    ])

    const terrain = loader.get('extend_terrain')

    expect(terrain!.hasFlag(OmTerrainFlag.NO_ROTATE)).toBe(true)
    expect(terrain!.hasFlag(OmTerrainFlag.SOURCE_SAFETY)).toBe(true)
  })

  it('应该正确处理 delete 字段', () => {
    const loader = new OmTerrainLoader()

    loader.loadFromJsonArray([
      {
        type: 'overmap_terrain',
        id: 'delete_terrain',
        name: 'Delete Terrain',
        sym: 'D',
        color: 'purple',
        flags: [OmTerrainFlag.NO_ROTATE, OmTerrainFlag.SHOULD_NOT_SPAWN],
        delete: {
          flags: [OmTerrainFlag.SHOULD_NOT_SPAWN],
        },
      },
    ])

    const terrain = loader.get('delete_terrain')

    expect(terrain!.hasFlag(OmTerrainFlag.NO_ROTATE)).toBe(true)
    expect(terrain!.hasFlag(OmTerrainFlag.SHOULD_NOT_SPAWN)).toBe(false)
  })

  it('应该正确统计 terrain 数量', () => {
    const loader = new OmTerrainLoader()

    loader.loadFromJsonArray([
      {
        type: 'overmap_terrain',
        id: 'terrain1',
        name: 'Terrain 1',
        sym: '1',
        color: 'white',
      },
      {
        type: 'overmap_terrain',
        id: ['terrain2', 'terrain2_alt'],
        name: 'Terrain 2',
        sym: '2',
        color: 'white',
      },
      {
        type: 'overmap_terrain',
        abstract: true,
        id: 'abstract_terrain',
        name: 'Abstract',
        sym: 'A',
        color: 'gray',
      },
    ])

    const stats = loader.getStats()

    // terrain1, terrain2, terrain2_alt = 3
    // abstract_terrain = 1
    expect(stats.terrainCount).toBe(3)
    expect(stats.abstractCount).toBe(1)
  })

  it('应该正确处理 has() 方法', () => {
    const loader = new OmTerrainLoader()

    loader.add(new OmTerrain({ ids: ['exists'], name: 'Exists' }))

    expect(loader.has('exists')).toBe(true)
    expect(loader.has('not_exists')).toBe(false)
  })

  it('应该正确清空数据', () => {
    const loader = new OmTerrainLoader()

    loader.add(new OmTerrain({ ids: ['test'], name: 'Test' }))
    expect(loader.has('test')).toBe(true)

    loader.clear()
    expect(loader.has('test')).toBe(false)
    expect(loader.getStats().terrainCount).toBe(0)
  })
})

describe('OmTerrainLoader 使用真实 CDDA 数据', () => {
  const dataPath = '/Users/bytedance/workspace/game/cdda-ts/packages/web/public/data/json/overmap/overmap_terrain'

  it('应该能够加载真实的 overmap_terrain.json 文件', async () => {
    const loader = new OmTerrainLoader()

    // 加载多个 overmap terrain 文件
    await loader.loadFromFile(`${dataPath}/overmap_terrain.json`)
    await loader.loadFromFile(`${dataPath}/overmap_terrain_hardcoded.json`)

    const stats = loader.getStats()

    // 验证至少加载了一些 terrain
    expect(stats.terrainCount).toBeGreaterThan(0)

    // 检查一些已知的 terrain ID
    const forest = loader.get('forest')
    expect(forest).toBeDefined()
    expect(forest!.symbol).toBe('F')

    const field = loader.get('field')
    expect(field).toBeDefined()
    expect(field!.symbol).toBe('.')
  })

  it('应该正确处理 forest terrain 的 mapgen 关联', async () => {
    const loader = new OmTerrainLoader()

    await loader.loadFromFile(`${dataPath}/overmap_terrain.json`)
    await loader.loadFromFile(`${dataPath}/overmap_terrain_hardcoded.json`)

    const forest = loader.get('forest')

    expect(forest).toBeDefined()

    // 验证 terrain 的属性
    expect(forest!.name.toLowerCase()).toContain('forest')
    expect(forest!.color).toBe('green')
  })

  it('应该能够查找所有 terrain ID', async () => {
    const loader = new OmTerrainLoader()

    await loader.loadFromFile(`${dataPath}/overmap_terrain.json`)
    await loader.loadFromFile(`${dataPath}/overmap_terrain_hardcoded.json`)

    const allIds = loader.getAllIds()

    expect(allIds.length).toBeGreaterThan(0)
    expect(allIds).toContain('forest')
    expect(allIds).toContain('field')
  })

  it('应该正确处理 copy-from 机制（真实数据）', async () => {
    const loader = new OmTerrainLoader()

    await loader.loadFromFile(`${dataPath}/overmap_terrain.json`)
    await loader.loadFromFile(`${dataPath}/overmap_terrain_hardcoded.json`)

    // 检查一些使用 copy-from 的 terrain
    // 例如 cabin 变体
    const cabin = loader.get('cabin')
    expect(cabin).toBeDefined()

    // 验证属性被正确继承
    expect(cabin!.symbol).toBe('C')
  })
})
