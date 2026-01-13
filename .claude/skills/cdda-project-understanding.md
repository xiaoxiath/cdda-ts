# Cataclysm-DDA 项目理解 Skill

## 项目概述

Cataclysm: Dark Days Ahead (CDDA) 是一个开源的回合制生存 Roguelike 游戏，设定在后末日世界。

### 项目规模
- **源代码**: 840个 C++ 源文件，约564,840行代码
- **数据文件**: 6,220个 JSON 配置文件
- **支持语言**: 20+种语言
- **项目大小**: 约195MB（源码29MB + 数据107MB + 图形资源59MB）

### 技术栈
- **语言**: C++17
- **构建**: CMake 3.20+ / Make
- **渲染**: SDL2（图形）+ NCurses（终端）
- **数据驱动**: JSON 配置系统
- **测试**: Catch2
- **国际化**: Gettext

---

## 目录结构

```
Cataclysm-DDA/
├── src/                    # 核心C++源代码（29MB）
│   ├── game.cpp/h          # 游戏主循环和状态管理（556KB）
│   ├── item.cpp/h          # 物品系统（588KB最大文件）
│   ├── character.cpp/h     # 角色系统（495KB）
│   ├── mapgen.cpp/h        # 地图生成（394KB）
│   ├── avatar.cpp/h        # 玩家角色
│   ├── npc.cpp/h           # NPC系统
│   ├── monster.cpp/h       # 怪物系统
│   ├── vehicle.cpp/h       # 载具系统
│   ├── crafting.cpp/h      # 制作系统
│   ├── map.cpp/h           # 地图核心（380KB）
│   ├── overmap.cpp/h       # 世界地图（320KB）
│   ├── calendar.cpp/h      # 时间日历
│   ├── weather.cpp/h       # 天气系统
│   ├── mission.cpp/h       # 任务系统
│   ├── faction.cpp/h       # 派系系统
│   ├── sdltiles.cpp/h      # SDL瓦片渲染
│   ├── cursesport.cpp/h    # curses终端渲染
│   ├── init.cpp/h          # 初始化和数据加载
│   ├── savegame*.cpp       # 存档系统
│   ├── input.cpp/h         # 输入处理
│   ├── output.cpp/h        # 输出处理
│   └── third-party/        # 第三方库（flatbuffers, imgui, zstd等）
│
├── data/                   # 游戏数据
│   ├── json/               # JSON配置文件（6,220个）
│   │   ├── items/          # 物品定义（46个子目录）
│   │   ├── monsters/       # 怪物定义（66个子目录）
│   │   ├── recipes/        # 配方（26个子目录）
│   │   ├── mapgen/         # 地图生成（323个子目录）
│   │   ├── mutations/      # 变异（15个子目录）
│   │   ├── npcs/           # NPC（82个子目录）
│   │   ├── vehicles/       # 载具（17个子目录）
│   │   ├── skills.json     # 技能定义
│   │   └── professions.json # 职业（320KB）
│   └── mods/               # 模组（40+个内置模组）
│
├── gfx/                    # 图形资源（59MB）
│   ├── tile_config.json    # 瓦片配置
│   └── [瓦片集目录]        # 18个瓦片集
│
├── lang/                   # 多语言翻译
│   ├── po/                 # 翻译源文件
│   └── mo/                 # 编译后的翻译
│
├── tests/                  # 单元测试（200+个测试文件）
├── tools/                  # 开发工具
├── build-scripts/          # 构建脚本
├── doc/                    # 文档
├── CMakeLists.txt          # 主CMake配置
└── Makefile                # 传统Make构建
```

---

## 核心系统架构

### 1. 实体/对象系统

```
viewer (基类)
  └─ Creature (生物基类) - creature.h/cpp
      ├─ monster (怪物类) - monster.h/cpp
      ├─ Character (角色类) - character.h/cpp
      │   ├─ avatar (玩家角色) - avatar.h/cpp
      │   └─ npc (NPC角色) - npc.h/cpp
```

**关键文件**:
- `src/creature.h` - 生物基类，定义所有实体的核心接口
- `src/character.h` - 角色类（玩家和NPC的基类）
- `src/avatar.h` - 玩家角色类
- `src/npc.h` - NPC角色类
- `src/monster.h` - 怪物类

### 2. 游戏循环和更新机制

**主循环入口**: `src/main.cpp`
**核心循环**: `src/do_turn.cpp` 中的 `do_turn()` 函数

**循环结构**:
```cpp
bool do_turn() {
    // 1. 检查游戏状态
    // 2. 处理天气
    // 3. 处理玩家活动
    // 4. 更新所有生物
    // 5. 处理NPC AI
    // 6. 更新地图和移动
    // 7. 处理事件
}
```

**游戏主类**: `src/game.h/cpp` (556KB)

### 3. 地图系统（三层架构）

**Overmap（世界地图）**:
- 文件: `src/overmap.h/cpp` (320KB)
- 作用: 管理整个世界地图（OMT坐标）
- 功能: 城市生成、河流、道路网络、特殊地点放置

**Map（局部地图）**:
- 文件: `src/map.h/cpp` (380KB)
- 作用: 玩家周围的详细地图
- 功能: 动态加载/卸载、子地图系统

**地图生成**:
- 文件: `src/mapgen.h/cpp` (394KB)
- 作用: JSON驱动的地图生成系统
- 功能: 程序生成和预定义地图

**坐标系统**:
- 多尺度坐标: OMT（Overmap Tile）、SM（Submap）、MS（Map Square）
- 自动坐标转换
- 统一的三维坐标系统

### 4. 物品系统

**核心文件**: `src/item.h/cpp` (588KB - 最大的文件)

**系统特性**:
- 统一的物品表示
- 容器和口袋系统
- 物品组合和分解
- 腐烂和变质系统

**辅助文件**:
- `src/item_factory.h` - 物品工厂
- `src/item_group.cpp` - 物品组
- `src/item_location.h` - 物品位置管理

### 5. 制作系统

**核心文件**:
- `src/crafting.h/cpp` - 制作核心
- `src/recipe.h/cpp` - 配方系统
- `src/recipe_dictionary.h/cpp` - 配方字典

**JSON数据**: `data/json/recipes/` (26个子目录)

### 6. JSON 数据驱动系统

**核心加载器**: `src/init.cpp` 中的 `DynamicDataLoader` 类

**数据类型**（100+种）:
- ITEM - 物品定义
- recipe - 配方
- monster - 怪物
- NPC_class - NPC职业
- mutation - 变异
- bionic - 仿生植入物
- martial_art - 武术
- skill - 技能
- trait - 特征
- construction - 建筑
- mapgen - 地图生成

**类型ID系统**: `string_id<T>` 模板类提供类型安全的ID

---

## 构建系统

### CMake 构建

**主要构建选项**:
```cmake
TILES=ON/OFF          # 图形界面（SDL2）
CURSES=ON/OFF         # 终端界面（NCurses）
SOUND=ON/OFF          # 声音支持
LOCALIZE=ON/OFF       # 多语言支持
BACKTRACE=ON/OFF      # 崩溃回溯
TESTS=ON/OFF          # 测试编译
DYNAMIC_LINKING=ON    # 动态链接
```

**构建示例**:
```bash
# Linux 图形版本
mkdir build && cd build
cmake .. -DTILES=ON -DSOUND=ON
make -j$(nproc)

# Windows MSVC
cmake --preset windows-x64-msvc
cmake --build build --config Release

# macOS
cmake .. -DTILES=ON -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64"
make -j$(sysctl -n hw.ncpu)
```

### Makefile 构建

```bash
# Debug 构建
make

# Release 构建
make RELEASE=1

# 自定义选项
make TILES=1 SOUND=1 LOCALIZE=1 RELEASE=1
```

### 平台支持

- **Linux**（主要平台）
- **Windows**（MSYS2, MSVC + vcpkg）
- **macOS**（Homebrew，支持通用二进制）
- **Android**（实验性）
- **WebAssembly**（Emscripten）

---

## 关键开发概念

### 数据驱动架构

游戏采用严格的数据驱动设计，几乎所有游戏内容都通过JSON配置：

**加载顺序**: 见 `doc/LOADING_ORDER.md`

**模组系统**: `data/mods/` 目录，40+个内置模组

**类型安全**: 使用 `string_id<T>` 模板类确保编译时类型检查

### 双渲染引擎

1. **SDL2 瓦片渲染** (`src/sdltiles.cpp`)
   - 图形界面
   - 支持18个瓦片集
   - ImGui集成用于UI

2. **NCurses 终端渲染** (`src/cursesport.cpp`)
   - 纯文本界面
   - 跨平台兼容
   - ImTUI（NCurses版ImGui）

### 存档系统

**核心文件**:
- `src/savegame.cpp` - 存档核心
- `src/savegame_json.cpp` - JSON存档（当前格式）
- `src/savegame_legacy.cpp` - 遗留存档格式支持

### 时间系统

**核心文件**: `src/calendar.h/cpp`

- 精确到秒的模拟时间
- 季节和天气系统 (`src/weather.h/cpp`)
- 事件调度系统 (`src/timed_event.cpp`)

---

## 开发指南

### 代码风格

**配置文件**:
- `.astylerc` - 代码格式化
- `.clang-tidy` - 静态分析
- `doc/CODE_STYLE.md` - 代码风格指南

**格式化命令**:
```bash
make astyle           # 格式化所有源文件
make astyle-check     # 检查代码风格
```

### 测试

**测试框架**: Catch2

**运行测试**:
```bash
# 构建测试
make tests

# 运行测试
make check

# CMake 构建
ctest --test-dir build
```

**测试目录**: `tests/` (200+个测试文件)

### JSON 验证

```bash
# 验证所有JSON文件
make json-check

# 格式化JSON文件
make style-json
```

**工具**: `src/chkjson/chkjson.cpp`

### 文档

**关键文档**:
- `doc/CONTRIBUTING.md` - 贡献指南
- `doc/MODDING.md` - 模组制作
- `doc/JSON_STYLE.md` - JSON风格指南
- `doc/c++/COMPILING.md` - 编译指南
- `doc/JSON/` - JSON数据文档

---

## 常见问题

### Q: 如何添加新物品？

A: 在 `data/json/items/` 对应分类的目录中创建JSON文件：

```json
{
  "type": "ITEM",
  "id": "my_new_item",
  "name": { "str_sp": "我的新物品" },
  "category": "tools",
  "material": [ "steel" ],
  "weight": "500 g",
  "volume": "250 ml"
}
```

### Q: 如何添加新怪物？

A: 在 `data/json/monsters/` 创建JSON文件：

```json
{
  "type": "MONSTER",
  "id": "mon_my_monster",
  "name": { "str": "我的怪物" },
  "description": "一只自定义的怪物",
  "default_faction": "zombie",
  "species": [ "ZOMBIE" ],
  "diff": 3,
  "hp": 50,
  "speed": 90,
  "melee_skill": 4,
  "melee_damage": [ { "damage_amount": 10 } ]
}
```

### Q: 游戏主循环在哪里？

A: `src/do_turn.cpp` 的 `do_turn()` 函数，入口在 `src/main.cpp`。

### Q: 地图生成是如何工作的？

A: `src/mapgen.cpp` 实现地图生成逻辑，配置在 `data/json/mapgen/` (323个子目录)。

### Q: 如何调试构建问题？

A:
1. 检查 `CMakeLists.txt` 中的依赖
2. 使用 `cmake .. -DCMAKE_BUILD_TYPE=Debug` 构建调试版本
3. 查看 `build-scripts/requirements.sh` 确认依赖
4. 检查平台特定的构建脚本

### Q: 最大的源文件是哪个？

A:
1. `src/item.cpp` (588KB) - 物品系统
2. `src/game.cpp` (556KB) - 游戏主类
3. `src/character.cpp` (495KB) - 角色系统
4. `src/mapgen.cpp` (394KB) - 地图生成

### Q: 如何支持新语言？

A:
1. 在 `lang/po/` 创建新的 `.po` 文件
2. 使用 msgfmt 编译为 `.mo` 文件
3. 更新 `lang/CMakeLists.txt` 添加语言代码

---

## 关键文件速查表

| 功能 | 文件路径 | 大小/说明 |
|------|----------|-----------|
| 游戏主循环 | `src/do_turn.cpp` | 回合处理 |
| 游戏主类 | `src/game.h/cpp` | 556KB |
| 物品系统 | `src/item.h/cpp` | 588KB |
| 角色系统 | `src/character.h/cpp` | 495KB |
| 地图生成 | `src/mapgen.h/cpp` | 394KB |
| 地图核心 | `src/map.h/cpp` | 380KB |
| 世界地图 | `src/overmap.h/cpp` | 320KB |
| 玩家角色 | `src/avatar.h/cpp` | - |
| NPC系统 | `src/npc.h/cpp` | - |
| 怪物系统 | `src/monster.h/cpp` | - |
| 载具系统 | `src/vehicle.h/cpp` | - |
| 制作系统 | `src/crafting.h/cpp` | - |
| 时间系统 | `src/calendar.h/cpp` | - |
| 天气系统 | `src/weather.h/cpp` | - |
| 任务系统 | `src/mission.h/cpp` | - |
| 输入处理 | `src/input.h/cpp` | - |
| 输出处理 | `src/output.h/cpp` | - |
| 数据加载 | `src/init.cpp` | DynamicDataLoader |
| 存档系统 | `src/savegame*.cpp` | JSON格式 |
| SDL渲染 | `src/sdltiles.cpp` | 图形界面 |
| Curses渲染 | `src/cursesport.cpp` | 终端界面 |
| 主入口 | `src/main.cpp` | - |
| CMake配置 | `CMakeLists.txt` | - |
| Make构建 | `Makefile` | - |

---

## 设计模式

1. **工厂模式**: item_factory, MonsterGenerator
2. **单例模式**: game实例（全局变量 `g`）
3. **观察者模式**: 事件总线系统
4. **策略模式**: 不同的UI渲染策略
5. **建造者模式**: 复杂对象构建

---

## 扩展资源

- **GitHub**: https://github.com/CleverRaven/Cataclysm-DDA
- **Wiki**: https://cdda.truckingsim.com/wiki
- **论坛**: https://discourse.cataclysmdda.org
- **问题追踪**: GitHub Issues
