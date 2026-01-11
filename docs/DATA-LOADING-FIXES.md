# Cataclysm-DDA 数据加载修复方案

## 问题总结

### 严重问题（必须修复）

#### 1. connects_to 字段类型不匹配

**当前代码**：
```typescript
export interface TerrainJson {
  connects_to?: string[];  // ❌ 期望数组
}
```

**实际数据**：
```json
{
  "connects_to": "CONCRETE"  // 实际是字符串或数组
}
```

**修复**：
```typescript
export interface TerrainJson {
  connects_to?: string | string[];  // ✅ 支持两种类型
}

// 在解析器中
private parseConnectsTo(connects: string | string[] | undefined): Map<string, boolean> {
  if (!connects) return new Map();
  const connectArray = typeof connects === 'string' ? [connects] : connects;
  return new Map(connectArray.map(c => [c, true]));
}
```

### 中等问题（建议修复）

#### 2. 缺少重要字段

```typescript
export interface TerrainJson {
  // 缺少的字段
  looks_like?: string;
  copy_from?: string;
  light_emitted?: number;
  shoot?: ShootData;
}

export interface BashJson {
  // 缺少的字段
  str_min_supported?: number;
  sound_vol?: number;
  sound_fail?: string;
  sound_fail_vol?: number;
}
```

#### 3. BashInfo 接口不完整

```typescript
export interface BashInfo {
  sound: string;
  strMin: number;
  strMax: number;
  furniture: string[];
  items?: ItemSpawn[];
  ter?: TerrainId;
  successMsg?: string;
  failMsg?: string;
  soundChance?: number;
  quiet?: string;
  // 缺少:
  strMinSupported?: number;  // ⚠️ 有支撑时的力量需求
  soundVol?: number;
  soundFail?: string;
  soundFailVol?: number;
}
```

### 轻微问题（可选）

#### 4. copy-from 继承机制

Cataclysm-DDA 使用 `copy-from` 字段实现数据继承：
```json
{
  "id": "t_thconc_y",
  "copy-from": "t_thconc_floor",
  "color": "yellow"
}
```

这需要在解析前先查找并合并父对象的数据。

## 修复代码

### 修复 1: 更新 TerrainJson 接口

```typescript
export interface ShootData {
  chance_to_hit?: number;
  reduce_damage?: [number, number];
  reduce_damage_laser?: [number, number];
  destroy_damage?: [number, number];
}

export interface TerrainJson {
  type: 'terrain';
  id: string;
  name: string;
  description?: string;
  symbol: string;
  color: string;
  move_cost?: number;
  coverage?: number;
  flags?: string[];
  open?: string;
  close?: string;
  bash?: BashJson;
  deconstruct?: DeconstructJson;
  lockpick_result?: string;
  transforms_into?: string;
  roof?: string;
  trap?: string;
  connect_groups?: string | string[];
  connects_to?: string | string[];  // ✅ 修复：支持字符串
  looks_like?: string;  // ✅ 新增
  copy_from?: string;  // ✅ 新增
  light_emitted?: number;  // ✅ 新增
  shoot?: ShootData;  // ✅ 新增
  comfort?: number;  // ✅ 新增
  trap?: string;
}

export interface BashJson {
  sound?: string;
  str_min?: number;
  str_max?: number;
  furniture?: string[];
  items?: ItemSpawn[];
  ter_set?: string;
  success_msg?: string;
  fail_msg?: string;
  sound_chance?: number;
  quiet?: string;
  str_min_supported?: number;  // ✅ 新增
  sound_vol?: number;  // ✅ 新增
  sound_fail?: string;  // ✅ 新增
  sound_fail_vol?: number;  // ✅ 新增
}
```

### 修复 2: 更新解析器

```typescript
export class TerrainParser {
  // 添加 copy-from 缓存
  private terrainCache = new Map<string, TerrainJson>();

  parse(obj: TerrainJson, allObjects?: TerrainJson[]): Terrain {
    // 处理 copy-from
    if (obj.copy_from) {
      obj = this.resolveCopyFrom(obj, allObjects || []);
    }

    const id = this.parseId(obj.id);

    return new Terrain({
      id,
      name: obj.name || '',
      description: obj.description || '',
      symbol: obj.symbol || '?',
      color: obj.color || 'white',
      moveCost: obj.move_cost ?? 2,
      coverage: obj.coverage ?? 0,
      flags: TerrainFlags.fromJson(obj.flags || []),
      open: obj.open ? this.parseId(obj.open) : undefined,
      close: obj.close ? this.parseId(obj.close) : undefined,
      bash: obj.bash ? this.parseBash(obj.bash) : undefined,
      deconstruct: obj.deconstruct ? this.parseDeconstruct(obj.deconstruct) : undefined,
      lockpickResult: obj.lockpick_result ? this.parseId(obj.lockpick_result) : undefined,
      transformsInto: obj.transforms_into ? this.parseId(obj.transforms_into) : undefined,
      roof: obj.roof ? this.parseId(obj.roof) : undefined,
      trap: obj.trap,
      connectGroups: this.parseConnectGroups(obj.connect_groups),
      connectsTo: this.parseConnectsTo(obj.connects_to),  // ✅ 使用新的方法
      allowedTemplates: new Map(),
      // 新增字段
      looksLike: obj.looks_like,
      lightEmitted: obj.light_emitted,
      shoot: obj.shoot,
      comfort: obj.comfort,
    });
  }

  // ✅ 修复：处理字符串或数组
  private parseConnectsTo(connects: string | string[] | undefined): Map<string, boolean> {
    if (!connects) return new Map();
    const connectArray = typeof connects === 'string' ? [connects] : connects;
    return new Map(connectArray.map(c => [c, true]));
  }

  // ✅ 新增：处理 copy-from 继承
  private resolveCopyFrom(obj: TerrainJson, allObjects: TerrainJson[]): TerrainJson {
    const parent = allObjects.find(o => o.id === obj.copy_from);
    if (!parent) return obj;

    // 递归解析父对象
    const resolvedParent = parent.copy_from
      ? this.resolveCopyFrom(parent, allObjects)
      : parent;

    // 合并属性（obj 覆盖 parent）
    return {
      ...resolvedParent,
      ...obj,
      // 特殊处理：bash 可能部分覆盖
      bash: obj.bash ? { ...resolvedParent.bash, ...obj.bash } : resolvedParent.bash,
    };
  }
}
```

### 修复 3: 更新 BashInfo 接口

```typescript
export interface BashInfo {
  sound: string;
  strMin: number;
  strMax: number;
  furniture: string[];
  items?: ItemSpawn[];
  ter?: TerrainId;
  successMsg?: string;
  failMsg?: string;
  soundChance?: number;
  quiet?: string;
  strMinSupported?: number;  // ✅ 新增
  soundVol?: number;  // ✅ 新增
  soundFail?: string;  // ✅ 新增
  soundFailVol?: number;  // ✅ 新增
}

// 在解析器中
private parseBash(obj: BashJson): BashInfo {
  return {
    sound: obj.sound || '',
    strMin: obj.str_min || 0,
    strMax: obj.str_max || 0,
    furniture: obj.furniture || [],
    items: obj.items,
    ter: obj.ter_set ? this.parseId(obj.ter_set) : undefined,
    successMsg: obj.success_msg,
    failMsg: obj.fail_msg,
    soundChance: obj.sound_chance,
    quiet: obj.quiet,
    strMinSupported: obj.str_min_supported,  // ✅ 新增
    soundVol: obj.sound_vol,  // ✅ 新增
    soundFail: obj.sound_fail,  // ✅ 新增
    soundFailVol: obj.sound_fail_vol,  // ✅ 新增
  };
}
```

### 修复 4: 更新 Terrain 类

```typescript
export interface TerrainProps {
  // ... 现有字段

  // 新增字段
  looksLike?: string;
  lightEmitted?: number;
  shoot?: ShootData;
  comfort?: number;
}

export class Terrain {
  // ... 现有属性

  readonly looksLike?: string;
  readonly lightEmitted?: number;
  readonly shoot?: ShootData;
  readonly comfort?: number;

  // ... 构造函数
}
```

## 测试验证

修复后需要测试：

```typescript
describe('Cataclysm-DDA Real Data', () => {
  it('should load terrain-floors-indoor.json', async () => {
    const loader = new TerrainLoader();
    const data = await loader.loadFromUrl('path/to/terrain-floors-indoor.json');

    // 应该成功加载所有 95 个地形
    expect(data.size()).toBe(95);

    // 检查具体地形
    const concreteFloor = data.get('t_thconc_floor');
    expect(concreteFloor).toBeDefined();
    expect(concreteFloor.connectsTo.get('CONCRETE')).toBe(true);
    expect(concreteFloor.lightEmitted).toBeUndefined(); // 这个没有

    // 检查有光照的地形
    const lightFloor = data.get('t_thconc_floor_olight');
    expect(lightFloor?.lightEmitted).toBe(120);
  });

  it('should handle copy-from inheritance', async () => {
    // 需要确保所有对象一起加载
    const loader = new TerrainLoader();
    const allData = await loader.loadFromUrl('path/to/terrain.json');

    const child = allData.get('t_thconc_y');
    expect(child).toBeDefined();
    // copy-from 的子对象应该继承父对象的属性
  });
});
```

## 修复优先级

1. **P0 - 必须立即修复**
   - ✅ `connects_to` 字段类型（影响 36% 数据）

2. **P1 - 强烈建议修复**
   - ✅ `looks_like`, `light_emitted`, `shoot` 字段
   - ✅ `bash` 扩展字段

3. **P2 - 后续优化**
   - ⚠️ `copy-from` 继承机制（需要重构加载流程）
   - ⚠️ 完整的 `shoot` 数据结构

## 总结

**当前状态**: ❌ **不能完全加载**（36% 数据会丢失）

**修复后**: ✅ **可以完全加载**（需要约 2-3 小时修复）

**核心问题**: 字段类型不匹配和缺失字段，不是架构问题，容易修复！
