/**
 * SkillManager - 技能管理器
 *
 * 管理角色所有的技能，提供练习、升级、查询等功能
 */

import { Map, List } from 'immutable';
import type { SkillId, SkillLevel, SkillPracticeResult } from './types';
import type { SkillDefinition } from './SkillDefinition';
import { Skill } from './Skill';

/**
 * SkillManager 属性接口
 */
export interface SkillManagerProps {
  /** 所有技能实例 */
  skills: Map<SkillId, Skill>;
  /** 技能定义映射 */
  definitions: Map<SkillId, SkillDefinition>;
}

/**
 * 技能管理器类
 *
 * 使用不可变数据结构
 */
export class SkillManager {
  readonly skills!: Map<SkillId, Skill>;
  readonly definitions!: Map<SkillId, SkillDefinition>;

  private constructor(props: SkillManagerProps) {
    this.skills = props.skills;
    this.definitions = props.definitions;

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建技能管理器
   */
  static create(definitions: SkillDefinition[]): SkillManager {
    const defMap = Map(definitions.map(d => [d.id, d] as [SkillId, SkillDefinition]));

    // 创建所有技能实例
    const skillMap = Map<SkillId, Skill>(
      definitions.map(d => [d.id, Skill.create(d)])
    );

    return new SkillManager({
      skills: skillMap,
      definitions: defMap,
    });
  }

  /**
   * 从预定义技能创建
   */
  static createDefault(): SkillManager {
    const { SkillDefinitions } = require('./SkillDefinition');
    const defs = Object.values(SkillDefinitions) as SkillDefinition[];
    return SkillManager.create(defs);
  }

  /**
   * 从 JSON 创建
   */
  static fromJson(json: {
    skills: Array<{ id: string; level: number; experience: number }>;
    definitions: Array<Record<string, any>>;
  }): SkillManager {
    const definitions = json.definitions.map(d => {
      const { SkillDefinition } = require('./SkillDefinition');
      return SkillDefinition.fromJson(d);
    });

    const defMap = Map(definitions.map(d => [d.id, d] as [SkillId, SkillDefinition]));

    const skills = Map<SkillId, Skill>(
      json.skills.map(s => {
        const def = defMap.get(s.id as SkillId);
        if (!def) {
          throw new Error(`Unknown skill ID: ${s.id}`);
        }
        return [s.id as SkillId, Skill.fromJson(s, def)];
      })
    );

    return new SkillManager({
      skills,
      definitions: defMap,
    });
  }

  // ========== 技能查询 ==========

  /**
   * 获取技能
   */
  getSkill(id: SkillId): Skill | undefined {
    return this.skills.get(id);
  }

  /**
   * 获取技能等级
   */
  getSkillLevel(id: SkillId): SkillLevel {
    return this.skills.get(id)?.level ?? 0;
  }

  /**
   * 获取所有技能
   */
  getAllSkills(): Map<SkillId, Skill> {
    return this.skills;
  }

  /**
   * 获取已解锁的技能
   */
  getUnlockedSkills(): List<Skill> {
    return List(this.skills.valueSeq().filter(s => s.isUnlocked));
  }

  /**
   * 按类别获取技能
   */
  getSkillsByCategory(category: string): List<Skill> {
    return List(
      this.skills.valueSeq().filter(s => s.definition.category === category)
    );
  }

  /**
   * 获取技能总数
   */
  getSkillCount(): number {
    return this.skills.size;
  }

  /**
   * 获取已解锁技能数
   */
  getUnlockedSkillCount(): number {
    return this.skills.valueSeq().filter(s => s.isUnlocked).count();
  }

  /**
   * 检查是否有技能
   */
  hasSkill(id: SkillId): boolean {
    return this.skills.has(id);
  }

  // ========== 技能练习 ==========

  /**
   * 练习技能
   */
  practiceSkill(
    id: SkillId,
    baseExperience: number = 10,
    currentTime: number = Date.now()
  ): SkillManager {
    const skill = this.skills.get(id);
    if (!skill || !skill.isUnlocked) {
      return this;
    }

    const practiced = skill.practiceSkill(baseExperience, currentTime);

    // 尝试自动升级
    const { skill: leveledSkill } = practiced.autoLevelUp();

    return new SkillManager({
      skills: this.skills.set(id, leveledSkill),
      definitions: this.definitions,
    });
  }

  /**
   * 练习多个技能
   */
  practiceMultiple(
    practices: Array<{ id: SkillId; experience: number }>,
    currentTime: number = Date.now()
  ): SkillManager {
    let newSkills = this.skills;

    for (const p of practices) {
      const skill = this.skills.get(p.id);
      if (skill && skill.isUnlocked) {
        const practiced = skill.practiceSkill(p.experience, currentTime);
        const { skill: leveledSkill } = practiced.autoLevelUp();
        newSkills = newSkills.set(p.id, leveledSkill);
      }
    }

    return new SkillManager({
      skills: newSkills,
      definitions: this.definitions,
    });
  }

  /**
   * 练习所有技能
   */
  practiceAll(
    baseExperience: number = 1,
    currentTime: number = Date.now()
  ): SkillManager {
    let newSkills = this.skills;

    for (const [id, skill] of this.skills.entries()) {
      if (skill.isUnlocked) {
        const practiced = skill.practiceSkill(baseExperience, currentTime);
        const { skill: leveledSkill } = practiced.autoLevelUp();
        newSkills = newSkills.set(id, leveledSkill);
      }
    }

    return new SkillManager({
      skills: newSkills,
      definitions: this.definitions,
    });
  }

  // ========== 技能修改 ==========

  /**
   * 设置技能等级
   */
  setSkillLevel(id: SkillId, level: SkillLevel): SkillManager {
    const skill = this.skills.get(id);
    if (!skill) {
      return this;
    }

    return new SkillManager({
      skills: this.skills.set(id, skill.setLevel(level)),
      definitions: this.definitions,
    });
  }

  /**
   * 设置多个技能等级
   */
  setMultipleSkills(levels: Map<SkillId, SkillLevel>): SkillManager {
    let newSkills = this.skills;

    for (const [id, level] of levels.entries()) {
      const skill = this.skills.get(id);
      if (skill) {
        newSkills = newSkills.set(id, skill.setLevel(level));
      }
    }

    return new SkillManager({
      skills: newSkills,
      definitions: this.definitions,
    });
  }

  /**
   * 解锁技能
   */
  unlockSkill(id: SkillId): SkillManager {
    const skill = this.skills.get(id);
    if (!skill) {
      return this;
    }

    return new SkillManager({
      skills: this.skills.set(id, skill.unlock()),
      definitions: this.definitions,
    });
  }

  /**
   * 添加新技能
   */
  addSkill(definition: SkillDefinition): SkillManager {
    if (this.skills.has(definition.id)) {
      return this;
    }

    return new SkillManager({
      skills: this.skills.set(definition.id, Skill.create(definition)),
      definitions: this.definitions.set(definition.id, definition),
    });
  }

  // ========== 时间相关 ==========

  /**
   * 处理所有技能的消退
   */
  processDecay(currentTime: number = Date.now()): SkillManager {
    let newSkills = this.skills;

    for (const [id, skill] of this.skills.entries()) {
      const decayed = skill.processDecay(currentTime);
      if (decayed !== skill) {
        newSkills = newSkills.set(id, decayed);
      }
    }

    return new SkillManager({
      skills: newSkills,
      definitions: this.definitions,
    });
  }

  // ========== 统计信息 ==========

  /**
   * 获取总技能等级
   */
  getTotalSkillLevel(): number {
    return this.skills.valueSeq().reduce((sum, skill) => sum + skill.level, 0);
  }

  /**
   * 获取最高等级技能
   */
  getHighestSkill(): { skill: Skill; level: number } | null {
    let highest: Skill | null = null;
    let maxLevel = -1;

    for (const skill of this.skills.valueSeq()) {
      if (skill.level > maxLevel) {
        highest = skill;
        maxLevel = skill.level;
      }
    }

    if (!highest) return null;
    return { skill: highest, level: maxLevel };
  }

  /**
   * 获取掌握的技能数量 (>= 10)
   */
  getMasteredSkillCount(): number {
    return this.skills.valueSeq().filter(s => s.isMastered()).count();
  }

  /**
   * 获取专家技能数量 (>= 7)
   */
  getExpertSkillCount(): number {
    return this.skills.valueSeq().filter(s => s.isExpert()).count();
  }

  // ========== 显示方法 ==========

  /**
   * 获取技能列表字符串
   */
  getSkillListString(): string {
    const lines: string[] = [];

    for (const skill of this.skills.valueSeq().sort((a: Skill, b: Skill) => b.level - a.level)) {
      if (skill.isUnlocked && skill.level > 0) {
        lines.push(skill.getDisplayInfo());
      }
    }

    return lines.join('\n') || '没有任何技能';
  }

  /**
   * 按类别获取技能字符串
   */
  getSkillsByCategoryString(): string {
    const categories: Record<string, Skill[]> = {};

    for (const skill of this.skills.valueSeq()) {
      if (!skill.isUnlocked || skill.level === 0) continue;

      const cat = skill.definition.category;
      if (!categories[cat]) {
        categories[cat] = [];
      }
      categories[cat].push(skill);
    }

    const lines: string[] = [];

    for (const [category, skills] of Object.entries(categories)) {
      lines.push(`\n${category}:`);
      for (const skill of skills.sort((a: Skill, b: Skill) => b.level - a.level)) {
        lines.push(`  ${skill.getDisplayInfo()}`);
      }
    }

    return lines.join('\n') || '没有技能';
  }

  // ========== 转换方法 ==========

  /**
   * 转换为属性对象
   */
  private asProps() {
    return {
      skills: this.skills,
      definitions: this.definitions,
    };
  }

  /**
   * 转换为 JSON
   */
  toJson(): Record<string, any> {
    return {
      skills: this.skills.valueSeq().map(s => s.toJson()).toArray(),
      definitions: this.definitions.valueSeq().map(d => d.toJson()).toArray(),
    };
  }
}
