/**
 * Tile 渲染器 - 使用图块集渲染游戏画面
 *
 * 支持 Ultica_iso 等距视角图块集
 */

import type { GameMap, Tripoint, MapTile } from '@cataclym-web/core'
import type { TileConfig } from './types'
import { gameDataLoader } from '../services/GameDataLoader'

/**
 * 图块数据缓存
 */
interface TileCache {
  image: HTMLImageElement
  loaded: boolean
}

/**
 * Tile 渲染器类
 */
export class TileRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private tileSize: number
  private tileConfig: TileConfig | null = null
  private tileCache: Map<string, TileCache> = new Map()
  private loaded = false
  private currentMap: GameMap | null = null

  // 等距视角配置
  private isoConfig = {
    tileWidth: 48,
    tileHeight: 24,
    zLevelHeight: 108,
  }

  constructor(canvas: HTMLCanvasElement, tileSize: number = 32) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) {
      throw new Error('无法获取 Canvas 2D 上下文')
    }
    this.ctx = ctx
    this.tileSize = tileSize
  }

  /**
   * 加载图块集配置
   */
  async loadTileset(configPath: string): Promise<void> {
    try {
      const response = await fetch(configPath)
      if (!response.ok) {
        throw new Error(`Failed to load tile config: ${response.statusText}`)
      }

      this.tileConfig = await response.json()

      // 解析图块信息
      if (this.tileConfig.tile_info && this.tileConfig.tile_info.length > 0) {
        const info = this.tileConfig.tile_info[0]
        this.isoConfig.tileWidth = info?.width || 48
        this.isoConfig.tileHeight = info?.height || 24
        this.isoConfig.zLevelHeight = info?.zlevel_height || 108
      }

      // 预加载所有图块图像
      await this.preloadTiles(configPath)

      this.loaded = true
      console.log('[TileRenderer] Tileset loaded successfully')
    } catch (error) {
      console.error('[TileRenderer] Failed to load tileset:', error)
      throw error
    }
  }

  /**
   * 预加载所有图块图像
   */
  private async preloadTiles(configPath: string): Promise<void> {
    if (!this.tileConfig || !this.tileConfig['tiles-new']) return

    const tiles = this.tileConfig['tiles-new']
    const loadPromises: Promise<void>[] = []

    for (const tileEntry of tiles) {
      const file = tileEntry.file
      const baseUrl = (configPath: string) => {
        const url = new URL(configPath, window.location.href)
        const dir = url.pathname.substring(0, url.pathname.lastIndexOf('/'))
        const gfxDir = dir.substring(0, dir.lastIndexOf('/'))
        return `${gfxDir}/gfx/Ultica_iso/${file}`
      }

      const imagePath = baseUrl(configPath)

      const loadPromise = new Promise<void>((resolve) => {
        const img = new Image()

        img.onload = () => {
          this.tileCache.set(file, { image: img, loaded: true })
          resolve()
        }

        img.onerror = () => {
          console.warn(`[TileRenderer] Failed to load tile image: ${file}`)
          resolve() // 继续加载其他图像
        }

        img.src = imagePath
      })

      loadPromises.push(loadPromise)
    }

    await Promise.all(loadPromises)
    console.log(`[TileRenderer] Preloaded ${this.tileCache.size} tile images`)
  }

  /**
   * 检查是否已加载
   */
  isLoaded(): boolean {
    return this.loaded
  }

  /**
   * 设置当前地图
   */
  setMap(map: GameMap): void {
    this.currentMap = map
  }

  /**
   * 调整 Canvas 大小
   */
  resize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
  }

  /**
   * 清空画布
   */
  clear(): void {
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   * 渲染游戏地图
   */
  render(_gameMap: GameMap, centerPos: Tripoint): void {
    this.clear()

    if (!this.loaded) {
      // 如果图块集未加载，显示文本提示
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = '16px monospace'
      this.ctx.fillText('Loading tiles...', 20, 30)
      return
    }

    // 计算视口范围
    const tilesX = Math.ceil(this.canvas.width / this.tileSize)
    const tilesY = Math.ceil(this.canvas.height / this.tileSize)

    const startX = Math.max(0, centerPos.x - Math.floor(tilesX / 2))
    const startY = Math.max(0, centerPos.y - Math.floor(tilesY / 2))

    // 按等距视角顺序渲染（从后往前，从下往上）
    for (let y = startY; y < startY + tilesY; y++) {
      for (let x = startX; x < startX + tilesX; x++) {
        const worldPos = { x, y, z: centerPos.z } as Tripoint
        this.renderTile(worldPos, centerPos)
      }
    }

    // 渲染玩家
    this.renderPlayer(centerPos, centerPos)
  }

  /**
   * 渲染单个瓦片
   */
  private renderTile(worldPos: Tripoint, centerPos: Tripoint): void {
    if (!this.currentMap) return

    const tile = this.currentMap.getTile(worldPos)
    if (!tile) return

    // 计算屏幕坐标（等距视角）
    const screenX = this.worldToScreenX(worldPos, centerPos)
    const screenY = this.worldToScreenY(worldPos, centerPos)

    // 查找对应的图块
    const tileImage = this.findTileForMapTile(tile)
    if (tileImage) {
      this.ctx.drawImage(
        tileImage,
        screenX - this.isoConfig.tileWidth / 2,
        screenY - this.isoConfig.tileHeight,
        this.isoConfig.tileWidth,
        this.isoConfig.tileHeight
      )
    } else {
      // 降级到 ASCII 显示
      this.renderAsciiTile(tile, screenX, screenY)
    }
  }

  /**
   * 查找对应地图瓦片的图块图像
   */
  private findTileForMapTile(tile: MapTile): HTMLImageElement | null {
    if (!this.tileConfig || !this.tileConfig['tiles-new']) return null

    // 根据地形 ID 查找对应的图块
    const terrainLoader = gameDataLoader.getTerrainLoader()
    const terrain = terrainLoader.get(tile.terrain)

    if (!terrain) return null

    // 在图块配置中查找匹配的项
    for (const tileEntry of this.tileConfig['tiles-new']) {
      if (tileEntry.tiles) {
        for (const tileDef of tileEntry.tiles) {
          if (tileDef.id === terrain.name) {
            // 找到匹配的图块定义
            const file = tileEntry.file
            const cached = this.tileCache.get(file)
            if (cached && cached.loaded) {
              return cached.image
            }
          }
        }
      }
    }

    return null
  }

  /**
   * 渲染 ASCII 瓦片（降级方案）
   */
  private renderAsciiTile(tile: MapTile, screenX: number, screenY: number): void {
    const terrainLoader = gameDataLoader.getTerrainLoader()
    const terrain = terrainLoader.get(tile.terrain)

    if (!terrain) return

    this.ctx.fillStyle = terrain.color || '#ffffff'
    this.ctx.font = `${this.tileSize}px monospace`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(terrain.symbol || '?', screenX, screenY)
  }

  /**
   * 渲染玩家
   */
  private renderPlayer(playerPos: Tripoint, centerPos: Tripoint): void {
    const screenX = this.worldToScreenX(playerPos, centerPos)
    const screenY = this.worldToScreenY(playerPos, centerPos)

    // 绘制玩家高亮
    this.ctx.fillStyle = 'rgba(74, 158, 255, 0.3)'
    this.ctx.beginPath()
    this.ctx.arc(screenX, screenY - this.isoConfig.tileHeight / 2, this.tileSize / 2, 0, Math.PI * 2)
    this.ctx.fill()

    // 绘制玩家符号
    this.ctx.fillStyle = '#4a9eff'
    this.ctx.font = `bold ${this.tileSize}px monospace`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('@', screenX, screenY - this.isoConfig.tileHeight / 2)
  }

  /**
   * 世界坐标 X 转换为屏幕坐标 X（等距视角）
   */
  private worldToScreenX(worldPos: Tripoint, centerPos: Tripoint): number {
    const dx = worldPos.x - centerPos.x
    const dy = worldPos.y - centerPos.y
    return this.canvas.width / 2 + (dx - dy) * (this.isoConfig.tileWidth / 2)
  }

  /**
   * 世界坐标 Y 转换为屏幕坐标 Y（等距视角）
   */
  private worldToScreenY(worldPos: Tripoint, centerPos: Tripoint): number {
    const dx = worldPos.x - centerPos.x
    const dy = worldPos.y - centerPos.y
    const dz = worldPos.z - centerPos.z
    return this.canvas.height / 2 + (dx + dy) * (this.isoConfig.tileHeight / 2) - dz * this.isoConfig.zLevelHeight
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    this.tileCache.clear()
  }
}
