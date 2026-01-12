import type { GameState as CoreGameState } from '@cataclym-web/core'

/**
 * 显示模式
 */
export type DisplayMode = 'ascii' | 'tile'

/**
 * 游戏状态扩展
 */
export interface GameState extends CoreGameState {
  // 可以添加 web 版本特有的状态
}

/**
 * 渲染配置
 */
export interface RenderConfig {
  tileSize: number
  fontWidth: number
  fontHeight: number
  fontSize: number
  fontFamily: string
}

/**
 * Tile 数据
 */
export interface TileData {
  char: string
  color: string
  bgColor: string
}

/**
 * 输入动作
 */
export type InputAction =
  | { type: 'move'; direction: 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw' }
  | { type: 'wait' }
  | { type: 'quit' }
  | { type: 'interact' }
