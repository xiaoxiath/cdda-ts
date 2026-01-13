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
  isUnlocked: boolean;
}

/**
 * 技能实例类
 *
 * 使用不可变数据结构
 */
export class Skill {
  readonly definition!: SkillDefinition;
  readonly level!: SkillLevel;
  readonly experience!: SkillExperience;
  readonly practice!: SkillPracticeData;
  readonly isUnlocked!: boolean;

  private constructor(props: SkillPropsInternal) {
    this.definition = props.definition;
    this.level = props.level;
    this.experience = props.experience;
    this.practice = props.practice;
    this.isUnlocked = props.isUnlocked;

    Object.freeze(this);
    Object.freeze(this.practice);
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
      isUnlocked: true,
    });
  }

  // ========== 等级和经验 ==========

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
   * 练习技能（获得经验）
   */
  practiceSkill(baseExperience: SkillExperience, currentTime: number = Date.now()): Skill {
    if (!this.isUnlocked) {
      return this;
    }

    // 应用经验倍率
    const multiplier = this.definition.getExperienceMultiplier(this.level);
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

    return new Skill({
      definition: this.definition,
      level: this.level,
      experience: newExperience,
      practice: newPractice,
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
      isUnlocked: this.isUnlocked,
    });
  }

  // ========== 时间相关 ==========

  /**
   * 处理技能消退（长时间未练习）
   */
  processDecay(currentTime: number, decayDays: number = 30): Skill {
    if (!this.isUnlocked || this.level === 0) {
      return this;
    }

    const daysSincePracticed = (currentTime - this.practice.lastPracticed) / (1000 * 60 * 60 * 24);

    if (daysSincePracticed < decayDays) {
      return this;
    }

    // 技能开始消退
    // 每超过一天有 1% 概率降低 1 级
    const excessDays = Math.floor(daysSincePracticed - decayDays);
    const decayChance = Math.min(excessDays * 0.01, 0.5);

    if (Math.random() < decayChance && this.level > 0) {
      return new Skill({
        definition: this.definition,
        level: Math.max(0, this.level - 1),
        experience: this.experience,
        practice: {
          ...this.practice,
          isDecaying: true,
        },
        isUnlocked: this.isUnlocked,
      });
    }

    return this;
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
    };
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: Record<string, any>, definition: SkillDefinition): Skill {
    const practiceData = json.practice as SkillPracticeData | undefined;
    return new Skill({
      definition,
      level: (json.level as SkillLevel) ?? 0,
      experience: (json.experience as SkillExperience) ?? 0,
      practice: practiceData ?? {
        practiceCount: 0,
        lastPracticed: 0,
        isDecaying: false,
      },
      isUnlocked: (json.isUnlocked as boolean) ?? true,
    });
  }
}
