# Debug 工具面板设计文档

## 概述

Debug 工具面板为开发者提供游戏内部状态的实时监控和调试功能，是测试驱动开发的重要组成部分。

## 设计目标

1. **实时监控**: 显示游戏关键指标
2. **交互式调试**: 允许修改游戏状态
3. **性能分析**: 监控内存和 CPU 使用
4. **数据检查**: 查看内部数据结构
5. **日志系统**: 记录游戏事件

## 架构设计

### 1. 核心组件

```
packages/core/src/debug/
├── DebugPanel.ts           # 调试面板主类
├── metrics/
│   ├── MetricsCollector.ts # 指标收集器
│   ├── PerformanceMonitor.ts   # 性能监控
│   └── MemoryTracker.ts        # 内存追踪
├── commands/
│   ├── DebugCommand.ts     # 调试命令基类
│   ├── CommandRegistry.ts  # 命令注册表
│   └── builtins/
│       ├── TeleportCommand.ts
│       ├── SpawnCommand.ts
│       ├── SetTerrainCommand.ts
│       └── TimeCommand.ts
├── logger/
│   ├── Logger.ts           # 日志记录器
│   └── LogEntry.ts         # 日志条目
└── DebugState.ts           # 调试状态
```

### 2. UI 布局（CLI 版本）

```
┌──────────────────────────────────────────────────────────────┐
│  🔧 DEBUG PANEL [F1]                                         │
├──────────────────────────────────────────────────────────────┤
│  Metrics (Tab 1) │ Commands (Tab 2) │ Logs (Tab 3)           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  PERFORMANCE                                                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ FPS: 60 │ Frame Time: 16.7ms │ Turn: 12345             │ │
│  │ Memory: 45.2 MB │ Submaps: 121 │ Entities: 34          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  PLAYER STATUS                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Pos: (50, 60, 0) │ HP: 100% │ Stamina: 850/1000       │ │
│  │ Speed: 100 │ Move Cost: 100 │ Vision: 40              │ │
│  │ Effects: [none]                                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  MAP INFO                                                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Loaded Submaps: 121/2541                                │ │
│  │ Current Terrain: t_grass                                │ │
│  │ Visibility: 40 tiles                                    │ │
│  │ Light Level: 20                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  COMMANDS [:help for help]                                   │
│  > :teleport 100 100 0                                       │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## 核心实现

### 1. DebugPanel (调试面板主类)

```typescript
// packages/core/src/debug/DebugPanel.ts

export interface DebugPanelConfig {
  readonly enabled: boolean;
  readonly hotkey: string;
  readonly logLevel: LogLevel;
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export enum DebugTab {
  METRICS = 'metrics',
  COMMANDS = 'commands',
  LOGS = 'logs',
  INSPECTOR = 'inspector',
}

export class DebugPanel {
  private config: DebugPanelConfig;
  private currentTab: DebugTab = DebugTab.METRICS;
  private metricsCollector: MetricsCollector;
  private commandRegistry: CommandRegistry;
  private logger: Logger;
  private visible: boolean = false;

  // 当前选中的实体（用于检查器）
  private selectedEntity: string | null = null;

  constructor(config: DebugPanelConfig) {
    this.config = config;
    this.metricsCollector = new MetricsCollector();
    this.commandRegistry = new CommandRegistry();
    this.logger = new Logger(config.logLevel);
    this.registerBuiltinCommands();
  }

  // 切换可见性
  toggle(): DebugPanel {
    return new DebugPanel({
      ...this.config,
      ...this,
      visible: !this.visible,
    });
  }

  // 切换标签页
  switchTab(tab: DebugTab): DebugPanel {
    return new DebugPanel({
      ...this.config,
      ...this,
      currentTab: tab,
    });
  }

  // 更新指标
  updateMetrics(game: Game): DebugPanel {
    this.metricsCollector.collect(game);
    return this;
  }

  // 执行命令
  executeCommand(command: string): DebugPanel {
    const result = this.commandRegistry.execute(command);
    this.logger.info(`> ${command}`);
    if (result.success) {
      this.logger.info(result.message);
    } else {
      this.logger.error(result.message);
    }
    return this;
  }

  // 渲染面板
  render(renderer: TerminalRenderer): void {
    if (!this.visible) {
      return;
    }

    this.renderBorder(renderer);
    this.renderTabIndicator(renderer);

    switch (this.currentTab) {
      case DebugTab.METRICS:
        this.renderMetricsTab(renderer);
        break;
      case DebugTab.COMMANDS:
        this.renderCommandsTab(renderer);
        break;
      case DebugTab.LOGS:
        this.renderLogsTab(renderer);
        break;
      case DebugTab.INSPECTOR:
        this.renderInspectorTab(renderer);
        break;
    }
  }

  // 渲染指标标签页
  private renderMetricsTab(renderer: TerminalRenderer): void {
    const metrics = this.metricsCollector.getMetrics();

    // 性能指标
    renderer.renderBox(2, 5, 76, 3, 'PERFORMANCE');
    renderer.renderText(
      4, 6,
      `FPS: ${metrics.fps} │ Frame Time: ${metrics.frameTime}ms │ ` +
      `Turn: ${metrics.turn}`
    );
    renderer.renderText(
      4, 7,
      `Memory: ${this.formatBytes(metrics.memory)} │ ` +
      `Submaps: ${metrics.loadedSubmaps} │ ` +
      `Entities: ${metrics.entityCount}`
    );

    // 玩家状态
    renderer.renderBox(2, 9, 76, 5, 'PLAYER STATUS');
    const player = metrics.playerStats;
    renderer.renderText(4, 10, `Pos: ${player.pos.toString()} │ ` +
      `HP: ${player.hpPercent}% │ Stamina: ${player.stamina}/${player.staminaMax}`);
    renderer.renderText(4, 11, `Speed: ${player.speed} │ ` +
      `Move Cost: ${player.moveCost} │ Vision: ${player.vision}`);
    renderer.renderText(4, 12, `Effects: ${player.effects.join(', ') || 'none'}`);

    // 地图信息
    renderer.renderBox(2, 15, 76, 5, 'MAP INFO');
    renderer.renderText(4, 16, `Loaded Submaps: ${metrics.mapInfo.loadedSubmaps}/${metrics.mapInfo.totalSubmaps}`);
    renderer.renderText(4, 17, `Current Terrain: ${metrics.mapInfo.currentTerrain}`);
    renderer.renderText(4, 18, `Visibility: ${metrics.mapInfo.visibility} tiles`);
    renderer.renderText(4, 19, `Light Level: ${metrics.mapInfo.lightLevel}`);
  }

  // 渲染命令标签页
  private renderCommandsTab(renderer: TerminalRenderer): void {
    renderer.renderBox(2, 5, 76, 18, 'COMMANDS [:help for help]');

    // 命令历史
    const history = this.commandRegistry.getHistory();
    history.slice(-10).forEach((cmd, i) => {
      renderer.renderText(4, 6 + i, `> ${cmd}`);
    });

    // 当前输入
    renderer.renderText(4, 22, '> ');
    renderer.renderCursor(6, 22);
  }

  // 渲染日志标签页
  private renderLogsTab(renderer: TerminalRenderer): void {
    renderer.renderBox(2, 5, 76, 18, 'LOGS');

    const logs = this.logger.getLogs();
    logs.slice(-16).forEach((entry, i) => {
      const color = this.getLogLevelColor(entry.level);
      renderer.renderText(4, 6 + i, `[${entry.timestamp}] ${entry.message}`, color);
    });
  }

  // 渲染检查器标签页
  private renderInspectorTab(renderer: TerminalRenderer): void {
    renderer.renderBox(2, 5, 76, 18, 'INSPECTOR');

    if (!this.selectedEntity) {
      renderer.renderText(4, 6, 'No entity selected. Click on a tile to inspect.');
      return;
    }

    // 显示选中实体的详细信息
    const entity = this.getEntity(this.selectedEntity);
    if (entity) {
      this.renderEntityDetails(renderer, entity, 4, 6);
    }
  }

  // 格式化字节数
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // 获取日志级别颜色
  private getLogLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return 'gray';
      case LogLevel.INFO: return 'white';
      case LogLevel.WARN: return 'yellow';
      case LogLevel.ERROR: return 'red';
    }
  }

  // 注册内置命令
  private registerBuiltinCommands(): void {
    this.commandRegistry.register(new TeleportCommand());
    this.commandRegistry.register(new SpawnCommand());
    this.commandRegistry.register(new SetTerrainCommand());
    this.commandRegistry.register(new TimeCommand());
    this.commandRegistry.register(new HelpCommand(this.commandRegistry));
    this.commandRegistry.register(new ReloadCommand());
    this.commandRegistry.register(new ClearCommand());
  }
}
```

### 2. MetricsCollector (指标收集器)

```typescript
// packages/core/src/debug/metrics/MetricsCollector.ts

export interface PerformanceMetrics {
  readonly fps: number;
  readonly frameTime: number;
  readonly turn: number;
  readonly memory: number;
  readonly loadedSubmaps: number;
  readonly entityCount: number;
}

export interface PlayerStats {
  readonly pos: Tripoint;
  readonly hpPercent: number;
  readonly stamina: number;
  readonly staminaMax: number;
  readonly speed: number;
  readonly moveCost: number;
  readonly vision: number;
  readonly effects: string[];
}

export interface MapInfo {
  readonly loadedSubmaps: number;
  readonly totalSubmaps: number;
  readonly currentTerrain: string;
  readonly visibility: number;
  readonly lightLevel: number;
}

export interface Metrics {
  readonly performance: PerformanceMetrics;
  readonly playerStats: PlayerStats;
  readonly mapInfo: MapInfo;
}

export class MetricsCollector {
  private lastUpdateTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private currentMetrics: Metrics | null = null;

  // 收集游戏指标
  collect(game: Game): void {
    const now = performance.now();
    this.frameCount++;

    // 每秒更新一次 FPS
    if (now - this.lastUpdateTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastUpdateTime = now;
    }

    this.currentMetrics = {
      performance: this.collectPerformance(game),
      playerStats: this.collectPlayerStats(game),
      mapInfo: this.collectMapInfo(game),
    };
  }

  // 获取指标
  getMetrics(): Metrics {
    return this.currentMetrics || this.getEmptyMetrics();
  }

  // 收集性能指标
  private collectPerformance(game: Game): PerformanceMetrics {
    return {
      fps: this.fps,
      frameTime: 1000 / this.fps,
      turn: game.turn,
      memory: game.map.getMemoryUsage(),
      loadedSubmaps: game.map.getLoadedSubmapCount(),
      entityCount: game.entities.size,
    };
  }

  // 收集玩家状态
  private collectPlayerStats(game: Game): PlayerStats {
    const player = game.player;
    return {
      pos: player.pos,
      hpPercent: this.calculateHPPercent(player),
      stamina: player.stamina,
      staminaMax: player.staminaMax,
      speed: player.getSpeed(),
      moveCost: player.getMoveCost(),
      vision: player.getVision(),
      effects: player.effects.map(e => e.name).toArray(),
    };
  }

  // 收集地图信息
  private collectMapInfo(game: Game): MapInfo {
    const map = game.map;
    const playerPos = game.player.pos;
    const tile = map.getTile(playerPos);

    return {
      loadedSubmaps: map.getLoadedSubmapCount(),
      totalSubmaps: MAPSIZE * MAPSIZE * OVERMAP_LAYERS,
      currentTerrain: tile ? TerrainData.get(tile.terrain).id : 'null',
      visibility: game.calculateVisibility(playerPos),
      lightLevel: game.getLightLevel(playerPos),
    };
  }

  // 计算 HP 百分比
  private calculateHPPercent(player: Character): number {
    let totalHP = 0;
    let totalMaxHP = 0;

    for (const [_, part] of player.bodyParts) {
      totalHP += part.hp;
      totalMaxHP += part.hpMax;
    }

    return totalMaxHP > 0 ? Math.floor((totalHP / totalMaxHP) * 100) : 0;
  }

  // 获取空指标
  private getEmptyMetrics(): Metrics {
    return {
      performance: {
        fps: 0,
        frameTime: 0,
        turn: 0,
        memory: 0,
        loadedSubmaps: 0,
        entityCount: 0,
      },
      playerStats: {
        pos: new Tripoint({ x: 0, y: 0, z: 0 }),
        hpPercent: 0,
        stamina: 0,
        staminaMax: 0,
        speed: 0,
        moveCost: 0,
        vision: 0,
        effects: [],
      },
      mapInfo: {
        loadedSubmaps: 0,
        totalSubmaps: 0,
        currentTerrain: 'null',
        visibility: 0,
        lightLevel: 0,
      },
    };
  }
}
```

### 3. DebugCommand (调试命令)

```typescript
// packages/core/src/debug/commands/DebugCommand.ts

export interface CommandResult {
  readonly success: boolean;
  readonly message: string;
  readonly data?: any;
}

export abstract class DebugCommand {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly usage: string;

  // 执行命令
  abstract execute(game: Game, args: string[]): CommandResult;

  // 自动补全
  autocomplete(args: string[]): string[] {
    return [];
  }

  // 验证参数
  protected validateArgs(args: string[], min: number, max: number): boolean {
    return args.length >= min && args.length <= max;
  }
}

// :teleport 命令
export class TeleportCommand extends DebugCommand {
  readonly name = 'teleport';
  readonly description = 'Teleport player to coordinates';
  readonly usage = ':teleport <x> <y> [z]';

  execute(game: Game, args: string[]): CommandResult {
    if (!this.validateArgs(args, 2, 3)) {
      return {
        success: false,
        message: `Usage: ${this.usage}`,
      };
    }

    const x = parseInt(args[0]);
    const y = parseInt(args[1]);
    const z = args.length > 2 ? parseInt(args[2]) : game.player.pos.z;

    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      return {
        success: false,
        message: 'Invalid coordinates',
      };
    }

    const newPos = new Tripoint({ x, y, z });
    const newPlayer = game.player.moveTo(newPos);

    return {
      success: true,
      message: `Teleported to (${x}, ${y}, ${z})`,
      data: { player: newPlayer },
    };
  }

  autocomplete(args: string[]): string[] {
    if (args.length < 3) {
      // 建议常用坐标
      return ['0', '100', '200', '-100'];
    }
    return [];
  }
}

// :spawn 命令
export class SpawnCommand extends DebugCommand {
  readonly name = 'spawn';
  readonly description = 'Spawn a monster or item';
  readonly usage = ':spawn <type> [count]';

  execute(game: Game, args: string[]): CommandResult {
    if (!this.validateArgs(args, 1, 2)) {
      return {
        success: false,
        message: `Usage: ${this.usage}`,
      };
    }

    const type = args[0];
    const count = args.length > 1 ? parseInt(args[1]) : 1;

    // 生成实体
    const newGame = game.spawnEntity(type, count, game.player.pos);

    return {
      success: true,
      message: `Spawned ${count}x ${type}`,
      data: { game: newGame },
    };
  }
}

// :set_terrain 命令
export class SetTerrainCommand extends DebugCommand {
  readonly name = 'set_terrain';
  readonly description = 'Set terrain at current position';
  readonly usage = ':set_terrain <terrain_id>';

  execute(game: Game, args: string[]): CommandResult {
    if (!this.validateArgs(args, 1, 1)) {
      return {
        success: false,
        message: `Usage: ${this.usage}`,
      };
    }

    const terrainId = TerrainData.getId(args[0]);
    if (terrainId === null) {
      return {
        success: false,
        message: `Unknown terrain: ${args[0]}`,
      };
    }

    const newMap = game.map.setTerrain(game.player.pos, terrainId);

    return {
      success: true,
      message: `Set terrain to ${args[0]}`,
      data: { map: newMap },
    };
  }

  autocomplete(args: string[]): string[] {
    if (args.length === 1) {
      // 返回所有地形 ID
      return TerrainData.getAllIds();
    }
    return [];
  }
}

// :time 命令
export class TimeCommand extends DebugCommand {
  readonly name = 'time';
  readonly description = 'Advance time or display current time';
  readonly usage = ':time [advance]';

  execute(game: Game, args: string[]): CommandResult {
    if (args.length === 0) {
      // 显示当前时间
      return {
        success: true,
        message: `Current time: ${game.getTimeString()}`,
      };
    }

    const advance = parseInt(args[0]);
    if (isNaN(advance)) {
      return {
        success: false,
        message: 'Invalid time advance',
      };
    }

    const newGame = game.advanceTime(advance);
    return {
      success: true,
      message: `Advanced time by ${advance} turns`,
      data: { game: newGame },
    };
  }
}
```

### 4. CommandRegistry (命令注册表)

```typescript
// packages/core/src/debug/commands/CommandRegistry.ts

export class CommandRegistry {
  private commands: Map<string, DebugCommand>;
  private history: string[];

  constructor() {
    this.commands = new Map();
    this.history = [];
  }

  // 注册命令
  register(command: DebugCommand): void {
    this.commands.set(command.name, command);
  }

  // 执行命令
  execute(commandStr: string): CommandResult {
    // 添加到历史
    this.history.push(commandStr);
    if (this.history.length > 100) {
      this.history.shift();
    }

    // 解析命令
    const match = commandStr.match(/^:(\w+)\s*(.*)$/);
    if (!match) {
      return {
        success: false,
        message: 'Invalid command format. Use :help for help.',
      };
    }

    const [, name, argsStr] = match;
    const command = this.commands.get(name);
    if (!command) {
      return {
        success: false,
        message: `Unknown command: ${name}`,
      };
    }

    const args = argsStr.trim().split(/\s+/);
    return command.execute(/* game */, args);
  }

  // 自动补全
  autocomplete(input: string): string[] {
    const match = input.match(/^:(\w+)\s*(.*)$/);
    if (!match) {
      // 补全命令名
      const prefix = input.startsWith(':') ? input.slice(1) : input;
      return Array.from(this.commands.keys())
        .filter(name => name.startsWith(prefix))
        .map(name => `:${name}`);
    }

    const [, name, argsStr] = match;
    const command = this.commands.get(name);
    if (!command) {
      return [];
    }

    // 补全参数
    const args = argsStr.trim().split(/\s+/);
    const completions = command.autocomplete(args);
    return completions.map(c => `:${name} ${argsStr} ${c}`);
  }

  // 获取命令历史
  getHistory(): string[] {
    return [...this.history];
  }

  // 获取所有命令
  getAllCommands(): DebugCommand[] {
    return Array.from(this.commands.values());
  }
}
```

### 5. Logger (日志系统)

```typescript
// packages/core/src/debug/logger/Logger.ts

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly data?: any;
}

export class Logger {
  private minLevel: LogLevel;
  private logs: LogEntry[] = [];

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  // 记录日志
  log(level: LogLevel, message: string, data?: any): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > 1000) {
      this.logs.shift();
    }

    // 输出到控制台
    console.log(`[${this.getLevelString(level)}]`, message);
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  // 获取日志
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // 清除日志
  clear(): void {
    this.logs = [];
  }

  // 获取日志级别字符串
  private getLevelString(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return 'DEBUG';
      case LogLevel.INFO: return 'INFO';
      case LogLevel.WARN: return 'WARN';
      case LogLevel.ERROR: return 'ERROR';
    }
  }
}
```

## 使用示例

### 启用调试模式

```typescript
// Game.ts

export class Game {
  private debugPanel: DebugPanel;

  constructor(config: GameConfig) {
    // ...
    this.debugPanel = new DebugPanel({
      enabled: config.debug,
      hotkey: 'F1',
      logLevel: LogLevel.INFO,
    });
  }

  // 切换调试面板
  toggleDebug(): Game {
    this.debugPanel = this.debugPanel.toggle();
    return this;
  }

  // 执行调试命令
  executeDebugCommand(command: string): Game {
    const result = this.debugPanel.executeCommand(command);
    if (result.data && result.data.game) {
      return result.data.game;
    }
    return this;
  }
}
```

### 在游戏循环中使用

```typescript
// GameLoop.ts

export class GameLoop {
  loop(): void {
    while (this.running) {
      // 更新调试指标
      this.game.debugPanel.updateMetrics(this.game);

      // 渲染
      this.render();

      // 如果调试面板可见，渲染它
      if (this.game.debugPanel.visible) {
        this.game.debugPanel.render(this.renderer);
      }
    }
  }
}
```

## 调试命令参考

| 命令 | 描述 | 用法 |
|------|------|------|
| `:help` | 显示帮助 | `:help [command]` |
| `:teleport` | 传送玩家 | `:teleport <x> <y> [z]` |
| `:spawn` | 生成实体 | `:spawn <type> [count]` |
| `:set_terrain` | 设置地形 | `:set_terrain <terrain_id>` |
| `:time` | 推进时间 | `:time [advance]` |
| `:reload` | 重新加载数据 | `:reload [type]` |
| `:clear` | 清除日志 | `:clear` |
| `:god` | 上帝模式 | `:god [on/off]` |
| `:reveal` | 显示地图 | `:reveal [radius]` |
| `:kill` | 杀死实体 | `:kill <entity_id>` |

## 性能考虑

### 1. 采样频率

不要每帧都收集指标，而是按固定间隔：

```typescript
class MetricsCollector {
  private lastSampleTime: number = 0;
  private sampleInterval: number = 1000; // 1 秒

  collect(game: Game): void {
    const now = performance.now();
    if (now - this.lastSampleTime < this.sampleInterval) {
      return;
    }

    this.lastSampleTime = now;
    // ... 收集指标
  }
}
```

### 2. 延迟计算

只在需要显示时才计算详细信息：

```typescript
class DebugPanel {
  private detailedMetrics: Metrics | null = null;

  render(renderer: TerminalRenderer): void {
    if (!this.visible) {
      return;
    }

    // 只在渲染时计算详细指标
    if (!this.detailedMetrics) {
      this.detailedMetrics = this.collectDetailedMetrics();
    }
  }
}
```

### 3. 日志限制

限制日志数量和保留时间：

```typescript
class Logger {
  private readonly MAX_LOGS = 1000;
  private readonly MAX_AGE_MS = 5 * 60 * 1000; // 5 分钟

  log(level: LogLevel, message: string): void {
    // ... 添加日志

    // 清除旧日志
    const now = Date.now();
    this.logs = this.logs.filter(entry =>
      now - new Date(entry.timestamp).getTime() < this.MAX_AGE_MS
    );
  }
}
```

## 未来扩展

### 1. 可视化性能分析器

```typescript
class PerformanceProfiler {
  startProfile(label: string): void;
  endProfile(label: string): number;
  getFlamegraph(): FlamegraphData;
}
```

### 2. 时间旅行调试

```typescript
class TimeTravelDebugger {
  private snapshots: GameSnapshot[];

  saveSnapshot(): void;
  restoreSnapshot(index: number): Game;
  getSnapshots(): GameSnapshot[];
}
```

### 3. 断点系统

```typescript
class BreakpointManager {
  setBreakpoint(condition: (game: Game) => boolean): void;
  checkBreakpoints(game: Game): boolean;
  clearBreakpoints(): void;
}
```

### 4. 脚本命令

```typescript
// 支持自定义脚本
const script = `
  for (let i = 0; i < 10; i++) {
    :spawn zombie 1
    :teleport ${i * 10} ${i * 10} 0
  }
`;
debugPanel.executeScript(script);
```
