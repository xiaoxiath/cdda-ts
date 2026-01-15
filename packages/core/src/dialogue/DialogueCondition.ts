/**
 * DialogueCondition - 对话条件解析器
 *
 * 解析和评估对话系统中的布尔表达式条件。
 * 支持 and、or、not 等逻辑运算符。
 *
 * 示例条件:
 * - "u_has_mission and npc_has_weapon"
 * - "u_stat_strength > 10 or not at_safe_space"
 */

import type { DialogueContext } from './types';

/**
 * 对话条件解析器
 *
 * 提供静态方法来评估对话条件表达式。
 */
export class DialogueCondition {
  /**
   * 评估条件表达式
   * @param condition - 条件表达式字符串
   * @param ctx - 对话上下文
   * @returns 条件是否为真
   */
  static evaluate(condition: string, ctx: DialogueContext): boolean {
    if (!condition || condition.trim() === '') {
      return true;
    }

    // 预处理：移除多余空格
    const expr = condition.trim();

    // 处理括号（简化版本：只处理一层括号）
    const parenResult = this.handleParentheses(expr, ctx);
    if (parenResult !== null) {
      return parenResult;
    }

    // 处理 not
    if (expr.startsWith('not ')) {
      const inner = expr.slice(4).trim();
      return !this.evaluate(inner, ctx);
    }

    // 处理 or（先处理 or，因为 and 优先级更高）
    const orParts = this.splitByOperator(expr, ' or ');
    if (orParts.length > 1) {
      return orParts.some(part => this.evaluate(part.trim(), ctx));
    }

    // 处理 and
    const andParts = this.splitByOperator(expr, ' and ');
    if (andParts.length > 1) {
      return andParts.every(part => this.evaluate(part.trim(), ctx));
    }

    // 基础条件
    return this.evaluateBasicCondition(expr, ctx);
  }

  /**
   * 处理括号（简化版本）
   * 只处理最外层的括号
   */
  private static handleParentheses(
    expr: string,
    ctx: DialogueContext
  ): boolean | null {
    // 检查是否有完整的括号对
    let depth = 0;
    let start = -1;
    let end = -1;

    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') {
        if (depth === 0) {
          start = i;
        }
        depth++;
      } else if (expr[i] === ')') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    // 如果没有找到完整的括号对
    if (start === -1 || end === -1) {
      return null;
    }

    // 提取括号内的内容
    const inner = expr.slice(start + 1, end).trim();
    const before = expr.slice(0, start).trim();
    const after = expr.slice(end + 1).trim();

    // 评估括号内的表达式
    const innerResult = this.evaluate(inner, ctx);

    // 如果括号前后没有内容，直接返回结果
    if (!before && !after) {
      return innerResult;
    }

    // 如果有前后内容，需要组合
    // 这是一个简化版本，完整版本需要更复杂的处理
    if (before.endsWith('not ')) {
      return !innerResult;
    }

    return innerResult;
  }

  /**
   * 按运算符分割表达式
   * 注意不要分割在字符串或括号内部
   */
  private static splitByOperator(expr: string, op: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0; // 括号深度
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];

      // 处理字符串
      if ((char === '"' || char === "'") && (i === 0 || expr[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }

      if (!inString) {
        // 处理括号
        if (char === '(') {
          depth++;
        } else if (char === ')') {
          depth--;
        }

        // 检查是否是运算符（不在括号内）
        if (depth === 0 && expr.slice(i, i + op.length) === op) {
          parts.push(current.trim());
          current = '';
          i += op.length - 1; // 跳过运算符
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  }

  /**
   * 评估基础条件（不包含逻辑运算符）
   */
  private static evaluateBasicCondition(
    condition: string,
    ctx: DialogueContext
  ): boolean {
    const trimmed = condition.trim();

    // 处理比较运算符
    if (trimmed.includes('>=')) {
      return this.evaluateComparison(trimmed, '>=', ctx);
    }
    if (trimmed.includes('<=')) {
      return this.evaluateComparison(trimmed, '<=', ctx);
    }
    if (trimmed.includes('>')) {
      return this.evaluateComparison(trimmed, '>', ctx);
    }
    if (trimmed.includes('<')) {
      return this.evaluateComparison(trimmed, '<', ctx);
    }
    if (trimmed.includes('==')) {
      return this.evaluateComparison(trimmed, '==', ctx);
    }
    if (trimmed.includes('!=')) {
      return this.evaluateComparison(trimmed, '!=', ctx);
    }

    // 处理布尔条件
    return this.evaluateBooleanCondition(trimmed, ctx);
  }

  /**
   * 评估比较表达式
   */
  private static evaluateComparison(expr: string, op: string, ctx?: DialogueContext): boolean {
    const parts = expr.split(op);
    if (parts.length !== 2) {
      return false;
    }

    const left = parts[0].trim();
    const right = parts[1].trim();

    // 检查左边是否是特殊条件
    const leftValue = this.parseValue(left, ctx);
    const rightValue = this.parseValue(right, ctx);

    switch (op) {
      case '>':
        return leftValue > rightValue;
      case '<':
        return leftValue < rightValue;
      case '>=':
        return leftValue >= rightValue;
      case '<=':
        return leftValue <= rightValue;
      case '==':
        return leftValue === rightValue;
      case '!=':
        return leftValue !== rightValue;
      default:
        return false;
    }
  }

  /**
   * 解析值
   * 支持数字和特殊条件
   */
  private static parseValue(value: string, ctx?: DialogueContext): number {
    // 尝试直接解析为数字
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return num;
    }

    // 如果有上下文，尝试解析特殊条件
    if (ctx) {
      // 处理 u_stat_* 条件
      if (value.startsWith('u_stat_')) {
        const stat = value.slice(7);
        return ctx.player.getStat(stat);
      }
    }

    return 0;
  }

  /**
   * 评估布尔条件
   */
  private static evaluateBooleanCondition(
    condition: string,
    ctx: DialogueContext
  ): boolean {
    // 玩家条件
    if (condition === 'u_has_mission') {
      return ctx.mission !== null;
    }

    // NPC 条件
    if (condition === 'npc_has_weapon') {
      return (ctx.npc as { hasWeapon?: () => boolean })?.hasWeapon?.() ?? false;
    }

    if (condition === 'npc_is_friend') {
      const attitude = (ctx.npc as { getAttitude?: () => number })?.getAttitude?.() ?? 5;
      return attitude >= 7;
    }

    if (condition === 'npc_is_hostile') {
      const attitude = (ctx.npc as { getAttitude?: () => number })?.getAttitude?.() ?? 5;
      return attitude <= 2;
    }

    if (condition === 'at_safe_space') {
      return (ctx.npc as { isInSafePlace?: () => boolean })?.isInSafePlace?.() ?? true;
    }

    // 玩家属性条件
    if (condition.startsWith('u_stat_')) {
      const stat = condition.slice(7);
      const value = ctx.player.getStat(stat);
      return value > 0;
    }

    // 技能条件
    if (condition.startsWith('u_has_skill_')) {
      const skill = condition.slice(12);
      // 简化版本，检查技能等级是否大于0
      const level = ctx.player.getSkillLevel(skill as any);
      return level > 0;
    }

    // 物品条件
    if (condition.startsWith('u_has_') && condition.endsWith('_item')) {
      const item = condition.slice(6, -5);
      // 简化版本
      return false;
    }

    // 时间条件
    if (condition === 'is_day') {
      // 简化版本
      return true;
    }

    if (condition === 'is_night') {
      return false;
    }

    // 季节条件
    if (condition.startsWith('season_')) {
      // 简化版本
      return condition === 'season_summer';
    }

    // 默认返回 false
    return false;
  }

  /**
   * 检查条件语法是否有效
   * 用于调试和验证
   */
  static validate(condition: string): { valid: boolean; error?: string } {
    if (!condition || condition.trim() === '') {
      return { valid: true };
    }

    // 检查括号匹配
    let depth = 0;
    for (const char of condition) {
      if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
        if (depth < 0) {
          return { valid: false, error: '括号不匹配' };
        }
      }
    }

    if (depth !== 0) {
      return { valid: false, error: '括号不匹配' };
    }

    // 更多语法检查可以在这里添加

    return { valid: true };
  }

  /**
   * 获取条件的所有依赖
   * 用于优化和缓存
   */
  static getDependencies(condition: string): string[] {
    const dependencies: string[] = [];

    // 简化版本：提取所有的 u_ 和 npc_ 前缀的标识符
    const matches = condition.match(/\b(u_\w+|npc_\w+|at_\w+|is_\w+|season_\w+)/g);
    if (matches) {
      dependencies.push(...matches);
    }

    return [...new Set(dependencies)];
  }
}
