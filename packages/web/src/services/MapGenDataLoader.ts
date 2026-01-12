import {
  CataclysmMapGenLoader,
  CataclysmMapGenGenerator,
  PaletteResolver,
  type CataclysmMapGenJson,
} from '@cataclym-web/core/mapgen'
import { TerrainLoader } from '@cataclym-web/core'
import { FurnitureLoader } from '@cataclym-web/core'

/**
 * MapGen 数据加载器
 * 从静态资源加载 mapgen 数据并提供地图生成功能
 */
export class MapGenDataLoader {
  private readonly loader: CataclysmMapGenLoader
  private readonly paletteResolver: PaletteResolver
  private loaded = false

  constructor(
    private readonly terrainLoader: TerrainLoader,
    private readonly furnitureLoader: FurnitureLoader
  ) {
    this.loader = new CataclysmMapGenLoader()
    this.paletteResolver = new PaletteResolver(this.loader)
  }

  /**
   * 加载 mapgen 数据文件
   */
  async loadFromUrl(url: string): Promise<void> {
    console.log(`[MapGenDataLoader] Loading from: ${url}`)

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load mapgen from ${url}: ${response.statusText}`)
    }

    const json = (await response.json()) as unknown

    if (Array.isArray(json)) {
      this.loader.loadArray(json)
    } else {
      this.loader.load(json as CataclysmMapGenJson)
    }
  }

  /**
   * 加载指定目录下的数据文件
   */
  private async loadDataFromDirectory(dataDir: string, dirName: string): Promise<number> {
    try {
      const response = await fetch(`${dataDir}/index.json`)
      if (!response.ok) {
        console.warn(`[MapGenDataLoader] 无法获取 ${dirName} 索引: ${response.statusText}`)
        return 0
      }

      const files = await response.json() as string[]
      console.log(`[MapGenDataLoader] 找到 ${files.length} 个 ${dirName} 文件`)

      let loadedCount = 0
      for (const file of files) {
        try {
          await this.loadFromUrl(`${dataDir}/${file}`)
          loadedCount++
        } catch (err) {
          console.warn(`[MapGenDataLoader] 加载 ${dirName} 文件失败: ${file}`, err)
        }
      }

      return loadedCount
    } catch (error) {
      console.warn(`[MapGenDataLoader] 加载 ${dirName} 数据失败:`, error)
      return 0
    }
  }

  /**
   * 加载所有核心 mapgen 数据
   */
  async loadCoreData(): Promise<void> {
    if (this.loaded) {
      console.log('[MapGenDataLoader] Data already loaded')
      return
    }

    console.log('[MapGenDataLoader] 开始加载 mapgen 数据...')

    try {
      // 首先加载调色板（因为 mapgen 可能会引用它们）
      const paletteDir = '/data/json/mapgen_palettes'
      const paletteCount = await this.loadDataFromDirectory(paletteDir, 'palette')
      console.log(`[MapGenDataLoader] 调色板加载完成: ${paletteCount} 个`)

      // 然后加载 mapgen 文件
      const mapgenDir = '/data/json/mapgen'
      const mapgenCount = await this.loadDataFromDirectory(mapgenDir, 'mapgen')
      console.log(`[MapGenDataLoader] mapgen 加载完成: ${mapgenCount} 个`)

      this.loaded = true
      console.log(`[MapGenDataLoader] 数据加载完成!`)
      console.log(`  - 成功加载: ${paletteCount + mapgenCount} 个文件`)
      console.log(`  - mapgens: ${this.loader.size()}`)
      console.log(`  - palettes: ${this.loader.paletteCount()}`)
    } catch (error) {
      console.error('[MapGenDataLoader] 加载数据失败:', error)
      throw error
    }
  }

  /**
   * 获取 mapgen 生成器
   */
  getGenerator(id: string): CataclysmMapGenGenerator | null {
    const mapgenData = this.loader.get(id)
    if (!mapgenData) {
      console.warn(`[MapGenDataLoader] mapgen not found: ${id}`)
      return null
    }

    return new CataclysmMapGenGenerator(
      mapgenData,
      {
        terrain: this.terrainLoader,
        furniture: this.furnitureLoader,
        trap: null as any, // TODO: 添加 trap loader
      },
      {
        paletteResolver: this.paletteResolver,
        mapgenLoader: this.loader,
      }
    )
  }

  /**
   * 获取所有可用的 mapgen ID
   */
  getAvailableMapgens(): string[] {
    return this.loader.getAll().map(m => m.id)
  }

  /**
   * 根据 om_terrain 查找 mapgen
   */
  findByOmTerrain(omTerrain: string): CataclysmMapGenGenerator | null {
    const mapgenData = this.loader.getAll().find(
      m => {
        // @ts-ignore - omTerrain 可能是 string 或 string[]
        const mOmTerrain = m.omTerrain
        if (Array.isArray(mOmTerrain)) {
          // @ts-ignore - 类型兼容性问题
          return mOmTerrain.includes(omTerrain)
        }
        return mOmTerrain === omTerrain
      }
    )

    if (!mapgenData) {
      return null
    }

    return new CataclysmMapGenGenerator(
      mapgenData,
      {
        // @ts-ignore - 类型不匹配，但运行时可以工作
        terrain: this.terrainLoader,
        // @ts-ignore - 类型不匹配，但运行时可以工作
        furniture: this.furnitureLoader,
        trap: null as any,
      },
      {
        paletteResolver: this.paletteResolver,
        mapgenLoader: this.loader,
      }
    )
  }

  /**
   * 获取 mapgen 加载器
   */
  getLoader(): CataclysmMapGenLoader {
    return this.loader
  }

  /**
   * 检查是否已加载
   */
  isDataLoaded(): boolean {
    return this.loaded
  }
}
