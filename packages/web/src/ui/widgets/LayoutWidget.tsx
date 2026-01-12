/**
 * Layout Widget - 布局容器
 */

import React from 'react'
import type { WidgetConfig, WidgetValues } from '../types'
import { WidgetRenderer } from './WidgetRenderer'
import { getUIConfigLoader } from '../UIConfigLoader'

interface LayoutWidgetProps {
  config: WidgetConfig
  values: WidgetValues
}

/**
 * 布局 Widget 组件
 */
export function LayoutWidget({ config, values }: LayoutWidgetProps): React.ReactNode {
  const arrange = config.arrange || 'rows'
  const isRow = arrange === 'rows'
  const widgetIds = config.widgets || []

  if (widgetIds.length === 0) {
    return null
  }

  const loader = getUIConfigLoader()
  const childWidgets: WidgetConfig[] = []

  // 解析子 widgets
  for (const widgetId of widgetIds) {
    const widget = loader.getWidget(widgetId)
    if (widget) {
      childWidgets.push(widget)
    }
  }

  if (childWidgets.length === 0) {
    return null
  }

  // 确定布局方向
  const display = isRow ? 'flex' : 'flex'
  const flexDirection = isRow ? 'column' : 'row'
  const gap = isRow ? '2px' : '8px'
  const alignItems = isRow ? 'stretch' : 'center'

  const style: React.CSSProperties = {
    display,
    flexDirection,
    gap,
    alignItems,
    width: config.width ? `${config.width * 8}px` : 'auto', // 估算宽度
    height: config.height ? `${config.height * 16}px` : 'auto',
  }

  return (
    <div className="ui-layout" style={style}>
      {childWidgets.map((childConfig) => (
        <WidgetRenderer key={childConfig.id} config={childConfig} values={values} />
      ))}
    </div>
  )
}
