/**
 * BookManager - 书籍学习系统管理器
 *
 * 处理书籍阅读和技能训练
 * 参考 Cataclysm-DDA 的 book 系统
 */

import type {
  SkillId,
  SkillLevel,
  BookData,
} from './types';
import { BookType } from './types';
import { Skill } from './Skill';
import type { SkillDefinition } from './SkillDefinition';

/**
 * 阅读结果
 */
export interface ReadingResult {
  /** 是否成功阅读 */
  success: boolean;
  /** 获得的理论经验 */
  theoryExperienceGained: number;
  /** 实际阅读时间（毫秒） */
  actualReadingTime: number;
  /** 消息 */
  message: string;
  /** 错误原因 */
  error?: string;
}

/**
 * 阅读条件检查结果
 */
export interface ReadingCheckResult {
  /** 是否可以阅读 */
  canRead: boolean;
  /** 错误消息 */
  error?: string;
  /** 实际阅读时间（考虑各种修正） */
  readingTime: number;
  /** 理论经验倍率 */
  experienceMultiplier: number;
}

/**
 * BookManager - 书籍管理器类
 */
export class BookManager {
  /**
   * 检查是否可以阅读书籍
   *
   * @param book 书籍数据
   * @param currentLevel 当前技能等级
   * @param readerIntelligence 读者智力（可选）
   * @returns 阅读条件检查结果
   */
  static checkReadingConditions(
    book: BookData,
    currentLevel: SkillLevel,
    readerIntelligence?: number
  ): ReadingCheckResult {
    // 检查最低等级要求
    if (currentLevel < book.requiredLevel) {
      return {
        canRead: false,
        error: `技能等级不足。需要等级 ${book.requiredLevel}，当前等级 ${currentLevel}`,
        readingTime: 0,
        experienceMultiplier: 0,
      };
    }

    // 检查最高等级限制
    if (currentLevel >= book.maxLevel) {
      return {
        canRead: false,
        error: `已达到书籍能训练的最高等级 (${book.maxLevel})`,
        readingTime: 0,
        experienceMultiplier: 0,
      };
    }

    // 检查智力要求
    if (book.intRequired !== undefined && readerIntelligence !== undefined) {
      if (readerIntelligence < book.intRequired) {
        return {
          canRead: false,
          error: `智力不足。需要智力 ${book.intRequired}，当前智力 ${readerIntelligence}`,
          readingTime: 0,
          experienceMultiplier: 0,
        };
      }
    }

    // 计算阅读时间修正
    let readingTime = book.baseReadingTime;
    let experienceMultiplier = 1.0;

    // 技能等级越高，阅读越快
    const levelBonus = (currentLevel - book.requiredLevel) * 0.05;
    readingTime = readingTime * (1 - levelBonus);

    // 智力影响阅读速度
    if (readerIntelligence !== undefined) {
      const intBonus = Math.max(0, (readerIntelligence - 8) * 0.03);
      readingTime = readingTime * (1 - intBonus);
    }

    // 确保阅读时间不会太短
    readingTime = Math.max(readingTime, 1000); // 最少1秒

    return {
      canRead: true,
      readingTime: Math.floor(readingTime),
      experienceMultiplier: 1.0 + levelBonus,
    };
  }

  /**
   * 计算从书籍获得的理论经验
   *
   * @param book 书籍数据
   * @param skillLevel 当前技能等级
   * @param checkResult 阅读条件检查结果
   * @returns 理论经验值
   */
  static calculateBookExperience(
    book: BookData,
    skillLevel: SkillLevel,
    checkResult: ReadingCheckResult
  ): number {
    // 基础经验
    let experience = book.theoryExperience;

    // 技能等级越高，从书籍获得的经验越少
    const levelPenalty = (skillLevel - book.requiredLevel) / (book.maxLevel - book.requiredLevel);
    experience = experience * (1 - levelPenalty * 0.5);

    // 应用阅读条件倍率
    experience = experience * checkResult.experienceMultiplier;

    return Math.max(1, Math.floor(experience));
  }

  /**
   * 阅读书籍并获得经验
   *
   * @param book 书籍数据
   * @param skill 技能实例
   * @param readerIntelligence 读者智力（可选）
   * @returns 阅读结果
   */
  static readBook(
    book: BookData,
    skill: Skill,
    readerIntelligence?: number
  ): ReadingResult {
    // 检查阅读条件
    const checkResult = BookManager.checkReadingConditions(
      book,
      skill.level,
      readerIntelligence
    );

    if (!checkResult.canRead) {
      return {
        success: false,
        theoryExperienceGained: 0,
        actualReadingTime: 0,
        message: checkResult.error || '无法阅读此书',
        error: checkResult.error,
      };
    }

    // 计算获得的经验
    const experienceGained = BookManager.calculateBookExperience(
      book,
      skill.level,
      checkResult
    );

    // 应用理论经验到技能
    const updatedSkill = skill.studyTheory(experienceGained);

    // 生成反馈消息
    const message = `你阅读了《${book.name}》，获得了 ${experienceGained} 点理论经验。`;

    return {
      success: true,
      theoryExperienceGained: experienceGained,
      actualReadingTime: checkResult.readingTime,
      message,
    };
  }

  /**
   * 获取书籍的阅读进度百分比
   *
   * @param book 书籍数据
   * @param currentLevel 当前技能等级
   * @returns 进度百分比 (0-100)
   */
  static getReadingProgress(book: BookData, currentLevel: SkillLevel): number {
    if (currentLevel < book.requiredLevel) {
      return 0;
    }
    if (currentLevel >= book.maxLevel) {
      return 100;
    }

    const progress = (currentLevel - book.requiredLevel) / (book.maxLevel - book.requiredLevel);
    return Math.min(100, Math.floor(progress * 100));
  }

  /**
   * 获取书籍描述信息
   *
   * @param book 书籍数据
   * @param currentLevel 当前技能等级
   * @returns 描述字符串
   */
  static getBookDescription(book: BookData, currentLevel: SkillLevel): string {
    const lines = [
      `《${book.name}》`,
      `类型: ${book.bookType}`,
      `训练技能: ${book.skillId}`,
      `要求等级: ${book.requiredLevel}`,
      `最高等级: ${book.maxLevel}`,
      `理论经验: ${book.theoryExperience}`,
    ];

    if (book.fun !== undefined) {
      lines.push(`娱乐值: ${book.fun}`);
    }
    if (book.intRequired !== undefined) {
      lines.push(`智力要求: ${book.intRequired}`);
    }

    const progress = BookManager.getReadingProgress(book, currentLevel);
    lines.push(`学习进度: ${progress}%`);

    if (book.description) {
      lines.push(``);
      lines.push(book.description);
    }

    return lines.join('\n');
  }

  // ========== 内置书籍创建 ==========

  /**
   * 创建技能手册
   */
  static createManual(
    id: string,
    name: string,
    skillId: SkillId,
    requiredLevel: SkillLevel,
    maxLevel: SkillLevel,
    experience: number,
    readingTime: number = 30000
  ): BookData {
    return {
      id,
      name,
      bookType: BookType.MANUAL,
      skillId,
      requiredLevel,
      maxLevel,
      baseReadingTime: readingTime,
      theoryExperience: experience,
      fun: 1,
      description: `一本关于 ${skillId} 的技能手册`,
    };
  }

  /**
   * 创建教科书
   */
  static createTextbook(
    id: string,
    name: string,
    skillId: SkillId,
    requiredLevel: SkillLevel,
    maxLevel: SkillLevel,
    experience: number,
    intRequired: number = 8,
    readingTime: number = 60000
  ): BookData {
    return {
      id,
      name,
      bookType: BookType.TEXTBOOK,
      skillId,
      requiredLevel,
      maxLevel,
      baseReadingTime: readingTime,
      theoryExperience: experience,
      intRequired,
      fun: -1,
      description: `一本关于 ${skillId} 的学术教科书`,
    };
  }

  /**
   * 创建参考书
   */
  static createReference(
    id: string,
    name: string,
    skillId: SkillId,
    maxLevel: SkillLevel,
    experience: number
  ): BookData {
    return {
      id,
      name,
      bookType: BookType.REFERENCE,
      skillId,
      requiredLevel: 0,
      maxLevel,
      baseReadingTime: 15000,
      theoryExperience: experience,
      fun: 0,
      description: `一本关于 ${skillId} 的参考书`,
    };
  }
}
