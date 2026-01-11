# CLI 界面设计文档

## 概述

CLI 界面是 Cataclysm-DDA 复刻项目的第一期实现，提供基于终端的游戏体验。

## 技术选择

### 推荐方案：blessed + tcell.js

```typescript
// 方案 1: blessed (推荐)
- 成熟的终端 UI 库
- 支持鼠标和键盘
- 丰富的组件库
- 性能优秀

// 方案 2: tcell.js
- 更底层的终端控制
- 跨平台支持更好
- 需要更多自定义代码
```

### 安装依赖

```bash
pnpm add blessed @types/blessed
# 或
pnpm add tcell.ts
```

## 架构设计

### 1. 核心组件

```
packages/ui-cli/
├── src/
│   ├── renderer/
│   │   ├── TerminalRenderer.ts    # 终端渲染器
│   │   ├── TileRenderer.ts         # 瓦片渲染
│   │   └── AsciiRenderer.ts        # ASCII 字符渲染
│   ├── ui/
│   │   ├── Screen.ts               # 屏幕管理
│   │   ├── Panel.ts                # 面板基类
│   │   ├── MapPanel.ts             # 地图面板
│   │   ├── StatusPanel.ts          # 状态面板
│   │   ├── MessagePanel.ts         # 消息面板
│   │   └── DebugPanel.ts           # 调试面板
│   ├── input/
│   │   ├── InputHandler.ts         # 输入处理
│   │   ├── KeyMapper.ts            # 按键映射
│   │   └── ActionDispatcher.ts     # 动作分发
│   ├── game/
│   │   ├── Game.ts                 # 游戏主类
│   │   ├── GameLoop.ts             # 游戏循环
│   │   └── GameState.ts            # 游戏状态
│   └── index.ts
└── package.json
```

### 2. 屏幕布局

```
┌────────────────────────────────────────────────────────┐
│  STATUS PANEL (顶部 4 行)                              │
│  HP │ STR │ DEX │ INT │ PER │ Stamina │ Effects       │
├────────────────────────────────────────────────────────┤
│                                                        │
│                                                        │
│                                                        │
│              MAP PANEL (主区域)                         │
│                                                        │
│                                                        │
│                                                        │
├────────────────────────────────────────────────────────┤
│  MESSAGE PANEL (底部 8 行)                             │
│  > 你听到了奇怪的声音...                               │
│  > 你感到饥饿。                                        │
├────────────────────────────────────────────────────────┤
│  LOCATION │ MINIMAP │ MONINFO │ Debug info            │
└────────────────────────────────────────────────────────┘
```

## 核心实现

### 1. TerminalRenderer (终端渲染器)

```typescript
// packages/ui-cli/src/renderer/TerminalRenderer.ts

export interface RenderOptions {
  readonly width: number;
  readonly height: number;
  readonly fullscreen: boolean;
}

export class TerminalRenderer {
  private screen: any;
  private program: any;

  constructor(options: RenderOptions) {
    // 使用 blessed 创建屏幕
    const blessed = require('blessed');
    this.program = blessed.program();
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Cataclysm-DDA TypeScript',
      fullscreen: options.fullscreen,
    });

    // 键盘输入
    this.screen.key(['escape', 'q', 'C-c'], () => {
      return process.exit(0);
    });
  }

  // 渲染单个瓦片
  renderTile(
    x: number,
    y: number,
    tile: MapTile,
    visible: boolean,
    remembered: boolean
  ): void {
    const char = this.getTileChar(tile, visible, remembered);
    const color = this.getTileColor(tile, visible, remembered);

    const box = blessed.box({
      top: y,
      left: x,
      width: 1,
      height: 1,
      content: char,
      style: {
        fg: color,
        bg: remembered ? 'gray' : 'black',
      },
    });

    this.screen.append(box);
  }

  // 获取瓦片字符
  private getTileChar(tile: MapTile, visible: boolean, remembered: boolean): string {
    if (!visible && !remembered) {
      return ' ';
    }

    // 根据地形、家具获取字符
    const terrain = TerrainData.get(tile.terrain);
    if (tile.furniture !== 0) {
      const furniture = FurnitureData.get(tile.furniture);
      return furniture.symbol;
    }

    return terrain.symbol;
  }

  // 获取瓦片颜色
  private getTileColor(tile: MapTile, visible: boolean, remembered: boolean): string {
    if (!visible) {
      return 'gray';
    }

    const terrain = TerrainData.get(tile.terrain);
    return terrain.color;
  }

  // 刷新屏幕
  render(): void {
    this.screen.render();
  }

  // 清除屏幕
  clear(): void {
    this.screen.destroy();
  }
}
```

### 2. MapPanel (地图面板)

```typescript
// packages/ui-cli/src/ui/MapPanel.ts

export interface MapViewConfig {
  readonly width: number;
  readonly height: number;
  readonly viewRadius: number;
}

export class MapPanel {
  private renderer: TerminalRenderer;
  private config: MapViewConfig;
  private map: GameMap | null = null;
  private playerPos: Tripoint | null = null;

  constructor(
    renderer: TerminalRenderer,
    config: MapViewConfig
  ) {
    this.renderer = renderer;
    this.config = config;
  }

  // 设置地图
  setMap(map: GameMap): MapPanel {
    return new MapPanel(this.renderer, this.config, map, this.playerPos);
  }

  // 设置玩家位置
  setPlayerPos(pos: Tripoint): MapPanel {
    return new MapPanel(this.renderer, this.config, this.map, pos);
  }

  // 渲染可见区域
  render(): void {
    if (!this.map || !this.playerPos) {
      return;
    }

    const startX = this.playerPos.x - Math.floor(this.config.width / 2);
    const startY = this.playerPos.y - Math.floor(this.config.height / 2);

    for (let dy = 0; dy < this.config.height; dy++) {
      for (let dx = 0; dx < this.config.width; dx++) {
        const worldX = startX + dx;
        const worldY = startY + dy;
        const pos = new Tripoint({ x: worldX, y: worldY, z: this.playerPos.z });

        const tile = this.map.getTile(pos);
        const visible = this.isVisible(pos);
        const remembered = this.isRemembered(pos);

        if (tile) {
          this.renderer.renderTile(dx, dy, tile, visible, remembered);
        }
      }
    }

    // 渲染玩家
    const centerX = Math.floor(this.config.width / 2);
    const centerY = Math.floor(this.config.height / 2);
    this.renderer.renderTile(centerX, centerY, {
      terrain: 0,
      furniture: 0,
      trap: 0,
      radiation: 0,
    }, true, true);
  }

  // 检查位置是否可见
  private isVisible(pos: Tripoint): boolean {
    // TODO: 实现视野计算
    return true;
  }

  // 检查位置是否被记忆
  private isRemembered(pos: Tripoint): boolean {
    // TODO: 实现地图记忆
    return false;
  }
}
```

### 3. StatusPanel (状态面板)

```typescript
// packages/ui-cli/src/ui/StatusPanel.ts

export interface StatusPanelConfig {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

export class StatusPanel {
  private renderer: TerminalRenderer;
  private config: StatusPanelConfig;
  private character: Character | null = null;
  private box: any;

  constructor(
    renderer: TerminalRenderer,
    config: StatusPanelConfig
  ) {
    this.renderer = renderer;
    this.config = config;

    const blessed = require('blessed');
    this.box = blessed.box({
      top: config.top,
      left: config.left,
      width: config.width,
      height: config.height,
      style: {
        fg: 'white',
        bg: 'blue',
      },
    });
  }

  // 设置角色
  setCharacter(character: Character): StatusPanel {
    return new StatusPanel(this.renderer, this.config, character);
  }

  // 渲染状态
  render(): void {
    if (!this.character) {
      return;
    }

    const content = this.formatStatus();
    this.box.setContent(content);
    this.renderer.screen.append(this.box);
  }

  // 格式化状态文本
  private formatStatus(): string {
    const char = this.character!;

    const stats = [
      `STR: ${char.getStrength()}`,
      `DEX: ${this.character!.stats.dexterity}`,
      `INT: ${this.character!.stats.intelligence}`,
      `PER: ${this.character!.stats.perception}`,
    ].join(' │ ');

    const hp = this.formatHP();
    const stamina = `Stamina: ${char.stamina}/${char.staminaMax}`;
    const effects = this.formatEffects();

    return `${hp}\n${stats}\n${stamina}\n${effects}`;
  }

  // 格式化 HP
  private formatHP(): string {
    const char = this.character!;
    const parts = [
      { name: 'Head', hp: char.getHP(BodyPart.HEAD), max: char.getHPMax(BodyPart.HEAD) },
      { name: 'Torso', hp: char.getHP(BodyPart.TORSO), max: char.getHPMax(BodyPart.TORSO) },
      { name: 'L.Arm', hp: char.getHP(BodyPart.ARM_L), max: char.getHPMax(BodyPart.ARM_L) },
      { name: 'R.Arm', hp: char.getHP(BodyPart.ARM_R), max: char.getHPMax(BodyPart.ARM_R) },
      { name: 'L.Leg', hp: char.getHP(BodyPart.LEG_L), max: char.getHPMax(BodyPart.LEG_L) },
      { name: 'R.Leg', hp: char.getHP(BodyPart.LEG_R), max: char.getHPMax(BodyPart.LEG_R) },
    ];

    return parts
      .map(p => {
        const percentage = (p.hp / p.max) * 100;
        const color = this.getHPColor(percentage);
        const bar = this.createHPBar(percentage);
        return `${p.name}: ${p.hp}/${p.max} ${bar}`;
      })
      .join(' │ ');
  }

  // 创建 HP 条
  private createHPBar(percentage: number): string {
    const filled = Math.floor(percentage / 10);
    const empty = 10 - filled;
    return `[${'#'.repeat(filled)}${'.'.repeat(empty)}]`;
  }

  // 获取 HP 颜色
  private getHPColor(percentage: number): string {
    if (percentage > 75) return 'green';
    if (percentage > 50) return 'yellow';
    if (percentage > 25) return 'orange';
    return 'red';
  }

  // 格式化效果
  private formatEffects(): string {
    const char = this.character!;
    if (char.effects.size === 0) {
      return 'Effects: None';
    }

    const effectNames = char.effects
      .map(e => e.name)
      .join(', ');

    return `Effects: ${effectNames}`;
  }
}
```

### 4. InputHandler (输入处理)

```typescript
// packages/ui-cli/src/input/InputHandler.ts

export enum Action {
  MOVE_N = 'move_n',
  MOVE_NE = 'move_ne',
  MOVE_E = 'move_e',
  MOVE_SE = 'move_se',
  MOVE_S = 'move_s',
  MOVE_SW = 'move_sw',
  MOVE_W = 'move_w',
  MOVE_NW = 'move_nw',
  WAIT = 'wait',
  PICKUP = 'pickup',
  OPEN = 'open',
  CLOSE = 'close',
  DEBUG = 'debug',
}

export interface KeyBinding {
  readonly key: string;
  readonly action: Action;
  readonly description: string;
}

export class InputHandler {
  private bindings: Map<string, Action>;
  private screen: any;

  constructor(screen: any) {
    this.screen = screen;
    this.bindings = this.createDefaultBindings();
    this.setupInput();
  }

  // 创建默认按键绑定
  private createDefaultBindings(): Map<string, Action> {
    return new Map([
      ['k', Action.MOVE_N],
      ['y', Action.MOVE_NE], // numpad 7/8/9
      ['l', Action.MOVE_E],
      ['n', Action.MOVE_SE], // numpad 1/2/3
      ['j', Action.MOVE_S],
      ['b', Action.MOVE_SW], // numpad 1/2/3
      ['h', Action.MOVE_W],
      ['u', Action.MOVE_NW], // numpad 7/8/9
      ['.', Action.WAIT],
      [',', Action.PICKUP],
      ['o', Action.OPEN],
      ['c', Action.CLOSE],
      ['F1', Action.DEBUG],
    ]);
  }

  // 设置输入监听
  private setupInput(): void {
    this.screen.key(['k', 'y', 'l', 'n', 'j', 'b', 'h', 'u', '.', ',', 'o', 'c', 'F1'], (ch: string) => {
      const action = this.bindings.get(ch);
      if (action) {
        this.dispatchAction(action);
      }
    });
  }

  // 分发动作
  private dispatchAction(action: Action): void {
    // 触发动作事件
    events.emit('action', action);
  }
}
```

### 5. GameLoop (游戏循环)

```typescript
// packages/ui-cli/src/game/GameLoop.ts

export class GameLoop {
  private running: boolean = false;
  private game: Game;
  private renderer: TerminalRenderer;
  private mapPanel: MapPanel;
  private statusPanel: StatusPanel;
  private messagePanel: MessagePanel;

  constructor(
    game: Game,
    renderer: TerminalRenderer
  ) {
    this.game = game;
    this.renderer = renderer;

    // 创建 UI 面板
    this.mapPanel = new MapPanel(renderer, {
      width: 80,
      height: 24,
      viewRadius: 40,
    });

    this.statusPanel = new StatusPanel(renderer, {
      top: 0,
      left: 0,
      width: 80,
      height: 4,
    });

    this.messagePanel = new MessagePanel(renderer, {
      top: 28,
      left: 0,
      width: 80,
      height: 8,
    });
  }

  // 启动游戏循环
  start(): void {
    this.running = true;
    this.loop();
  }

  // 停止游戏循环
  stop(): void {
    this.running = false;
  }

  // 主循环
  private async loop(): Promise<void> {
    while (this.running) {
      // 1. 处理输入
      await this.handleInput();

      // 2. 更新游戏状态
      this.game = this.game.processTurn();

      // 3. 渲染
      this.render();

      // 4. 控制帧率
      await this.sleep(1000 / 60);
    }
  }

  // 处理输入
  private async handleInput(): Promise<void> {
    return new Promise((resolve) => {
      const handler = (action: Action) => {
        this.game = this.executeAction(action);
        events.removeListener('action', handler);
        resolve();
      };

      events.on('action', handler);
    });
  }

  // 执行动作
  private executeAction(action: Action): Game {
    switch (action) {
      case Action.MOVE_N:
        return this.game.movePlayer(0, -1);
      case Action.MOVE_S:
        return this.game.movePlayer(0, 1);
      case Action.WAIT:
        return this.game.wait();
      // ... 其他动作
      default:
        return this.game;
    }
  }

  // 渲染
  private render(): void {
    this.mapPanel.setMap(this.game.map);
    this.mapPanel.setPlayerPos(this.game.player.pos);
    this.mapPanel.render();

    this.statusPanel.setCharacter(this.game.player);
    this.statusPanel.render();

    this.messagePanel.setMessages(this.game.messages);
    this.messagePanel.render();

    this.renderer.render();
  }

  // 延迟
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## 字符和颜色映射

### 地形符号映射

```typescript
const TERRAIN_SYMBOLS: Record<number, string> = {
  // 地板
  FLOOR_CONCRETE: '.',
  FLOOR_WOOD: '.',
  FLOOR_CARPET: '.',

  // 墙
  WALL_CONCRETE: '|',
  WALL_BRICK: '#',
  WALL_GLASS: '=',

  // 门
  DOOR: '+',
  DOOR_OPEN: "'",

  // 自然
  GRASS: '"',
  TREE: '♣',
  WATER: '~',

  // 道路
  ROAD: ':',
  SIDEWALK: '.',

  // 其他
  STAIRS: '>',
  STAIRS_DOWN: '<',
};
```

### 颜色映射

```typescript
const COLORS: Record<string, string> = {
  // 基础颜色
  'gray': 'gray',
  'red': 'red',
  'green': 'green',
  'blue': 'blue',
  'yellow': 'yellow',
  'cyan': 'cyan',
  'magenta': 'magenta',
  'white': 'white',

  // 明亮变体
  'light_gray': 'bright black',
  'light_red': 'bright red',
  'light_green': 'bright green',
  'light_blue': 'bright blue',
  'light_yellow': 'bright yellow',
  'light_cyan': 'bright cyan',
  'light_magenta': 'bright magenta',
};
```

## 使用示例

### 启动游戏

```typescript
// packages/ui-cli/src/index.ts

import { Game } from './game/Game';
import { TerminalRenderer } from './renderer/TerminalRenderer';
import { GameLoop } from './game/GameLoop';

async function main() {
  // 创建渲染器
  const renderer = new TerminalRenderer({
    width: 80,
    height: 30,
    fullscreen: true,
  });

  // 创建游戏
  const game = await Game.create();

  // 创建游戏循环
  const loop = new GameLoop(game, renderer);

  // 启动
  loop.start();
}

main().catch(console.error);
```

## 性能优化

### 1. 增量渲染

只更新变化的瓦片：

```typescript
class MapPanel {
  private lastRender: Map<string, MapTile> = new Map();

  render(): void {
    const currentTiles = this.getCurrentTiles();

    for (const [key, tile] of currentTiles) {
      const lastTile = this.lastRender.get(key);
      if (!lastTile || !tile.equals(lastTile)) {
        this.renderer.renderTile(...);
      }
    }

    this.lastRender = currentTiles;
  }
}
```

### 2. 视野裁剪

只渲染可见区域：

```typescript
class MapPanel {
  getVisibleTiles(): MapTile[] {
    const tiles: MapTile[] = [];
    const radius = this.config.viewRadius;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          tiles.push(this.getTileAt(dx, dy));
        }
      }
    }

    return tiles;
  }
}
```

## 未来扩展

### 1. 支持 Unicode

```typescript
// 使用 Unicode 字符增强视觉效果
const UNICODE_SYMBOLS = {
  TREE: '🌲',
  WATER: '🌊',
  FIRE: '🔥',
  ZOMBIE: '🧟',
  PLAYER: '🙂',
};
```

### 2. 颜色主题

```typescript
interface ColorTheme {
  readonly background: string;
  readonly foreground: string;
  readonly highlight: string;
  readonly danger: string;
  readonly success: string;
}

const THEMES = {
  DEFAULT: {
    background: 'black',
    foreground: 'white',
    highlight: 'cyan',
    danger: 'red',
    success: 'green',
  },
  SEPIA: {
    background: '#3b2c1f',
    foreground: '#f5e6d3',
    highlight: '#8b7355',
    danger: '#b85c38',
    success: '#6b8e23',
  },
};
```

### 3. 鼠标支持

```typescript
screen.on('click', (data) => {
  const { x, y } = data;
  const action = determineActionFromClick(x, y);
  game.executeAction(action);
});
```
