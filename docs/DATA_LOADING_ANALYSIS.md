# Cataclysm-DDA 数据加载和配置系统分析报告

## 系统架构概览

Cataclysm-DDA采用了一个高度模块化、类型安全的数据驱动架构，核心组件包括：

- **DynamicDataLoader** (init.h/cpp) - 核心数据加载器
- **generic_factory** (generic_factory.h) - 通用工厂模式实现
- **string_id/int_id** (string_id.h, int_id.h) - 类型安全的ID系统
- **JSON工具** (json.h, json_loader.h) - JSON解析和序列化

## 一、DynamicDataLoader - 动态数据加载器

### 1.1 核心职责

**位置**: `src/init.h`

`DynamicDataLoader`是单例模式（Singleton），负责：
- 从JSON文件加载所有游戏数据
- 支持Mod系统和数据覆盖
- 管理数据加载生命周期
- 处理延迟加载（deferred loading）

### 1.2 关键流程

#### 初始化流程

```cpp
DynamicDataLoader::DynamicDataLoader() {
    initialize(); // 注册所有类型处理器
}
```

#### 数据加载流程

```
1. load_data_from_path(path) - 递归加载目录下所有.json文件
   ↓
2. load_all_from_json() - 解析JSON并分发到对应类型处理器
   ↓
3. load_object() - 根据"type"字段分发到具体工厂
   ↓
4. 各工厂的load()方法 - 实际解析对象数据
```

#### Finalize流程

```
1. finalize_loaded_data() - 所有数据加载完成后调用
   ↓
2. load_deferred() - 处理延迟加载的对象（如copy-from依赖）
   ↓
3. check_consistency() - 验证数据一致性
```

### 1.3 类型分发机制

使用`type_function_map`将JSON中的"type"字符串映射到处理函数：

```cpp
using t_type_function_map =
    std::map<type_string,
    std::function<void(const JsonObject &, const std::string &, ...)>>
```

## 二、generic_factory - 通用工厂模式

### 2.1 设计理念

**位置**: `src/generic_factory.h`

`generic_factory<T>`是一个模板类，为所有游戏对象类型提供统一的数据管理接口：

#### 核心要求

```cpp
template<typename T>
class generic_factory {
    std::vector<T> list;                    // 连续存储的对象数组
    std::unordered_map<string_id<T>, int_id<T>> map;  // 字符串ID到整数ID的映射
    std::unordered_map<std::string, T> abstracts;     // 抽象模板（copy-from）
    int64_t version;                        // 版本号，用于缓存失效
};
```

**类型T的要求**:
- 必须有`string_id<T> id`成员
- 必须有`bool was_loaded`成员
- 必须实现`void load(JsonObject &jo)`方法
- 可选实现`void check()`方法

### 2.2 继承处理（copy-from机制）

#### 核心流程

```cpp
bool handle_inheritance(T &def, const JsonObject &jo, const std::string &src) {
    // 1. 检查 "copy-from" 字段
    if (jo.has_string("copy-from")) {
        const std::string source = jo.get_string("copy-from");

        // 2. 先在已加载对象中查找
        auto base = map.find(string_id<T>(source));
        if (base != map.end()) {
            def = obj(base->second);  // 复制基对象
        }
        // 3. 再在抽象对象中查找
        else if ((ab = abstracts.find(source)) != abstracts.end()) {
            def = ab->second;
        }
        // 4. 都找不到，延迟加载
        else {
            deferred.emplace_back(jo, src);
            return false;
        }
    }

    // 5. 处理抽象对象
    if (jo.has_string("abstract")) {
        // 存储到abstracts，不加入主列表
        abstracts[abstract_id] = def;
    }

    return true;
}
```

#### 支持两种继承方式

1. **简单赋值** - 直接复制基对象
2. **自定义处理** - 如果类型T实现`handle_inheritance()`方法，使用自定义逻辑

### 2.3 版本控制和缓存失效

```cpp
class Version {
    int64_t version = -1;
    bool operator==(const Version &rhs) const;
};

// 每次修改factory时
void inc_version() {
    version++;
}

// string_id中的缓存
mutable int64_t _version = INVALID_VERSION;
mutable int _cid = INVALID_CID;

// 查找时检查版本
bool find_id(const string_id<T> &id, int_id<T> &result) const {
    if (id._version == version) {
        result = int_id<T>(id._cid);  // 使用缓存
        return is_valid(result);
    }
    // 重新查找并更新缓存
    const auto iter = map.find(id);
    id.set_cid_version(result.to_i(), version);
    return iter != map.end();
}
```

## 三、类型安全的ID系统

### 3.1 string_id<T> - 字符串标识符

**位置**: `src/string_id.h`

#### 双重实现

**Static实现（默认）** - 使用字符串驻留:

```cpp
class string_identity_static {
    int _id;  // 驻留字符串的整数ID

    static int string_id_intern(std::string &&s);
    static const std::string &get_interned_string(int id);
};
```

**Dynamic实现** - 直接存储std::string:

```cpp
class string_identity_dynamic {
    std::string _id;
};
```

#### 性能特性

- **首次查找**: O(n)字符串哈希查找
- **后续查找**: O(1)整数索引访问
- **适合**: 静态ID、跨游戏重载

### 3.2 int_id<T> - 整数标识符

```cpp
template<typename T>
class int_id {
    int _id;

    // 快速转换为string_id
    const string_id<T> &id() const;
    const T &obj() const;
};
```

#### 性能特性

- **查找**: O(1)数组访问
- **限制**: 不能跨游戏重载使用
- **适合**: 运行时缓存

#### 优化：int_id_set

```cpp
template<typename T, std::size_t kFastSize>
class int_id_set {
    std::bitset<kFastSize> fast_set_;  // 小ID使用位集合
    std::unordered_set<int_id<T>> slow_set_;  // 大ID使用哈希表
};
```

### 3.3 ID转换机制

#### string_id → int_id

```cpp
int_id<T> id() const {
    int_id<T> result;
    if (!generic_factory<T>::find_id(*this, result)) {
        debugmsg("invalid %s id \"%s\"", type_name, c_str());
    }
    return result;
}
```

#### int_id → string_id

```cpp
const string_id<T> &id() const {
    return generic_factory<T>::obj(*this).id;
}
```

## 四、JSON工具集

### 4.1 分层架构

**位置**: `src/json.h`

#### TextJsonIn - 低级流式解析器

```cpp
class TextJsonIn {
    std::istream *stream;

    // 单次遍历API
    void start_array();
    bool end_array();
    void start_object();
    bool end_object();

    // 类型感知读取
    template<typename T> bool read(T &v, bool throw_on_error = false);
};
```

#### TextJsonObject - 对象包装器

```cpp
class TextJsonObject {
    std::map<std::string, int> positions;  // 成员名→流偏移量

    // 访问未访问的成员会触发错误
    mutable std::set<std::string> visited_members;

    ~TextJsonObject() {
        finish();  // 检查是否有未访问的成员
    }
};
```

#### TextJsonArray - 数组包装器

```cpp
class TextJsonArray {
    std::vector<size_t> positions;  // 元素偏移量

    // 迭代访问
    bool has_more() const;
    int next_int();

    // 随机访问
    int get_int(size_t index) const;
};
```

### 4.2 自动反序列化

#### 支持类型

- **基础类型**: int, bool, double, std::string
- **容器**: std::vector, std::set, std::map, std::array
- **ID类型**: string_id<T>, int_id<T>
- **自定义类型**（通过`deserialize()`函数）

#### 示例

```cpp
// 自动读取vector
std::vector<int> vec;
jo.read("numbers", vec);

// 自动读取map
std::map<string_id<item>, int> item_counts;
jo.read("items", item_counts);

// 自定义反序列化
struct MyClass {
    void deserialize(const TextJsonValue &jv) {
        // 自定义逻辑
    }
};
```

## 五、数据驱动的架构设计

### 5.1 数据组织方式

#### 目录结构

```
data/json/
├── items/          # 物品定义
├── monsters/       # 怪物定义
├── constructions/  # 建造配方
├── recipes/        # 合成配方
├── mutations/      # 突变定义
└── ...
```

#### 文件结构

```json
[
  {
    "type": "item",
    "id": "apple",
    "name": "Apple",
    "weight": 100,
    "volume": "250 ml"
  },
  {
    "type": "item",
    "id": "rotten_apple",
    "copy-from": "apple",
    "name": "Rotten Apple",
    "spoils_in": "12 hours"
  }
]
```

### 5.2 Mod系统

#### 加载顺序

1. 核心数据（data/json/）
2. Mod数据（按依赖顺序）
3. Mod交互数据（mod_interactions/）

#### 数据覆盖规则

- 后加载的数据完全覆盖同ID对象
- 使用`"copy-from"`实现增量修改
- `"abstract"`对象不可直接使用

### 5.3 数据验证

#### 三个层次的验证

**1. 加载时验证**

```cpp
void T::load(const JsonObject &jo) {
    mandatory(jo, was_loaded, "id", id);
    optional(jo, was_loaded, "name", name, "Unnamed");

    // 自定义验证
    if (weight < 0) {
        jo.throw_error("weight cannot be negative");
    }
}
```

**2. Finalize验证**

```cpp
void T::finalize() {
    // 检查跨对象引用
    for (auto &req : requirements) {
        if (!req.is_valid()) {
            debugmsg("Invalid requirement in %s", id.c_str());
        }
    }
}
```

**3. 一致性检查**

```cpp
void T::check() const {
    // 运行时约束检查
    if (volume > MAX_VOLUME) {
        debugmsg("Item %s exceeds maximum volume", id.c_str());
    }
}
```

## 六、具体实现示例：Item_factory

### 6.1 工厂结构

**位置**: `src/item_factory.h`

```cpp
class Item_factory {
    generic_factory<itype> item_factory;

    // Item组（用于随机生成）
    std::map<item_group_id, std::unique_ptr<Item_spawn_data>> m_template_groups;

    // 迁移（用于旧版本兼容）
    std::map<itype_id, std::vector<migration>> migrations;

    // 运行时创建的物品类型
    std::map<itype_id, std::unique_ptr<itype>> m_runtimes;
};
```

### 6.2 加载流程

```cpp
void items::load(const JsonObject &jo, const std::string &src) {
    item_controller->item_factory.load(jo, src);
}

void items::finalize_all() {
    item_controller->finalize();
}

void items::check_consistency() {
    item_controller->check_definitions();
}
```

### 6.3 特殊功能

#### 迁移系统

```cpp
void Item_factory::migrate_item(const itype_id &id, item &obj) {
    auto it = migrations.find(id);
    if (it != migrations.end()) {
        for (const migration &m : it->second) {
            // 应用迁移
            if (m.replace) obj.set_type(m.replace);
            if (m.charges) obj.charges = m.charges;
            // ...
        }
    }
}
```

#### 动态类型创建

```cpp
const itype *Item_factory::add_runtime(
    const itype_id &id,
    translation name,
    translation description
) const {
    auto itype_ptr = std::make_unique<itype>();
    itype_ptr->id = id;
    itype_ptr->name = name;
    itype_ptr->description = description;

    m_runtimes[id] = std::move(itype_ptr);
    m_runtimes_dirty = true;
    return m_runtimes[id].get();
}
```

## 七、性能优化策略

### 7.1 字符串驻留

```cpp
// 所有string_id共享相同的字符串存储
int string_identity_static::string_id_intern(std::string &&s) {
    static std::unordered_map<std::string, int> pool;
    auto [it, inserted] = pool.emplace(std::move(s), pool.size());
    return it->second;
}
```

### 7.2 延迟加载

```cpp
// 处理copy-from循环依赖
void DynamicDataLoader::load_deferred(deferred_json &data) {
    while (!data.empty()) {
        const size_t n = data.size();
        for (auto &elem : data) {
            try {
                load_object(elem.first, elem.second);
            } catch (...) {
                // 继续尝试其他对象
            }
        }

        // 如果没有进展，说明有循环依赖
        if (data.size() == n) {
            for (auto &elem : data) {
                elem.first.throw_error("Circular dependency");
            }
        }
    }
}
```

### 7.3 流缓存

```cpp
shared_ptr_fast<std::istream> DynamicDataLoader::get_cached_stream(
    const std::string &path
) {
    // LRU缓存，避免重复读取文件
    shared_ptr_fast<std::istringstream> cached =
        stream_cache->cache.get(path, nullptr);

    if (!cached) {
        cached = make_shared_fast<std::istringstream>(
            read_entire_file(path)
        );
    } else if (cached.use_count() > 2) {
        // 如果还在使用，创建新副本
        cached = make_shared_fast<std::istringstream>(cached->str());
    }

    return cached;
}
```

## 八、TypeScript 实现建议

### 8.1 通用工厂模式

```typescript
export interface Loadable {
    id: string;
    wasLoaded: boolean;
    load?(json: JsonObject): void;
    check?(): void;
}

export class GenericFactory<T extends Loadable> {
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

    // 处理继承
    handleInheritance(obj: T, json: JsonObject): boolean {
        if (json['copy-from']) {
            const source = json['copy-from'];

            // 先在已加载对象中查找
            let base = this.items.get(source);
            if (base) {
                Object.assign(obj, base);
            }
            // 再在抽象对象中查找
            else {
                base = this.abstracts.get(source);
                if (base) {
                    Object.assign(obj, base);
                } else {
                    // 延迟加载
                    return false;
                }
            }
        }

        // 处理抽象对象
        if (json['abstract']) {
            this.abstracts.set(obj.id, obj);
        }

        return true;
    }
}
```

### 8.2 类型安全的ID系统

```typescript
// 使用 branded types 实现类型安全
export type StringId<T> = string & { readonly __brand: unique symbol };
export type IntId<T> = number & { readonly __brand: unique symbol };

// ID创建函数
export function createStringId<T>(id: string): StringId<T> {
    return id as StringId<T>;
}

export function createIntId<T>(id: number): IntId<T> {
    return id as IntId<T>;
}

// ID工厂
export class IdFactory<T> {
    private stringToInt = new Map<string, number>();
    private intToString = new Map<number, string>();
    private nextId = 0;

    intern(str: string): IntId<T> {
        let id = this.stringToInt.get(str);
        if (id === undefined) {
            id = this.nextId++;
            this.stringToInt.set(str, id);
            this.intToString.set(id, str);
        }
        return id as IntId<T>;
    }

    getString(id: IntId<T>): string {
        return this.intToString.get(id) || '';
    }
}
```

### 8.3 JSON加载器

```typescript
export interface JsonObject {
    [key: string]: any;
}

export class DataLoader {
    private factories = new Map<string, GenericFactory<any>>();

    registerFactory(type: string, factory: GenericFactory<any>): void {
        this.factories.set(type, factory);
    }

    async loadFromPath(path: string): Promise<void> {
        const files = await this.findJsonFiles(path);

        for (const file of files) {
            await this.loadFile(file);
        }
    }

    async loadFile(filePath: string): Promise<void> {
        const content = await fs.readFile(filePath, 'utf-8');
        const json = JSON.parse(content) as JsonObject[];

        for (const obj of json) {
            this.loadObject(obj);
        }
    }

    loadObject(json: JsonObject): void {
        const type = json['type'];
        const factory = this.factories.get(type);

        if (factory) {
            factory.load(json);
        } else {
            console.warn(`Unknown type: ${type}`);
        }
    }

    private async findJsonFiles(path: string): Promise<string[]> {
        // 递归查找所有.json文件
    }

    async finalize(): Promise<void> {
        // 处理延迟加载的对象
        // 验证数据一致性
    }
}
```

---

*本文档基于 Cataclysm-DDA 源代码分析生成*
