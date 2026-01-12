# Cataclysm-DDA AI与阵营系统分析报告

## 系统概览

Cataclysm-DDA 使用了一个**行为树**系统来驱动NPC和怪物的AI决策，结合复杂的阵营系统、对话系统和NPC关系管理，创造了一个充满生命力的游戏世界。

## 一、行为树系统

### 1.1 核心架构

**位置**: `src/behavior.h`

### 状态系统

行为树使用三种状态来表示执行结果：

```cpp
enum class status_t : char {
    running,  // 正在执行，尚未完成
    success,  // 成功完成
    failure   // 执行失败
};
```

### 树的遍历机制

```cpp
class tree {
    // 入口点，评估树并返回选定的目标
    std::string tick(const oracle_t *subject);

    // 获取最近确定的目标
    std::string goal() const;

    // 设置根节点
    void add(const node_t *new_node);
};
```

**遍历流程**:
1. 从根节点开始
2. 对每个节点调用 `node_t::tick()`
3. 应用策略决定子节点的访问顺序
4. 检查谓词条件
5. 直到找到返回 `running` 状态的节点

### 节点设计

```cpp
class node_t {
    void set_strategy(const strategy_t *new_strategy);
    void add_predicate(
        const std::function<status_t(const oracle_t *, const std::string &)> &new_predicate,
        const std::string &argument = "",
        const bool &invert_result = false
    );
    void set_goal(const std::string &new_goal);
    void add_child(const node_t *new_child);
};
```

## 二、行为策略系统

### 2.1 策略类型

```cpp
class sequential_t : public strategy_t {
    // 按顺序执行子节点，直到一个失败或返回running
    behavior_return evaluate(
        const oracle_t *subject,
        std::vector<const node_t *> children
    ) const override;
};

class fallback_t : public strategy_t {
    // 按顺序尝试子节点，直到一个成功或返回running
    behavior_return evaluate(
        const oracle_t *subject,
        std::vector<const node_t *> children
    ) const override;
};

class sequential_until_done_t : public strategy_t {
    // 无条件按顺序执行所有子节点
    behavior_return evaluate(
        const oracle_t *subject,
        std::vector<const node_t *> children
    ) const override;
};
```

### 2.2 策略行为详解

**Sequential（顺序策略）**:
- 依次执行子节点
- 任何子节点返回 `running` 或 `failure` 则立即返回
- 所有子节点都返回 `success` 才返回 `success`

**Fallback（回退策略）**:
- 依次尝试子节点
- 任何子节点返回 `running` 或 `success` 则立即返回
- 所有子节点都返回 `failure` 才返回 `failure`

**Sequential Until Done（完全顺序策略）**:
- 依次执行所有子节点
- 只有 `running` 状态会中断执行
- 忽略 `success` 和 `failure` 继续执行

## 三、行为预言机系统

### 3.1 预言机架构

预言机是**实体内省机制**，提供对游戏实体的信息查询：

```cpp
class oracle_t {
    // 基类提供基本功能
    // 特化的预言机如 character_oracle_t 提供具体的谓词
};
```

### 3.2 角色预言机

```cpp
class character_oracle_t : public oracle_t {
    status_t needs_warmth_badly(std::string_view) const;
    status_t needs_water_badly(std::string_view) const;
    status_t needs_food_badly(std::string_view) const;
    status_t can_wear_warmer_clothes(std::string_view) const;
    status_t can_make_fire(std::string_view) const;
    status_t can_take_shelter(std::string_view) const;
    status_t has_water(std::string_view) const;
    status_t has_food(std::string_view) const;
};
```

### 3.3 谓词映射系统

```cpp
std::unordered_map<std::string, std::function<status_t(const oracle_t *, std::string_view)>> predicate_map = {{
    { "npc_needs_warmth_badly", make_function(&character_oracle_t::needs_warmth_badly) },
    { "npc_needs_water_badly", make_function(&character_oracle_t::needs_water_badly) },
    { "monster_not_hallucination", make_function(&monster_oracle_t::not_hallucination) },
    // ... 更多谓词
}};
```

## 四、阵营系统架构

### 4.1 阵营核心类

**位置**: `src/faction.h`

```cpp
class faction {
    std::string name;
    int likes_u;      // 好感度
    int respects_u;   // 尊重度
    int trusts_u;     // 信任度
    bool known_by_u;  // 玩家是否已知

    int size;         // 影响范围大小
    int power;        // 综合实力
    int wealth;       // 财富
    bool consumes_food;  // 是否消耗食物

    itype_id currency;  // 货币类型
    std::vector<faction_price_rule> price_rules;  // 价格规则

    mfaction_str_id mon_faction;  // 关联的怪物阵营

    std::map<std::string, std::bitset<relationship::rel_types>> relations;  // 阵营关系
    std::map<character_id, std::pair<std::string, bool>> members;  // 成员
};
```

### 4.2 阵营关系系统

```cpp
enum class relationship : int {
    kill_on_sight,       // 见面就杀
    watch_your_back,     // 小心背后
    share_my_stuff,      // 共享物品
    share_public_goods,  // 共享公共物品
    guard_your_stuff,    // 守护物品
    lets_you_in,         // 允许进入
    defend_your_space,   // 防卫空间
    knows_your_voice     // 认识声音
};
```

### 4.3 阵营管理器

```cpp
class faction_manager {
    std::map<faction_id, faction> factions;

    void deserialize(const JsonValue &jv);
    void serialize(JsonOut &jsout) const;
    void clear();
    void create_if_needed();
    faction *add_new_faction(const std::string &name_new, const faction_id &id_new,
                              const faction_id &template_id);
    void remove_faction(const faction_id &id);
    faction *get(const faction_id &id, bool complain = true);
};
```

## 五、怪物阵营系统

### 5.1 怪物阵营态度

```cpp
enum mf_attitude {
    MFA_BY_MOOD = 0,    // 根据情绪决定（愤怒时敌对）
    MFA_NEUTRAL,        // 永远中立
    MFA_FRIENDLY,       // 友好
    MFA_HATE,           // 见面就攻击
    MFA_SIZE
};
```

### 5.2 阵营继承系统

```cpp
class monfaction {
    mfaction_str_id id;
    mfaction_str_id base_faction;  // 基础阵营（支持继承）

    // 态度缓存
    mutable mfaction_att_map attitude_map;
    std::set<mfaction_str_id> _att_by_mood;
    std::set<mfaction_str_id> _att_neutral;
    std::set<mfaction_str_id> _att_friendly;
    std::set<mfaction_str_id> _att_hate;

    // 递归计算态度
    std::optional<mf_attitude> attitude_rec(const mfaction_str_id &other) const;
};
```

### 5.3 态度计算逻辑

怪物阵营使用**递归继承**机制：
1. 检查是否在本地态度映射中
2. 如果没有，检查基础阵营
3. 递归向上查找直到找到或到达根节点
4. 使用缓存优化性能

## 六、NPC关系系统

### 6.1 NPC意见结构

```cpp
struct npc_opinion {
    int trust;   // 信任
    int fear;    // 恐惧
    int value;   // 价值
    int anger;   // 愤怒
    int owed;    // 欠债（正数为NPC欠玩家，负数为玩家欠NPC）
    int sold;    // 销售总额
};
```

### 6.2 NPC态度系统

```cpp
enum npc_attitude : int {
    NPCATT_NULL = 0,           // 无所谓
    NPCATT_TALK,               // 想要交谈
    NPCATT_FOLLOW,             // 跟随
    NPCATT_LEAD,               // 带领
    NPCATT_WAIT,               // 等待
    NPCATT_MUG,                // 抢劫
    NPCATT_WAIT_FOR_LEAVE,     // 等待玩家离开
    NPCATT_KILL,               // 杀死
    NPCATT_FLEE,               // 逃跑
    NPCATT_HEAL,               // 治疗
    NPCATT_ACTIVITY,           // 执行活动
    NPCATT_FLEE_TEMP,          // 暂时逃跑
    NPCATT_RECOVER_GOODS       // 追回被盗物品
};
```

### 6.3 NPC个性系统

```cpp
struct npc_personality {
    int8_t aggression;  // 攻击性 (-10 到 10)
    int8_t bravery;     // 勇敢 (-10 到 10)
    int8_t collector;   // 收集癖 (-10 到 10)
    int8_t altruism;    // 利他主义 (-10 到 10)
};
```

### 6.4 NPC跟随者规则

```cpp
struct npc_follower_rules {
    combat_engagement engagement;  // 战斗参与度
    aim_rule aim;                  // 瞄准规则
    cbm_recharge_rule cbm_recharge; // 义体充电规则
    cbm_reserve_rule cbm_reserve;   // 义体能量保留
    ally_rule flags;               // 行为标志
    ally_rule override_enable;     // 覆盖启用
    ally_rule overrides;           // 覆盖规则
};
```

**盟友行为标志**:

```cpp
enum class ally_rule : int {
    use_guns = 1,           // 使用枪械
    use_grenades = 2,       // 使用手榴弹
    use_silent = 4,         // 使用消音武器
    avoid_friendly_fire = 8,// 避免友军伤害
    allow_pick_up = 16,     // 允许拾取
    allow_bash = 32,        // 允许破坏
    allow_sleep = 64,       // 允许睡眠
    allow_complain = 128,   // 允许抱怨
    allow_pulp = 256,       // 允许粉碎尸体
    close_doors = 512,      // 关闭门
    follow_close = 1024,    // 紧密跟随
    avoid_doors = 2048,     // 避开门
    hold_the_line = 4096,   // 坚守防线
    ignore_noise = 8192,    // 忽略噪音
    forbid_engage = 16384,  // 禁止战斗
    follow_distance_2 = 32768, // 跟随距离2
    lock_doors = 65536,     // 锁门
    avoid_locks = 131072    // 避免锁
};
```

## 七、对话系统

### 7.1 说话者接口

系统使用**抽象接口** `talker` 来统一不同实体的对话能力：

```cpp
class const_talker {
    virtual Character const *get_const_character() const;
    virtual npc const *get_const_npc() const;
    virtual monster const *get_const_monster() const;

    virtual std::string disp_name() const;
    virtual bool will_talk_to_u(const Character &, bool) const;
    virtual std::vector<std::string> get_topics(bool) const;
    virtual int parse_mod(const std::string &, int) const;

    // 大量虚函数提供统一的接口
    virtual int get_skill_level(const skill_id &) const;
    virtual bool has_trait(const trait_id &) const;
    virtual bool has_effect(const efftype_id &, const bodypart_id &) const;
    virtual int cash() const;
    virtual int debt() const;
    // ... 更多接口
};
```

### 7.2 对话话题系统

```cpp
struct talk_topic {
    std::string id;           // 话题ID
    itype_id item_type;       // 相关物品类型
    std::string reason;       // 拒绝原因
};
```

### 7.3 对话试验系统

```cpp
enum talk_trial_type : unsigned char {
    TALK_TRIAL_NONE,         // 无挑战
    TALK_TRIAL_LIE,          // 撒谎
    TALK_TRIAL_PERSUADE,     // 说服
    TALK_TRIAL_INTIMIDATE,   // 威胁
    TALK_TRIAL_SKILL_CHECK,  // 技能检查
    TALK_TRIAL_CONDITION     // 条件检查
};

struct talk_trial {
    talk_trial_type type;
    int difficulty;          // 难度（0-100）
    std::function<bool(const_dialogue const &)> condition;
    std::string skill_required;  // 需要的技能
    std::vector<trial_mod> modifiers;  // 修正器

    int calc_chance(const_dialogue const &d) const;
    bool roll(dialogue &d) const;
};
```

### 7.4 对话效果系统

```cpp
struct talk_effect_t {
    npc_opinion opinion;           // 意见改变
    npc_opinion mission_opinion;   // 任务相关的意见改变
    talk_topic next_topic;         // 下一个话题
    std::vector<talk_effect_fun_t> effects;  // 效果函数列表

    dialogue_consequence get_consequence(dialogue const &d) const;
};

enum dialogue_consequence : unsigned char {
    none = 0,
    hostile,    // 变得敌对
    helpless,   // 变得无助
    action      // 执行动作
};
```

### 7.5 对话响应系统

```cpp
struct talk_response {
    std::string text;           // 玩家说的话
    translation truetext;       // 成功时的文本
    translation falsetext;      // 失败时的文本

    talk_trial trial;           // 对话试验
    std::function<bool(const_dialogue const &)> condition;  // 显示条件

    bool show_always;           // 总是显示
    std::string show_reason;    // 显示原因
    mission *mission_selected;  // 选中的任务
    talk_effect_t success;      // 成功效果
    talk_effect_t failure;      // 失败效果
};
```

## 八、NPC AI决策机制总结

### 8.1 决策流程

```
1. 行为树评估
   - 从根节点开始深度优先遍历
   - 应用策略决定子节点访问顺序
   - 检查谓词条件
   - 找到最高优先级的可执行目标
   ↓
2. 预言机查询
   - 使用预言机查询实体状态
   - 评估基本需求（食物、水、温暖）
   - 检查能力（制作、战斗、移动）
   ↓
3. 目标选择
   - 根据行为树结果选择目标
   - 考虑阵营关系和NPC意见
   - 应用个性特征修正
   ↓
4. 行为执行
   - 将目标转换为具体行动
   - 应用战斗策略和跟随者规则
   - 执行活动或移动
```

### 8.2 关键设计特点

1. **数据驱动**: 行为树从JSON加载
2. **模块化设计**: 预言机与行为树分离
3. **层次化关系**: 阵营关系系统、NPC意见系统
4. **动态适应**: 实时状态查询、动态目标调整

## 九、TypeScript 实现建议

### 9.1 行为树系统

```typescript
// 行为树状态
export enum BehaviorStatus {
    Running,
    Success,
    Failure,
}

// 行为树节点
export class BehaviorNode {
    strategy?: BehaviorStrategy;
    predicates: Array<(oracle: Oracle, arg: string) => BehaviorStatus> = [];
    goal: string = '';
    children: BehaviorNode[] = [];

    tick(oracle: Oracle): BehaviorStatus {
        // 实现节点评估
    }
}

// 行为树
export class BehaviorTree {
    root: BehaviorNode | null = null;
    currentGoal: string = '';

    tick(oracle: Oracle): string {
        // 实现行为树评估
    }

    addNode(node: BehaviorNode): void {
        this.root = node;
    }
}

// 策略
export abstract class BehaviorStrategy {
    abstract evaluate(
        subject: Oracle,
        children: BehaviorNode[]
    ): BehaviorStatus;
}

export class SequentialStrategy extends BehaviorStrategy {
    evaluate(subject: Oracle, children: BehaviorNode[]): BehaviorStatus {
        for (const child of children) {
            const status = child.tick(subject);
            if (status === BehaviorStatus.Running ||
                status === BehaviorStatus.Failure) {
                return status;
            }
        }
        return BehaviorStatus.Success;
    }
}

export class FallbackStrategy extends BehaviorStrategy {
    evaluate(subject: Oracle, children: BehaviorNode[]): BehaviorStatus {
        for (const child of children) {
            const status = child.tick(subject);
            if (status === BehaviorStatus.Running ||
                status === BehaviorStatus.Success) {
                return status;
            }
        }
        return BehaviorStatus.Failure;
    }
}
```

### 9.2 预言机系统

```typescript
// 预言机基类
export abstract class Oracle {
    abstract needsWarmthBadly(arg: string): BehaviorStatus;
    abstract needsWaterBadly(arg: string): BehaviorStatus;
    abstract needsFoodBadly(arg: string): BehaviorStatus;
    abstract canWearWarmerClothes(arg: string): BehaviorStatus;
    abstract canMakeFire(arg: string): BehaviorStatus;
}

// 角色预言机
export class CharacterOracle extends Oracle {
    character: Character;

    constructor(character: Character) {
        super();
        this.character = character;
    }

    needsWarmthBadly(arg: string): BehaviorStatus {
        // 实现需求检查
    }

    needsWaterBadly(arg: string): BehaviorStatus {
        // 实现需求检查
    }

    // ... 更多方法
}
```

### 9.3 阵营系统

```typescript
// 阵营关系
export enum FactionRelationship {
    KillOnSight,
    WatchYourBack,
    ShareMyStuff,
    SharePublicGoods,
    GuardYourStuff,
    LetsYouIn,
    DefendYourSpace,
    KnowsYourVoice,
}

// 阵营
export class Faction {
    name: string;
    likesU: number = 0;
    respectsU: number = 0;
    trustsU: number = 0;
    knownByU: boolean = false;

    size: number = 0;
    power: number = 0;
    wealth: number = 0;
    consumesFood: boolean = true;

    currency: ItemTypeId;
    priceRules: FactionPriceRule[] = [];

    monsterFaction: MonsterFactionId;

    relations = new Map<string, Set<FactionRelationship>>();
    members = new Map<CharacterId, [string, boolean]>();
}

// 阵营管理器
export class FactionManager {
    factions = new Map<string, Faction>();

    addNewFaction(name: string, id: string, templateId: string): Faction {
        const faction = new Faction();
        faction.name = name;
        this.factions.set(id, faction);
        return faction;
    }

    removeFaction(id: string): void {
        this.factions.delete(id);
    }

    get(id: string): Faction | null {
        return this.factions.get(id) || null;
    }
}
```

### 9.4 NPC关系系统

```typescript
// NPC意见
export interface NPCOpinion {
    trust: number;
    fear: number;
    value: number;
    anger: number;
    owed: number;
    sold: number;
}

// NPC态度
export enum NPCAttitude {
    Null,
    Talk,
    Follow,
    Lead,
    Wait,
    Mug,
    WaitForLeave,
    Kill,
    Flee,
    Heal,
    Activity,
    FleeTemp,
    RecoverGoods,
}

// NPC个性
export interface NPCPersonality {
    aggression: number;  // -10 到 10
    bravery: number;     // -10 到 10
    collector: number;   // -10 到 10
    altruism: number;    // -10 到 10
}

// NPC跟随者规则
export interface NPCFollowerRules {
    engagement: CombatEngagement;
    aim: AimRule;
    cbmRecharge: CbmRechargeRule;
    cbmReserve: CbmReserveRule;
    flags: AllyRule;
    overrideEnable: AllyRule;
    overrides: AllyRule;
}

// 盟友行为标志
export enum AllyRule {
    UseGuns = 1,
    UseGrenades = 2,
    UseSilent = 4,
    AvoidFriendlyFire = 8,
    AllowPickUp = 16,
    AllowBash = 32,
    AllowSleep = 64,
    AllowComplain = 128,
    AllowPulp = 256,
    CloseDoors = 512,
    FollowClose = 1024,
    AvoidDoors = 2048,
    HoldTheLine = 4096,
    IgnoreNoise = 8192,
    ForbidEngage = 16384,
    FollowDistance2 = 32768,
    LockDoors = 65536,
    AvoidLocks = 131072,
}
```

---

*本文档基于 Cataclysm-DDA 源代码分析生成*
