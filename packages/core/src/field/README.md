# 场系统使用指南

## 概述

场系统是 Cataclysm-DDA 的环境效果系统，用于处理火、烟雾、血迹、酸等各种临时或持久的环境效果。

## 基本使用

### 1. 加载场类型数据

```typescript
import { FieldTypeLoader } from '@cataclym-web/core';

const loader = new FieldTypeLoader();

// 从 JSON 数组加载
const fieldTypes = [
  {
    type: 'field_type',
    id: 'fd_fire',
    name: 'fire',
    intensity_levels: [
      { name: 'flames', color: 'red', symbol: '^' },
      { name: 'flames', color: 'red', symbol: '^' },
      { name: 'inferno', color: 'red', symbol: '^' },
    ],
    half_life: 1,
    phase: 'plasma',
    flags: ['FIRE', 'DANGEROUS'],
  },
];

const data = await loader.loadFromJson(fieldTypes);
console.log(`Loaded ${data.size()} field types`);
```

### 2. 创建场实例

```typescript
// 创建场实例
const fireField = data.createEntry('fd_fire', 2);

console.log(fireField.type);       // 'fd_fire'
console.log(fireField.intensity);   // 2
console.log(fireField.age);         // 0
console.log(fireField.isAlive);     // true
```

### 3. 更新场实例

```typescript
// 每回合更新
let field = fireField;

for (let turn = 0; turn < 10; turn++) {
  field = data.updateEntry(field);

  console.log(`Turn ${turn}: age=${field.age}, intensity=${field.intensity}`);
}
```

## 场类型属性

### 基础属性

```typescript
const fieldType = new FieldType({
  id: 'fd_fire',
  name: 'fire',
  description: 'Burns everything',
  intensityLevels: List([
    { name: 'small flames', color: 'red', symbol: '^' },
    { name: 'flames', color: 'red', symbol: '^' },
    { name: 'inferno', color: 'red', symbol: '^' },
  ]),
  halfLife: 1,               // 半衰期（回合）
  phase: FieldPhase.PLASMA,  // 相态
  acceleratedDecay: true,     // 加速衰减
  displayField: true,        // 是否显示
  displayPriority: 10,       // 显示优先级
});
```

### 强度等级

```typescript
// 获取强度信息
const maxIntensity = fieldType.getMaxIntensity();     // 3
const isValid = fieldType.isValidIntensity(2);          // true
const name = fieldType.getIntensityName(2);           // "flames"
const color = fieldType.getIntensityColor(2);         // "red"
const symbol = fieldType.getIntensitySymbol(2);       // "^"
```

### 衰减计算

```typescript
// 计算衰减时间
const decayTime = fieldType.calculateDecayTime();
// halfLife * maxIntensity = 1 * 3 = 3 回合

// 检查是否加速衰减
if (fieldType.shouldAccelerateDecay()) {
  // 每个半衰期降低 1 级强度
}
```

## 场实例管理

### 生命周期

```typescript
// 1. 创建
let field = data.createEntry('fd_fire', 3);

// 2. 更新
field = data.updateEntry(field);

// 3. 检查状态
if (!field.checkAlive()) {
  console.log('Field has dissipated');
}

// 4. 衰减
field = field.decayIntensity();

// 5. 增强
field = field.increaseIntensity(1, 3);

// 6. 杀死
field = field.kill();
```

### 查询方法

```typescript
// 状态检查
field.checkAlive()      // 是否存活
field.isExpired()       // 是否过期
field.isYoung(100)      // 是否年轻（< 100 回合）

// 进度
field.getAgeProgress()  // 0.0 - 1.0

// 强度操作
field.getNormalizedIntensity(3)  // 归一化强度
field.isStrongerThan(other)      // 比较强度
field.isAtMaxIntensity(3)        // 是否最大强度
```

## 游戏机制集成

### 伤害系统

```typescript
function applyFieldDamage(actor: Actor, pos: Tripoint): void {
  const field = map.getFieldAt(pos);

  if (!field || !field.checkAlive()) {
    return;
  }

  const fieldType = data.get(field.type);
  if (!fieldType?.isDangerous()) {
    return;
  }

  // 计算伤害
  const damage = fieldType.getDangerLevel() * field.intensity;
  actor.applyDamage(damage, fieldType.id);

  // 特殊效果
  if (fieldType.isAcid()) {
    actor.damageEquipment(damage);
  } else if (fieldType.isFire()) {
    actor.burn(fieldType.getLightModifier());
  }
}
```

### 视野系统

```typescript
function isPositionVisible(from: Tripoint, to: Tripoint): boolean {
  const field = map.getFieldAt(to);

  if (!field || !field.checkAlive()) {
    return true; // 没有场，透明
  }

  const fieldType = data.get(field.type);

  if (!fieldType?.isTransparent()) {
    return false; // 阻挡视线
  }

  return hasLineOfSight(from, to);
}
```

### 传播系统

```typescript
function spreadFire(pos: Tripoint): void {
  const fieldType = data.get('fd_fire');
  if (!fieldType?.canSpread()) {
    return;
  }

  // 检查传播概率
  const roll = Math.random() * 100;
  if (roll >= fieldType.fireSpreadChance) {
    return;
  }

  // 向相邻位置传播
  const neighbors = getNeighbors(pos);
  for (const neighbor of neighbors) {
    if (canIgnite(neighbor)) {
      const newField = data.createEntry('fd_fire', 1);
      map.setField(neighbor, newField);
    }
  }
}
```

### 燃烧系统

```typescript
function checkIgnition(pos: Tripoint): void {
  const field = map.getFieldAt(pos);

  if (field?.checkAlive()) {
    return; // 已经有火了
  }

  const fireType = data.get('fd_fire');
  if (!fireType) {
    return;
  }

  // 检查点燃概率
  const roll = Math.random() * 100;
  if (roll < fireType.fireIgnitionChance) {
    const newFire = data.createEntry('fd_fire', 1);
    map.setField(pos, newFire);

    showMessage('Something catches fire!');
  }
}
```

### 光照系统

```typescript
function calculateLightAt(pos: Tripoint): number {
  const field = map.getFieldAt(pos);

  if (!field || !field.checkAlive()) {
    return 0;
  }

  const fieldType = data.get(field.type);
  return fieldType?.getLightModifier() ?? 0;
}
```

### 场的叠加

```typescript
function getDisplayFieldAt(pos: Tripoint): FieldEntry | undefined {
  const fields = map.getFieldsAt(pos); // 获取所有场

  if (fields.length === 0) {
    return undefined;
  }

  if (fields.length === 1) {
    return fields[0];
  }

  // 按优先级合并
  return data.mergeEntries(fields);
}

function renderField(pos: Tripoint): DisplayInfo {
  const field = getDisplayFieldAt(pos);

  if (!field) {
    return { symbol: '.', color: 'white' };
  }

  return data.getEntryDisplayInfo(field) || { symbol: '?', color: 'white' };
}
```

### 移动影响

```typescript
function getFieldMoveCostModifier(pos: Tripoint): number {
  const field = map.getFieldAt(pos);

  if (!field || !field.checkAlive()) {
    return 0;
  }

  const fieldType = data.get(field.type);

  // 粘滞场减缓移动
  if (fieldType?.isSticky()) {
    return field.intensity * 2; // 每级强度 +2 移动消耗
  }

  // 深场减缓移动
  if (fieldType?.isLiquid()) {
    return field.intensity * 3;
  }

  return 0;
}
```

## 场的分类

### 按相态分类

```typescript
// 气体
const gasFields = data.getGasFields();
// 烟雾、毒气等

// 液体
const liquidFields = data.getLiquidFields();
// 血迹、酸、水等

// 固体
const solidFields = data.getByPhase('solid');
// 碎片、网等

// 等离子
const plasmaFields = data.getByPhase('plasma');
// 火焰

// 能量
const energyFields = data.getByPhase('energy');
// 电
```

### 按功能分类

```typescript
// 危险场
const dangerous = data.getDangerousFields();
// 火、酸、毒气等

// 发光场
const lightEmitters = data.getLightEmitters();
// 火焰、电等

// 阻挡视线的场
const blockers = data.getAll().filter(f => !f.isTransparent());

// 可传播的场
const spreaders = data.getAll().filter(f => f.canSpread());
```

## 性能优化

### 1. 批量更新

```typescript
// 更新地图上的所有场
function updateAllFields(map: GameMap): void {
  const positions = map.getAllFieldPositions();

  // 收集需要更新的场
  const updates = positions.map(pos => {
    const field = map.getFieldAt(pos);
    const updated = data.updateEntry(field);
    return { pos, field: updated };
  });

  // 批量应用更新
  updates.forEach(({ pos, field }) => {
    if (field.checkAlive()) {
      map.setField(pos, field);
    } else {
      map.removeField(pos);
    }
  });
}
```

### 2. 缓存显示信息

```typescript
class FieldDisplayCache {
  private cache = new Map<string, DisplayInfo>();

  getDisplay(field: FieldEntry): DisplayInfo | undefined {
    const key = `${field.type}:${field.intensity}`;

    if (!this.cache.has(key)) {
      const info = data.getEntryDisplayInfo(field);
      this.cache.set(key, info);
    }

    return this.cache.get(key);
  }
}
```

### 3. 区域更新

```typescript
// 只更新活跃区域
function updateFieldsInView(map: GameMap, view: Rect): void {
  for (const pos of view.positions()) {
    const field = map.getFieldAt(pos);
    if (field) {
      const updated = data.updateEntry(field);
      if (updated.checkAlive()) {
        map.setField(pos, updated);
      } else {
        map.removeField(pos);
      }
    }
  }
}
```

## 完整示例

### 创建燃烧的建筑物

```typescript
async function createBurningBuilding(map: GameMap, topLeft: Tripoint, size: number) {
  const loader = new FieldTypeLoader();
  await loader.loadFromUrl('/data/json/field_type.json');
  const data = loader.getData();

  // 在建筑物中创建多个火焰场
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const pos = topLeft.add({ x, y, z: 0 });

      // 随机火焰强度
      const intensity = Math.floor(Math.random() * 3) + 1;
      const fire = data.createEntry('fd_fire', intensity);

      if (fire) {
        map.setField(pos, fire);
      }
    }
  }

  // 模拟火灾蔓延
  for (let turn = 0; turn < 100; turn++) {
    updateAllFields(map);

    // 火焰传播
    const firePositions = map.getPositionsWithField('fd_fire');
    for (const pos of firePositions) {
      spreadFire(pos);
    }

    // 检查燃烧
    const nearbyPositions = getNeighbors(topLeft, size);
    for (const pos of nearbyPositions) {
      checkIgnition(pos);
    }
  }
}
```

### 血迹飞溅

```typescript
function createBloodSplatter(map: GameMap, pos: Tripoint, amount: number) {
  const data = loader.getData();

  // 根据血量确定强度
  const intensity = Math.min(3, Math.ceil(amount / 100));
  const blood = data.createEntry('fd_blood', intensity);

  if (blood) {
    map.setField(pos, blood);

    // 小范围飞溅
    const neighbors = getNeighbors(pos);
    for (const neighbor of neighbors) {
      if (Math.random() < 0.3) {
        const splatter = data.createEntry('fd_blood', 1);
        if (splatter) {
          map.setField(neighbor, splatter);
        }
      }
    }
  }
}
```

### 毒气云扩散

```typescript
function createToxicCloud(map: GameMap, center: Tripoint, radius: number) {
  const data = loader.getData();

  // 在圆形区域内创建毒气
  const positions = getCirclePositions(center, radius);
  for (const pos of positions) {
    const intensity = Math.floor(Math.random() * 3) + 1;
    const cloud = data.createEntry('fd_toxic_cloud', intensity);

    if (cloud) {
      map.setField(pos, cloud);
    }
  }
}

function spreadToxicCloud(map: GameMap, center: Tripoint) {
  const cloud = map.getFieldAt(center);

  if (!cloud || cloud.type !== 'fd_toxic_cloud') {
    return;
  }

  // 向相邻位置扩散
  const neighbors = getNeighbors(center);
  for (const neighbor of neighbors) {
    if (Math.random() < 0.2) { // 20% 扩散概率
      const newCloud = loader.getData().createEntry('fd_toxic_cloud', 1);
      if (newCloud) {
        map.setField(neighbor, newCloud);
      }
    }
  }
}
```

## 调试

```typescript
// 显示所有场
function listAllFields(map: GameMap): void {
  const fields = map.getAllFields();

  console.log(`Total fields: ${fields.length}`);

  fields.forEach(({ pos, field }) => {
    const fieldType = data.get(field.type);
    console.log(`${pos.toString()}: ${fieldType?.name} (${field.intensity})`);
  });
}

// 统计场分布
function getFieldStatistics(map: GameMap) {
  const stats = new Map<string, number>();

  const fields = map.getAllFields();
  fields.forEach(({ field }) => {
    const count = stats.get(field.type) || 0;
    stats.set(field.type, count + 1);
  });

  stats.forEach((count, typeId) => {
    const fieldType = data.get(typeId);
    console.log(`${fieldType?.name}: ${count}`);
  });
}
```

## 最佳实践

1. **始终使用场类型创建实例**
2. **每回合更新所有场**
3. **及时清理死亡的场**
4. **使用优先级处理重叠场**
5. **缓存显示信息以提高性能**

```typescript
// 好的做法
const fieldType = data.get('fd_fire');
if (fieldType) {
  const field = fieldType.createEntry(2);
  // 使用场...
}

// 避免
const field = new FieldEntry({
  type: 'fd_fire',
  intensity: 2,
  age: 0,
  decayTime: 0, // 错误：应该使用 fieldType.calculateDecayTime()
  isAlive: true,
});
```
