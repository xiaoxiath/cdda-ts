import { useState, useEffect, useCallback } from 'react'
import GameCanvas from './components/GameCanvas'
import GameLog from './components/GameLog'
import GameStats from './components/GameStats'
import Sidebar from './components/Sidebar'
import { useGame } from './hooks/useGame'
import { configStorage } from './services/configStorage'
import { getUIConfigLoader } from './ui/UIConfigLoader'
import './App.css'
import './ui/widgets/WidgetRenderer.css'

// 分辨率选项类型
interface ResolutionOption {
  label: string
  width: number
  height: number
  fullscreen?: boolean
}

// 主流游戏分辨率选项
export const RESOLUTIONS: ResolutionOption[] = [
  { label: '1024x576', width: 1024, height: 576 },
  { label: '1200x675', width: 1200, height: 675 },
  { label: '1280x720', width: 1280, height: 720 }, // 默认，最主流
  { label: '1366x768', width: 1366, height: 768 },
  { label: '1600x900', width: 1600, height: 900 },
  { label: '1920x1080', width: 1920, height: 1080 },
  { label: '全屏', width: 0, height: 0, fullscreen: true },
]

// 默认配置
const DEFAULT_CONFIG = {
  resolutionIndex: 2, // 1280x720
  displayMode: 'ascii' as const,
  sidebarCollapsed: false,
}

function App() {
  const { gameState, isReady, error, handleInput } = useGame()
  const [displayMode, setDisplayMode] = useState<'ascii' | 'tile'>(DEFAULT_CONFIG.displayMode)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(DEFAULT_CONFIG.sidebarCollapsed)
  const [resolutionIndex, setResolutionIndex] = useState(DEFAULT_CONFIG.resolutionIndex)
  const [showResolutionMenu, setShowResolutionMenu] = useState(false)
  const [canvasKey, setCanvasKey] = useState(0) // 用于强制重新渲染 canvas
  const [configLoaded, setConfigLoaded] = useState(false)
  const [uiConfigLoaded, setUiConfigLoaded] = useState(false)

  const currentResolution = RESOLUTIONS[resolutionIndex]
  const isFullscreen = currentResolution.fullscreen === true

  // 加载保存的配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedConfig = await configStorage.load()
        if (savedConfig.resolutionIndex !== undefined) {
          setResolutionIndex(savedConfig.resolutionIndex)
        }
        if (savedConfig.displayMode) {
          setDisplayMode(savedConfig.displayMode)
        }
        if (savedConfig.sidebarCollapsed !== undefined) {
          setSidebarCollapsed(savedConfig.sidebarCollapsed)
        }
        setConfigLoaded(true)
      } catch (err) {
        console.error('Failed to load config:', err)
        setConfigLoaded(true)
      }
    }
    loadConfig()
  }, [])

  // 加载 UI 配置
  useEffect(() => {
    const loadUIConfig = async () => {
      try {
        const loader = getUIConfigLoader()
        // 注意：实际运行时需要配置正确的数据路径
        // await loader.loadAll({ dataPath: './Cataclysm-DDA' })
        setUiConfigLoaded(true)
      } catch (err) {
        console.error('Failed to load UI config:', err)
        setUiConfigLoaded(true)
      }
    }
    loadUIConfig()
  }, [])

  // 保存配置
  const saveConfig = useCallback(async () => {
    try {
      await configStorage.save({
        resolutionIndex,
        displayMode,
        sidebarCollapsed,
      })
    } catch (err) {
      console.error('Failed to save config:', err)
    }
  }, [resolutionIndex, displayMode, sidebarCollapsed])

  // 监听配置变化并保存
  useEffect(() => {
    if (configLoaded) {
      saveConfig()
    }
  }, [resolutionIndex, displayMode, sidebarCollapsed, configLoaded, saveConfig])

  // 应用分辨率到 CSS 变量
  useEffect(() => {
    const root = document.documentElement
    const rootElement = document.querySelector('#root')
    const appElement = document.querySelector('.app')

    if (isFullscreen) {
      // 全屏模式
      root.style.removeProperty('--game-width')
      root.style.removeProperty('--game-height')
      rootElement?.classList.add('fullscreen-mode')
      appElement?.classList.add('fullscreen')
    } else {
      // 固定分辨率模式
      root.style.setProperty('--game-width', `${currentResolution.width}px`)
      root.style.setProperty('--game-height', `${currentResolution.height}px`)
      rootElement?.classList.remove('fullscreen-mode')
      appElement?.classList.remove('fullscreen')
    }

    // 触发 canvas 重新渲染
    setCanvasKey(prev => prev + 1)
  }, [currentResolution, isFullscreen])

  // 处理分辨率切换
  const handleResolutionChange = useCallback((index: number) => {
    setResolutionIndex(index)
    setShowResolutionMenu(false)
  }, [])

  // 处理显示模式切换
  const handleDisplayModeChange = useCallback(() => {
    setDisplayMode(prev => prev === 'ascii' ? 'tile' : 'ascii')
  }, [])

  // 处理侧边栏切换
  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed(prev => !prev)
  }, [])

  if (error) {
    return (
      <div className="error-screen">
        <div className="error-content">
          <h1>加载失败</h1>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>重新加载</button>
        </div>
      </div>
    )
  }

  if (!isReady || !configLoaded || !uiConfigLoaded) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>CATAclysm-DDA Web</h1>
          <div className="loading-spinner"></div>
          <p>正在加载游戏资源...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* 顶部栏 */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">CDDA Web</h1>
          <span className="app-version">v0.1.0</span>
        </div>
        <div className="header-center">
          {gameState && (
            <span className="turn-counter">回合: {gameState.turn}</span>
          )}
        </div>
        <div className="header-right">
          <div style={{ position: 'relative' }}>
            <button
              className="icon-btn"
              onClick={() => setShowResolutionMenu(!showResolutionMenu)}
              title="切换分辨率"
            >
              🖥
            </button>
            {showResolutionMenu && (
              <div className="resolution-menu">
                {RESOLUTIONS.map((res, index) => (
                  <button
                    key={res.label}
                    className={`resolution-option${index === resolutionIndex ? ' active' : ''}`}
                    onClick={() => handleResolutionChange(index)}
                  >
                    {res.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="icon-btn"
            onClick={handleDisplayModeChange}
            title={displayMode === 'ascii' ? '切换到 Tile 模式' : '切换到 ASCII 模式'}
          >
            {displayMode === 'ascii' ? '📝' : '🎨'}
          </button>
          <button
            className="icon-btn"
            onClick={handleSidebarToggle}
            title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="app-main">
        {/* 游戏画布区域 */}
        <div className="game-container">
          <GameCanvas
            key={canvasKey}
            gameState={gameState}
            displayMode={displayMode}
            onInput={handleInput}
          />
        </div>

        {/* 右侧信息面板 */}
        <aside className={`app-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
          {/* 新的 UI Widget 系统侧边栏 */}
          <Sidebar gameState={gameState} collapsed={sidebarCollapsed} />

          {/* 消息日志 */}
          <div className="sidebar-section sidebar-section-flex">
            <GameLog messages={gameState?.messages || []} />
          </div>
        </aside>
      </main>

      {/* 底部状态栏 */}
      <footer className="app-footer">
        <div className="footer-info">
          <span className="key-hint">
            <kbd>↑↓←→</kbd> / <kbd>WASD</kbd> 移动
          </span>
          <span className="key-hint">
            <kbd>Space</kbd> 等待
          </span>
          <span className="key-hint">
            <kbd>Esc</kbd> 菜单
          </span>
        </div>
        <div className="footer-position">
          {gameState?.player?.position && (
            <span>
              位置: ({gameState.player.position.x}, {gameState.player.position.y}, {gameState.player.position.z})
            </span>
          )}
        </div>
      </footer>
    </div>
  )
}

export default App
