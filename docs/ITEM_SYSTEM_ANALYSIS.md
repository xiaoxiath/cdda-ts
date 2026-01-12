# Cataclysm-DDA 物品系统分析报告

## 一、系统架构概览

Cataclysm-DDA 采用了一个高度模块化、数据驱动的物品系统架构：

```
┌─────────────────────────────────────────────────────────────┐
│                      Item_factory                            │
│                    (全局物品管理器)                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  itype      │  │  item       │  │  inventory  │          │
│  │  (物品类型) │  │  (物品实例) │  │  (物品栏)   │          │
│  │             │  │             │  │             │          │
│  │ 插槽系统:   │  │ type*       │  │ invstack    │          │
│  │ - tool     │  │ charges     │  │ items       │          │
│  │ - gun      │  │ damage      │  │ position    │          │
│  │ - armor    │  │ bday        │  │ weight()    │          │
│  │ - food     │  │ contents    │  │ volume()    │          │
│  │ - ammo     │  │             │  │             │          │
│  │ - ...      │  │             │  │             │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐                             │
│  │item_pocket  │  │item_group   │                             │
│  │ (容器系统)  │  │ (物品组)    │                             │
│  │             │  │             │                             │
│  │ contents[]  │  │ G_COLLECTION│                             │
│  │ sealable    │  │ G_DISTRIBUT │                             │
│  │ volume      │  │ Item_spawn  │                             │
│  │ weight      │  │ modifier    │                             │
│  └─────────────┘  └─────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

## 二、核心类设计

### 2.1 item 类

**位置**: `src/item.h`

#### 构造方式

```cpp
class item : public visitable {
public:
    item();  // 默认构造
    item(const itype_id &id, time_point turn, int qty);
    item(const itype *type, time_point turn, int qty);
};
```

#### 关键属性

```cpp
class item {
    const itype *type;           // 指向物品类型的指针
    int charges;                 // 可计数的物品（弹药、食物等）
    int damage;                  // 伤害状态（0-4000）
    time_point bday;             // 生日（创建时间）
    item_contents contents;      // 容器系统内容

    // 物品变量（运行时状态）
    std::map<std::string, std::string> item_vars;

    // 标签
    item_tag tag;                // 物品标签（用于追踪）
};
```

#### 核心功能

```cpp
// 类型转换
void convert(const itype_id &new_type);
item deactivate(int qty);
item activate();

// 内容管理
item split(int qty);
void ammo_set(item &obj);
void ammo_unset();

// 状态查询
bool is_tool() const;
bool is_gun() const;
bool is_food() const;
bool is_armor() const;
bool is_book() const;
bool is_corpse() const;
bool is_money() const;

// 显示信息
std::string tname() const;
std::string info() const;
std::string get_info() const;
```

### 2.2 itype 类

**位置**: `src/itype.h`

#### 插槽式设计模式

```cpp
struct itype {
    itype_id id;                // 唯一标识符

    // 插槽系统 - 每个插槽对应特定物品类型的属性
    cata::value_ptr<islot_tool> tool;
    cata::value_ptr<islot_comestible> comestible;
    cata::value_ptr<islot_armor> armor;
    cata::value_ptr<islot_gun> gun;
    cata::value_ptr<islot_ammo> ammo;
    cata::value_ptr<islot_book> book;
    cata::value_ptr<islot_mod> weapon_mod;
    cata::value_ptr<islot_bionic> bionic;
    cata::value_ptr<islot_generic> generic;
    cata::value_ptr<islot_engine> engine;
    cata::value_ptr<islot_wheel> wheel;
    cata::value_ptr<islot_furniture> furniture;
    cata::value_ptr<islot_pet_armor> pet_armor;

    // 通用属性
    translation name;
    translation description;
    units::mass weight;
    units::volume volume;
    int price;
    material_id material;
    std::vector<std::string> flags;
};
```

**插槽系统优势**:
- **内存高效**: 只有相关类型存储数据
- **扩展性强**: 添加新类型无需修改核心结构
- **类型安全**: 通过 `value_ptr` 确保访问安全

## 三、工厂模式应用

### 3.1 Item_factory 类

**位置**: `src/item_factory.h`

#### 核心职责

```cpp
class Item_factory {
    generic_factory<itype> item_factory;  // 通用工厂

    // 物品管理
    const itype *find_template(const itype_id &id);
    bool has_template(const itype_id &id);

    // 物品组管理
    void load_item_group(const JsonObject &jo);
    Item_spawn_data *get_group(const item_group_id &);

    // 迁移系统
    itype_id migrate_id(const itype_id &id);
    void migrate_item(const itype_id &id, item &obj);
};
```

#### 设计模式特点

1. **单例模式**: 全局 `item_controller` 实例
2. **模板方法模式**: `generic_factory<T>` 提供通用对象管理
3. **延迟加载**: 通过 `DynamicDataLoader` 支持JSON数据延迟加载
4. **版本控制**: 通过 `version` 成员支持缓存失效

### 3.2 generic_factory 实现

**位置**: `src/generic_factory.h`

```cpp
template<typename T>
class generic_factory {
    std::vector<T> list;  // 连续存储的对象数组
    std::unordered_map<string_id<T>, int_id<T>> map;  // 字符串ID到整数ID的映射
    std::unordered_map<std::string, T> abstracts;  // 抽象模板（copy-from）
    int64_t version;  // 版本号，用于缓存失效

    // 核心功能
    void load(const JsonObject &jo);
    void insert(const T &obj);
    const T &obj(const string_id<T> &id) const;
};
```

## 四、物品容器系统

### 4.1 item_pocket 设计

**位置**: `src/item_pocket.h`

#### Pocket类型枚举

```cpp
enum class pocket_type : int {
    CONTAINER,       // 通用容器
    MAGAZINE,        // 弹匣
    MAGAZINE_WELL,   // 弹匣槽
    MOD,             // 改装件
    CORPSE,          // 尸体（内置bionic）
    SOFTWARE,        // 软件
    E_FILE_STORAGE,  // 电子文件存储
    CABLE,           // 电缆
    MIGRATION,       // 迁移用
    EBOOK,           // 电子书
    LAST
};
```

#### item_pocket 核心功能

```cpp
class item_pocket {
    // 容量检查
    ret_val<contain_code> can_contain(const item &it);
    units::volume remaining_volume();
    units::mass remaining_weight();

    // 物品操作
    ret_val<item *> insert_item(const item &it);
    std::optional<item> remove_item(const item &it);

    // 密封系统
    bool sealable();
    bool sealed();
    void seal();
    void unseal();

    // 设置管理
    favorite_settings settings;  // 玩家自定义设置
};
```

#### 包含码系统

```cpp
enum class contain_code : int {
    SUCCESS,
    ERR_MOD,           // 只有MOD可以放入
    ERR_LIQUID,        // 需要防水容器
    ERR_GAS,           // 需要气密容器
    ERR_TOO_BIG,       // 物品太大
    ERR_TOO_HEAVY,     // 物品太重
    ERR_TOO_SMALL,     // 物品太小
    ERR_NO_SPACE,      // 容量不足
    ERR_FLAG,          // 缺少必需标志
    ERR_AMMO           // 弹药类型不匹配
};
```

### 4.2 item_contents 管理

**位置**: `src/item_contents.h`

```cpp
class item_contents {
    std::list<item_pocket> contents;  // 多个pocket

    // 智能匹配
    std::pair<item_location, item_pocket *> best_pocket(
        const item &it, item_location &this_loc,
        bool allow_nested = true
    );

    // 容量计算
    units::volume total_container_capacity();
    units::volume remaining_container_capacity();

    // 特定查询
    std::vector<item *> gunmods();
    std::vector<item *> ebooks();
    item *magazine_current();
};
```

#### 嵌套容器支持

- **递归查找**: `best_pocket()` 支持嵌套搜索
- **溢出处理**: `overflow()` 自动处理超容量物品
- **重量/体积传播**: 递归计算总重量和体积

## 五、inventory 物品栏系统

**位置**: `src/inventory.h`

### 5.1 inventory 类设计

```cpp
class inventory : public visitable {
    invstack items;  // std::list<std::list<item>>

    // 物品操作
    item &add_item(item newit);
    item remove_item(const item *it);
    void restack(Character &p);

    // 查询
    int position_by_item(const item *it);
    const item &find_item(int position);

    // 统计
    units::mass weight();
    units::volume volume();
    int charges_of(const itype_id &what);
};
```

### 5.2 invlet 分配系统

```cpp
class invlet_favorites {
    std::unordered_map<itype_id, std::string> invlets_by_id;
    std::array<itype_id, 256> ids_by_invlet;

    void set(char invlet, const itype_id &);
    std::string invlets_for(const itype_id &);
};
```

### 5.3 Visitable 接口

```cpp
class visitable {
    virtual VisitResponse visit_items(
        const std::function<VisitResponse(item *, item *)> &func
    ) const = 0;
};

// 使用示例
inventory inv;
inv.visit_items([](item *it, item *parent) {
    if(it->is_food()) {
        return VisitResponse::NEXT;
    }
    return VisitResponse::SKIP;
});
```

## 六、数据驱动设计

### 6.1 JSON 数据结构

**物品示例**:

```json
{
  "type": "ITEM",
  "subtypes": ["AMMO"],
  "id": "chem_sulphur",
  "name": { "str_sp": "sulfur" },
  "category": "chems",
  "weight": "320 mg",
  "volume": "16 ml",
  "material": ["powder"],
  "ammo_type": "components",
  "count": 100,
  "flags": ["EDIBLE_FROZEN", "NO_INGEST"]
}
```

**枪械示例**:

```json
{
  "type": "GUN",
  "id": "glock_19",
  "name": { "str_sp": "Glock 19" },
  "description": "A compact 9mm pistol.",
  "weight": "620 g",
  "volume": "750 ml",
  "material": ["steel"],
  "ammo": ["9mm"],
  "capacity": 15,
  "reload": 30,
  "range": 8,
  "damage": 12,
  "flags": ["HANDGUN", "RELOAD_ONE"]
}
```

### 6.2 copy-from 继承系统

```json
{
  "id": "tall_pine",
  "copy-from": "tree",
  "name": "pine tree",
  "symbol": "Y",
  "color": "green",
  "overrides": "wood"
}
```

**继承优先级**:
1. 原始对象
2. copy-from 复制
3. overrides 字段
4. 直接定义字段

## 七、高级特性

### 7.1 迁移系统

**版本迁移**:

```cpp
struct migration {
    itype_id id;              // 旧ID
    itype_id replace;         // 新ID
    std::string variant;      // 变体
    int charges;              // 电量
    std::vector<content> contents;  // 内容物
    bool reset_item_vars;     // 重置变量
};

Item_factory::migrate_id("old_item");  // 返回 "new_item"
```

### 7.2 物品位置系统

**位置**: `src/item_location.h`

```cpp
class item_location {
    enum class type { invalid, character, map, vehicle, container };

    std::shared_ptr<impl> ptr;  // Pimpl模式

    // 位置无关操作
    item &operator*();
    item_location obtain(Character &ch);
    void remove_item();

    // 位置查询
    type where();
    tripoint_bub_ms pos_bub();
    std::string describe();
};
```

### 7.3 密封系统

```cpp
struct sealable_data {
    float spoil_multiplier;  // 腐烂倍率
};

item_pocket::seal();   // 密封
item_pocket::sealed(); // 检查状态
item_pocket::unseal(); // 解封
```

## 八、TypeScript 实现建议

### 8.1 基础类结构

```typescript
// 物品类型
export class ItemType {
    id: ItemTypeId;
    name: string;
    description: string;
    weight: Mass;
    volume: Volume;
    price: number;
    material: MaterialId[];
    flags: Set<string>;

    // 插槽
    tool?: ToolSlot;
    gun?: GunSlot;
    armor?: ArmorSlot;
    comestible?: ComestibleSlot;
    ammo?: AmmoSlot;
    book?: BookSlot;
    mod?: ModSlot;
    // ... 更多插槽
}

// 物品实例
export class Item {
    type: ItemType;
    charges: number;
    damage: number;
    bday: TimePoint;
    contents: ItemContents;

    // 物品变量
    itemVars: Map<string, string>;

    // 方法
    isTool(): boolean { return this.type.tool !== undefined; }
    isGun(): boolean { return this.type.gun !== undefined; }
    isFood(): boolean { return this.type.comestible !== undefined; }
    isArmor(): boolean { return this.type.armor !== undefined; }

    tname(): string { return this.type.name; }
    info(): string { /* ... */ }
}

// 容器系统
export class ItemPocket {
    pocketType: PocketType;
    contents: Item[] = [];

    canContain(item: Item): Result<ContainCode> { /* ... */ }
    remainingVolume(): Volume { /* ... */ }
    remainingWeight(): Mass { /* ... */ }

    insertItem(item: Item): Result<Item> { /* ... */ }
    removeItem(item: Item): Item | null { /* ... */ }

    sealable(): boolean { /* ... */ }
    sealed(): boolean { /* ... */ }
    seal(): void { /* ... */ }
    unseal(): void { /* ... */ }
}

export class ItemContents {
    pockets: ItemPocket[] = [];

    bestPocket(item: Item, allowNested: boolean): [ItemLocation, ItemPocket] { /* ... */ }
    totalContainerCapacity(): Volume { /* ... */ }
    remainingContainerCapacity(): Volume { /* ... */ }

    gunmods(): Item[] { /* ... */ }
    ebooks(): Item[] { /* ... */ }
    magazineCurrent(): Item | null { /* ... */ }
}

// 物品栏
export class Inventory {
    items: Item[][] = [];

    addItem(item: Item): Item { /* ... */ }
    removeItem(item: Item): Item { /* ... */ }
    restack(character: Character): void { /* ... */ }

    positionByItem(item: Item): number { /* ... */ }
    findItem(position: number): Item { /* ... */ }

    weight(): Mass { /* ... */ }
    volume(): Volume { /* ... */ }
    chargesOf(type: ItemTypeId): number { /* ... */ }
}
```

### 8.2 工厂模式

```typescript
export class GenericFactory<T extends { id: string }> {
    private items = new Map<string, T>();
    private abstracts = new Map<string, T>();
    private version = 0;

    load(json: JsonObject): void {
        const obj = this.parseJson(json);
        this.insert(obj);
    }

    insert(obj: T): void {
        this.items.set(obj.id, obj);
        this.version++;
    }

    get(id: string): T | null {
        return this.items.get(id) || null;
    }

    getVersion(): number {
        return this.version;
    }
}

export class ItemFactory {
    private factory = new GenericFactory<ItemType>();
    private itemGroups = new Map<string, ItemSpawnData>();
    private migrations = new Map<string, Migration>();

    findTemplate(id: ItemTypeId): ItemType | null {
        return this.factory.get(id);
    }

    hasTemplate(id: ItemTypeId): boolean {
        return this.factory.get(id) !== null;
    }

    loadItemGroup(json: JsonObject): void {
        const group = this.parseItemGroup(json);
        this.itemGroups.set(group.id, group);
    }

    getGroup(id: string): ItemSpawnData | null {
        return this.itemGroups.get(id) || null;
    }

    migrateId(id: string): string {
        const migration = this.migrations.get(id);
        return migration ? migration.replace : id;
    }

    migrateItem(id: string, item: Item): void {
        const migration = this.migrations.get(id);
        if (migration) {
            if (migration.replace) item.type = this.findTemplate(migration.replace)!;
            if (migration.charges !== undefined) item.charges = migration.charges;
            // ...
        }
    }
}
```

---

*本文档基于 Cataclysm-DDA 源代码分析生成*
