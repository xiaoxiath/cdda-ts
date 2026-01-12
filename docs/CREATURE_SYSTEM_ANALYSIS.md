# Cataclysm-DDA 角色/生物系统分析报告

## 一、类继承层次与职责分工

### 1.1 继承层次结构

```
Creature (生物基类)
├── Character (角色类)
│   ├── avatar (玩家角色)
│   └── npc (非玩家角色)
└── monster (怪物类)
```

### 1.2 各类主要职责

#### Creature (生物基类)

**位置**: `src/creature.h`

**核心职责**:
- 所有可活动的生物实体的抽象基类
- 定义统一的生物行为接口

**核心属性**:
```cpp
class Creature {
    tripoint_bub_ms pos;           // 绝对位置坐标
    int moves;                     // 移动点数
    Creature *killer;              // 击杀者
    effects_map effects;           // 效果映射表
    std::map<bodypart_id, bodypart> body;  // 身体部位映射表
    creature_anatomy_id creature_anatomy;  // 解剖结构ID
};
```

**关键方法**:
- **位置管理**: `setpos()`, `move_to()`, `pos_abs()`, `pos_bub()`
- **战斗系统**: `deal_melee_attack()`, `deal_projectile_attack()`, `deal_damage()`
- **效果系统**: `add_effect()`, `remove_effect()`, `has_effect()`, `process_effects()`
- **视觉系统**: `sees()`, `sight_range()`
- **状态查询**: `is_dead_state()`, `is_on_ground()`, `is_underwater()`

#### Character (角色类)

**位置**: `src/character.h`

**核心职责**:
- 具有人类特征的生物（玩家和NPC的基类）
- 管理复杂的角色状态系统

**核心属性**:
```cpp
class Character : public Creature {
    // 四大属性
    int str_max, dex_max, int_max, per_max;

    // 子系统
    SkillLevelMap skills;              // 技能系统
    std::map<bodypart_id, bodypart> body;  // 身体系统
    bionic_collection my_bionics;      // 义体系统
    std::vector<addiction> addictions; // 成瘾系统

    // 状态
    int health, stamina, fatigue;
    int sleep_deprivation;

    // 装备
    std::vector<item> worn;            // 穿戴物品
    item *weapon;                      // 武器

    // 魔法
    known_magic magic;                 // 魔法系统

    // 士气
    player_morale morale;              // 士气系统

    // 食谱
    recipe_subset learned_recipes;     // 已学配方
};
```

**关键方法**:
- **属性管理**: `get_str()`, `get_dex()`, `get_int()`, `get_per()`, `mod_stat()`
- **技能管理**: `get_skill_level()`, `train_skill()`
- **身体管理**: `get_part_hp_cur()`, `mod_part_hp_cur()`, `heal_bp()`
- **义体管理**: `add_bionic()`, `remove_bionic()`, `activate_bionic()`
- **装备管理**: `wear_item()`, `takeoff_item()`, `wield()`
- **战斗系统**: `melee_attack()`, `ranged_attack()`, `throw_item()`

#### avatar (玩家角色)

**位置**: `src/avatar.h`

**核心职责**:
- 玩家控制的角色
- 继承Character并添加玩家特有的功能

**核心属性**:
```cpp
class avatar : public Character {
    // 任务系统
    std::vector<mission*> active_missions;
    std::vector<mission*> completed_missions;
    std::vector<mission*> failed_missions;

    // 卡路里系统
    calorie_diary_t calorie_diary;

    // 物品识别
    std::set<itype_id> items_identified;

    // 地图记忆
    map_memory player_map_memory;

    // 可见怪物
    std::map<tripoint_bub_ms, monster_reference> mon_visible;
};
```

#### npc (非玩家角色)

**位置**: `src/npc.h`

**核心职责**:
- AI控制的角色
- 继承Character并添加AI行为

**核心属性**:
```cpp
class npc : public Character {
    npc_attitude attitude;        // 对玩家的态度
    npc_personality personality;  // 性格
    npc_opinion op_of_u;          // 对玩家的看法
    npc_follower_rules rules;     // 同伴规则

    ai_cache ai_cache;            // AI决策缓存
    std::vector<tripoint_bub_ms> path;  // 移动路径

    mission *mission;             // 当前任务
};
```

#### monster (怪物类)

**位置**: `src/monster.h`

**核心职责**:
- 怪物生物
- 直接继承Creature

**核心属性**:
```cpp
class monster : public Creature {
    mtype *type;                  // 怪物类型
    int hp;                       // 生命值
    mfaction_id faction;          // 阵营
    int wandf;                    // 游荡冲动

    int anger, morale, friendly;  // 情绪状态

    std::vector<mon_special_attack> special_attacks;  // 特殊攻击

    std::vector<tripoint_bub_ms> path;  // 移动路径

    item *inv;                    // 物品栏
};
```

## 二、关键子系统详细分析

### 2.1 身体系统

**位置**: `src/bodypart.h`, `src/bodygraph.h`

#### 身体部位类型

```cpp
enum body_part : int {
    bp_torso = 0,
    bp_head,
    bp_eyes,
    bp_mouth,
    bp_arm_l, bp_arm_r,
    bp_hand_l, bp_hand_r,
    bp_leg_l, bp_leg_r,
    bp_foot_l, bp_foot_r
};
```

#### 身体部位属性

```cpp
class bodypart {
    // HP系统
    int hp_cur, hp_max;

    // 温度系统
    int temp_cur, temp_conv;

    // 湿度系统
    int wetness, drench_capacity;

    // 治疗状态
    int healed_total;
    int damage_bandaged;
    int damage_disinfected;

    // 负载数据
    std::map<body_part_type, encumbrance_data> encumb_data;
};
```

#### 身体图系统

```cpp
class bodygraph_part {
    bodypart_id part;
    std::vector<bodygraph_part> sub_parts;

    std::vector<bodygraph_info> info;
};

class bodygraph {
    bodygraph_part root;

    std::vector<std::string> get_bodygraph_lines(
        const Character &u,
        const bodygraph_part &bg
    ) const;
};
```

### 2.2 技能系统

**位置**: `src/skill.h`

#### Skill类（技能定义）

```cpp
class Skill {
    skill_id id;
    translation name;
    translation description;

    std::vector<translation> _level_descriptions_theory;
    std::vector<translation> _level_descriptions_practice;

    std::set<std::string> _tags;

    time_duration time_to_attack;
};
```

#### SkillLevel类（技能等级）

```cpp
class SkillLevel {
    int _level;           // 0 到 MAX_SKILL (通常为10)
    int _exercise;        // 练习经验
    int _knowledgeLevel;  // 理论知识
    int _rustAccumulator; // 生锈积累

    bool _skillisTraining;

    void train(int amount, bool skip_rediscovery = false);
    void practice(int amount);
    void rust(int level, const time_duration &tick_time);
    void readBook(int amount, const time_duration &tick_time);
};
```

#### SkillLevelMap类（技能集合）

```cpp
class SkillLevelMap {
    std::map<skill_id, std::unique_ptr<SkillLevel>> skills;

    int get_skill_level(const skill_id &ident) const;
    bool meets_skill_requirements(
        const std::map<skill_id, int> &req
    ) const;
    void mod_skill_level(const skill_id &ident, int delta);
};
```

### 2.3 属性系统

**位置**: `src/character_modifier.h`

#### 四大基础属性

```cpp
enum class character_stat : char {
    STRENGTH,
    DEXTERITY,
    INTELLIGENCE,
    PERCEPTION
};
```

#### 属性修饰符

```cpp
struct character_modifier {
    enum class mod_type {
        ADD,    // 加法修饰
        MULT    // 乘法修饰
    };

    enum class limb_score {
        NONE,
        BLOOD,
        NERVE,
        BITTEN
    };

    mod_type type;
    limb_score score_type;

    float get_minimum() const;
    float get_maximum() const;

    float modifier(
        const Character &c,
        const skill_id &skill
    ) const;
};
```

### 2.4 成瘾系统

**位置**: `src/addiction.h`

#### add_type类（成瘾类型）

```cpp
class add_type {
    add_type_id id;
    translation name;
    translation description;

    int _craving_morale;  // 渴望时的士气惩罚

    efftype_id _effect;  // 成瘾触发的效果

    bool _builtin;       // 内置处理逻辑
};
```

#### addiction类（成瘾实例）

```cpp
class addiction {
    add_type_id type;
    int intensity;       // 1-20 级
    time_point sated;    // 上次满足的时间

    void run_effects(Character &guy);
    bool is_active() const;
};
```

### 2.5 效果系统

**位置**: `src/effect.h`

#### effect_type类（效果类型定义）

```cpp
class effect_type {
    efftype_id id;

    // 强度和持续时间
    int max_intensity;
    int max_effective_intensity;
    time_duration max_duration;

    // 衰减机制
    int dur_add_perc;
    int int_add_val;
    int int_decay_step;
    int int_decay_tick;
    time_duration int_dur_factor;
    bool int_decay_remove;

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
};
```

#### effect类（效果实例）

```cpp
class effect {
    const effect_type *eff_type;
    time_duration duration;
    bodypart_str_id bp;
    bool permanent;
    int intensity;
    time_point start_time;
    effect_source source;

    void decay(
        std::vector<efftype_id> &rem_ids,
        std::vector<bodypart_id> &rem_bps,
        const time_point &time,
        bool player
    );

    int get_mod(const std::string &arg, bool reduced = false) const;
    int get_amount(const std::string &arg, bool reduced = false) const;
    bool activated(const time_point &when, const std::string &arg,
                   int val, bool reduced = false, double mod = 1) const;
};
```

#### effects_map（效果集合）

```cpp
class effects_map :
    public std::map<efftype_id, std::map<bodypart_id, effect>>
{
    // 双层映射：效果类型 -> 身体部位 -> 效果实例
};
```

### 2.6 义体系统

**位置**: `src/bionics.h`

#### bionic_data类（义体数据）

```cpp
class bionic_data {
    bionic_id id;
    translation name;

    // 能量系统
    units::energy power_activate;
    units::energy power_deactivate;
    units::energy power_over_time;
    units::energy capacity;

    bool activated;
    item_id fake_weapon;

    std::vector<enchantment> enchantments;
    std::vector<martialart> ma_styles;

    std::vector<bodypart_id> occupied_bodyparts;
    std::map<bodypart_id, int> encumbrance;
};
```

#### bionic类（义体实例）

```cpp
class bionic {
    bionic_id id;
    char invlet;
    bool powered;
    int charge_timer;

    item *get_weapon();
};
```

## 三、系统间交互关系

### 3.1 数据流图

```
外部输入 (攻击/效果)
    ↓
Creature::deal_damage()
    ↓
Character::block_hit() ← 武器/护甲系统
    ↓
Character::absorb_hit() ← 装备系统
    ↓
Creature::deal_damage_handle_type()
    ↓
Character::apply_damage() → 身体部位HP
    ↓
效果系统 (add_effect)
    ↓
属性系统 (modifier) → 影响属性
    ↓
技能系统 (train) → 战斗经验
    ↓
状态更新 (process_turn)
```

### 3.2 系统交互矩阵

| 系统 | 身体 | 技能 | 属性 | 成瘾 | 效果 | 义体 |
|------|------|------|------|------|------|------|
| **身体** | - | HP影响属性 | 伤害影响技能 | 疼痛影响效果 | 阻挡义体 |
| **技能** | 练习需求 | - | 学习速度 | 戒断检测 | 激活要求 |
| **属性** | 影响HP | 影响命中 | - | 抵抗能力 | 力量需求 |
| **成瘾** | 身体伤害 | 技能惩罚 | 属性惩罚 | - | 效果抵抗 |
| **效果** | 修改HP | 技能修饰 | 属性修饰 | 产生成瘾 | 触发义体 |
| **义体** | 占用部位 | 提供技能 | 提供属性 | 治疗成瘾 | - |

## 四、TypeScript 实现建议

### 4.1 基础类结构

```typescript
// 生物基类
export abstract class Creature {
    pos: Tripoint;
    moves: number;
    killer: Creature | null;
    effects: Map<EffectTypeId, Map<BodyPartId, Effect>>;

    abstract dealMeleeAttack(target: Creature): void;
    abstract dealDamage(damage: DamageInstance): void;
}

// 角色类
export class Character extends Creature {
    // 四大属性
    strMax: number;
    dexMax: number;
    intMax: number;
    perMax: number;

    // 子系统
    skills: Map<SkillId, SkillLevel>;
    body: Map<BodyPartId, BodyPart>;
    bionics: BionicCollection;
    addictions: Addiction[];

    // 状态
    health: number;
    stamina: number;
    fatigue: number;
    sleepDeprivation: number;

    // 装备
    worn: Item[];
    weapon: Item | null;
}

// 玩家角色
export class Avatar extends Character {
    activeMissions: Mission[];
    completedMissions: Mission[];
    failedMissions: Mission[];
    calorieDiary: CalorieDiary;
    itemsIdentified: Set<ItemTypeId>;
    playerMapMemory: MapMemory;
}

// NPC
export class NPC extends Character {
    attitude: NPCAttitude;
    personality: NPCPersonality;
    opinionOfPlayer: NPCOpinion;
    rules: NPCFollowerRules;

    aiCache: AICache;
    path: Tripoint[];
    mission: Mission | null;
}

// 怪物
export class Monster extends Creature {
    type: MonsterType;
    hp: number;
    faction: MonsterFactionId;
    wandF: number;

    anger: number;
    morale: number;
    friendly: number;

    specialAttacks: MonsterSpecialAttack[];
    path: Tripoint[];
}
```

### 4.2 技能系统

```typescript
export class Skill {
    id: SkillId;
    name: string;
    description: string;

    levelDescriptionsTheory: string[];
    levelDescriptionsPractice: string[];

    tags: Set<string>;
}

export class SkillLevel {
    level: number = 0;
    exercise: number = 0;
    knowledgeLevel: number = 0;
    rustAccumulator: number = 0;
    isTraining: boolean = false;

    train(amount: number): void;
    practice(amount: number): void;
    rust(level: number, tickTime: TimeDuration): void;
}
```

### 4.3 效果系统

```typescript
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

    resistTraits: TraitId[];
    resistEffects: EffectTypeId[];
    removesEffects: EffectTypeId[];
    blocksEffects: EffectTypeId[];

    modData: Map<string, Map<number, ModifierValue[]>>;

    vitaminData: VitaminRateEffect[];
    limbScoreData: LimbScoreEffect[];
}

export class Effect {
    effType: EffectType;
    duration: TimeDuration;
    bp: BodyPartId;
    permanent: boolean;
    intensity: number;
    startTime: TimePoint;
    source: EffectSource;

    decay(remIds: EffectTypeId[], remBps: BodyPartId[],
          time: TimePoint, player: boolean): void;

    getMod(arg: string, reduced: boolean): number;
    getAmount(arg: string, reduced: boolean): number;
    activated(when: TimePoint, arg: string, val: number,
              reduced: boolean, mod: number): boolean;
}
```

---

*本文档基于 Cataclysm-DDA 源代码分析生成*
