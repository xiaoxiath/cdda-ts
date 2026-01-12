import type { GameState } from '../types'

interface GameStatsProps {
  gameState: GameState | null
}

/**
 * 游戏状态组件 - 显示玩家信息和游戏状态
 */
export default function GameStats({ gameState }: GameStatsProps) {
  const player = gameState?.player
  const turn = gameState?.turn || 0

  return (
    <div className="game-stats">
      <div className="game-stats-header">
        <h3>角色状态</h3>
        {player && (
          <span className="stat-value highlight">Lv.1</span>
        )}
      </div>

      <div className="game-stats-content">
        {player ? (
          <>
            <div className="stat-row">
              <span className="stat-label">名称</span>
              <span className="stat-value">{player.name}</span>
            </div>

            <div className="stat-divider"></div>

            <div className="stat-row">
              <span className="stat-label">位置</span>
              <span className="stat-value">
                ({player.position?.x}, {player.position?.y}, {player.position?.z})
              </span>
            </div>

            <div className="stat-divider"></div>

            {'stats' in player && player.stats && (
              <>
                <div className="stat-row">
                  <span className="stat-label">力量 STR</span>
                  <span className="stat-value">{player.stats.str}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">敏捷 DEX</span>
                  <span className="stat-value">{player.stats.dex}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">智力 INT</span>
                  <span className="stat-value">{player.stats.int}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">感知 PER</span>
                  <span className="stat-value">{player.stats.per}</span>
                </div>

                <div className="stat-divider"></div>
              </>
            )}

            <div className="stat-row">
              <span className="stat-label">回合</span>
              <span className="stat-value">{turn}</span>
            </div>
          </>
        ) : (
          <div className="stat-empty">无角色信息</div>
        )}
      </div>
    </div>
  )
}
