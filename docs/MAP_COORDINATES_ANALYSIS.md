# Cataclysm-DDA 地图与坐标系统分析报告

## 一、坐标系统设计原理

### 1.1 核心设计理念

Cataclysm-DDA 采用了**类型安全的坐标系统**，这是一个现代化的 C++ 设计，通过类型系统在编译期防止坐标转换错误。

**关键设计特点**:
- **强类型坐标**: 不同的坐标系统和尺度通过类型区分
- **模板化实现**: 使用模板参数 `origin`（原点）和 `scale`（尺度）来定义坐标类型
- **运行时零开销**: 所有类型检查都在编译期完成

### 1.2 坐标命名规则

坐标类型命名遵循严格的格式：`(tri)point_<origin>_<scale>(_ib)`

**示例解析**:
```cpp
tripoint_abs_ms    // 3D绝对坐标，地图方块尺度
point_rel_sm       // 2D相对坐标，子地图尺度
point_bub_ms_ib    // 2D气泡坐标，地图方块尺度，保证在界内
```

**组成部分**:
1. **dimension**: `point` (2D) 或 `tripoint` (3D)
2. **origin**: 坐标原点类型
3. **scale**: 坐标尺度
4. **_ib** (可选): 表示保证在边界内 (in-bounds)

## 二、坐标尺度系统

### 2.1 尺度层次结构

```
map_square (ms)  ← 最精细，单个游戏格子
    ↓ ×12
submap (sm)       ← 12×12 地图方块，加载/保存单位
    ↓ ×2
overmap_terrain (omt) ← 2×2 子地图，地图生成单位
    ↓ ×180
overmap (om)      ← 180×180 overmap terrain，大地图
    ↓ ×32
segment (seg)     ← 仅用于保存/加载
```

### 2.2 尺度常量

**位置**: `src/map_scale_constants.h`

```cpp
// 子地图大小
constexpr int SEEX = 12;
constexpr int SEEY = SEEX;

// 现实气泡大小（以子地图为单位）
constexpr int MAPSIZE = 11;
constexpr int MAPSIZE_X = SEEX * MAPSIZE;  // 132
constexpr int MAPSIZE_Y = SEEY * MAPSIZE;  // 132

// 大地图大小
constexpr int OMAPX = 180;
constexpr int OMAPY = OMAPX;

// 段大小（用于保存）
constexpr int SEG_SIZE = 32;

// Z轴范围
constexpr int OVERMAP_DEPTH = 10;
constexpr int OVERMAP_HEIGHT = 10;
constexpr int OVERMAP_LAYERS = 21;
```

### 2.3 尺度转换实现

**位置**: `src/coordinates.h`

```cpp
// 简单尺度转换
template<scale ResultScale, typename Point, origin Origin, scale SourceScale>
CATA_FORCEINLINE auto project_to(const coord_point_ob<Point, Origin, SourceScale> src)
{
    constexpr int scale_down = map_squares_per(ResultScale) / map_squares_per(SourceScale);
    constexpr int scale_up = map_squares_per(SourceScale) / map_squares_per(ResultScale);
    return project_to_impl<scale_up, scale_down, ResultScale>()(src);
}

// 带余数的尺度转换
template<scale ResultScale, origin Origin, scale SourceScale, ...>
CATA_FORCEINLINE quotient_remainder_point<Origin, ResultScale, SourceScale, InBounds>
project_remain(const coord<point, Origin, SourceScale> src)
{
    constexpr int ScaleDown = map_squares_per(ResultScale) / map_squares_per(SourceScale);
    coord_point<point, Origin, ResultScale, InBounds> quotient = project_to<ResultScale>(src);
    remainder_inbounds_t<point, RemainderOrigin, SourceScale, InBounds> remainder =
        remainder_inbounds_t<...>::make_unchecked(src.raw() - quotient.raw() * ScaleDown);
    return { quotient, remainder };
}

// 组合坐标
template<typename PointL, typename PointR, origin CoarseOrigin, scale CoarseScale,
         origin FineOrigin, scale FineScale>
inline auto project_combine(
    const coord_point_ob<PointL, CoarseOrigin, CoarseScale> &coarse,
    const coord_point_ob<PointR, FineOrigin, FineScale> &fine)
{
    const coord_point_ob<PointL, CoarseOrigin, FineScale> refined_coarse =
        project_to<FineScale>(coarse);
    return coord_point<PointResult, CoarseOrigin, FineScale>::make_unchecked(
               refined_coarse.raw() + fine.raw());
}
```

## 三、原点系统

### 3.1 原点类型

**位置**: `src/coords_fwd.h`

```cpp
enum class origin {
    relative,        // 相对坐标，可以加到任何其他原点
    abs,            // 全局绝对坐标原点
    submap,         // 相对于子地图角
    overmap_terrain,// 相对于overmap terrain角
    overmap,        // 相对于大地图角
    reality_bubble, // 相对于现实气泡角
};
```

### 3.2 原点与尺度的关系

```cpp
constexpr origin origin_from_scale(scale s) {
    switch(s) {
        case scale::submap:           return origin::submap;
        case scale::overmap_terrain:  return origin::overmap_terrain;
        case scale::overmap:          return origin::overmap;
        default: constexpr_fatal(origin::abs, "Requested origin for scale %d", s);
    }
}
```

## 四、地图层次结构

### 4.1 地图类层次

```
overmapbuffer (全局管理器)
    ↓
overmap (单个大地图，180×180 OMT)
    ↓
overmap terrain (OMT，2×2 SM)
    ↓
submap (SM，12×12 MS)
    ↓
map tile (单个格子)
```

### 4.2 Submap 系统

**位置**: `src/submap.h`

#### SOA (Structure of Arrays) 数据布局

```cpp
struct maptile_soa {
    cata::mdarray<ter_id, point_sm_ms>             ter;  // 地形
    cata::mdarray<furn_id, point_sm_ms>            frn;  // 家具
    cata::mdarray<std::uint8_t, point_sm_ms>       lum;  // 光照
    cata::mdarray<cata::colony<item>, point_sm_ms> itm;  // 物品
    cata::mdarray<field, point_sm_ms>              fld;  // 场
    cata::mdarray<trap_id, point_sm_ms>            trp;  // 陷阱
    cata::mdarray<int, point_sm_ms>                rad;  // 辐射
};
```

#### Uniform 优化

```cpp
class submap {
    std::unique_ptr<maptile_soa> m;  // nullptr 表示 uniform submap
    ter_id uniform_ter = t_null;     // uniform submap 的统一地形

    bool is_uniform() const {
        return !static_cast<bool>(m);
    }

    void ensure_nonuniform() {
        if(is_uniform()) {
            m = std::make_unique<maptile_soa>();
            // 初始化所有格子
        }
    }
};
```

**设计优势**:
- **内存优化**: 空白区域（如野外）只需存储一个地形ID
- **缓存友好**: SOA布局提高内存访问效率
- **延迟初始化**: 只在需要时才分配完整数据

### 4.3 Map 类

**位置**: `src/map.h`

#### 核心职责
- 管理 MAPSIZE×MAPSIZE (11×11) 的子地图网格
- 提供本地坐标访问接口
- 处理地图更新和事件

#### 关键接口

```cpp
class map {
    // 获取子地图
    submap *get_submap_at(const tripoint_bub_ms &p);
    submap *get_submap_at_grid(const tripoint_rel_sm &gridp);

    // 坐标转换
    tripoint_abs_ms getglobal(const tripoint_bub_ms &p) const;
    tripoint_bub_ms get_bub(const tripoint_abs_ms &p) const;
};
```

## 五、缓存机制

### 5.1 MapBuffer (地图缓冲)

**位置**: `src/mapbuffer.h`

```cpp
class mapbuffer {
private:
    using submap_map_t = std::map<tripoint_abs_sm, std::unique_ptr<submap>>;
    submap_map_t submaps;  // 全局子地图缓存

public:
    // 添加子地图到缓冲
    bool add_submap(const tripoint_abs_sm &p, std::unique_ptr<submap> &sm);

    // 查找子地图（自动加载）
    submap *lookup_submap(const tripoint_abs_sm &p);

    // 保存所有子地图
    void save(bool delete_after_save = false);

    // 清除缓冲
    void clear();
    void clear_outside_reality_bubble();
};
```

**缓存策略**:
1. **分层存储**: 子地图按 segment (32×32 OMT) 组织
2. **按需加载**: 访问时自动从磁盘加载
3. **LRU 淘汰**: 超出容量时移除不活跃的子地图
4. **保存优化**: uniform submap 不保存，运行时重新生成

### 5.2 Map Memory (地图记忆)

**位置**: `src/map_memory.h`

```cpp
class map_memory {
private:
    std::map<tripoint_abs_sm, shared_ptr_fast<mm_submap>> submaps;

    // 缓存系统
    mutable std::map<int, std::vector<shared_ptr_fast<mm_submap>>> cached;
    tripoint_abs_sm cache_pos;
    point cache_size;

public:
    // 准备区域（加载到缓存）
    bool prepare_region(const tripoint_abs_ms &p1, const tripoint_abs_ms &p2);

    // 记忆操作
    const memorized_tile &get_tile(const tripoint_abs_ms &pos) const;
    void set_tile_terrain(const tripoint_abs_ms &pos, std::string_view id,
                         int subtile, int rotation);
    void set_tile_symbol(const tripoint_abs_ms &pos, char32_t symbol);
};
```

### 5.3 Overmapbuffer (大地图缓冲)

**位置**: `src/overmapbuffer.h`

```cpp
class overmapbuffer {
private:
    std::map<point_abs_om, std::unique_ptr<overmap>> overmaps;

public:
    // 获取大地图（自动创建）
    overmap &get(const point_abs_om &);

    // 地形查询
    const oter_id &ter(const tripoint_abs_omt &p);
    const oter_id &ter_existing(const tripoint_abs_omt &p);

    // 查找功能
    city_reference find_closest_city(const tripoint_abs_sm &loc, int radius);
    camp_reference find_closest_camp(const tripoint_abs_sm &loc, int radius);
    radio_tower_reference find_closest_radio(const tripoint_abs_sm &loc, int radius);
};
```

## 六、地图生成系统

### 6.1 Mapgen 架构

**位置**: `src/mapgen.h`

#### 生成函数层次

```cpp
// 基类
class mapgen_function {
    virtual void generate(mapgendata &) = 0;
    virtual mapgen_parameters get_mapgen_params(mapgen_parameter_scope) const;
};

// 内置生成函数
class mapgen_function_builtin : public virtual mapgen_function {
    building_gen_pointer fptr;  // C++ 函数指针
    void generate(mapgendata &mgd) override;
};

// JSON 定义生成函数
class mapgen_function_json : public mapgen_function_json_base,
                             public virtual mapgen_function {
    std::vector<jmapgen_setmap> setmap_points;
    jmapgen_objects objects;
    mapgen_parameters parameters;

    void generate(mapgendata &) override;
};
```

### 6.2 Mapgen 阶段

```cpp
enum class mapgen_phase {
    removal,        // 移除阶段
    terrain,        // 地形放置
    furniture,      // 家具放置
    default_,       // 默认处理
    nested_mapgen,  // 嵌套生成
    transform,      // 变换
    faction_ownership, // 阵营所有权
    zones,          // 区域定义
    last
};
```

### 6.3 Palette 系统

```cpp
class mapgen_palette {
public:
    using placing_map = std::unordered_map<map_key,
        std::vector<shared_ptr_fast<const jmapgen_piece>>>;

    palette_id id;
    std::unordered_set<map_key> keys_with_terrain;
    placing_map format_placings;
    mapgen_parameters parameters;

    // 递归加载 palette
    void add(const mapgen_palette &rh, const add_palette_context &);
};
```

## 七、TypeScript 实现建议

### 7.1 坐标系统

```typescript
// 坐标尺度枚举
export enum Scale {
    MapSquare = 'ms',
    Submap = 'sm',
    OvermapTerrain = 'omt',
    Overmap = 'om',
    Segment = 'seg',
}

// 坐标原点枚举
export enum Origin {
    Relative = 'rel',
    Absolute = 'abs',
    Submap = 'submap',
    OvermapTerrain = 'omt',
    Overmap = 'om',
    RealityBubble = 'bub',
}

// 使用 branded types 实现类型安全
export type PointAbsMs = { readonly __brand: unique symbol };
export type TripointAbsMs = { readonly __brand: unique symbol };
export type PointRelSm = { readonly __brand: unique symbol };
// ... 更多坐标类型

// 坐标转换工具
export class CoordinateConverter {
    static projectTo<ResultScale extends Scale>(
        point: Point<Origin, SourceScale>
    ): Point<Origin, ResultScale> {
        // 实现尺度转换
    }

    static projectCombine<CoarseOrigin extends Origin, FineOrigin extends Origin>(
        coarse: Point<CoarseOrigin, CoarseScale>,
        fine: Point<FineOrigin, FineScale>
    ): Point<CoarseOrigin, FineScale> {
        // 实现坐标组合
    }
}
```

### 7.2 Submap 系统

```typescript
export interface MapTileSoA {
    ter: Int16Array;      // 地形 ID 数组
    frn: Int16Array;      // 家具 ID 数组
    lum: Uint8Array;      // 光照数组
    itm: Item[][];        // 物品数组
    fld: FieldEntry[][];  // 场数组
    trp: Int16Array;      // 陷阱 ID 数组
    rad: Int32Array;      // 辐射数组
}

export class Submap {
    private soa: MapTileSoA | null = null;
    public uniformTer: TerrainId = 't_null';

    isUniform(): boolean {
        return this.soa === null;
    }

    ensureNonUniform(): void {
        if (this.isUniform()) {
            this.soa = this.createSoA();
        }
    }

    private createSoA(): MapTileSoA {
        const size = SEEX * SEEY;
        return {
            ter: new Int16Array(size),
            frn: new Int16Array(size),
            lum: new Uint8Array(size),
            itm: Array.from({ length: size }, () => []),
            fld: Array.from({ length: size }, () => []),
            trp: new Int16Array(size),
            rad: new Int32Array(size),
        };
    }
}
```

### 7.3 地图缓冲

```typescript
export class MapBuffer {
    private submaps = new Map<string, Submap>();
    private lruCache: LRUCache<string, Submap>;

    addSubmap(pos: TripointAbsSm, sm: Submap): void {
        const key = this.posToKey(pos);
        this.submaps.set(key, sm);
        this.lruCache.set(key, sm);
    }

    lookupSubmap(pos: TripointAbsSm): Submap | null {
        const key = this.posToKey(pos);
        let sm = this.submaps.get(key);
        if (!sm) {
            sm = this.loadFromDisk(pos);
            if (sm) {
                this.submaps.set(key, sm);
            }
        }
        return sm || null;
    }

    private posToKey(pos: TripointAbsSm): string {
        return `${pos.x},${pos.y},${pos.z}`;
    }
}
```

---

*本文档基于 Cataclysm-DDA 源代码分析生成*
