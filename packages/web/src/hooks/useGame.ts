import { useState, useEffect, useCallback, useRef } from 'react'
import {
  GameState,
  GameMap,
  Avatar,
  Tripoint,
  WorldMap,
} from '@cataclym-web/core'
import type { InputAction } from '../types'
import { gameDataLoader } from '../services/GameDataLoader'
import { WorldMapLoader } from '../services/WorldMapLoader'
import { debug, info, warn, error, success, group, groupEnd, LogCategory } from '../utils/logger'

// 全局游戏状态
let globalMap: WorldMap | null = null
let globalPlayer: Avatar | null = null
let globalTurn = 0
let globalMessages: string[] = []
let globalDataLoaded = false
let worldMapLoader: WorldMapLoader | null = null

/**
 * 游戏状态管理 Hook
 */
export function useGame() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [errorState, setErrorState] = useState<string | null>(null)
  const isInitializing = useRef(false)
  const [shouldInit, setShouldInit] = useState(false)

  /**
   * 更新游戏状态到 React
   */
  const updateGameState = useCallback(() => {
    if (!globalMap || !globalPlayer) return

    setGameState(new GameState({
      // @ts-ignore - WorldMap 与 GameMap 类型不完全兼容，但运行时可以工作
      map: globalMap,
      player: globalPlayer,
      turn: globalTurn,
      messages: globalMessages,
    }))
  }, [])

  /**
   * 处理移动
   */
  const handleMove = useCallback(async (dx: number, dy: number, dz: number = 0) => {
    if (!globalPlayer || !globalMap) {
      debug(LogCategory.GAME, '无法移动: globalPlayer 或 globalMap 为空')
      return
    }

    const oldPos = globalPlayer.position
    const newPos = new Tripoint({
      x: globalPlayer.position.x + dx,
      y: globalPlayer.position.y + dy,
      z: globalPlayer.position.z + dz,
    })

    debug(LogCategory.GAME, `移动: (${oldPos.x},${oldPos.y}) -> (${newPos.x},${newPos.y}), delta: (${dx},${dy})`)

    // 检查新位置是否有瓦片
    const tile = globalMap.getTile(newPos)
    if (!tile) {
      warn(LogCategory.GAME, `移动失败: 位置 (${newPos.x},${newPos.y}) 超出边界`)
      return // 边界检查
    }

    // 检查地形是否可通行
    const terrainLoader = gameDataLoader.getTerrainLoader()
    const terrain = terrainLoader.get(tile.terrain)
    if (terrain && !terrain.isPassable()) {
      warn(LogCategory.GAME, `移动失败: 地形 '${terrain.name}' 不可通行`)
      globalMessages.push(`你无法穿过 ${terrain.name}。`)
      updateGameState()
      return
    }

    // 更新玩家位置
    const updatedPlayer = new Avatar(
      globalPlayer.id,
      newPos,
      globalPlayer.name,
      { ...globalPlayer.stats }
    )

    globalPlayer = updatedPlayer
    globalTurn++

    debug(LogCategory.GAME, `移动成功! 新位置: (${newPos.x},${newPos.y}), 回合: ${globalTurn}`)

    // 动态加载周围区域
    if (worldMapLoader) {
      await worldMapLoader.loadAround(newPos)
      debug(LogCategory.MAP, `缓存大小: ${globalMap.getCacheSize()}`)
    }

    updateGameState()
  }, [updateGameState])

  /**
   * 处理等待
   */
  const handleWait = useCallback(() => {
    globalTurn++
    updateGameState()
  }, [updateGameState])

  /**
   * 初始化游戏
   */
  useEffect(() => {
    if (!shouldInit || isInitializing.current) return
    isInitializing.current = true

    async function initGame() {
      group(LogCategory.GAME, '初始化 Cataclysm-DDA Web')

      try {
        // 1. 加载核心游戏数据
        if (!globalDataLoaded) {
          info(LogCategory.DATA, '加载核心游戏数据...')
          await gameDataLoader.loadCoreData()
          globalDataLoaded = true

          const stats = gameDataLoader.getStats()
          success(LogCategory.DATA, `数据加载完成! 地形: ${stats.terrainCount} 个, 家具: ${stats.furnitureCount} 个`)
        } else {
          info(LogCategory.DATA, '使用已加载的游戏数据')
        }

        // 2. 创建世界地图加载器
        info(LogCategory.MAP, '创建世界地图加载器...')
        const terrainLoader = gameDataLoader.getTerrainLoader()
        const furnitureLoader = gameDataLoader.getFurnitureLoader()

        worldMapLoader = new WorldMapLoader(terrainLoader, furnitureLoader)

        // 加载 mapgen 数据
        await worldMapLoader.loadMapGenData()
        success(LogCategory.MAP, '世界地图加载器创建完成!')

        // 3. 创建玩家角色并初始化周围区域
        info(LogCategory.GAME, '创建玩家角色并初始化周围区域...')

        // 初始位置（世界中心附近）
        const playerPos = new Tripoint({ x: 0, y: 0, z: 0 })

        // 加载周围区域
        await worldMapLoader.loadAround(playerPos)

        // 获取 WorldMap
        globalMap = worldMapLoader.getWorldMap()

        const player = new Avatar(
          'player',
          playerPos,
          '幸存者',
          { str: 10, dex: 10, int: 10, per: 10 }
        )

        globalPlayer = player
        globalMessages = [
          '欢迎来到 Cataclysm-DDA Web!',
          '游戏数据加载完成。',
          '这是一个无限大的世界，探索时会动态加载新区域。',
          '使用 WASD 或方向键移动。',
        ]
        globalTurn = 0

        updateGameState()
        setIsReady(true)

        success(LogCategory.GAME, `游戏初始化完成! 初始位置: (${playerPos.x}, ${playerPos.y}), 缓存: ${globalMap.getCacheSize()} submap`)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '初始化失败'
        setErrorState(errorMsg)
        error(LogCategory.GAME, '游戏初始化失败:', err)
      }

      groupEnd()
    }

    initGame()

    return () => {
      // 清理
      globalMap = null
      globalPlayer = null
      worldMapLoader = null
    }
  }, [shouldInit, updateGameState])

  /**
   * 手动触发游戏初始化
   */
  const initializeGame = useCallback(() => {
    if (!isReady) {
      setShouldInit(true)
    }
  }, [isReady])

  /**
   * 处理输入动作
   */
  const handleInput = useCallback((action: InputAction) => {
    if (!isReady) {
      debug(LogCategory.INPUT, '游戏未就绪，忽略输入')
      return
    }

    debug(LogCategory.INPUT, '收到输入动作:', action)

    switch (action.type) {
      case 'move':
        const dirs: Record<string, { dx: number; dy: number }> = {
          n: { dx: 0, dy: -1 },
          ne: { dx: 1, dy: -1 },
          e: { dx: 1, dy: 0 },
          se: { dx: 1, dy: 1 },
          s: { dx: 0, dy: 1 },
          sw: { dx: -1, dy: 1 },
          w: { dx: -1, dy: 0 },
          nw: { dx: -1, dy: -1 },
        }
        const dir = dirs[action.direction]
        if (dir) {
          handleMove(dir.dx, dir.dy)
        }
        break
      case 'wait':
        handleWait()
        break
      case 'quit':
        globalMessages.push('游戏结束。')
        updateGameState()
        break
    }
  }, [isReady, handleMove, handleWait, updateGameState])

  /**
   * 获取玩家位置
   */
  const getPlayerPosition = useCallback((): Tripoint | null => {
    return globalPlayer?.position || null
  }, [])

  return {
    gameState,
    isReady,
    error: errorState,
    handleInput,
    getPlayerPosition,
    initializeGame,
  }
}
