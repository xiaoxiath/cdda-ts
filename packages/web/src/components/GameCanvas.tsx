import { useEffect, useRef, useCallback } from 'react'
import { GameRenderer } from '../renderers'
import { keyboardEventToAction } from '../utils'
import type { GameState, DisplayMode } from '../types'

interface GameCanvasProps {
  gameState: GameState | null
  displayMode: DisplayMode
  onInput?: (action: any) => void
}

/**
 * 游戏画布组件 - 渲染游戏主画面
 */
export default function GameCanvas({ gameState, displayMode, onInput }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<GameRenderer | null>(null)

  /**
   * 初始化渲染器
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // 创建渲染器
    const renderer = new GameRenderer(canvas, {
      tileSize: 16,
      fontSize: 14,
      fontFamily: '"Courier New", monospace',
    })
    rendererRef.current = renderer

    // 设置 Canvas 大小
    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (parent) {
        const width = parent.clientWidth
        const height = parent.clientHeight
        // 只在尺寸真正改变时才更新
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width
          canvas.height = height
          renderer.resize(width, height)
        }
      }
    }

    // 初始调整大小
    resizeCanvas()

    // 监听窗口大小变化
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
    })

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement)
    }

    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      resizeObserver.disconnect()
      renderer.destroy()
    }
  }, [])

  /**
   * 更新显示模式
   */
  useEffect(() => {
    rendererRef.current?.setDisplayMode(displayMode)
  }, [displayMode])

  /**
   * 渲染游戏画面
   */
  useEffect(() => {
    if (!gameState || !rendererRef.current) return

    const renderer = rendererRef.current
    const map = gameState.map
    const playerPos = gameState.player?.position

    if (!map || !playerPos) return

    // 渲染地图
    renderer.render(map, playerPos)

    // 渲染玩家
    renderer.renderPlayer(playerPos, playerPos)

    // 打印可视区域地图数据（用于调试）
    renderer.dumpVisibleMap(map, playerPos)

    // 打印可视区域原始数据（用于调试）
    // renderer.dumpVisibleRawData(map, playerPos)
  }, [gameState, displayMode])

  /**
   * 处理键盘输入
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const action = keyboardEventToAction(event)
    if (action && onInput) {
      event.preventDefault()
      onInput(action)
    }
  }, [onInput])

  /**
   * 注册键盘事件监听
   */
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return <canvas ref={canvasRef} className="game-canvas" />
}
