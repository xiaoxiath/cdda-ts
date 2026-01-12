/**
 * Text Widget - 显示文本内容
 */

import React from 'react'
import type { WidgetConfig, WidgetValues } from '../types'
import { getWidgetValue, resolveColor } from './WidgetRenderer'

interface TextWidgetProps {
  config: WidgetConfig
  values: WidgetValues
}

/**
 * 文本 Widget 组件
 */
export function TextWidget({ config, values }: TextWidgetProps): React.ReactNode {
  const value = getWidgetValue(config, values)

  if (value === undefined || value === null) {
    return <span className="ui-text-empty">-</span>
  }

  // 将值转换为字符串
  const text = String(value)

  // 应用文本对齐
  const textAlign = config.text_align || 'left'

  // 应用颜色（如果有定义）
  const style: React.CSSProperties = {
    textAlign,
  }

  // 如果有颜色配置，应用颜色
  if (config.colors && config.colors.length > 0) {
    // 对于某些变量，根据值选择颜色
    if (config.var === 'health') {
      const health = Number(value)
      if (health < -100) style.color = resolveColor(config.colors[0])
      else if (health < -50) style.color = resolveColor(config.colors[1])
      else if (health < -10) style.color = resolveColor(config.colors[2])
      else if (health < 10) style.color = resolveColor(config.colors[3])
      else style.color = resolveColor(config.colors[4] || config.colors[3])
    }
  }

  return (
    <span className="ui-text" style={style}>
      {text}
    </span>
  )
}
