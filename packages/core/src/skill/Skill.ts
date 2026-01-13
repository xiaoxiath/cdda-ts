/**
 * Skill - 技能实例类
 *
 * 参考 Cataclysm-DDA 的 skill 结构
 * 表示角色掌握的单个技能实例，包含等级和经验值
 */

import type {
  SkillId,
  SkillLevel,
  SkillExperience,
  SkillPracticeData,
  SkillTheoryData,
  SkillRustData,
  SkillLevelUpResult,
} from './types';
import type { SkillDefinition } from './SkillDefinition';

/**
 * 技能实例属性（内部）
 */
interface SkillPropsInternal {
  definition: SkillDefinition;
  level: SkillLevel;
  experience: SkillExperience;
  practice: SkillPracticeData;
  theory: SkillTheoryData;
  rust: SkillRustData;
  isUnlocked: boolean;
}

/**
 * 技能实例类
 *
 * 使用不可变数据结构
 *
 * 理论/实践双轨系统：
 * - level: 实践等级（通过实际使用获得）
 * - theory.theoryLevel: 理论等级（通过学习获得）
 * - 理论会随时间转化为实践经验
 */
export class Skill {
  readonly definition!: SkillDefinition;
  readonly level!: SkillLevel;
  readonly experience!: SkillExperience;
  readonly practice!: SkillPracticeData;
  readonly theory!: SkillTheoryData;
  readonly rust!: SkillRustData;
  readonly isUnlocked!: boolean;

  private constructor(props: SkillPropsInternal) {
    this.definition = props.definition;
    this.level = props.level;
    this.experience = props.experience;
    this.practice = props.practice;
    this.theory = props.theory;
    this.rust = props.rust;
    this.isUnlocked = props.isUnlocked;

    Object.freeze(this);
    Object.freeze(this.practice);
    Object.freeze(this.theory);
    Object.freeze(this.rust);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建新技能实例
   */
  static create(definition: SkillDefinition): Skill {
    return new Skill({
      definition,
      level: 0,
      experience: 0,
      practice: {
        practiceCount: 0,
        lastPracticed: 0,
        isDecaying: false,
      },
      theory: {
        theoryLevel: 0,
        theoryExperience: 0,
        lastStudied: 0,
      },
      rust: {
        isRusted: false,
        rustLevel: 0,
        lastCheckTime: Date.now(),
        rustResist: definition.defaultRustResist ?? 0,
      },
      isUnlocked: true,
    });
  }

  /**
   * 创建已锁定的技能
   */
  static locked(definition: SkillDefinition): Skill {
    return new Skill({
      definition,
      level: 0,
      experience: 0,
      practice: {
        practiceCount: 0,
        lastPracticed: 0,
        isDecaying: false,
      },
      theory: {
        theoryLevel: 0,
        theoryExperience: 0,
        lastStudied: 0,
      },
      rust: {
        isRusted: false,
        rustLevel: 0,
        lastCheckTime: Date.now(),
        rustResist: definition.defaultRustResist ?? 0,
      },
      isUnlocked: false,
    });
  }

  /**
   * 从等级创建
   */
  static fromLevel(definition: SkillDefinition, level: SkillLevel): Skill {
    return new Skill({
      definition,
      level,
      experience: 0,
      practice: {
        practiceCount: 0,
        lastPracticed: Date.now(),
        isDecaying: false,
      },
      theory: {
        theoryLevel: 0,
        theoryExperience: 0,
        lastStudied: 0,
      },
      rust: {
        isRusted: false,
        rustLevel: 0,
        lastCheckTime: Date.now(),
        rustResist: definition.defaultRustResist ?? 0,
      },
      isUnlocked: true,
    });
  }

  // ========== 等级和经验 ==========

  /**
   * 获取实践等级（通过实际使用获得的等级）
   * 这是 CDDA 中的 level() 函数对应的实现
   */
  level(): SkillLevel {
    return this.level;
  }

  /**
   * 获取理论等级（通过学习获得的等级）
   * 这是 CDDA 中的 theory() 函数对应的实现
   */
  theory(): SkillLevel {
    return this.theory.theoryLevel;
  }

  /**
   * 获取升级所需经验
   */
  getExperienceToLevelUp(): SkillExperience {
    const required = this.definition.getExperienceForLevel(this.level);
    return Math.max(0, required - this.experience);
  }

  /**
   * 检查是否可以升级
   */
  canLevelUp(): boolean {
    return this.experience >= this.definition.getExperienceForLevel(this.level);
  }

  /**
   * 练习技能（获得实践经验）
   */
  practiceSkill(baseExperience: SkillExperience, currentTime: number = Date.now()): Skill {
    if (!this.isUnlocked) {
      return this;
    }

    // 应用经验倍率和生锈影响
    const effectiveLevel = Math.max(0, this.level - this.rust.rustLevel);
    const multiplier = this.definition.getExperienceMultiplier(effectiveLevel);
    const experienceGained = Math.floor(baseExperience * multiplier);

    if (experienceGained <= 0) {
      return this;
    }

    const newExperience = this.experience + experienceGained;
    const newPractice: SkillPracticeData = {
      practiceCount: this.practice.practiceCount + 1,
      lastPracticed: currentTime,
      isDecaying: false,
    };

    // 练习可以减少一些生锈
    const rustReduction = Math.min(this.rust.rustLevel, Math.ceil(experienceGained / 100));
    const newRust: SkillRustData = {
      ...this.rust,
      rustLevel: Math.max(0, this.rust.rustLevel - rustReduction),
      isRusted: Math.max(0, this.rust.rustLevel - rustReduction) > 0,
      lastCheckTime: currentTime,
    };

    return new Skill({
      definition: this.definition,
      level: this.level,
      experience: newExperience,
      practice: newPractice,
      theory: this.theory,
      rust: newRust,
      isUnlocked: this.isUnlocked,
    });
  }

  /**
   * 学习理论（从书籍等获得理论经验）
   */
  studyTheory(baseExperience: SkillExperience, currentTime: number = Date.now()): Skill {
    if (!this.isUnlocked) {
      return this;
    }

    // 理论经验倍率（通常比练习慢）
    const multiplier = 0.5;
    const experienceGained = Math.floor(baseExperience * multiplier);

    if (experienceGained <= 0) {
      return this;
    }

    const newTheoryExperience = this.theory.theoryExperience + experienceGained;

    // 检查理论是否可以升级
    let newTheoryLevel = this.theory.theoryLevel;
    const theoryExpForNextLevel = this.definition.getExperienceForLevel(newTheoryLevel);

    if (newTheoryExperience >= theoryExpForNextLevel && newTheoryLevel < 10) {
      newTheoryLevel++;
      // 理论升级会消耗经验
    }

    const newTheory: SkillTheoryData = {
      theoryLevel: newTheoryLevel,
      theoryExperience: newTheoryLevel >= 10
        ? this.theory.theoryExperience
        : newTheoryExperience >= theoryExpForNextLevel
          ? newTheoryExperience - theoryExpForNextLevel
          : newTheoryExperience,
      lastStudied: currentTime,
    };

    return new Skill({
      definition: this.definition,
      level: this.level,
      experience: this.experience,
      practice: this.practice,
      theory: newTheory,
      rust: this.rust,
      isUnlocked: this.isUnlocked,
    });
  }

  /**
   * 转化理论为实践经验
   *
   * 理论会逐渐转化为实际技能等级
   * 转化速率：每游戏小时约 1-2 点理论经验转化为实践
   *
   * CDDA 参考实现：
   * - 理论等级限制实践等级的上限
   * - 理论经验随时间慢慢转化为实践
   * - 转化速率受技能难度影响
   */
  convertTheoryToPractice(currentTime: number): Skill {
    if (this.theory.theoryLevel === 0 || this.theory.theoryExperience === 0) {
      return this;
    }

    // 计算自上次学习以来的时间（小时）
    const hoursPassed = (currentTime - this.theory.lastStudied) / (1000 * 60 * 60);

    if (hoursPassed < 1) {
      return this; // 不到1小时，不转化
    }

    // 转化速率基于技能难度
    // 难度越高，转化越慢
    const difficultyMultiplier = this.definition.difficultyMultiplier;
    const baseConversionRate = 0.5; // 每 2 小时转化 1 点经验
    const actualConversionRate = baseConversionRate / difficultyMultiplier;

    // 计算可转化的理论经验
    const theoryToConvert = Math.floor(hoursPassed * actualConversionRate);
    const actualConvert = Math.min(theoryToConvert, this.theory.theoryExperience);

    if (actualConvert <= 0) {
      return this;
    }

    // 理论等级限制实践等级上限
    // 实践等级不能超过理论等级 + 2
    const maxPracticeLevel = this.theory.theoryLevel + 2;
    if (this.level >= maxPracticeLevel) {
      return this; // 已达到理论允许的最大实践等级
    }

    // 转化理论为实践
    const newPracticeExp = this.experience + actualConvert;
    const newTheoryExp = this.theory.theoryExperience - actualConvert;

    // 检查是否可以升级
    let newLevel = this.level;
    const expForNextLevel = this.definition.getExperienceForLevel(this.level);

    if (newPracticeExp >= expForNextLevel && this.level < maxPracticeLevel) {
      newLevel++;
    }

    // 计算新的理论等级
    // 理论等级基于理论经验计算
    let newTheoryLevel = this.theory.theoryLevel;
    const theoryExpForNextLevel = this.definition.getExperienceForLevel(this.theory.theoryLevel);

    if (newTheoryExp < theoryExpForNextLevel && this.theory.theoryLevel > 0) {
      // 理论经验不足以维持当前理论等级
      newTheoryLevel = Math.max(0, this.theory.theoryLevel - 1);
    }

    return new Skill({
      definition: this.definition,
      level: newLevel,
      experience: newPracticeExp >= expForNextLevel && newLevel > this.level
        ? newPracticeExp - expForNextLevel
        : newPracticeExp,
      practice: {
        ...this.practice,
        lastPracticed: currentTime,
      },
      theory: {
        theoryLevel: newTheoryLevel,
        theoryExperience: newTheoryExp,
        lastStudied: currentTime,
      },
      rust: this.rust,
      isUnlocked: this.isUnlocked,
    });
  }

  /**
   * 尝试升级
   */
  tryLevelUp(): SkillLevelUpResult {
    const requiredExp = this.definition.getExperienceForLevel(this.level);

    if (this.experience < requiredExp) {
      return {
        leveledUp: false,
        newLevel: this.level,
        experienceGained: 0,
        remainingExperience: this.experience,
      };
    }

    // 升级！
    const newLevel = this.level + 1;
    const remainingExp = this.experience - requiredExp;

    return {
      leveledUp: true,
      newLevel,
      experienceGained: requiredExp,
      remainingExperience: remainingExp,
    };
  }

  /**
   * 升级到指定等级
   */
  levelUpTo(targetLevel: SkillLevel, remainingExp: number): Skill {
    return new Skill({
      definition: this.definition,
      level: targetLevel,
      experience: remainingExp,
      practice: this.practice,
      theory: this.theory,
      rust: this.rust,
      isUnlocked: this.isUnlocked,
    });
  }

  /**
   * 自动升级到尽可能高的等级
   */
  autoLevelUp(): { skill: Skill; result: SkillLevelUpResult } {
    let currentSkill: Skill = this;
    let totalLevelsGained = 0;
    let finalResult = currentSkill.tryLevelUp();

    while (finalResult.leveledUp) {
      totalLevelsGained++;
      currentSkill = currentSkill.levelUpTo(finalResult.newLevel, finalResult.remainingExperience);
      finalResult = currentSkill.tryLevelUp();

      // 防止无限循环
      if (totalLevelsGained > 100) {
        break;
      }
    }

    return {
      skill: currentSkill,
      result: {
        leveledUp: totalLevelsGained > 0,
        newLevel: currentSkill.level,
        experienceGained: totalLevelsGained > 0 ? this.experience : 0,
        remainingExperience: currentSkill.experience,
      },
    };
  }

  // ========== 生锈系统 ==========

  /**
   * 处理技能生锈
   *
   * @param currentTime 当前时间
   * @returns 更新后的技能
   */
  processRust(currentTime: number = Date.now()): Skill {
    if (!this.isUnlocked || this.level === 0) {
      return this;
    }

    // 计算自上次检查以来的天数
    const daysPassed = (currentTime - this.rust.lastCheckTime) / (1000 * 60 * 60 * 24);

    if (daysPassed < 1) {
      return this;
    }

    // 获取生锈速率（每天减少的经验）
    const rustRate = this.definition.rustRate ?? 1;

    // 应用生锈抗性
    const effectiveRustRate = rustRate * (1 - this.rust.rustResist);

    // 计算生锈等级
    const rustToAdd = Math.floor(daysPassed * effectiveRustRate);
    const maxRust = this.level; // 生锈等级不能超过当前等级

    const newRustLevel = Math.min(maxRust, this.rust.rustLevel + rustToAdd);

    if (newRustLevel === this.rust.rustLevel) {
      return this;
    }

    const newRust: SkillRustData = {
      isRusted: newRustLevel > 0,
      rustLevel: newRustLevel,
      lastCheckTime: currentTime,
      rustResist: this.rust.rustResist,
    };

    return new Skill({
      definition: this.definition,
      level: this.level,
      experience: this.experience,
      practice: this.practice,
      theory: this.theory,
      rust: newRust,
      isUnlocked: this.isUnlocked,
    });
  }

  /**
   * 获取有效等级（扣除生锈影响）
   */
  getEffectiveLevel(): SkillLevel {
    return Math.max(0, this.level - this.rust.rustLevel);
  }

  /**
   * 设置生锈抗性
   */
  setRustResist(resist: number): Skill {
    const newRust: SkillRustData = {
      ...this.rust,
      rustResist: Math.max(0, Math.min(1, resist)),
    };

    return new Skill({
      definition: this.definition,
      level: this.level,
      experience: this.experience,
      practice: this.practice,
      theory: this.theory,
      rust: newRust,
      isUnlocked: this.isUnlocked,
    });
  }

  // ========== 状态查询 ==========

  /**
   * 是否为 mastered 等级 (>= 10)
   */
  isMastered(): boolean {
    return this.level >= 10;
  }

  /**
   * 是否为专家等级 (>= 7)
   */
  isExpert(): boolean {
    return this.level >= 7;
  }

  /**
   * 是否为熟练等级 (>= 4)
   */
  isProficient(): boolean {
    return this.level >= 4;
  }

  /**
   * 是否为新手等级 (<= 2)
   */
  isNovice(): boolean {
    return this.level <= 2;
  }

  /**
   * 获取技能等级描述
   */
  getLevelDescription(): string {
    if (this.level === 0) return '无经验';
    if (this.level <= 1) return '新手';
    if (this.level <= 2) return '基本';
    if (this.level <= 3) return '熟练';
    if (this.level <= 4) return '专业';
    if (this.level <= 5) return '专家';
    if (this.level <= 6) return '大师';
    if (this.level <= 7) return '宗师';
    if (this.level <= 8) return '传奇';
    return '神话';
  }

  /**
   * 获取进度百分比 (0-100)
   */
  getProgressPercent(): number {
    const required = this.definition.getExperienceForLevel(this.level);
    if (required === 0) return 100;
    return Math.min(100, Math.floor((this.experience / required) * 100));
  }

  // ========== 修改方法 ==========

  /**
   * 解锁技能
   */
  unlock(): Skill {
    if (this.isUnlocked) return this;
    return new Skill({
      definition: this.definition,
      level: this.level,
      experience: this.experience,
      practice: this.practice,
      theory: this.theory,
      rust: this.rust,
      isUnlocked: true,
    });
  }

  /**
   * 设置等级
   */
  setLevel(level: SkillLevel): Skill {
    return new Skill({
      definition: this.definition,
      level,
      experience: this.experience,
      practice: this.practice,
      theory: this.theory,
      rust: this.rust,
      isUnlocked: this.isUnlocked,
    });
  }

  /**
   * 设置经验
   */
  setExperience(experience: SkillExperience): Skill {
    return new Skill({
      definition: this.definition,
      level: this.level,
      experience,
      practice: this.practice,
      theory: this.theory,
      rust: this.rust,
      isUnlocked: this.isUnlocked,
    });
  }

  /**
   * 增加经验
   */
  addExperience(amount: SkillExperience): Skill {
    return new Skill({
      definition: this.definition,
      level: this.level,
      experience: this.experience + amount,
      practice: this.practice,
      theory: this.theory,
      rust: this.rust,
      isUnlocked: this.isUnlocked,
    });
  }

  // ========== 时间相关 ==========

  /**
   * 处理技能消退（长时间未练习）
   *
   * @deprecated 使用 processRust 代替
   */
  processDecay(currentTime: number, decayDays: number = 30): Skill {
    // 新的实现直接调用 processRust
    return this.processRust(currentTime);
  }

  // ========== 显示方法 ==========

  /**
   * 获取显示名称
   */
  getDisplayName(): string {
    if (!this.isUnlocked) {
      return '??? (未解锁)';
    }
    return `${this.definition.name} (${this.getLevelDescription()} ${this.level})`;
  }

  /**
   * 获取显示信息
   */
  getDisplayInfo(): string {
    if (!this.isUnlocked) {
      return '??? (需要解锁此技能)';
    }

    const progress = this.getProgressPercent();
    const nextExp = this.getExperienceToLevelUp();

    return `${this.definition.name} Lv.${this.level} (${this.getLevelDescription()}) - ${progress}% (${this.experience}/${this.experience + nextExp})`;
  }

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      id: this.definition.id,
      level: this.level,
      experience: this.experience,
      isUnlocked: this.isUnlocked,
      practice: this.practice,
      theory: this.theory,
      rust: this.rust,
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>, definition: SkillDefinition): Skill {
    const practiceData = json.practice as SkillPracticeData | undefined;
    const theoryData = json.theory as SkillTheoryData | undefined;
    const rustData = json.rust as SkillRustData | undefined;

    return new Skill({
      definition,
      level: (json.level as SkillLevel) ?? 0,
      experience: (json.experience as SkillExperience) ?? 0,
      practice: practiceData ?? {
        practiceCount: 0,
        lastPracticed: 0,
        isDecaying: false,
      },
      theory: theoryData ?? {
        theoryLevel: 0,
        theoryExperience: 0,
        lastStudied: 0,
      },
      rust: rustData ?? {
        isRusted: false,
        rustLevel: 0,
        lastCheckTime: Date.now(),
        rustResist: definition.defaultRustResist ?? 0,
      },
      isUnlocked: (json.isUnlocked as boolean) ?? true,
    });
  }
}
