/**
 * SimpleRenderer - 简单的命令行渲染器
 *
 * 使用标准输出渲染游戏状态
 */

import { GameState } from '../game/GameState';
import { BodyPartId } from '../creature/types';
import { Tripoint } from '../coordinates/Tripoint';

/**
 * 渲染器配置
 */
export interface RendererConfig {
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly showStats: boolean;
  readonly showMessages: boolean;
}

/**
 * 简单的命令行渲染器
 */
export class SimpleRenderer {
  private config: RendererConfig;
  private lastRender: string = '';

  constructor(config: RendererConfig = {
    mapWidth: 40,
    mapHeight: 20,
    showStats: true,
    showMessages: true,
  }) {
    this.config = config;
  }

  /**
   * 渲染游戏状态
   */
  render(state: GameState): void {
    const output = this.formatOutput(state);

    // 只在输出改变时才渲染（减少闪烁）
    if (output !== this.lastRender) {
      // 清屏（使用 ANSI 转义序列）
      console.clear();
      console.log(output);
      this.lastRender = output;
    }
  }

  /**
   * 格式化输出
   */
  private formatOutput(state: GameState): string {
    const lines: string[] = [];

    // 标题
    lines.push('╔═══════════════════════════════════════════════════════════╗');
    lines.push('║         Cataclysm-DDA TypeScript - CLI 版                 ║');
    lines.push('╚═══════════════════════════════════════════════════════════╝');
    lines.push('');

    // 状态面板
    if (this.config.showStats) {
      lines.push(this.formatStats(state));
      lines.push('');
    }

    // 地图
    lines.push(this.formatMap(state));
    lines.push('');

    // 消息面板
    if (this.config.showMessages) {
      lines.push('═══════════════════════════════════════════════════════════');
      lines.push('消息:');
      lines.push(this.formatMessages(state));
      lines.push('═══════════════════════════════════════════════════════════');
    }

    // 操作提示
    lines.push('');
    lines.push('操作: 移动 [方向键] 或 [8/4/6/2] | 等待 [.] | 退出 [q]');

    return lines.join('\n');
  }

  /**
   * 格式化状态信息
   */
  private formatStats(state: GameState): string {
    const player = state.player;
    const stats = player.stats;

    const lines = [
      '┌─────────────────────────────────────────────────────────────┐',
      '│ 状态                                                         │',
      '├─────────────────────────────────────────────────────────────┤',
      `│ 回合: ${String(state.turn).padStart(5)} │ 位置: (${String(player.position.x).padStart(3)}, ${String(player.position.y).padStart(3)}, ${String(player.position.z).padStart(2)}) │ 健康状态: ${player.getHealthStatus().padEnd(6)} │`,
      '├─────────────────────────────────────────────────────────────┤',
      `│ 属性: STR ${String(stats.str).padStart(2)} │ DEX ${String(stats.dex).padStart(2)} │ INT ${String(stats.int).padStart(2)} │ PER ${String(stats.per).padStart(2)} │`,
      '├─────────────────────────────────────────────────────────────┤',
      `│ ${this.formatHP(player)}`,
      '└─────────────────────────────────────────────────────────────┘',
    ];

    return lines.join('\n');
  }

  /**
   * 格式化 HP
   */
  private formatHP(player: any): string {
    const parts = [
      { id: BodyPartId.HEAD, name: '头部' },
      { id: BodyPartId.TORSO, name: '躯干' },
      { id: BodyPartId.ARM_L, name: '左臂' },
      { id: BodyPartId.ARM_R, name: '右臂' },
      { id: BodyPartId.LEG_L, name: '左腿' },
      { id: BodyPartId.LEG_R, name: '右腿' },
    ];

    const hpStrs = parts.map(part => {
      const hp = player.getHP(part.id);
      const maxHp = player.getHPMax(part.id);

      if (hp === undefined || maxHp === undefined) {
        return `${part.name}: ?/?`;
      }

      const percentage = Math.round((hp / maxHp) * 100);
      const bar = this.createHPBar(percentage, 10);

      return `${part.name}: ${hp}/${maxHp} ${bar}`;
    });

    return hpStrs.join(' │ ');
  }

  /**
   * 创建 HP 条
   */
  private createHPBar(percentage: number, width: number): string {
    const filled = Math.max(0, Math.min(width, Math.floor(percentage / 100 * width)));
    const empty = width - filled;

    const char = this.getHPBarChar(percentage);
    return `[${char.repeat(filled)}${'.'.repeat(empty)}]`;
  }

  /**
   * 获取 HP 条字符
   */
  private getHPBarChar(percentage: number): string {
    if (percentage > 75) return '█';
    if (percentage > 50) return '▓';
    if (percentage > 25) return '▒';
    return '░';
  }

  /**
   * 格式化地图
   */
  private formatMap(state: GameState): string {
    const player = state.player;
    const map = state.map;

    const halfWidth = Math.floor(this.config.mapWidth / 2);
    const halfHeight = Math.floor(this.config.mapHeight / 2);

    const lines: string[] = [];

    for (let dy = -halfHeight; dy <= halfHeight; dy++) {
      const row: string[] = [];

      for (let dx = -halfWidth; dx <= halfWidth; dx++) {
        const x = player.position.x + dx;
        const y = player.position.y + dy;
        const z = player.position.z;

        // 玩家位置
        if (dx === 0 && dy === 0) {
          row.push('@');
          continue;
        }

        // 获取地形
        const pos = new Tripoint({ x, y, z });
        const tile = map.getTile(pos);

        if (tile) {
          row.push(this.getTerrainChar(tile));
        } else {
          row.push('?'); // 未知区域
        }
      }

      lines.push(row.join(''));
    }

    return '┌' + '─'.repeat(this.config.mapWidth) + '┐\n' +
      lines.map(line => '│' + line + '│').join('\n') +
      '\n└' + '─'.repeat(this.config.mapWidth) + '┘';
  }

  /**
   * 获取地形字符
   */
  private getTerrainChar(tile: any): string {
    // 地形 ID 映射
    // 0 = 地板, 1 = 墙
    const terrainId = tile.terrain;

    if (terrainId === 0) {
      return '.'; // 地板
    } else if (terrainId === 1) {
      return '#'; // 墙
    }

    return '?'; // 未知地形
  }

  /**
   * 格式化消息
   */
  private formatMessages(state: GameState): string {
    const messages = state.getRecentMessages(8);

    if (messages.length === 0) {
      return '暂无消息';
    }

    return messages.map(msg => `> ${msg}`).join('\n');
  }
}
