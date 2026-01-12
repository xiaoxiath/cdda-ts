/**
 * Number Widget - 显示数字值
 */

import React from 'react'
import type { WidgetConfig, WidgetValues } from '../types'
import { getWidgetValue, getWidgetMaxValue, getHPColor, resolveColor } from './WidgetRenderer'

interface NumberWidgetProps {
  config: WidgetConfig
  values: WidgetValues
}

/**
 * 数字 Widget 组件
 */
export function NumberWidget({ config, values }: NumberWidgetProps): React.ReactNode {
  const value = getWidgetValue(config, values)

  if (value === undefined || value === null) {
    return <span className="ui-number-empty">-</span>
  }

  const numValue = Number(value)
  const maxValue = getWidgetMaxValue(config, values)
  const colors = config.colors || []

  // 确定颜色
  let color = '#ffffff'

  if (colors.length > 0) {
    color = getHPColor(numValue, maxValue, colors.map(resolveColor))
  }

  const style: React.CSSProperties = {
    color,
    fontFamily: 'monospace',
  }

  // 根据变量类型格式化显示
  let displayValue: string

  switch (config.var) {
    case 'stamina':
      // 耐力显示整数
      displayValue = Math.round(numValue).toString()
      break
    case 'focus':
    case 'mood':
    case 'cardio_fit':
      // 这些通常是百分比
      displayValue = `${Math.round(numValue)}%`
      break
    case 'pain':
      // 疼痛显示带符号
      displayValue = numValue > 0 ? `+${numValue}` : numValue.toString()
      break
    default:
      displayValue = numValue.toString()
  }

  return (
    <span className="ui-number" style={style}>
      {displayValue}
    </span>
  )
}
