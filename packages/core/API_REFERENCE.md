# @cataclysm-web/core - API 参考手册

## 核心 API

### Coordinates 模块

#### Point

2D 坐标点类，表示游戏世界中的平面位置。

```typescript
class Point {
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number);

  // 创建原点 (0, 0)
  static origin(): Point;

  // 创建随机点
  static random(maxX: number, maxY: number): Point;

  // 加法运算
  add(other: Point): Point;
  add(dx: number, dy: number): Point;

  // 减法运算
  subtract(other: Point): Point;

  // 乘法（缩放）
  scale(factor: number): Point;

  // 计算距离
  distanceTo(other: Point): number;

  // 曼哈顿距离
  manhattanDistanceTo(other: Point): number;

  // 获取相邻点（8方向）
  neighbors(): Point[];

  // 获取直线方向（4方向）
  cardinalNeighbors(): Point[];

  // 检查是否在范围内
  inBounds(minX: number, minY: number, maxX: number, maxY: number): boolean;

  // 转换为字符串
  toString(): string;

  // 转换为数组
  toArray(): [number, number];
}
```

#### Tripoint

3D 坐标点类，继承自 Point，添加 z 轴坐标。

```typescript
class Tripoint extends Point {
  readonly z: number;

  constructor(x: number, y: number, z: number);

  // 创建原点 (0, 0, 0)
  static origin(): Tripoint;

  // 加法运算
  add(other: Tripoint): Tripoint;
  add(dx: number, dy: number, dz: number): Tripoint;

  // 检查是否可以向下移动
  canGoDown(): boolean;

  // 检查是否可以向上移动
  canGoUp(): boolean;

  // 获取相邻点（26方向）
  neighbors(): Tripoint[];

  // 转换为字符串
  toString(): string;

  // 转换为数组
  toArray(): [number, number, number];
}
```

#### CoordinateConverter

坐标转换工具类，用于在不同坐标系统间转换。

```typescript
class CoordinateConverter {
  // 绝对坐标转换为气泡坐标
  static globalToBubble(global: Tripoint, playerPos: Tripoint): Tripoint;

  // 气泡坐标转换为绝对坐标
  static bubbleToGlobal(bubble: Tripoint, playerPos: Tripoint): Tripoint;

  // 子地图坐标转换为绝对坐标
  static submapToGlobal(submap: Tripoint): Tripoint;

  // 绝对坐标转换为子地图坐标
  static globalToSubmap(global: Tripoint): Tripoint;

  // 局部坐标转换为子地图坐标
  static localToSubmap(local: Point): Point;
}
```

### Terrain 模块

#### Terrain

地形类，表示游戏地图中的单个地形类型。

```typescript
class Terrain extends Record<TerrainProps> {
  readonly id: TerrainId;
  readonly name: string;
  readonly symbol: string;
  readonly color: NCColor;
  readonly moveCost: number;
  readonly flags: Set<TerrainFlag>;

  // 检查是否有指定标志
  hasFlag(flag: TerrainFlag): boolean;

  // 检查是否可通行
  isPassable(): boolean;

  // 检查是否透明
  isTransparent(): boolean;

  // 检查是否可燃
  isFlammable(): boolean;

  // 获取连接的家具
  getConnectedFurniture(): FurnitureId | null;
}
```

#### TerrainData

地形数据管理器，存储所有地形类型。

```typescript
class TerrainData {
  // 获取地形
  get(id: TerrainId): Terrain | null;

  // 检查是否存在
  has(id: TerrainId): boolean;

  // 获取所有地形
  getAll(): Terrain[];

  // 按标志筛选
  getByFlag(flag: TerrainFlag): Terrain[];

  // 加载 JSON 数据
  loadFromJson(data: JsonObject[]): void;
}
```

#### TerrainLoader

地形加载器，从 JSON 文件加载地形数据。

```typescript
class TerrainLoader {
  // 加载单个地形对象
  static parseObject(json: JsonObject): Terrain;

  // 从文件加载
  static async loadFromFile(filePath: string): Promise<Map<TerrainId, Terrain>>;

  // 从目录加载
  static async loadFromDirectory(dirPath: string): Promise<Map<TerrainId, Terrain>>;
}
```

### Furniture 模块

#### Furniture

家具类，表示可放置在地图上的家具对象。

```typescript
class Furniture extends Record<FurnitureProps> {
  readonly id: FurnitureId;
  readonly name: string;
  readonly symbol: string;
  readonly color: NCColor;
  readonly moveCostMod: number;
  readonly flags: Set<FurnitureFlag>;

  // 检查是否有指定标志
  hasFlag(flag: FurnitureFlag): boolean;

  // 检查是否为工作台
  isWorkbench(): boolean;

  // 获取工作台加成
  getWorkbenchBonus(skill: SkillId): number;

  // 检查是否可燃
  isFlammable(): boolean;
}
```

#### FurnitureData

家具数据管理器。

```typescript
class FurnitureData {
  // 获取家具
  get(id: FurnitureId): Furniture | null;

  // 检查是否存在
  has(id: FurnitureId): boolean;

  // 获取所有家具
  getAll(): Furniture[];

  // 按标志筛选
  getByFlag(flag: FurnitureFlag): Furniture[];

  // 加载 JSON 数据
  loadFromJson(data: JsonObject[]): void;
}
```

### Field 模块

#### FieldEntry

场实例，表示地图上特定位置的场效果。

```typescript
class FieldEntry {
  readonly type: FieldTypeId;
  readonly intensity: number;
  readonly age: TimeDuration;
  readonly isAlive: boolean;

  // 获取场类型
  getFieldType(): FieldType;

  // 检查是否已死亡
  isDead(): boolean;

  // 更新场（年龄增长）
  update(delta: TimeDuration): FieldEntry;

  // 获取伤害
  getDamage(): DamageInstance;
}
```

#### FieldType

场类型定义。

```typescript
class FieldType {
  readonly id: FieldTypeId;
  readonly name: string;
  readonly symbol: string;
  readonly color: NCColor;
  readonly halfLife: TimeDuration;
  readonly intensityLevels: FieldIntensityLevel[];

  // 获取指定强度的等级
  getIntensityLevel(intensity: number): FieldIntensityLevel;

  // 计算衰减
  calculateDecay(intensity: number, age: TimeDuration): number;
}
```

#### FieldData

场数据管理器。

```typescript
class FieldData {
  // 获取场类型
  get(id: FieldTypeId): FieldType | null;

  // 检查是否存在
  has(id: FieldTypeId): boolean;

  // 获取所有场类型
  getAll(): FieldType[];

  // 加载 JSON 数据
  loadFromJson(data: JsonObject[]): void;
}
```

### Creature 模块

#### Creature

生物基类，所有可活动实体的抽象基类。

```typescript
abstract class Creature {
  readonly id: CreatureId;
  readonly pos: Tripoint;
  readonly moves: number;

  // 获取名称
  getName(): string;

  // 移动到指定位置
  moveTo(pos: Tripoint): void;

  // 造成伤害
  dealDamage(damage: DamageInstance): void;

  // 检查是否死亡
  isDead(): boolean;

  // 处理回合
  processTurn(): void;
}
```

#### Avatar

玩家角色类，继承自 Character。

```typescript
class Avatar extends Character {
  readonly activeMissions: Mission[];
  readonly itemsIdentified: Set<ItemTypeId>;
  readonly playerMapMemory: MapMemory;

  // 添加任务
  addMission(mission: Mission): void;

  // 完成任务
  completeMission(mission: Mission): void;

  // 识别物品
  identifyItem(itemId: ItemTypeId): void;

  // 记忆地形
  memorizeTerrain(pos: Tripoint, terrain: Terrain): void;
}
```

#### NPC

非玩家角色类，继承自 Character。

```typescript
class NPC extends Character {
  readonly attitude: NPCAttitude;
  readonly personality: NPCPersonality;
  readonly opinionOfPlayer: NPCOpinion;

  // 设置态度
  setAttitude(attitude: NPCAttitude): void;

  // 更新意见
  updateOpinion(player: Avatar, change: NPCOpinion): void;

  // 执行 AI
  executeAI(): void;
}
```

### Map 模块

#### GameMap

游戏地图类，管理 11x11 的子地图网格。

```typescript
class GameMap {
  readonly size: Point;

  // 获取指定位置的瓦片
  getTile(pos: Tripoint): MapTile;

  // 设置瓦片
  setTile(pos: Tripoint, tile: MapTile): GameMap;

  // 获取地形
  getTerrain(pos: Tripoint): Terrain;

  // 设置地形
  setTerrain(pos: Tripoint, terrain: Terrain): GameMap;

  // 获取家具
  getFurniture(pos: Tripoint): Furniture | null;

  // 设置家具
  setFurniture(pos: Tripoint, furniture: Furniture | null): GameMap;

  // 获取场
  getField(pos: Tripoint): FieldEntry | null;

  // 添加场
  addField(pos: Tripoint, field: FieldEntry): GameMap;

  // 移除场
  removeField(pos: Tripoint): GameMap;

  // 检查是否可见
  isVisible(pos: Tripoint): boolean;

  // 检查是否透明
  isTransparent(pos: Tripoint): boolean;

  // 检查是否可通行
  isPassable(pos: Tripoint): boolean;
}
```

#### Submap

子地图类，12x12 的瓦片网格。

```typescript
class Submap {
  readonly size: Point;
  readonly position: Tripoint;

  // 是否为空白子地图
  isUniform(): boolean;

  // 确保非空白
  ensureNonUniform(): void;

  // 获取瓦片
  getTile(pos: Point): MapTile;

  // 设置瓦片
  setTile(pos: Point, tile: MapTile): void;
}
```

#### MapTile

地图瓦片类，表示地图上的单个位置。

```typescript
class MapTile {
  readonly terrain: Terrain;
  readonly furniture: Furniture | null;
  readonly field: FieldEntry | null;
  readonly trap: Trap | null;
  readonly items: Item[];

  // 检查是否可通行
  isPassable(): boolean;

  // 检查是否透明
  isTransparent(): boolean;

  // 获取移动消耗
  getMoveCost(): number;
}
```

### MapGen 模块

#### CataclysmMapGenGenerator

地图生成器，从 JSON 定义生成地图。

```typescript
class CataclysmMapGenGenerator {
  // 生成地图
  generate(
    definition: MapGenDefinition,
    paletteResolver: PaletteResolver
  ): GeneratedSubmap[];

  // 生成单个子地图
  generateSubmap(
    definition: MapGenDefinition,
    offset: Point
  ): GeneratedSubmap;
}
```

#### PaletteResolver

调色板解析器，解析地图生成调色板。

```typescript
class PaletteResolver {
  // 解析调色板
  resolve(paletteId: string): Palette;

  // 获取字符对应的地图对象
  getCharMapping(char: string): MapCharMapping;

  // 加载调色板
  loadPalette(palette: JsonObject): void;
}
```

### Game 模块

#### GameState

游戏状态类，存储所有游戏状态数据。

```typescript
class GameState extends Record<GameStateProps> {
  readonly player: Avatar;
  readonly map: GameMap;
  readonly turn: number;
  readonly messages: GameMessage[];

  // 处理玩家动作
  processAction(action: GameAction): GameState;

  // 添加消息
  addMessage(message: string): GameState;

  // 检查游戏是否结束
  isGameOver(): boolean;
}
```

#### GameLoop

游戏循环类，管理游戏的主循环。

```typescript
class GameLoop {
  readonly state: GameState;
  readonly fps: number;

  // 开始游戏循环
  start(): void;

  // 停止游戏循环
  stop(): void;

  // 处理输入
  handleInput(input: InputEvent): void;

  // 更新游戏状态
  update(): void;

  // 渲染
  render(): void;
}
```

### Config 模块

#### CddaConfig

Cataclysm-DDA 配置管理器。

```typescript
class CddaConfig {
  readonly json: string;
  readonly mapgen: string;
  readonly mapgenPalettes: string;
  readonly furnitureAndTerrain: string;
  readonly npcs: string;
  readonly traps: string;

  // 从文件加载配置
  static async loadFromFile(filePath: string): Promise<CddaConfig>;

  // 获取默认配置
  static getDefault(): CddaConfig;

  // 验证配置
  validate(): boolean;
}
```

## 类型定义

### 基础类型

```typescript
// 地形 ID
export type TerrainId = string & { readonly __brand: unique symbol };

// 家具 ID
export type FurnitureId = string & { readonly __brand: unique symbol };

// 场类型 ID
export type FieldTypeId = string & { readonly __brand: unique symbol };

// 陷阱 ID
export type TrapId = string & { readonly __brand: unique symbol };

// 生物 ID
export type CreatureId = string & { readonly __brand: unique symbol };

// NPC 类 ID
export type NPCClassId = string & { readonly __brand: unique symbol };

// 技能 ID
export type SkillId = string & { readonly __brand: unique symbol };
```

### 枚举类型

```typescript
// 地形标志
export enum TerrainFlag {
  FLAMMABLE = 'FLAMMABLE',
  DIGGABLE = 'DIGGABLE',
  TRANSPARENT = 'TRANSPARENT',
  PASSABLE = 'PASSABLE',
  // ...
}

// 家具标志
export enum FurnitureFlag {
  WORKBENCH = 'WORKBENCH',
  FLAMMABLE = 'FLAMMABLE',
  CONTAINER = 'CONTAINER',
  // ...
}

// NPC 态度
export enum NPCAttitude {
  NULL = 'NULL',
  TALK = 'TALK',
  FOLLOW = 'FOLLOW',
  KILL = 'KILL',
  // ...
}

// 游戏动作
export enum GameAction {
  Move,
  Wait,
  Attack,
  Interact,
  // ...
}
```

## 工具函数

### Math 工具

```typescript
// 计算两点之间的距离
export function distance(a: Point, b: Point): number;

// 计算曼哈顿距离
export function manhattanDistance(a: Point, b: Point): number;

// 限制数值在范围内
export function clamp(value: number, min: number, max: number): number;

// 线性插值
export function lerp(a: number, b: number, t: number): number;

// 随机数
export function random(min: number, max: number): number;
export function randomInt(min: number, max: number): number;
```

### 集合工具

```typescript
// 从数组创建映射
export function toMap<K, V>(array: V[], keyFn: (item: V) => K): Map<K, V>;

// 从数组创建集合
export function toSet<T>(array: T[]): Set<T>;

// 分组
export function groupBy<T, K>(array: T[], keyFn: (item: T) => K): Map<K, T[]>;
```

### 字符串工具

```typescript
// 格式化字符串
export function format(template: string, ...args: any[]): string;

// 首字母大写
export function capitalize(str: string): string;

// 蛇形转驼峰
export function snakeToCamel(str: string): string;

// 驼峰转蛇形
export function camelToSnake(str: string): string;
```

## 常量

### 地图常量

```typescript
// 子地图大小
export const SUBMAP_SIZE = 12;

// 地图大小（以子地图为单位）
export const MAPSIZE = 11;

// Z 轴范围
export const OVERMAP_DEPTH = 10;
export const OVERMAP_HEIGHT = 10;
export const OVERMAP_LAYERS = 21;
```

### 游戏常量

```typescript
// 默认帧率
export const DEFAULT_FPS = 60;

// 每回合移动点数
export const BASE_MOVES = 100;

// 最大消息数
export const MAX_MESSAGES = 100;
```

---

*本文档由 Claude Code 生成，基于对 @cataclysm-web/core 代码库的深入分析。*
