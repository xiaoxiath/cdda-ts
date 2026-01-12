# Cataclysm-DDA 战斗与效果系统分析报告

## 系统概览

Cataclysm-DDA 的战斗和效果系统是一个高度模块化的设计，采用数据驱动的方式实现了复杂的伤害计算、战斗机制和状态效果系统。

## 一、伤害系统

### 1.1 核心数据结构

#### damage_type - 伤害类型定义

**位置**: `src/damage.h`

```cpp
struct damage_type {
    damage_type_id id;                    // 类型ID
    translation name;                     // 显示名称
    std::vector<effect_on_condition_id> onhit_eocs;     // 命中时触发的效果
    std::vector<effect_on_condition_id> ondamage_eocs;  // 造成伤害时触发的效果
    skill_id skill;                       // 相关技能
    cata::flat_set<std::string> immune_flags;          // 免疫标记
    cata::flat_set<std::string> mon_immune_flags;      // 怪物免疫标记
    nc_color magic_color;                 // 魔法颜色
    bool melee_only;                      // 仅近战
    bool physical;                        // 物理伤害
    bool no_resist;                       // 不可抵抗
    bool edged;                           // 锐利伤害
    bool env;                             // 环境伤害
    bool material_required;               // 需要材料
};
```

#### damage_unit - 最小伤害单位

```cpp
struct damage_unit {
    damage_type_id type;           // 伤害类型
    float amount;                  // 伤害量
    float res_pen;                 // 护甲穿透值
    float res_mult;                // 护甲穿透倍率
    float damage_multiplier;       // 伤害倍率
    float unconditional_res_mult;  // 无条件护甲倍率
    float unconditional_damage_mult; // 无条件伤害倍率
    std::vector<barrel_desc> barrels; // 枪管长度描述
};
```

#### damage_instance - 伤害实例

```cpp
struct damage_instance {
    std::vector<damage_unit> damage_units;  // 多个伤害单元组合

    // 核心方法
    void mult_damage(double multiplier, bool pre_armor = false);
    void mult_type_damage(double multiplier, const damage_type_id &dt);
    void add_damage(const damage_type_id &dt, float amt, ...);
    damage_instance di_considering_length(units::length barrel_length) const;

    // 效果应用
    void onhit_effects(Creature *source, Creature *target) const;
    void ondamage_effects(Creature *source, Creature *target,
                         const damage_instance &premitigated,
                         bodypart_str_id bp) const;
};
```

#### resistances - 抗性系统

```cpp
struct resistances {
    std::unordered_map<damage_type_id, float> resist_vals;

    // 构造函数
    explicit resistances(const item &armor, bool to_self = false,
                        int roll = 0, const bodypart_id &bp = bodypart_id());
    explicit resistances(monster &monster);

    float get_effective_resist(const damage_unit &du) const;
    resistances operator*(float mod) const;
};
```

### 1.2 伤害计算流程

```
1. 伤害实例创建
   ↓
2. 护甲穿透计算
   - res_pen: 固定穿透值
   - res_mult: 穿透倍率
   ↓
3. 抗性评估
   - get_effective_resist()
   - 考虑 unconditional_res_mult
   ↓
4. 伤害应用
   - damage_multiplier 修正
   - unconditional_damage_mult 修正
   ↓
5. 效果触发
   - onhit_eocs (命中时)
   - ondamage_eocs (造成伤害时)
```

## 二、弹道系统

### 2.1 核心结构

**位置**: `src/ballistics.h`

#### projectile_attack_aim - 攻击瞄准结果

```cpp
struct projectile_attack_aim {
    double missed_by;          // 命中质量 (0.0=完美命中, 1.0=完全失误)
    double missed_by_tiles;    // 失误的格数
    double dispersion;         // 本次射击的散布值（角分）
};
```

#### targeting_graph - 目标选择图

```cpp
template<typename T, typename Wrapper>
class targeting_graph {
    // 用于选择攻击哪个身体部位
    // T: 部位类型
    // Wrapper: 需实现两个静态函数
    //   - T Wrapper::connection(const T &) - 获取连接的部位
    //   - double Wrapper::weight(const T &) - 获取部位权重

    void generate(const T &center, const std::vector<T> &parts);
    T select(double range_min, double range_max, double value) const;
};
```

## 三、远程攻击系统

### 3.1 projectile - 抛射物

**位置**: `src/projectile.h`

```cpp
struct projectile {
    damage_instance impact;           // 撞击伤害
    int speed;                        // 闪避难度
    int range;                        // 射程
    int count;                        // 抛射物数量
    bool multishot;                   // 是否多重射击
    int shot_spread;                  // 弹丸间散布
    damage_instance shot_impact;      // 单发伤害
    float critical_multiplier;        // 暴击倍率
    std::set<ammo_effect_str_id> proj_effects; // 弹药效果

    // 效果应用
    void apply_effects_damage(Creature &target, Creature *source,
                             const dealt_damage_instance &dealt_dam,
                             bool critical) const;
};
```

### 3.2 远程攻击流程

```
1. 瞄准阶段
   - 计算稳定性
   - spend_moves aiming
   ↓
2. 散布计算
   - dispersion_sources 累积
   - 考虑后坐力、技能等
   ↓
3. 抛射物发射
   - projectile_attack()
   - 轨迹追踪
   ↓
4. 命中判定
   - 部位选择
   - 闪避检定
   ↓
5. 效果应用
   - apply_ammo_effects()
   - 伤害结算
   - 场地效果生成
```

## 四、近战攻击系统

**位置**: `src/melee.h`

### 4.1 melee_statistic_data - 统计数据

```cpp
struct melee_statistic_data {
    int attack_count;        // 攻击次数
    int hit_count;           // 命中次数
    int double_crit_count;   // 双重暴击次数
    int crit_count;          // 暴击次数
    int actual_crit_count;   // 实际暴击次数
    double double_crit_chance; // 双重暴击率
    double crit_chance;      // 暴击率
    int damage_amount;       // 伤害总量
};
```

### 4.2 近战机制

```
1. 攻击类型判定
   - melee_hit_range()
   - 根据伤害类型判定 (BASH/CUT/STAB)
   ↓
2. 命中检定
   - 考虑精度、闪避
   ↓
3. 暴击判定
   - crit_chance
   - double_crit_chance
   ↓
4. 弱点打击
   - weakpoint_attack
   - 部位选择
   ↓
5. 伤害计算
   - damage_instance 应用
   - 护甲抗性
   ↓
6. 效果触发
   - onhit_effects
   - ondamage_effects
```

## 五、效果系统

### 5.1 effect_type - 效果类型定义

**位置**: `src/effect.h`

```cpp
class effect_type {
    efftype_id id;

    // 强度和持续时间
    int max_intensity;           // 最大强度
    int max_effective_intensity; // 最大有效强度
    time_duration max_duration;  // 最大持续时间

    // 衰减机制
    int dur_add_perc;            // 持续时间增加百分比
    int int_add_val;             // 强度增加值
    int int_decay_step;          // 强度衰减步长
    int int_decay_tick;          // 衰减间隔
    time_duration int_dur_factor; // 强度持续时间因子
    bool int_decay_remove;       // 衰减时移除

    // 免疫和移除
    std::vector<trait_id> resist_traits;
    std::vector<efftype_id> resist_effects;
    std::vector<efftype_id> removes_effects;
    std::vector<efftype_id> blocks_effects;

    // 修饰符数据
    std::unordered_map<std::string,
        std::unordered_map<uint32_t, modifier_value_arr>> mod_data;

    // 维生素和肢体分数
    std::vector<vitamin_rate_effect> vitamin_data;
    std::vector<limb_score_effect> limb_score_data;

    // 显示和消息
    std::vector<translation> name;
    std::vector<translation> desc;
    std::vector<std::pair<translation, game_message_type>> decay_msgs;
    std::vector<std::pair<translation, game_message_type>> apply_msgs;
};
```

### 5.2 effect - 效果实例

```cpp
class effect {
    const effect_type *eff_type;
    time_duration duration;      // 剩余持续时间
    bodypart_str_id bp;          // 目标身体部位
    bool permanent;              // 是否永久
    int intensity;               // 当前强度
    time_point start_time;       // 开始时间
    effect_source source;        // 效果来源

    // 核心方法
    void decay(std::vector<efftype_id> &rem_ids,
              std::vector<bodypart_id> &rem_bps,
              const time_point &time, bool player);

    // 获取修饰符值
    int get_mod(const std::string &arg, bool reduced = false) const;
    int get_amount(const std::string &arg, bool reduced = false) const;
    int get_min_val(const std::string &arg, bool reduced = false) const;
    int get_max_val(const std::string &arg, bool reduced = false) const;

    // 激活检定
    bool activated(const time_point &when, const std::string &arg,
                  int val, bool reduced = false, double mod = 1) const;
};
```

### 5.3 effects_map - 效果集合

```cpp
class effects_map : public
    std::map<efftype_id, std::map<bodypart_id, effect>>
{
    // 双层映射：效果类型 -> 身体部位 -> 效果实例
    // 支持同一效果在不同身体部位的独立实例
};
```

### 5.4 效果系统工作流程

```
1. 效果应用
   - 检查免疫 (resist_traits, resist_effects)
   - 检查阻断 (blocks_effects)
   - 处理移除 (removes_effects)
   ↓
2. 效果叠加
   - dur_add_perc: 持续时间百分比
   - int_add_val: 强度增加值
   ↓
3. 效果衰减
   - 每tick调用 decay()
   - 强度衰减 (int_decay_step)
   - 持续时间减少
   ↓
4. 效果激活
   - activated() 检定
   - 应用修饰符 (get_mod)
   - 触发效果
   ↓
5. 效果移除
   - 持续时间 <= 0
   - int_decay_remove 且强度 <= 0
```

## 六、场地效果系统

### 6.1 field_type - 场地类型

**位置**: `src/field_type.h`

```cpp
struct field_type {
    field_type_str_id id;
    std::vector<field_intensity_level> intensity_levels;

    // 衰变机制
    time_duration underwater_age_speedup;   // 水下加速
    time_duration outdoor_age_speedup;      // 室外加速
    int decay_amount_factor;                // 衰减系数
    time_duration half_life;                // 半衰期
    bool accelerated_decay;                 // 加速衰减
    bool linear_half_life;                  // 线性半衰期

    // 扩散机制
    int percent_spread;                     // 扩散百分比
    phase_id phase;                         // 相态 (GAS/LIQUID/SOLID)

    // 属性
    bool dangerous;                         // 危险
    bool transparent;                       // 透明
    bool has_fire;                          // 有火
    bool has_acid;                          // 有酸
    bool has_elec;                          // 有电
    bool moppable;                          // 可清理

    // 显示
    description_affix desc_affix;           // 描述前缀
    int priority;                           // 优先级
    bool display_items;                     // 显示物品
    bool display_field;                     // 显示场地
    field_type_str_id wandering_field;      // 游荡场地
};
```

### 6.2 field_intensity_level - 强度等级

```cpp
struct field_intensity_level {
    translation name;                       // 名称
    uint32_t symbol;                        // 符号
    nc_color color;                         // 颜色

    bool dangerous;                         // 危险
    bool transparent;                       // 透明
    int move_cost;                          // 移动消耗
    float light_emitted;                    // 发光
    float translucency;                     // 半透明度
    int concentration;                      // 浓度

    // 辐射
    int extra_radiation_min;
    int extra_radiation_max;
    int radiation_hurt_damage_min;
    int radiation_hurt_damage_max;
    translation radiation_hurt_message;

    // 强度升级
    int intensity_upgrade_chance;
    time_duration intensity_upgrade_duration;

    // 怪物生成
    int monster_spawn_chance;
    int monster_spawn_count;
    int monster_spawn_radius;
    mongroup_id monster_spawn_group;

    // 效果
    std::vector<field_effect> field_effects;
};
```

### 6.3 field_entry - 场地实例

```cpp
class field_entry {
    field_type_id type;                     // 类型
    int intensity;                          // 强度
    time_duration age;                      // 年龄
    time_point decay_time;                  // 衰变时间
    bool is_alive;                          // 存活

    // 方法
    void initialize_decay();
    void do_decay();
    std::vector<field_effect> field_effects() const;
};
```

### 6.4 场地效果工作流程

```
1. 场地创建
   - add_field()
   - 初始化强度和年龄
   ↓
2. 场地显示
   - displayed_field_type()
   - 优先级系统
   ↓
3. 场地扩散
   - percent_spread 检定
   - 相态检查 (GAS)
   ↓
4. 场地衰变
   - do_decay()
   - 半衰期计算
   - 环境加速
   ↓
5. 效果应用
   - field_effects()
   - 免疫检定
   - 载具检查
   ↓
6. 强度变化
   - intensity_upgrade
   - 怪物生成
   - 辐射伤害
```

## 七、爆炸系统

**位置**: `src/explosion.h`

### 7.1 explosion_data - 爆炸数据

```cpp
struct explosion_data {
    float power;                    // 威力
    float distance_factor;          // 距离衰减系数 (0.8)
    int max_noise;                  // 最大噪音
    bool fire;                      // 是否产生火焰
    shrapnel_data shrapnel;         // 弹片数据

    // 计算方法
    float expected_range(float ratio) const;
    float power_at_range(float dist) const;
    int safe_range() const;
};
```

**威力衰减公式**: `power * factor^distance`

### 7.2 爆炸处理流程

```
1. 爆炸排队
   - queued_explosion
   - 延迟处理
   ↓
2. 爆炸执行
   - _make_explosion()
   - 威力计算
   - 范围确定
   ↓
3. 爆炸效果
   - 冲击波
   - 火焰
   - 弹片
   ↓
4. 伤害应用
   - power_at_range()
   - 多个目标
   ↓
5. 场地效果
   - 创建 smoke/fire 场地
   - 冲击波场地
   ↓
6. 视觉效果
   - draw_explosion()
   - 颜色渐变
```

## 八、TypeScript 实现建议

### 8.1 伤害系统

```typescript
// 伤害单位
export interface DamageUnit {
    type: DamageTypeId;
    amount: number;
    resPen: number;
    resMult: number;
    damageMultiplier: number;
    unconditionalResMult: number;
    unconditionalDamageMult: number;
}

// 伤害实例
export class DamageInstance {
    damageUnits: DamageUnit[] = [];

    multDamage(multiplier: number, preArmor: boolean): void {
        // 实现伤害倍率调整
    }

    addDamage(type: DamageTypeId, amount: number, ...): void {
        // 实现添加伤害
    }

    onhitEffects(source: Creature, target: Creature): void {
        // 实现命中效果
    }

    ondamageEffects(source: Creature, target: Creature,
                    premitigated: DamageInstance,
                    bp: BodyPartId): void {
        // 实现伤害效果
    }
}

// 抗性
export class Resistances {
    resistVals = new Map<DamageTypeId, number>();

    constructor(armor: Item, toSelf: boolean = false,
                roll: number = 0, bp: BodyPartId = BodyPartId.Torso) {
        // 实现抗性计算
    }

    getEffectiveResist(du: DamageUnit): number {
        // 实现有效抗性计算
    }
}
```

### 8.2 效果系统

```typescript
// 效果类型
export class EffectType {
    id: EffectTypeId;
    maxIntensity: number;
    maxEffectiveIntensity: number;
    maxDuration: TimeDuration;

    durAddPerc: number;
    intAddVal: number;
    intDecayStep: number;
    intDecayTick: number;
    intDurFactor: TimeDuration;
    intDecayRemove: boolean;

    resistTraits: TraitId[] = [];
    resistEffects: EffectTypeId[] = [];
    removesEffects: EffectTypeId[] = [];
    blocksEffects: EffectTypeId[] = [];

    modData = new Map<string, Map<number, ModifierValue[]>>();

    vitaminData: VitaminRateEffect[] = [];
    limbScoreData: LimbScoreEffect[] = [];

    name: string[] = [];
    desc: string[] = [];
    decayMsgs: Array<[string, GameMessageType]> = [];
    applyMsgs: Array<[string, GameMessageType]> = [];

    getModValue(type: string, action: ModAction,
                reductionLevel: number, intensity: number): number {
        // 实现修饰符值获取
    }
}

// 效果实例
export class Effect {
    effType: EffectType;
    duration: TimeDuration;
    bp: BodyPartId;
    permanent: boolean;
    intensity: number;
    startTime: TimePoint;
    source: EffectSource;

    decay(remIds: EffectTypeId[], remBps: BodyPartId[],
          time: TimePoint, player: boolean): void {
        // 实现效果衰减
    }

    getMod(arg: string, reduced: boolean): number {
        // 实现修饰符获取
    }

    getAmount(arg: string, reduced: boolean): number {
        // 实现数量获取
    }

    activated(when: TimePoint, arg: string, val: number,
              reduced: boolean, mod: number): boolean {
        // 实现激活检定
    }
}

// 效果集合
export class EffectsMap extends Map<EffectTypeId, Map<BodyPartId, Effect>> {
    // 双层映射：效果类型 -> 身体部位 -> 效果实例
}
```

### 8.3 场地效果

```typescript
// 场地类型
export class FieldType {
    id: FieldTypeId;
    intensityLevels: FieldIntensityLevel[] = [];

    underwaterAgeSpeedup: TimeDuration;
    outdoorAgeSpeedup: TimeDuration;
    decayAmountFactor: number;
    halfLife: TimeDuration;
    acceleratedDecay: boolean;
    linearHalfLife: boolean;

    percentSpread: number;
    phase: PhaseId;

    dangerous: boolean;
    transparent: boolean;
    hasFire: boolean;
    hasAcid: boolean;
    hasElec: boolean;
    moppable: boolean;

    descAffix: DescriptionAffix;
    priority: number;
    displayItems: boolean;
    displayField: boolean;
    wanderingField: FieldTypeId;

    getIntensityLevel(level: number): FieldIntensityLevel {
        return this.intensityLevels[level] || this.intensityLevels[0];
    }
}

// 场地实例
export class FieldEntry {
    type: FieldTypeId;
    intensity: number;
    age: TimeDuration;
    decayTime: TimePoint;
    isAlive: boolean;

    initializeDecay(): void {
        // 实现衰变初始化
    }

    doDecay(): void {
        // 实现衰变
    }

    fieldEffects(): FieldEffect[] {
        // 实现场地效果获取
    }
}

// 场地集合
export class Field {
    fieldTypeList = new Map<FieldTypeId, FieldEntry>();
    displayedFieldType: FieldTypeId | null = null;

    findField(fieldTypeToFind: FieldTypeId, aliveOnly: boolean = true): FieldEntry | null {
        // 实现场地查找
    }

    addField(fieldTypeToAdd: FieldTypeId,
             newIntensity: number = 1,
             newAge: TimeDuration = TimeDuration.zero()): boolean {
        // 实现场地添加
    }

    removeField(fieldTypeToRemove: FieldTypeId): boolean {
        // 实现场地移除
    }

    displayedFieldType(): FieldTypeId | null {
        // 实现显示场地类型
    }

    displayedIntensity(): number {
        // 实现显示强度
    }

    totalMoveCost(): number {
        // 实现总移动消耗
    }
}
```

---

*本文档基于 Cataclysm-DDA 源代码分析生成*
