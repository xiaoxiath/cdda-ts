import type { GameMap, Tripoint, MapTile } from '@cataclym-web/core'
import type { DisplayMode, RenderConfig, TileData } from '../types'
import { gameDataLoader } from '../services/GameDataLoader'

/**
 * 默认颜色映射
 */
const DEFAULT_COLORS = {
  ground: '#4a4a4a',
  grass: '#2d5a27',
  wall: '#888888',
  water: '#4169e1',
  player: '#4a9eff',
  unknown: '#1a1a1a',
  highlight: '#ffff00',
}

/**
 * 默认字符映射
 */
const DEFAULT_CHARS = {
  unknown: '?',
  ground: '.',
  grass: ',',
  wall: '#',
  water: '~',
  player: '@',
  floor: '.',
  door: '+',
  window: '=',
}

/**
 * 游戏渲染器 - 使用 Canvas 2D 渲染游戏画面
 */
export class GameRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private config: RenderConfig
  private displayMode: DisplayMode

  // 缓存的字符图像
  private charCache: Map<string, HTMLCanvasElement> = new Map()

  constructor(canvas: HTMLCanvasElement, config: Partial<RenderConfig> = {}) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) {
      throw new Error('无法获取 Canvas 2D 上下文')
    }
    this.ctx = ctx

    this.config = {
      tileSize: config.tileSize || 16,
      fontWidth: config.fontWidth || 10,
      fontHeight: config.fontHeight || 16,
      fontSize: config.fontSize || 14,
      fontFamily: config.fontFamily || '"Courier New", monospace',
    }

    this.displayMode = 'ascii'

    // 设置 Canvas 大小
    this.resize(canvas.width, canvas.height)
  }

  /**
   * 调整 Canvas 大小
   */
  resize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
    this.clear()
  }

  /**
   * 清空画布
   */
  clear(): void {
    this.ctx.fillStyle = '#1a1a1a'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   * 设置显示模式
   */
  setDisplayMode(mode: DisplayMode): void {
    this.displayMode = mode
  }

  /**
   * 渲染游戏地图
   */
  render(gameMap: GameMap, centerPos: Tripoint): void {
    this.clear()

    // 计算视口范围
    const tilesX = Math.ceil(this.canvas.width / this.config.tileSize)
    const tilesY = Math.ceil(this.canvas.height / this.config.tileSize)

    const startX = Math.max(0, centerPos.x - Math.floor(tilesX / 2))
    const startY = Math.max(0, centerPos.y - Math.floor(tilesY / 2))
    const endX = Math.min(gameMap.getWidth(), startX + tilesX)
    const endY = Math.min(gameMap.getHeight(), startY + tilesY)

    let renderedCount = 0
    let nullTileCount = 0

    // 渲染每个 tile
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const worldPos = { x, y, z: centerPos.z } as Tripoint
        const screenX = x - startX
        const screenY = y - startY

        const tile = gameMap.getTile(worldPos)
        if (!tile) {
          nullTileCount++
        }
        renderedCount++

        this.renderTile(worldPos, screenX, screenY, gameMap)
      }
    }

    console.log(`[GameRenderer] Rendered ${renderedCount} tiles, ${nullTileCount} null tiles, center: (${centerPos.x}, ${centerPos.y})`)
  }

  /**
   * 渲染单个 tile
   */
  private renderTile(worldPos: Tripoint, screenX: number, screenY: number, gameMap: GameMap): void {
    const tile = gameMap.getTile(worldPos)

    if (!tile) {
      this.renderUnknownTile(screenX, screenY)
      return
    }

    const tileData = this.getTileData(tile, worldPos, gameMap)
    this.drawTile(screenX, screenY, tileData)
  }

  /**
   * 获取 tile 的显示数据
   */
  private getTileData(tile: MapTile, pos: Tripoint, gameMap: GameMap): TileData {
    let char = DEFAULT_CHARS.unknown
    let color = DEFAULT_COLORS.unknown
    let bgColor = '#1a1a1a'

    // 尝试从加载器获取真实地形数据
    const terrainLoader = gameDataLoader.getTerrainLoader()
    const terrain = terrainLoader.get(tile.terrain)

    if (terrain) {
      // 使用真实地形的符号和颜色
      char = terrain.symbol
      color = terrain.color

      // 根据地形类型设置背景色
      if (terrain.name.includes('地板') || terrain.name.includes('floor')) {
        bgColor = '#1a1a1a'
      } else if (terrain.name.includes('草') || terrain.name.includes('grass')) {
        bgColor = '#0d1a0c'
      } else if (terrain.name.includes('墙') || terrain.name.includes('wall')) {
        bgColor = '#252525'
      } else if (terrain.name.includes('水') || terrain.name.includes('water')) {
        bgColor = '#0a1a2a'
      }
    } else {
      // 降级到硬编码映射（用于测试数据）
      const terrainId = tile.terrain
      switch (terrainId) {
        case 0:
          char = DEFAULT_CHARS.unknown
          color = DEFAULT_COLORS.unknown
          bgColor = '#0a0a0a'
          break
        case 1:
          char = DEFAULT_CHARS.floor
          color = DEFAULT_COLORS.ground
          bgColor = '#1a1a1a'
          break
        case 2:
          char = DEFAULT_CHARS.wall
          color = DEFAULT_COLORS.wall
          bgColor = '#252525'
          break
        case 3:
          char = DEFAULT_CHARS.door
          color = '#8B4513'
          bgColor = '#1a1a1a'
          break
        case 4:
          char = DEFAULT_CHARS.grass
          color = DEFAULT_COLORS.grass
          bgColor = '#0d1a0c'
          break
        default:
          char = DEFAULT_CHARS.floor
          color = DEFAULT_COLORS.ground
          bgColor = '#1a1a1a'
      }
    }

    // 检查是否有家具
    if (tile.furniture !== null) {
      const furnitureLoader = gameDataLoader.getFurnitureLoader()
      const furniture = furnitureLoader.get(tile.furniture)
      if (furniture) {
        char = furniture.symbol
        color = furniture.color
      } else {
        char = '='
        color = '#666666'
      }
    }

    return { char, color, bgColor }
  }

  /**
   * 绘制单个 tile
   */
  private drawTile(x: number, y: number, data: TileData): void {
    const pixelX = x * this.config.tileSize
    const pixelY = y * this.config.tileSize

    // 绘制背景
    if (data.bgColor !== '#1a1a1a') {
      this.ctx.fillStyle = data.bgColor
      this.ctx.fillRect(pixelX, pixelY, this.config.tileSize, this.config.tileSize)
    }

    // 绘制字符
    this.drawCharacter(data.char, pixelX, pixelY, data.color)
  }

  /**
   * 绘制字符
   */
  private drawCharacter(char: string, x: number, y: number, color: string): void {
    const cacheKey = `${char}-${color}`

    // 检查缓存
    let cachedCanvas = this.charCache.get(cacheKey)
    if (!cachedCanvas) {
      cachedCanvas = this.createCharCanvas(char, color)
      this.charCache.set(cacheKey, cachedCanvas)
    }

    this.ctx.drawImage(cachedCanvas, x, y)
  }

  /**
   * 创建字符的缓存 canvas
   */
  private createCharCanvas(char: string, color: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = this.config.tileSize
    canvas.height = this.config.tileSize

    const ctx = canvas.getContext('2d')!
    ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = color

    const centerX = this.config.tileSize / 2
    const centerY = this.config.tileSize / 2 + 1

    ctx.fillText(char, centerX, centerY)

    return canvas
  }

  /**
   * 渲染未知/空白 tile
   */
  private renderUnknownTile(x: number, y: number): void {
    const pixelX = x * this.config.tileSize
    const pixelY = y * this.config.tileSize

    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(pixelX, pixelY, this.config.tileSize, this.config.tileSize)
  }

  /**
   * 渲染玩家位置
   */
  renderPlayer(pos: Tripoint, centerPos: Tripoint): void {
    const tilesX = Math.ceil(this.canvas.width / this.config.tileSize)

    const startX = Math.max(0, centerPos.x - Math.floor(tilesX / 2))

    const screenX = pos.x - startX
    const screenY = pos.y - (centerPos.y - Math.floor(Math.ceil(this.canvas.height / this.config.tileSize) / 2))

    // 检查是否在视口范围内
    const tilesY = Math.ceil(this.canvas.height / this.config.tileSize)
    if (screenX < 0 || screenX >= tilesX || screenY < 0 || screenY >= tilesY) {
      return
    }

    const pixelX = screenX * this.config.tileSize
    const pixelY = screenY * this.config.tileSize

    // 绘制玩家高亮背景
    this.ctx.fillStyle = 'rgba(74, 158, 255, 0.2)'
    this.ctx.fillRect(pixelX, pixelY, this.config.tileSize, this.config.tileSize)

    // 绘制玩家符号 (@)
    this.drawCharacter(DEFAULT_CHARS.player, pixelX, pixelY, DEFAULT_COLORS.player)
  }

  /**
   * 打印可视区域的地图数据（ASCII 表示）
   */
  dumpVisibleMap(gameMap: GameMap, centerPos: Tripoint): void {
    const tilesX = Math.ceil(this.canvas.width / this.config.tileSize)
    const tilesY = Math.ceil(this.canvas.height / this.config.tileSize)

    const startX = Math.max(0, centerPos.x - Math.floor(tilesX / 2))
    const startY = Math.max(0, centerPos.y - Math.floor(tilesY / 2))
    const endX = Math.min(gameMap.getWidth(), startX + tilesX)
    const endY = Math.min(gameMap.getHeight(), startY + tilesY)

    console.log('=== 可视区域地图 ===')
    console.log(`范围: (${startX}, ${startY}) -> (${endX - 1}, ${endY - 1}), 中心: (${centerPos.x}, ${centerPos.y})`)
    console.log('')

    const terrainLoader = gameDataLoader.getTerrainLoader()
    const furnitureLoader = gameDataLoader.getFurnitureLoader()

    // 打印 Y 轴刻度
    let rowHeader = '     '
    for (let x = startX; x < endX; x += 5) {
      rowHeader += x.toString().padStart(5)
    }
    console.log(rowHeader)

    for (let y = startY; y < endY; y++) {
      let row = y.toString().padStart(3) + ' '

      for (let x = startX; x < endX; x++) {
        const worldPos = { x, y, z: centerPos.z } as Tripoint
        const tile = gameMap.getTile(worldPos)

        if (!tile) {
          row += ' '
          continue
        }

        // 获取显示字符
        let char = '?'

        // 检查家具
        if (tile.furniture !== null) {
          const furniture = furnitureLoader.get(tile.furniture)
          if (furniture) {
            char = furniture.symbol
          } else {
            char = '='
          }
        } else {
          // 使用地形符号
          const terrain = terrainLoader.get(tile.terrain)
          if (terrain) {
            char = terrain.symbol
          } else {
            char = '.'
          }
        }

        row += char
      }

      console.log(row)
    }

    console.log('')
    console.log('图例:')
    console.log('  @ = 玩家')
    console.log('  # = 墙壁')
    console.log('  . = 地板')
    console.log('  + = 门')
    console.log('  , = 草地')
    console.log('  ~ = 水')
    console.log('==================')
  }

  /**
   * 打印可视区域的原始瓦片数据
   */
  dumpVisibleRawData(gameMap: GameMap, centerPos: Tripoint): void {
    const tilesX = Math.ceil(this.canvas.width / this.config.tileSize)
    const tilesY = Math.ceil(this.canvas.height / this.config.tileSize)

    const startX = Math.max(0, centerPos.x - Math.floor(tilesX / 2))
    const startY = Math.max(0, centerPos.y - Math.floor(tilesY / 2))
    const endX = Math.min(gameMap.getWidth(), startX + tilesX)
    const endY = Math.min(gameMap.getHeight(), startY + tilesY)

    console.log('=== 可视区域原始数据 ===')
    console.log(`范围: (${startX}, ${startY}) -> (${endX - 1}, ${endY - 1})`)

    const terrainLoader = gameDataLoader.getTerrainLoader()
    const furnitureLoader = gameDataLoader.getFurnitureLoader()

    const tileData: Array<{
      x: number
      y: number
      terrainId: number
      terrainName: string
      terrainSymbol: string
      furnitureId: number | null
      furnitureName: string | null
    }> = []

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const worldPos = { x, y, z: centerPos.z } as Tripoint
        const tile = gameMap.getTile(worldPos)

        if (!tile) {
          continue
        }

        const terrain = terrainLoader.get(tile.terrain)
        const furniture = tile.furniture !== null ? furnitureLoader.get(tile.furniture) : null

        tileData.push({
          x,
          y,
          terrainId: tile.terrain,
          terrainName: terrain?.name || `Unknown(${tile.terrain})`,
          terrainSymbol: terrain?.symbol || '?',
          furnitureId: tile.furniture,
          furnitureName: furniture?.name || null,
        })
      }
    }

    console.table(tileData)
    console.log('==================')
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    this.charCache.clear()
  }
}
