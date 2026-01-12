/**
 * Graph Widget - 显示 ASCII 艺术图形
 */

import React from 'react'
import type { WidgetConfig, WidgetValues } from '../types'
import { getWidgetValue, getWidgetMaxValue, getHPColor, resolveColor } from './WidgetRenderer'

interface GraphWidgetProps {
  config: WidgetConfig
  values: WidgetValues
}

/**
 * 图形 Widget 组件
 */
export function GraphWidget({ config, values }: GraphWidgetProps): React.ReactNode {
  const value = getWidgetValue(config, values)

  if (value === undefined || value === null) {
    return <span className="ui-graph-empty">{' '.repeat(config.width || 5)}</span>
  }

  const numValue = Number(value)
  const maxValue = getWidgetMaxValue(config, values)
  const width = config.width || 5
  const symbols = config.symbols || '.\\|'
  const colors = config.colors || []
  const fill = config.fill || 'bucket'

  // 计算填充长度
  const ratio = maxValue > 0 ? Math.max(0, Math.min(1, numValue / maxValue)) : 0
  const filledLength = Math.round(ratio * width)

  // 解析符号
  let emptyChar: string
  let partialChar: string
  let fullChar: string

  if (symbols.length >= 3) {
    emptyChar = symbols[0]
    partialChar = symbols[1]
    fullChar = symbols[2]
  } else if (symbols.length === 2) {
    emptyChar = symbols[0]
    partialChar = symbols[1]
    fullChar = symbols[1]
  } else {
    emptyChar = ' '
    partialChar = '|'
    fullChar = '|'
  }

  // 获取颜色
  const color = getHPColor(numValue, maxValue, colors.length > 0 ? colors.map(resolveColor) : [])

  // 构建图形字符串
  const chars: Array<{ char: string; color: string }> = []

  for (let i = 0; i < width; i++) {
    if (i < filledLength) {
      chars.push({ char: fullChar, color })
    } else if (i === filledLength && fill === 'bucket') {
      chars.push({ char: partialChar, color })
    } else {
      chars.push({ char: emptyChar, color: '#666666' })
    }
  }

  return (
    <span className="ui-graph" style={{ fontFamily: 'monospace' }}>
      {chars.map((item, index) => (
        <span key={index} style={{ color: item.color }}>
          {item.char}
        </span>
      ))}
    </span>
  )
}
