# 物品系统 API 文档

## 概述

物品系统（Item System）是 Cataclysm-DDA 的核心系统之一，负责管理游戏中的所有物品。本系统采用不可变数据结构设计，参考了 CDDA 的 `item.h`、`itype.h` 和 `item_factory.h`。

## 核心概念

### 1. ItemType（物品类型）

物品类型定义了物品的静态属性，如名称、重量、体积、分类等。每个物品实例都基于一个 ItemType。

```typescript
import { ItemType, createItemTypeId, createMaterialId, createItemFlagSet } from './item';

// 创建一个工具类型
const hammerType = ItemType.create({
  id: createItemTypeId('hammer'),
  name: 'Hammer',
  description: 'A simple hammer for construction',
  weight: 500,        // 500g
  volume: 500,        // 500ml
  category: 'TOOL',
  material: [createMaterialId('steel')],
  flags: createItemFlagSet(),
  qualities: new Map(),
  tool: {
    maximumCharges: 100,
  },
});

// 类型检查
hammerType.isTool();    // true
hammerType.isGun();     // false
hammerType.hasFlag('ALLOWS_REMOTE_USE'); // false
```

### 2. Item（物品实例）

Item 代表游戏中的实际物品对象，包含实例特定的属性如损坏度、电荷、内容物等。

```typescript
import { Item } from './item';

// 创建基础物品
const hammer = Item.create(hammerType);

// 创建带有电荷的物品
const flashlight = Item.createWithCharges(flashlightType, 50);

// 创建损坏的物品
const damagedHammer = Item.createDamaged(hammerType, 200);

// 物品操作
const usedHammer = hammer.consumeOne();           // 消耗一个单位
const brokenHammer = hammer.addDamage(100);        // 增加伤害
const fixedHammer = damagedHammer.repair(50);      // 修复物品
const activatedFlashlight = flashlight.toggleActive(); // 切换激活状态

// 查询物品状态
hammer.isEmpty();      // true (无电荷)
hammer.isDamaged();    // false
hammer.isBroken();     // false
hammer.isUsable();     // 取决于物品类型

// 获取显示名称
hammer.getDisplayName();              // "Hammer"
damagedHammer.getDisplayName();       // "damaged Hammer"
flashlight.getDisplayName();          // "Flashlight (50)"

// 获取详细信息
hammer.getInfo();
/*
Type: TOOL
Weight: 500g
Volume: 500ml
*/
```

### 3. ItemPocket（容器槽位）

ItemPocket 表示物品的一个容器槽位，可以存储其他物品。

```typescript
import { ItemPocket } from './item';

// 创建通用容器
const backpack = ItemPocket.createContainer(
  10000,  // 10L 体积容量
  20000   // 20kg 重量容量
);

// 创建弹匣
const magazine = ItemPocket.createMagazine(500, 30); // 500ml 体积，30 发容量

// 添加物品
const pocketWithItem = backpack.addItem(someItem);

// 查询容量
backpack.getRemainingCapacity(); // 剩余体积
backpack.getRemainingWeight();   // 剩余重量
backpack.isFull();               // 是否已满

// 检查是否可以容纳某物品
const result = backpack.canContain(item);
if (result.code === 0) { // ContainCode.SUCCESS
  // 可以容纳
}
```

### 4. ItemContents（内容物管理）

管理物品的所有容器槽位（pockets），支持嵌套容器。

```typescript
import { ItemContents } from './item';

// 创建空的内容物
const contents = ItemContents.empty();

// 添加物品（自动创建 pocket）
const contentsWithItem = contents.addItem(item);

// 查询内容物
contents.isEmpty();           // 是否为空
contents.getItemCount();      // 物品总数
contents.getTotalCapacity();  // 总容量
contents.getWeight();         // 内容物重量

// 访问者模式 - 遍历所有物品
contents.visitItems((item, parent) => {
  console.log(item.name);
  return 0; // VisitResponse.NEXT - 继续访问子项
});

// 转换为 JSON
const json = contents.toJson();
```

### 5. Inventory（物品栏）

管理角色或容器的物品栏，支持物品堆叠和 invlet（快捷键）分配。

```typescript
import { Inventory } from './item';

// 创建空物品栏
const inventory = Inventory.create(100); // 最多 100 个位置

// 添加物品
const inventoryWithItem = inventory.addItem(item);

// 移除物品
const inventoryWithoutItem = inventoryWithItem.removeItem(item);

// 查询物品
inventory.getItemCount();           // 总物品数量
inventory.getStackCount();          // 物品栈数量
inventory.countItem('hammer');      // 统计特定物品
inventory.countCharges('battery');  // 统计总电荷

// 重新整理（堆叠相同物品）
const organizedInventory = inventory.restack();

// 清空
const emptyInventory = inventory.clear();
```

### 6. ItemFactory（物品工厂）

管理所有物品类型和物品组，负责创建物品实例。

```typescript
import { ItemFactory } from './item';

// 创建工厂
const factory = ItemFactory.create();

// 添加物品类型
factory.addType(hammerType);
factory.addTypes([hammerType, flashlightType, ...]);

// 获取物品类型
const type = factory.getType(createItemTypeId('hammer'));

// 创建物品实例
const hammer = factory.createItem(createItemTypeId('hammer'));
const chargedFlashlight = factory.createItemWithCharges(
  createItemTypeId('flashlight'),
  50
);

// 版本管理
factory.getVersion(); // 当前版本号

// 运行时类型
factory.createRuntimeType(
  createItemTypeId('custom_item'),
  'Custom Item',
  'A runtime created item'
);
```

### 7. ItemLoader（JSON 加载器）

从 JSON 文件加载物品类型定义。

```typescript
import { ItemLoader } from './item';

// 从文件加载
const factory = await ItemLoader.loadFromFile('./data/items.json');

// 从目录加载所有 JSON 文件
const factory = await ItemLoader.loadFromDirectory('./data/json/items/');

// 从 JSON 数组加载
const jsonArray = JSON.parse(content);
const factory = ItemLoader.fromJsonArray(jsonArray);
```

## 类型定义

### 品牌类型 ID

系统使用品牌类型（branded types）确保类型安全：

```typescript
// 物品类型 ID
type ItemTypeId = string & { readonly __brand: unique symbol };

// 材料ID
type MaterialId = string & { readonly __brand: unique symbol };

// 创建类型 ID
const itemId: ItemTypeId = createItemTypeId('hammer');
const materialId: MaterialId = createMaterialId('steel');
```

### 物品分类

```typescript
enum ItemCategory {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  FOOD = 'FOOD',
  TOOL = 'TOOL',
  BOOK = 'BOOK',
  AMMO = 'AMMO',
  CONTAINER = 'CONTAINER',
  GUN = 'GUN',
  GUNMOD = 'GUNMOD',
  ARMOR_MOD = 'ARMOR_MOD',
  BIONIC = 'BIONIC',
  COMESTIBLE = 'COMESTIBLE',
  ENGINE = 'ENGINE',
  WHEEL = 'WHEEL',
  PET_ARMOR = 'PET_ARMOR',
  GENERIC = 'GENERIC',
  FURNITURE = 'FURNITURE',
  MISCELLANEOUS = 'MISCELLANEOUS',
}
```

### 插槽系统

不同类型的物品使用不同的插槽：

```typescript
interface ItemTypeProps {
  // 基础属性
  id: ItemTypeId;
  name: string;
  weight: Mass;  // 克
  volume: Volume; // 毫升
  category: ItemCategory;
  material: MaterialId[];
  flags: Set<ItemFlagType>;

  // 可选插槽
  tool?: ToolSlot;         // 工具
  comestible?: ComestibleSlot;  // 食物
  armor?: ArmorSlot;       // 护甲
  gun?: GunSlot;           // 枪械
  ammo?: AmmoSlot;         // 弹药
  book?: BookSlot;         // 书籍
  mod?: ModSlot;           // 改装件
  // ... 更多插槽
}
```

## 完整使用示例

### 示例 1: 创建和管理物品

```typescript
import {
  ItemType,
  Item,
  ItemFactory,
  createItemTypeId,
  createMaterialId,
  createItemFlagSet,
} from './item';
import { Map } from 'immutable';

// 1. 定义物品类型
const bandageType = ItemType.create({
  id: createItemTypeId('bandage'),
  name: 'Bandage',
  description: 'A clean bandage for treating wounds',
  weight: 50,
  volume: 100,
  category: 'FOOD',
  material: [createMaterialId('cotton')],
  flags: createItemFlagSet(),
  qualities: Map(),
  comestible: {
    calories: 0,
    quench: 0,
    fun: 0,
  },
});

// 2. 创建物品实例
const bandage = Item.create(bandageType);

// 3. 修改物品状态
const usedBandage = bandage.setItemVar('used_for', 'cleaning_wound');
const dirtyBandage = usedBandage.addDamage(10);

// 4. 检查物品
if (!dirtyBandage.isBroken()) {
  console.log('Bandage is still usable');
}
```

### 示例 2: 容器系统

```typescript
import { Item, ItemPocket, ItemContents } from './item';

// 创建一个背包
const backpackPocket = ItemPocket.createContainer(10000, 20000);

// 添加物品到背包
const bandageType = ItemType.create({ /* ... */ });
const bandage1 = Item.create(bandageType);
const bandage2 = Item.create(bandageType);

const backpackWithItems = backpackPocket
  .addItem(bandage1)
  .addItem(bandage2);

// 查询背包
console.log(`Items: ${backpackWithItems.getItemCount()}`);
console.log(`Weight: ${backpackWithItems.getWeight()}`);
console.log(`Remaining: ${backpackWithItems.getRemainingCapacity()}`);

// 创建一个容器物品
const backpackItem = Item.create(backpackItemType);
const contents = backpackItem.contents.addItem(bandage1).addItem(bandage2);

console.log(`Total items in backpack: ${contents.getItemCount()}`);
```

### 示例 3: 物品栏管理

```typescript
import { Inventory } from './item';

// 创建角色物品栏
const playerInventory = Inventory.create(100);

// 拾取物品
const updatedInventory = playerInventory.addItem(weapon);
updatedInventory.addItem(ammo);
updatedInventory.addItem(medkit);

// 查询物品
const hasWeapon = updatedInventory.countItem('pistol') > 0;
const totalAmmo = updatedInventory.countCharges('9mm');

// 整理物品栏（自动堆叠）
const organizedInventory = updatedInventory.restack();

// 访问所有物品
organizedInventory.visitItems((item) => {
  console.log(`${item.name}: ${item.getWeight()}g`);
  return 0; // 继续访问
});
```

### 示例 4: 从 JSON 加载数据

```typescript
import { ItemLoader } from './item';

// JSON 数据格式示例
const jsonData = [
  {
    "id": "apple",
    "type": "FOOD",
    "name": "Apple",
    "description": "A red apple",
    "weight": "100 g",
    "volume": "250 ml",
    "material": ["flesh"],
    "calories": 50,
    "quench": 10,
  },
  {
    "id": "pistol",
    "type": "GUN",
    "name": "9mm Pistol",
    "weight": "500 g",
    "volume": "750 ml",
    "material": ["steel"],
    "skill": "pistol",
    "ammo": ["9mm"],
    "range": 8,
    "dispersion": 120,
  }
];

// 加载数据
const factory = ItemLoader.fromJsonArray(jsonData, ItemLoader.parseItemType);

// 创建物品
const apple = factory.createItem(createItemTypeId('apple'));
const pistol = factory.createItem(createItemTypeId('pistol'));
```

## API 参考

### ItemType

| 方法 | 描述 |
|------|------|
| `create(props)` | 创建新的 ItemType |
| `copyFrom(other, overrides?)` | 从另一个 ItemType 复制创建 |
| `isTool()` | 是否为工具 |
| `isGun()` | 是否为枪械 |
| `isArmor()` | 是否为护甲 |
| `hasFlag(flag)` | 是否有指定标志 |
| `hasAnyFlag(...flags)` | 是否有任意标志 |
| `hasAllFlags(...flags)` | 是否有所有标志 |
| `getQualityLevel(quality)` | 获取品质等级 |

### Item

| 方法 | 描述 |
|------|------|
| `create(type)` | 创建基础物品 |
| `createWithCharges(type, charges)` | 创建带电荷的物品 |
| `createDamaged(type, damage)` | 创建损坏的物品 |
| `consumeOne()` | 消耗一个单位 |
| `addDamage(amount)` | 增加伤害 |
| `repair(amount)` | 修复物品 |
| `toggleActive()` | 切换激活状态 |
| `getWeight()` | 获取总重量 |
| `getVolume()` | 获取总体积 |
| `getDisplayName()` | 获取显示名称 |
| `addItem(item)` | 添加内容物 |
| `convertTo(newType)` | 转换类型 |

### ItemPocket

| 方法 | 描述 |
|------|------|
| `createContainer(volume, weight?)` | 创建通用容器 |
| `createMagazine(volume, capacity)` | 创建弹匣 |
| `addItem(item)` | 添加物品 |
| `removeItem(item)` | 移除物品 |
| `canContain(item)` | 检查是否可容纳 |
| `getRemainingCapacity()` | 获取剩余容量 |
| `isEmpty()` | 是否为空 |
| `isFull()` | 是否已满 |

### ItemContents

| 方法 | 描述 |
|------|------|
| `empty()` | 创建空内容物 |
| `addItem(item)` | 添加物品 |
| `removeItem(item)` | 移除物品 |
| `visitItems(visitor)` | 访问所有物品 |
| `toJson()` | 转换为 JSON |

### Inventory

| 方法 | 描述 |
|------|------|
| `create(maxPositions?)` | 创建空物品栏 |
| `addItem(item)` | 添加物品 |
| `removeItem(item)` | 移除物品 |
| `restack()` | 重新整理（堆叠） |
| `countItem(typeId)` | 统计物品数量 |
| `countCharges(typeId)` | 统计总电荷 |
| `visitItems(visitor)` | 访问所有物品 |

### ItemFactory

| 方法 | 描述 |
|------|------|
| `create()` | 创建空工厂 |
| `addType(type)` | 添加物品类型 |
| `addTypes(types)` | 批量添加 |
| `getType(id)` | 获取物品类型 |
| `createItem(id)` | 创建物品实例 |
| `createItemWithCharges(id, charges)` | 创建带电荷物品 |

### ItemLoader

| 方法 | 描述 |
|------|------|
| `loadFromFile(path)` | 从文件加载 |
| `loadFromDirectory(path)` | 从目录加载 |
| `fromJsonArray(array)` | 从数组加载 |
| `parseItemType(json)` | 解析单个物品 |
