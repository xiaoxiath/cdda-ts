/**
 * Clause Widget - 条件子句选择器
 */

import React from 'react'
import type { WidgetConfig, WidgetValues, Clause, Condition } from '../types'
import { resolveColor } from './WidgetRenderer'

interface ClauseWidgetProps {
  config: WidgetConfig
  values: WidgetValues
}

/**
 * 条件 Widget 组件
 * 根据条件选择要显示的文本
 */
export function ClauseWidget({ config, values }: ClauseWidgetProps): React.ReactNode {
  const clauses = config.clauses || []

  // 找到第一个匹配的子句
  const matchedClause = clauses.find((clause) => evaluateCondition(clause.condition, values))

  if (!matchedClause) {
    return <span className="ui-clause-empty">-</span>
  }

  const style: React.CSSProperties = {
    color: resolveColor(matchedClause.color),
  }

  return (
    <span className="ui-clause" style={style}>
      {matchedClause.text}
    </span>
  )
}

/**
 * 评估条件表达式
 */
function evaluateCondition(condition: Condition | undefined, values: WidgetValues): boolean {
  if (!condition) return false

  // 简单的数学表达式评估
  if ('math' in condition) {
    return evaluateMathExpression(condition.math[0], values)
  }

  // 逻辑与
  if ('and' in condition) {
    return condition.and.every((c) => evaluateCondition(c, values))
  }

  // 逻辑或
  if ('or' in condition) {
    return condition.or.some((c) => evaluateCondition(c, values))
  }

  // 逻辑非
  if ('not' in condition) {
    return !evaluateCondition(condition.not, values)
  }

  return false
}

/**
 * 评估数学表达式
 * 支持简单的比较表达式，如 "u_health() < -100"
 */
function evaluateMathExpression(expr: string, values: WidgetValues): boolean {
  try {
    // 简化处理：解析常见的函数调用和比较表达式
    const match = expr.match(/(\w+)\(\)\s*([<>=!]+)\s*(-?\d+)/)
    if (!match) return false

    const [, func, op, rhsStr] = match
    const rhs = Number(rhsStr)

    // 获取变量值
    let lhs: number | undefined

    switch (func) {
      case 'u_health':
        lhs = values.hp ? Object.values(values.hp).reduce((a, b) => a + b, 0) / 6 : 0
        break
      case 'u_hunger':
        lhs = values.hunger
        break
      case 'u_thirst':
        lhs = values.thirst
        break
      case 'u_fatigue':
        lhs = values.fatigue
        break
      case 'u_sleepiness':
        lhs = values.sleepiness
        break
      case 'u_pain':
        lhs = values.pain
        break
      case 'u_stamina':
        lhs = values.stamina
        break
      case 'u_focus':
        lhs = values.focus
        break
      case 'u_mood':
        lhs = values.mood
        break
      default:
        return false
    }

    if (lhs === undefined) return false

    // 执行比较
    switch (op) {
      case '<':
        return lhs < rhs
      case '<=':
        return lhs <= rhs
      case '>':
        return lhs > rhs
      case '>=':
        return lhs >= rhs
      case '==':
        return lhs === rhs
      case '!=':
        return lhs !== rhs
      default:
        return false
    }
  } catch (error) {
    console.warn('[ClauseWidget] Failed to evaluate expression:', expr, error)
    return false
  }
}
