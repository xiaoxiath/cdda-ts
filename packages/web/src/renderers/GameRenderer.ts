import type { GameMap, Tripoint, MapTile } from '@cataclym-web/core'
import type { DisplayMode, RenderConfig, TileData } from '../types'
import { gameDataLoader } from '../services/GameDataLoader'
import { debug, info, group, groupEnd, LogCategory } from '../utils/logger'

/**
 * CDDA 风格的颜色映射
 * 使用 ncurses 风格的颜色名称
 */
const CDDA_COLORS = {
  // 基础颜色
  black: '#000000',
  red: '#ff0000',
  green: '#00ff00',
  yellow: '#ffff00',
  blue: '#0000ff',
  magenta: '#ff00ff',
  cyan: '#00ffff',
  white: '#ffffff',

  // 明亮变体
  bright_red: '#ff5555',
  bright_green: '#55ff55',
  bright_yellow: '#ffff55',
  bright_blue: '#5555ff',
  bright_magenta: '#ff55ff',
  bright_cyan: '#55ffff',
  bright_white: '#ffffff',

  // CDDA 特定颜色
  c_light_gray: '#808080',
  c_dark_gray: '#404040',
  c_red: '#ff0000',
  c_green: '#00ff00',
  c_blue: '#0000ff',
  c_cyan: '#00ffff',
  c_magenta: '#ff00ff',
  c_brown: '#aa5500',
  c_light_blue: '#aaaaaa',
  c_light_green: '#55ff55',
  c_light_red: '#ff5555',
  c_yellow: '#ffff00',
  c_pink: '#ffaaaa',
  c_white: '#ffffff',
  c_dark_green: '#00aa00',
  c_dark_red: '#aa0000',
  c_dark_blue: '#0000aa',
  c_dark_cyan: '#00aaaa',
  c_dark_magenta: '#aa00aa',
  c_dark_brown: '#775500',
  c_dark_yellow: '#aaaa00',
}

/**
 * 绘制参数（对应 CDDA 的 drawsq_params）
 */
interface DrawSqParams {
  viewCenter: Tripoint
  highlight: boolean
  showItems: boolean
  terrainOverride?: string
  furnitureOverride?: string
}

/**
 * 游戏渲染器 - 使用 Canvas 2D 渲染游戏画面
 * 严格遵循 CDDA 源码的渲染逻辑
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
    this.ctx.fillStyle = '#000000'
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
   * 对应 CDDA 的 map::draw() 函数
   */
  render(gameMap: GameMap, centerPos: Tripoint): void {
    this.clear()

    // 计算窗口尺寸（以瓦片为单位）
    const windowWidth = Math.ceil(this.canvas.width / this.config.tileSize)
    const windowHeight = Math.ceil(this.canvas.height / this.config.tileSize)

    // 默认绘制参数
    const params: DrawSqParams = {
      viewCenter: centerPos,
      highlight: false,
      showItems: true,
    }

    let renderedCount = 0

    // 遍历视口内的所有瓦片
    // CDDA 源码：for (int j = 0; j < getmaxy(w); j++) {
    //           for (int i = 0; i < getmaxx(w); i++) {
    //             tripoint_bub_ms p( view_center.x() - getmaxx(w)/2 + i,
    //                               view_center.y() - getmaxy(w)/2 + j,
    //                               view_center.z() );
    for (let screenY = 0; screenY < windowHeight; screenY++) {
      for (let screenX = 0; screenX < windowWidth; screenX++) {
        // CDDA 坐标转换公式：p.x() = view_center.x() - getmaxx(w)/2 + i
        // 反过来：i = p.x() - view_center.x() + getmaxx(w)/2
        // 我们这里从屏幕坐标计算地图坐标
        const mapPos = {
          x: centerPos.x - Math.floor(windowWidth / 2) + screenX,
          y: centerPos.y - Math.floor(windowHeight / 2) + screenY,
          z: centerPos.z,
        } as Tripoint

        // 检查地图边界（对应 CDDA 的 inbounds 检查）
        if (!this.isInBounds(mapPos, gameMap)) {
          continue
        }

        // 调用 drawsq 绘制单个瓦片
        this.drawSq(mapPos, screenX, screenY, params, gameMap)
        renderedCount++
      }
    }

    debug(LogCategory.RENDERER, `Rendered ${renderedCount} tiles, center: (${centerPos.x}, ${centerPos.y}), window: ${windowWidth}x${windowHeight}`)
  }

  /**
   * 检查位置是否在地图边界内
   * 对应 CDDA 的 map::inbounds()
   */
  private isInBounds(pos: Tripoint, gameMap: GameMap): boolean {
    // 对于 WorldMap，我们假设它是无限的，但需要检查瓦片是否存在
    const tile = gameMap.getTile(pos)
    return tile !== null && tile !== undefined
  }

  /**
   * 绘制单个瓦片
   * 对应 CDDA 的 map::drawsq() 函数
   */
  private drawSq(
    worldPos: Tripoint,
    screenX: number,
    screenY: number,
    params: DrawSqParams,
    gameMap: GameMap
  ): void {
    // 获取瓦片数据
    const tile = gameMap.getTile(worldPos)
    if (!tile) {
      return
    }

    // 调用 draw_maptile 获取显示数据
    const tileData = this.drawMapTile(tile, worldPos, params, gameMap)

    // 绘制到屏幕
    this.drawTile(screenX, screenY, tileData, params.highlight)
  }

  /**
   * 获取瓦片的显示数据
   * 对应 CDDA 的 map::draw_maptile() 函数
   */
  private drawMapTile(
    tile: MapTile,
    pos: Tripoint,
    params: DrawSqParams,
    gameMap: GameMap
  ): TileData {
    let sym = '?'
    let color = '#808080' // c_light_gray
    let bgColor = '#000000'

    const terrainLoader = gameDataLoader.getTerrainLoader()
    const furnitureLoader = gameDataLoader.getFurnitureLoader()

    // 1. 获取地形符号和颜色
    const terrain = terrainLoader.get(tile.terrain)
    if (terrain) {
      sym = terrain.symbol
      color = this.ncColorToHex(terrain.color)

      // 检查是否是自动墙壁符号
      if (terrain.hasFlag?.('AUTO_WALL_SYMBOL')) {
        // TODO: 实现 determine_wall_corner
        sym = '#'
      }
    }

    // 2. 家具覆盖地形
    if (tile.furniture !== null) {
      const furniture = furnitureLoader.get(tile.furniture)
      if (furniture) {
        sym = furniture.symbol
        color = this.ncColorToHex(furniture.color)
      }
    }

    // 3. 陷阱（如果有且玩家感知足够）
    // TODO: 实现陷阱逻辑

    // 4. 场地效果
    // TODO: 实现场地效果逻辑

    // 5. 物品
    if (params.showItems) {
      // TODO: 实现物品显示
    }

    return {
      char: sym,
      color: color,
      bgColor: bgColor,
    }
  }

  /**
   * 将 ncurses 颜色转换为十六进制
   * CDDA 使用 ncurses 颜色，这里映射到 CSS 颜色
   */
  private ncColorToHex(ncColor: string): string {
    // CDDA 颜色格式通常是 "c_red" 或 "red" 或十六进制
    if (ncColor.startsWith('#')) {
      return ncColor
    }

    // 移除 c_ 前缀
    const colorKey = ncColor.replace(/^c_/, '')
    const hexColor = (CDDA_COLORS as Record<string, string>)[colorKey]

    return hexColor || '#808080'
  }

  /**
   * 绘制单个 tile 到屏幕
   */
  private drawTile(x: number, y: number, data: TileData, highlight: boolean): void {
    const pixelX = x * this.config.tileSize
    const pixelY = y * this.config.tileSize

    // 绘制背景
    if (data.bgColor !== '#000000') {
      this.ctx.fillStyle = data.bgColor
      this.ctx.fillRect(pixelX, pixelY, this.config.tileSize, this.config.tileSize)
    }

    // 绘制高亮
    if (highlight) {
      this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'
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
   * 渲染玩家位置
   * 对应 CDDA 中玩家 '@' 的绘制
   */
  renderPlayer(pos: Tripoint, centerPos: Tripoint): void {
    // 使用 CDDA 的坐标转换公式
    const windowWidth = Math.ceil(this.canvas.width / this.config.tileSize)
    const windowHeight = Math.ceil(this.canvas.height / this.config.tileSize)

    // CDDA 公式：k = p.x() + getmaxx(w) / 2 - view_center.x()
    const screenX = pos.x + Math.floor(windowWidth / 2) - centerPos.x
    const screenY = pos.y + Math.floor(windowHeight / 2) - centerPos.y

    // 检查是否在视口范围内
    if (screenX < 0 || screenX >= windowWidth || screenY < 0 || screenY >= windowHeight) {
      return
    }

    const pixelX = screenX * this.config.tileSize
    const pixelY = screenY * this.config.tileSize

    // 绘制玩家高亮背景
    this.ctx.fillStyle = 'rgba(74, 158, 255, 0.2)'
    this.ctx.fillRect(pixelX, pixelY, this.config.tileSize, this.config.tileSize)

    // 绘制玩家符号 (@)，使用 CDDA 的 c_white 颜色
    this.drawCharacter('@', pixelX, pixelY, CDDA_COLORS.c_white)
  }

  /**
   * 打印可视区域的地图数据（ASCII 表示）
   */
  dumpVisibleMap(gameMap: GameMap, centerPos: Tripoint): void {
    group(LogCategory.RENDERER, '可视区域地图', true)

    const windowWidth = Math.ceil(this.canvas.width / this.config.tileSize)
    const windowHeight = Math.ceil(this.canvas.height / this.config.tileSize)

    const startX = centerPos.x - Math.floor(windowWidth / 2)
    const startY = centerPos.y - Math.floor(windowHeight / 2)

    debug(LogCategory.RENDERER, `窗口尺寸: ${windowWidth}x${windowHeight}`)
    debug(LogCategory.RENDERER, `视图中心: (${centerPos.x}, ${centerPos.y})`)
    debug(LogCategory.RENDERER, `地图范围: (${startX}, ${startY}) -> (${startX + windowWidth - 1}, ${startY + windowHeight - 1})`)

    const terrainLoader = gameDataLoader.getTerrainLoader()
    const furnitureLoader = gameDataLoader.getFurnitureLoader()

    // 打印 Y 轴刻度
    let rowHeader = '     '
    for (let x = startX; x < startX + windowWidth; x += 5) {
      rowHeader += x.toString().padStart(5)
    }
    console.log(rowHeader)

    for (let screenY = 0; screenY < windowHeight; screenY++) {
      const mapY = startY + screenY
      let row = mapY.toString().padStart(3) + ' '

      for (let screenX = 0; screenX < windowWidth; screenX++) {
        const mapX = startX + screenX
        const worldPos = { x: mapX, y: mapY, z: centerPos.z } as Tripoint
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

    debug(LogCategory.RENDERER, '图例: @=玩家 #=墙壁 .=地板 +=门 ,=grass ~=水')
    groupEnd()
  }

  /**
   * 打印可视区域的原始瓦片数据
   */
  dumpVisibleRawData(gameMap: GameMap, centerPos: Tripoint): void {
    group(LogCategory.RENDERER, '可视区域原始数据', true)

    const windowWidth = Math.ceil(this.canvas.width / this.config.tileSize)
    const windowHeight = Math.ceil(this.canvas.height / this.config.tileSize)

    const startX = centerPos.x - Math.floor(windowWidth / 2)
    const startY = centerPos.y - Math.floor(windowHeight / 2)

    debug(LogCategory.RENDERER, `窗口尺寸: ${windowWidth}x${windowHeight}`)
    debug(LogCategory.RENDERER, `地图范围: (${startX}, ${startY}) -> (${startX + windowWidth - 1}, ${startY + windowHeight - 1})`)

    const terrainLoader = gameDataLoader.getTerrainLoader()
    const furnitureLoader = gameDataLoader.getFurnitureLoader()

    const tileData: Array<{
      x: number
      y: number
      screenX: number
      screenY: number
      terrainId: number
      terrainName: string
      terrainSymbol: string
      furnitureId: number | null
      furnitureName: string | null
    }> = []

    for (let screenY = 0; screenY < windowHeight; screenY++) {
      for (let screenX = 0; screenX < windowWidth; screenX++) {
        const mapX = startX + screenX
        const mapY = startY + screenY
        const worldPos = { x: mapX, y: mapY, z: centerPos.z } as Tripoint
        const tile = gameMap.getTile(worldPos)

        if (!tile) {
          continue
        }

        const terrain = terrainLoader.get(tile.terrain)
        const furniture = tile.furniture !== null ? furnitureLoader.get(tile.furniture) : null

        tileData.push({
          x: mapX,
          y: mapY,
          screenX,
          screenY,
          terrainId: tile.terrain,
          terrainName: terrain?.name || `Unknown(${tile.terrain})`,
          terrainSymbol: terrain?.symbol || '?',
          furnitureId: tile.furniture,
          furnitureName: furniture?.name || null,
        })
      }
    }

    console.table(tileData)
    groupEnd()
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    this.charCache.clear()
  }
}
