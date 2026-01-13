/**
 * Skill Module - 技能系统
 *
 * 导出技能系统的所有核心类和类型
 */

// 类型定义
export * from './types';

// 核心类
export { SkillDefinition, SkillDefinitions } from './SkillDefinition';
export { Skill } from './Skill';
export { SkillManager } from './SkillManager';

// 书籍系统
export { BookManager } from './BookManager';
export type { BookData, BookType } from './types';

// 书籍相关类型从 BookManager 导出
export type { ReadingResult, ReadingCheckResult } from './BookManager';

