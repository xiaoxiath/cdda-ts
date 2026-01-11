# 角色系统文档

## 概述

角色系统管理游戏中的所有生物，包括玩家、NPC 和怪物。采用继承层次设计，从通用的 `Creature` 基类派生出具体的角色类型。

## 继承层次

```
Creature (抽象基类)
    ├── Monster (怪物)
    └── Character (角色)
            ├── NPC (非玩家角色)
            └── Avatar (玩家角色)
```

## 核心组件

### 1. Creature (生物基类)

所有生物的抽象基类。

```typescript
export enum CreatureSize {
  TINY = 1,      // 松鼠、猫
  SMALL = 2,     // 拉布拉多、人类儿童
  MEDIUM = 3,    // 人类成人
  LARGE = 4,     // 熊、老虎
  HUGE = 5,      // 牛、驼鹿、修格斯
}

export abstract class Creature {
  readonly id: string;
  readonly pos: Tripoint;
  readonly name: string;
  readonly size: CreatureSize;

  // 类型检查
  abstract isMonster(): boolean;
  abstract isAvatar(): boolean;
  abstract isNPC(): boolean;

  // 属性访问
  abstract getWeight(): number;
  abstract getHP(bodyPart: BodyPartId): number;
  abstract getHPMax(bodyPart: BodyPartId): number;

  // 移动和动作
  moveTo(pos: Tripoint): Creature;
  processTurn(): Creature;

  // 状态检查
  isDead(): boolean;
  isDowned(): boolean;
}
```

### 2. BodyPart (身体部位)

定义角色的身体部位系统。

```typescript
export enum BodyPart {
  TORSO = 0,   // 躯干
  HEAD,        // 头
  EYES,        // 眼
  MOUTH,       // 嘴
  ARM_L,       // 左臂
  ARM_R,       // 右臂
  HAND_L,      // 左手
  HAND_R,      // 右手
  LEG_L,       // 左腿
  LEG_R,       // 右腿
  FOOT_L,      // 左脚
  FOOT_R,      // 右脚
}

export enum BodyPartType {
  HEAD,      // 头部 - 盔甲位置，重要部位
  TORSO,     // 躯干 - 质量中心
  SENSOR,    // 传感器 - 提供视野
  MOUTH,     // 嘴 - 进食和尖叫
  ARM,       // 手臂 - 可操作对象
  HAND,      // 手 - 操作对象
  LEG,       // 腿 - 提供动力
  FOOT,      // 脚 - 平衡
  WING,      // 翅膀 - 减少坠落伤害
  TAIL,      // 尾巴 - 平衡或操作
  OTHER,     // 其他 - 角等通用肢体
}

export interface BodyPartData {
  readonly id: BodyPart;
  readonly name: string;
  readonly type: BodyPartType;
  readonly hitSize: number;         // 命中大小
  readonly hitDifficulty: number;   // 命中难度
  readonly baseHP: number;          // 基础生命值
  readonly encumbranceThreshold: number;  // 笨重阈值
  readonly bionicSlots: number;     // 义体槽位
  readonly isVital: boolean;        // 是否重要部位
  readonly mainPart: boolean;       // 是否主要部位
}

export class BodyPart {
  readonly data: BodyPartData;
  readonly hp: number;
  readonly hpMax: number;
  readonly effects: ImmutableList<Effect>;

  constructor(
    data: BodyPartData,
    hp: number = data.baseHP,
    hpMax: number = data.baseHP,
    effects: ImmutableList<Effect> = List()
  ) {
    this.data = data;
    this.hp = hp;
    this.hpMax = hpMax;
    this.effects = effects;
  }

  // 修改 HP
  modifyHP(delta: number): BodyPart {
    const newHP = Math.max(0, Math.min(this.hpMax, this.hp + delta));
    return new BodyPart(this.data, newHP, this.hpMax, this.effects);
  }

  // 添加效果
  addEffect(effect: Effect): BodyPart {
    return new BodyPart(
      this.data,
      this.hp,
      this.hpMax,
      this.effects.push(effect)
    );
  }

  // 计算笨重
  getEncumbrance(): number {
    // 根据装备和效果计算
    return 0;
  }

  // 是否残废
  isDisabled(): boolean {
    return this.hp === 0;
  }
}
```

### 3. CharacterStats (角色属性)

定义角色的基本属性。

```typescript
export enum CharacterStat {
  STRENGTH,     // 力量
  DEXTERITY,    // 敏捷
  INTELLIGENCE, // 智力
  PERCEPTION,   // 感知
}

export class CharacterStats {
  readonly strength: number;
  readonly dexterity: number;
  readonly intelligence: number;
  readonly perception: number;

  // 属性范围
  static readonly MIN_STAT = 0;
  static readonly MAX_STAT = 20;

  constructor(
    strength: number = 8,
    dexterity: number = 8,
    intelligence: number = 8,
    perception: number = 8
  ) {
    this.strength = Math.min(CharacterStats.MAX_STAT, Math.max(CharacterStats.MIN_STAT, strength));
    this.dexterity = Math.min(CharacterStats.MAX_STAT, Math.max(CharacterStats.MIN_STAT, dexterity));
    this.intelligence = Math.min(CharacterStats.MAX_STAT, Math.max(CharacterStats.MIN_STAT, intelligence));
    this.perception = Math.min(CharacterStats.MAX_STAT, Math.max(CharacterStats.MIN_STAT, perception));
  }

  // 修改属性
  modifyStat(stat: CharacterStat, delta: number): CharacterStats {
    const value = this.getStat(stat);
    const newValue = Math.min(CharacterStats.MAX_STAT, Math.max(CharacterStats.MIN_STAT, value + delta));
    switch (stat) {
      case CharacterStat.STRENGTH:
        return new CharacterStats(newValue, this.dexterity, this.intelligence, this.perception);
      case CharacterStat.DEXTERITY:
        return new CharacterStats(this.strength, newValue, this.intelligence, this.perception);
      case CharacterStat.INTELLIGENCE:
        return new CharacterStats(this.strength, this.dexterity, newValue, this.perception);
      case CharacterStat.PERCEPTION:
        return new CharacterStats(this.strength, this.dexterity, this.intelligence, newValue);
    }
  }

  // 获取属性值
  getStat(stat: CharacterStat): number {
    switch (stat) {
      case CharacterStat.STRENGTH: return this.strength;
      case CharacterStat.DEXTERITY: return this.dexterity;
      case CharacterStat.INTELLIGENCE: return this.intelligence;
      case CharacterStat.PERCEPTION: return this.perception;
    }
  }

  // 计算属性修饰符
  getModifier(stat: CharacterStat): number {
    const value = this.getStat(stat);
    return Math.floor((value - 8) / 2);
  }
}
```

### 4. SkillLevel (技能等级)

管理单个技能的等级和经验。

```typescript
export class SkillLevel {
  readonly level: number;           // 当前等级 (0-10)
  readonly exercise: number;        // 练习点数
  readonly knowledgeLevel: number;  // 知识等级
  readonly knowledgeExperience: number;
  readonly rustAccumulator: number; // 生锈累积
  readonly isTraining: boolean;

  static readonly MAX_LEVEL = 10;
  static readonly EXERCISE_PER_LEVEL = 100;

  constructor(
    level: number = 0,
    exercise: number = 0,
    knowledgeLevel: number = 0,
    knowledgeExperience: number = 0,
    rustAccumulator: number = 0,
    isTraining: boolean = true
  ) {
    this.level = Math.min(SkillLevel.MAX_LEVEL, level);
    this.exercise = exercise;
    this.knowledgeLevel = knowledgeLevel;
    this.knowledgeExperience = knowledgeExperience;
    this.rustAccumulator = rustAccumulator;
    this.isTraining = isTraining;
  }

  // 训练技能
  train(amount: number): SkillLevel {
    if (this.level >= SkillLevel.MAX_LEVEL) {
      return this;
    }

    const newExercise = this.exercise + amount;
    if (newExercise >= SkillLevel.EXERCISE_PER_LEVEL) {
      // 升级
      return new SkillLevel(
        this.level + 1,
        newExercise - SkillLevel.EXERCISE_PER_LEVEL,
        this.knowledgeLevel,
        this.knowledgeExperience,
        0,  // 重置生锈
        this.isTraining
      );
    }

    return new SkillLevel(
      this.level,
      newExercise,
      this.knowledgeLevel,
      this.knowledgeExperience,
      Math.max(0, this.rustAccumulator - amount),
      this.isTraining
    );
  }

  // 生锈
  rust(resistance: number): SkillLevel {
    if (this.level === 0 || this.rustAccumulator > 500) {
      return this;
    }

    const newRust = this.rustAccumulator + (100 - resistance);
    if (newRust > 1000 && Math.random() < 0.1) {
      // 降级
      return new SkillLevel(
        Math.max(0, this.level - 1),
        this.exercise,
        this.knowledgeLevel,
        this.knowledgeExperience,
        500,
        this.isTraining
      );
    }

    return new SkillLevel(
      this.level,
      this.exercise,
      this.knowledgeLevel,
      this.knowledgeExperience,
      newRust,
      this.isTraining
    );
  }

  // 获取总等级（包含小数部分）
  getEffectiveLevel(): number {
    return this.level + (this.exercise / SkillLevel.EXERCISE_PER_LEVEL);
  }
}
```

### 5. SkillMap (技能集合)

管理所有技能。

```typescript
export type SkillId = string;

export class SkillMap {
  private readonly skills: Immutable.Map<SkillId, SkillLevel>;

  constructor(skills: Immutable.Map<SkillId, SkillLevel> = Map()) {
    this.skills = skills;
  }

  // 获取技能等级
  getLevel(skillId: SkillId): number {
    return this.skills.get(skillId)?.getEffectiveLevel() ?? 0;
  }

  // 训练技能
  train(skillId: SkillId, amount: number): SkillMap {
    const current = this.skills.get(skillId) ?? new SkillLevel();
    return new SkillMap(this.skills.set(skillId, current.train(amount)));
  }

  // 检查技能要求
  meetsRequirements(requirements: Record<SkillId, number>): boolean {
    for (const [skillId, requiredLevel] of Object.entries(requirements)) {
      if (this.getLevel(skillId) < requiredLevel) {
        return false;
      }
    }
    return true;
  }

  // 获取所有技能
  getAllSkills(): Immutable.Map<SkillId, SkillLevel> {
    return this.skills;
  }
}
```

### 6. Effect (效果)

临时状态效果（buff/debuff）。

```typescript
export type EffectId = string;

export class Effect {
  readonly id: EffectId;
  readonly name: string;
  readonly duration: number;      // 持续时间（回合）
  readonly intensity: number;     // 强度
  readonly bodyPart: BodyPart | null;  // 目标部位
  readonly modifiers: EffectModifiers;

  constructor(
    id: EffectId,
    name: string,
    duration: number,
    intensity: number = 1,
    bodyPart: BodyPart | null = null,
    modifiers: EffectModifiers = {}
  ) {
    this.id = id;
    this.name = name;
    this.duration = Math.max(0, duration);
    this.intensity = intensity;
    this.bodyPart = bodyPart;
    this.modifiers = modifiers;
  }

  // 减少持续时间
  tick(): Effect | null {
    if (this.duration <= 1) {
      return null;
    }
    return new Effect(
      this.id,
      this.name,
      this.duration - 1,
      this.intensity,
      this.bodyPart,
      this.modifiers
    );
  }

  // 是否过期
  isExpired(): boolean {
    return this.duration <= 0;
  }
}

export interface EffectModifiers {
  readonly strMod?: number;
  readonly dexMod?: number;
  readonly intMod?: number;
  readonly perMod?: number;
  readonly moveCostMod?: number;
  readonly painMod?: number;
  readonly healMod?: number;
}
```

### 7. Character (角色)

玩家和 NPC 的基类。

```typescript
export class Character extends Creature {
  readonly stats: CharacterStats;
  readonly skills: SkillMap;
  readonly bodyParts: Immutable.Map<BodyPart, BodyPart>;
  readonly effects: ImmutableList<Effect>;
  readonly stamina: number;
  readonly staminaMax: number;

  constructor(
    id: string,
    name: string,
    pos: Tripoint,
    stats: CharacterStats = new CharacterStats(),
    skills: SkillMap = new SkillMap(),
    bodyParts: Immutable.Map<BodyPart, BodyPart> = createDefaultBodyParts(),
    effects: ImmutableList<Effect> = List(),
    stamina: number = 1000,
    staminaMax: number = 1000
  ) {
    super(id, pos, name, CreatureSize.MEDIUM);
    this.stats = stats;
    this.skills = skills;
    this.bodyParts = bodyParts;
    this.effects = effects;
    this.stamina = stamina;
    this.staminaMax = staminaMax;
  }

  // 类型检查
  isMonster(): boolean { return false; }
  isAvatar(): boolean { return false; }
  isNPC(): boolean { return false; }

  // 获取属性
  getStrength(): number {
    let base = this.stats.strength;
    for (const effect of this.effects) {
      base += effect.modifiers.strMod ?? 0;
    }
    return Math.max(0, base);
  }

  // 获取身体部位 HP
  getHP(bodyPart: BodyPart): number {
    return this.bodyParts.get(bodyPart)?.hp ?? 0;
  }

  getHPMax(bodyPart: BodyPart): number {
    return this.bodyParts.get(bodyPart)?.hpMax ?? 0;
  }

  // 修改体力
  modifyStamina(delta: number): Character {
    const newStamina = Math.max(0, Math.min(this.staminaMax, this.stamina + delta));
    return new Character(
      this.id,
      this.name,
      this.pos,
      this.stats,
      this.skills,
      this.bodyParts,
      this.effects,
      newStamina,
      this.staminaMax
    );
  }

  // 移动消耗
  getMoveCost(): number {
    let baseCost = 100;
    // 根据身体部位状态调整
    for (const [_, part] of this.bodyParts) {
      if (part.isDisabled()) {
        baseCost += 50;
      }
      baseCost += part.getEncumbrance();
    }
    return Math.max(50, baseCost);
  }

  // 处理回合
  processTurn(): Character {
    // 更新效果
    let newEffects = this.effects;
    let newSkills = this.skills;

    for (const effect of this.effects) {
      const updated = effect.tick();
      if (updated) {
        newEffects = newEffects.filter(e => e.id !== effect.id).push(updated);
      } else {
        newEffects = newEffects.filter(e => e.id !== effect.id);
      }
    }

    // 技能生锈
    for (const [skillId, level] of this.skills.getAllSkills()) {
      newSkills = newSkills.rust(skillId, 50);
    }

    return new Character(
      this.id,
      this.name,
      this.pos,
      this.stats,
      newSkills,
      this.bodyParts,
      newEffects,
      this.stamina,
      this.staminaMax
    );
  }

  // 受到伤害
  takeDamage(bodyPart: BodyPart, damage: number): Character {
    const currentPart = this.bodyParts.get(bodyPart);
    if (!currentPart) return this;

    const newPart = currentPart.modifyHP(-damage);
    const newBodyParts = this.bodyParts.set(bodyPart, newPart);

    return new Character(
      this.id,
      this.name,
      this.pos,
      this.stats,
      this.skills,
      newBodyParts,
      this.effects,
      this.stamina,
      this.staminaMax
    );
  }

  // 移动到新位置
  moveTo(pos: Tripoint): Character {
    return new Character(
      this.id,
      this.name,
      pos,
      this.stats,
      this.skills,
      this.bodyParts,
      this.effects,
      this.stamina,
      this.staminaMax
    );
  }
}

// 创建默认身体部位
function createDefaultBodyParts(): Immutable.Map<BodyPart, BodyPart> {
  const parts: [BodyPart, BodyPartData][] = [
    [BodyPart.TORSO, {
      id: BodyPart.TORSO,
      name: '躯干',
      type: BodyPartType.TORSO,
      hitSize: 36,
      hitDifficulty: 1,
      baseHP: 60,
      encumbranceThreshold: 6,
      bionicSlots: 80,
      isVital: true,
      mainPart: true,
    }],
    [BodyPart.HEAD, {
      id: BodyPart.HEAD,
      name: '头',
      type: BodyPartType.HEAD,
      hitSize: 10,
      hitDifficulty: 2,
      baseHP: 40,
      encumbranceThreshold: 3,
      bionicSlots: 10,
      isVital: true,
      mainPart: false,
    }],
    // ... 其他部位
  ];

  return Map(parts.map(([id, data]) => [id, new BodyPart(data)]));
}
```

### 8. Avatar (玩家角色)

玩家控制的特殊角色。

```typescript
export class Avatar extends Character {
  readonly saveId: string;
  readonly mapMemory: MapMemory;

  constructor(
    saveId: string,
    name: string,
    pos: Tripoint,
    stats: CharacterStats,
    skills: SkillMap,
    bodyParts: Immutable.Map<BodyPart, BodyPart>,
    effects: ImmutableList<Effect>,
    stamina: number,
    staminaMax: number,
    mapMemory: MapMemory = new MapMemory()
  ) {
    super(
      `avatar_${saveId}`,
      name,
      pos,
      stats,
      skills,
      bodyParts,
      effects,
      stamina,
      staminaMax
    );
    this.saveId = saveId;
    this.mapMemory = mapMemory;
  }

  isAvatar(): boolean { return true; }

  // 记忆地形
  memorizeTerrain(pos: Tripoint, terrainId: number): Avatar {
    return new Avatar(
      this.saveId,
      this.name,
      this.pos,
      this.stats,
      this.skills,
      this.bodyParts,
      this.effects,
      this.stamina,
      this.staminaMax,
      this.mapMemory.setTerrain(pos, terrainId)
    );
  }
}
```

### 9. Monster (怪物)

敌对生物。

```typescript
export enum MonsterAttitude {
  FRIENDLY,    // 友好
  NEUTRAL,     // 中立
  HOSTILE,     // 敌对
  FOLLOW,      // 跟随
}

export class Monster extends Creature {
  readonly typeId: string;
  readonly hp: number;
  readonly hpMax: number;
  readonly attitude: MonsterAttitude;

  constructor(
    id: string,
    typeId: string,
    name: string,
    pos: Tripoint,
    hp: number,
    hpMax: number,
    size: CreatureSize,
    attitude: MonsterAttitude = MonsterAttitude.HOSTILE
  ) {
    super(id, pos, name, size);
    this.typeId = typeId;
    this.hp = hp;
    this.hpMax = hpMax;
    this.attitude = attitude;
  }

  isMonster(): boolean { return true; }
  isAvatar(): boolean { return false; }
  isNPC(): boolean { return false; }

  getWeight(): number {
    // 根据大小计算
    return this.size * 20;
  }

  getHP(): number {
    return this.hp;
  }

  getHPMax(): number {
    return this.hpMax;
  }

  // 受到伤害
  takeDamage(damage: number): Monster {
    const newHP = Math.max(0, this.hp - damage);
    return new Monster(
      this.id,
      this.typeId,
      this.name,
      this.pos,
      newHP,
      this.hpMax,
      this.size,
      this.attitude
    );
  }

  // AI 决策
  processTurn(): Monster {
    // 简单的 AI：向玩家移动
    return this;
  }
}
```

## 使用示例

### 创建玩家角色

```typescript
// 创建玩家
const player = new Avatar(
  'player1',
  '幸存者',
  new Tripoint({ x: 50, y: 50, z: 0 }),
  new CharacterStats(10, 10, 10, 10),
  new SkillMap(),
  createDefaultBodyParts(),
  List(),
  1000,
  1000
);

// 训练技能
const playerWithSkill = player.skills.train('melee', 50);
console.log(playerWithSkill.getLevel('melee'));  // 0.5

// 受到伤害
const damagedPlayer = player.takeDamage(BodyPart.TORSO, 10);
console.log(damagedPlayer.getHP(BodyPart.TORSO));  // 50
```

### 创建怪物

```typescript
// 创建丧尸
const zombie = new Monster(
  'zombie_1',
  'mon_zombie',
  '丧尸',
  new Tripoint({ x: 55, y: 50, z: 0 }),
  60,
  60,
  CreatureSize.MEDIUM,
  MonsterAttitude.HOSTILE
);

// 丧尸攻击
const attackedPlayer = player.takeDamage(BodyPart.ARM_L, 15);
```

## 与原版 C++ 的对应

| C++ 类型 | TypeScript 类型 |
|---------|----------------|
| `Creature` | `Creature` |
| `Character` | `Character` |
| `avatar` | `Avatar` |
| `monster` | `Monster` |
| `body_part` enum | `BodyPart` enum |
| `SkillLevel` | `SkillLevel` |
| `effect` | `Effect` |

## 未来扩展

### 1. 装备系统

```typescript
class Character {
  readonly wieldedItem: Item | null;
  readonly wornItems: ImmutableList<Item>;
  wield(item: Item): Character;
  wear(item: Item): Character;
}
```

### 2. 需求系统

```typescript
class Character {
  readonly hunger: number;
  readonly thirst: number;
  readonly fatigue: number;
  readonly pain: number;
}
```

### 3. bionics 系统

```typescript
class Character {
  readonly bionics: ImmutableList<Bionic>;
  installBionic(bionic: Bionic): Character;
  activateBionic(id: string): Character;
}
```

### 4. mutation 系统

```typescript
class Character {
  readonly mutations: ImmutableSet<MutationId>;
  addMutation(mutation: Mutation): Character;
  removeMutation(mutation: Mutation): Character;
}
```
