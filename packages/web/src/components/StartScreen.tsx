import { useState, useEffect, useCallback } from 'react'
import './StartScreen.css'

/**
 * 主菜单选项
 */
enum MainMenuOption {
  MOTD = 'motd',
  NEW_GAME = 'new_game',
  LOAD = 'load',
  WORLD = 'world',
  TUTORIAL = 'tutorial',
  SETTINGS = 'settings',
  HELP = 'help',
  CREDITS = 'credits',
  QUIT = 'quit',
}

/**
 * 新游戏子菜单选项
 */
enum NewGameOption {
  CUSTOM = 'custom',
  PRESET = 'preset',
  RANDOM = 'random',
  PLAY_NOW_DEFAULT = 'play_now_default',
  PLAY_NOW_RANDOM = 'play_now_random',
  BACK = 'back',
}

/**
 * 菜单项定义
 */
interface MenuItem {
  id: string
  label: string
  hotkey: string
  action: () => void
}

/**
 * CDDA 风格的启动屏幕组件
 *
 * 复刻 Cataclysm-DDA 的主菜单界面，包括：
 * - ASCII 艺术 Title
 * - 主菜单选项
 * - 子菜单面板
 * - 快捷键支持
 * - 每日提示
 */
export default function StartScreen({ onStart }: { onStart: () => void }) {
  const [selectedMenu, setSelectedMenu] = useState<MainMenuOption>(MainMenuOption.NEW_GAME)
  const [showSubMenu, setShowSubMenu] = useState(false)
  const [subMenuItems, setSubMenuItems] = useState<MenuItem[]>([])
  const [selectedSubMenu, setSelectedSubMenu] = useState(0)
  const [tipOfDay, setTipOfDay] = useState('')
  const [motd, setMotd] = useState('')
  const [isDebugMode, setIsDebugMode] = useState(false)

  // 每日提示列表
  const tips = [
    '按 WASD 或方向键移动角色',
    '按 E 键可以交互和拾取物品',
    '按 I 键打开物品栏',
    '按 , 键可以拾取地板上的物品',
    '注意饥饿、口渴和疲劳状态',
    '寻找避难所和资源',
    '制作物品可以帮助你生存',
    '夜晚会变得更危险',
    '小心丧尸和怪物',
    '按 Space 键可以等待一回合',
  ]

  // 主菜单定义
  const mainMenuItems: MenuItem[] = [
    {
      id: MainMenuOption.MOTD,
      label: 'MOTD',
      hotkey: 'm',
      action: () => showMOTD(),
    },
    {
      id: MainMenuOption.NEW_GAME,
      label: 'New Game',
      hotkey: 'n',
      action: () => showNewGameMenu(),
    },
    {
      id: MainMenuOption.LOAD,
      label: 'Load',
      hotkey: 'a',
      action: () => alert('加载游戏功能开发中...'),
    },
    {
      id: MainMenuOption.WORLD,
      label: 'World',
      hotkey: 'w',
      action: () => alert('世界管理功能开发中...'),
    },
    {
      id: MainMenuOption.TUTORIAL,
      label: 'Tutorial',
      hotkey: 'u',
      action: () => alert('教程功能开发中...'),
    },
    {
      id: MainMenuOption.SETTINGS,
      label: 'Settings',
      hotkey: 't',
      action: () => alert('设置功能开发中...'),
    },
    {
      id: MainMenuOption.HELP,
      label: 'Help',
      hotkey: 'e',
      action: () => alert('帮助功能开发中...'),
    },
    {
      id: MainMenuOption.CREDITS,
      label: 'Credits',
      hotkey: 'c',
      action: () => showCredits(),
    },
    {
      id: MainMenuOption.QUIT,
      label: 'Quit',
      hotkey: 'q',
      action: () => {
        if (confirm('确定要退出游戏吗？')) {
          window.close()
        }
      },
    },
  ]

  // 初始化：设置每日提示和 MOTD
  useEffect(() => {
    const randomTip = tips[Math.floor(Math.random() * tips.length)]
    setTipOfDay(randomTip)
    setMotd(getMOTD())

    // 检查 URL 参数
    const params = new URLSearchParams(window.location.search)
    const hasDebugParam = params.has('debug') || params.has('query')
    setIsDebugMode(hasDebugParam)

    if (hasDebugParam) {
      console.log('[StartScreen] Debug mode detected in URL')
      console.log('[StartScreen] Available debug parameters:')
      console.log('  - ?debug=1   : 启用 debug 模式（跳过启动菜单）')
      console.log('  - ?query     : 同上')
      console.log('  - 当前 URL:', window.location.href)
    }
  }, [])

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()

      // 快捷键处理
      if (!showSubMenu) {
        const menuItem = mainMenuItems.find(item => item.hotkey === key)
        if (menuItem) {
          event.preventDefault()
          menuItem.action()
          return
        }

        // 左右键切换主菜单
        if (key === 'arrowleft' || key === 'a') {
          navigateMainMenu(-1)
        } else if (key === 'arrowright' || key === 'd') {
          navigateMainMenu(1)
        } else if (key === 'enter' || key === ' ') {
          event.preventDefault()
          const currentItem = mainMenuItems.find(item => item.id === selectedMenu)
          if (currentItem) {
            currentItem.action()
          }
        }
      } else {
        // 子菜单导航
        if (key === 'escape') {
          setShowSubMenu(false)
          setSelectedSubMenu(0)
        } else if (key === 'arrowup' || key === 'w') {
          setSelectedSubMenu(prev => Math.max(0, prev - 1))
        } else if (key === 'arrowdown' || key === 's') {
          setSelectedSubMenu(prev => Math.min(subMenuItems.length - 1, prev + 1))
        } else if (key === 'enter' || key === ' ') {
          event.preventDefault()
          subMenuItems[selectedSubMenu]?.action()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedMenu, showSubMenu, subMenuItems, selectedSubMenu])

  // 主菜单导航
  const menuKeys = Object.values(MainMenuOption)
  const currentIndex = menuKeys.indexOf(selectedMenu)

  const navigateMainMenu = (direction: number) => {
    const newIndex = (currentIndex + direction + menuKeys.length) % menuKeys.length
    setSelectedMenu(menuKeys[newIndex])
  }

  // 显示 MOTD
  const showMOTD = () => {
    setSubMenuItems([
      {
        id: 'back',
        label: '返回',
        hotkey: 'ESC',
        action: () => setShowSubMenu(false),
      },
    ])
    setShowSubMenu(true)
  }

  // 显示新游戏菜单
  const showNewGameMenu = () => {
    setSubMenuItems([
      {
        id: NewGameOption.CUSTOM,
        label: 'Custom Character',
        hotkey: 'u',
        action: () => alert('自定义角色功能开发中...'),
      },
      {
        id: NewGameOption.PRESET,
        label: 'Preset Character',
        hotkey: 'p',
        action: () => alert('预设角色功能开发中...'),
      },
      {
        id: NewGameOption.RANDOM,
        label: 'Random Character',
        hotkey: 'r',
        action: () => alert('随机角色功能开发中...'),
      },
      {
        id: NewGameOption.PLAY_NOW_DEFAULT,
        label: 'Play Now! (Default)',
        hotkey: 'd',
        action: () => {
          onStart()
        },
      },
      {
        id: NewGameOption.PLAY_NOW_RANDOM,
        label: 'Play Now! (Random)',
        hotkey: 'o',
        action: () => {
          onStart()
        },
      },
      {
        id: NewGameOption.BACK,
        label: 'Back',
        hotkey: 'ESC',
        action: () => setShowSubMenu(false),
      },
    ])
    setShowSubMenu(true)
    setSelectedSubMenu(0)
  }

  // 显示制作人员
  const showCredits = () => {
    setSubMenuItems([
      {
        id: 'back',
        label: '返回',
        hotkey: 'ESC',
        action: () => setShowSubMenu(false),
      },
    ])
    setShowSubMenu(true)
  }

  return (
    <div className="start-screen">
      {/* Debug 模式指示器 */}
      {isDebugMode && (
        <div className="debug-indicator">
          ⚡ DEBUG 模式已启用
        </div>
      )}

      {/* ASCII Title */}
      <div className="start-title">
        <pre className="ascii-title">
{`
    ███████╗██╗   ██╗ █████╗ ███╗   ███╗███████╗██╗     ██╗ ██████╗██╗  ██╗
    ██╔════╝██║   ██║██╔══██╗████╗ ████║██╔════╝██║     ██║██╔════╝██║ ██╔╝
    ███████╗██║   ██║███████║██╔████╔██║█████╗  ██║     ██║██║     █████╔╝
    ╚════██║██║   ██║██╔══██║██║╚██╔╝██║██╔══╝  ██║     ██║██║     ██╔═██╗
    ███████║╚██████╔╝██║  ██║██║ ╚═╝ ██║███████╗███████╗██║╚██████╗██║  ██╗
    ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚══════╝╚═╝ ╚═════╝╚═╝  ╚═╝
`}
        </pre>
        <div className="title-subtitle">Dark Days Ahead - Web Edition</div>
        <div className="title-version">v0.1.0</div>
      </div>

      {/* 主菜单 */}
      <div className="main-menu">
        {mainMenuItems.map((item) => {
          const isSelected = item.id === selectedMenu
          return (
            <button
              key={item.id}
              className={`menu-item ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                setSelectedMenu(item.id as MainMenuOption)
                item.action()
              }}
            >
              <span className="menu-label">{item.label}</span>
              <span className="menu-hotkey">[{item.hotkey.toUpperCase()}]</span>
            </button>
          )
        })}
      </div>

      {/* 子菜单面板 */}
      {showSubMenu && (
        <div className="submenu-panel">
          <div className="submenu-header">
            {selectedMenu === MainMenuOption.MOTD && '每日消息 (MOTD)'}
            {selectedMenu === MainMenuOption.NEW_GAME && '新游戏'}
            {selectedMenu === MainMenuOption.CREDITS && '制作人员'}
          </div>
          <div className="submenu-content">
            {selectedMenu === MainMenuOption.MOTD && (
              <div className="motd-content">
                <p>{motd}</p>
              </div>
            )}
            {selectedMenu === MainMenuOption.NEW_GAME && (
              <div className="submenu-items">
                {subMenuItems.map((item, index) => {
                  const isSelected = index === selectedSubMenu
                  return (
                    <div
                      key={item.id}
                      className={`submenu-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => item.action()}
                    >
                      <span className="submenu-label">{item.label}</span>
                      <span className="submenu-hotkey">[{item.hotkey.toUpperCase()}]</span>
                    </div>
                  )
                })}
              </div>
            )}
            {selectedMenu === MainMenuOption.CREDITS && (
              <div className="credits-content">
                <h3>Cataclysm: Dark Days Ahead</h3>
                <p>原版开发团队</p>
                <ul>
                  <li>Kevin Granade (The Bright Dark)</li>
                  <li>Gregory White (Whales)</li>
                  <li>所有贡献者和翻译者</li>
                </ul>
                <h3>Web Edition</h3>
                <p>Web 移植版</p>
                <ul>
                  <li>TypeScript 重构</li>
                  <li>React 用户界面</li>
                  <li>现代 Web 技术栈</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 底部信息 */}
      <div className="start-footer">
        <div className="tip-of-day">
          <span className="tip-label">每日提示:</span>
          <span className="tip-text">{tipOfDay}</span>
        </div>
        <div className="footer-info">
          按 <kbd>←</kbd><kbd>→</kbd> 切换菜单 | 按 <kbd>Enter</kbd> 确认 | 快捷键直接选择
          <span className="debug-shortcut">
            | <a href="?debug=1" onClick={(e) => { e.preventDefault(); window.location.href = '?debug=1' }}>Debug 模式</a>
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * 获取 MOTD (Message of the Day)
 */
function getMOTD(): string {
  return `
    欢迎来到 Cataclysm-DDA Web Edition!

    这是一个基于 Web 的 Cataclysm: Dark Days Ahead 移植版本。
    该项目使用 TypeScript 和 React 完全重写了游戏核心。

    当前版本功能：
    ✓ 无限世界地图
    ✓ 动态地图生成
    ✓ ASCII 渲染模式
    ✓ 玩家移动和交互
    ✓ 更多功能开发中...

    注意事项：
    - 当前为早期开发版本
    - 存档功能尚未实现
    - 部分游戏机制可能不完整
    - 欢迎反馈 Bug 和建议
  `
}
