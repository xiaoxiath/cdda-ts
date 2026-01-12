/**
 * Widget 渲染器 - 统一的 Widget 渲染入口
 */

import React from 'react'
import type { WidgetConfig, WidgetValues, WidgetRenderProps } from '../types'
import { TextWidget } from './TextWidget'
import { NumberWidget } from './NumberWidget'
import { GraphWidget } from './GraphWidget'
import { LayoutWidget } from './LayoutWidget'
import { ClauseWidget } from './ClauseWidget'

export interface WidgetRendererProps {
  config: WidgetConfig
  values: WidgetValues
  className?: string
}

/**
 * Widget 渲染器组件
 */
export function WidgetRenderer({ config, values, className }: WidgetRendererProps): React.ReactNode {
  const style = config.style
  const hasLabel = !config.flags?.includes('W_LABEL_NONE')
  const hasPadding = !config.flags?.includes('W_NO_PADDING')
  const isDisabled = config.flags?.includes('W_DISABLED_BY_DEFAULT')

  if (isDisabled) {
    return null
  }

  // 解析标签
  const label = config.label
    ? typeof config.label === 'string'
      ? config.label
      : config.label.str
    : undefined

  // 根据样式类型渲染不同的 Widget
  let content: React.ReactNode

  switch (style) {
    case 'text':
      content = <TextWidget config={config} values={values} />
      break

    case 'number':
      content = <NumberWidget config={config} values={values} />
      break

    case 'graph':
      content = <GraphWidget config={config} values={values} />
      break

    case 'layout':
      content = <LayoutWidget config={config} values={values} />
      break

    case 'clause':
      content = <ClauseWidget config={config} values={values} />
      break

    case 'sidebar':
      // 侧边栏由专门的 Sidebar 组件处理
      return null

    default:
      console.warn(`[WidgetRenderer] Unknown widget style: ${style}`)
      return null
  }

  // 构建 Widget 容器
  const containerClassName = [
    'ui-widget',
    `ui-widget-${style}`,
    hasPadding ? 'ui-widget-padding' : '',
    isDisabled ? 'ui-widget-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClassName} style={{ width: config.width }}>
      {hasLabel && label && (
        <span className="ui-widget-label">
          {label}
          {config.separator || ': '}
        </span>
      )}
      <span className="ui-widget-content">{content}</span>
    </div>
  )
}

/**
 * 获取 Widget 的值
 */
export function getWidgetValue(config: WidgetConfig, values: WidgetValues): any {
  const varName = config.var
  if (!varName) return undefined

  // 处理特殊的变量名
  if (varName === 'bp_hp' && config.bodypart) {
    return values.hp?.[config.bodypart]
  }

  // 直接返回值
  return (values as any)[varName]
}

/**
 * 获取 Widget 的最大值（用于图形显示）
 */
export function getWidgetMaxValue(config: WidgetConfig, values: WidgetValues): number {
  if (config.var === 'bp_hp' && config.bodypart) {
    return values.hp_max?.[config.bodypart] || 100
  }

  // 默认最大值
  const defaultMaxValues: Record<string, number> = {
    stamina: 1000,
    focus: 100,
    mood: 100,
    hunger: 100,
    thirst: 100,
    sleepiness: 100,
    pain: 100,
    cardio_fit: 100,
  }

  return defaultMaxValues[config.var || ''] || 100
}

/**
 * 根据 HP 百分比获取颜色
 */
export function getHPColor(current: number, max: number, colors: string[] = []): string {
  const ratio = max > 0 ? current / max : 0

  if (ratio <= 0.25) return colors[0] || '#ff0000'
  if (ratio <= 0.5) return colors[1] || '#ff8000'
  if (ratio <= 0.75) return colors[2] || '#ffff00'
  if (ratio <= 0.9) return colors[3] || '#00ff00'
  return colors[4] || '#00ff00'
}

/**
 * 解析颜色
 */
export function resolveColor(color: string): string {
  // CDDA 颜色映射
  const colorMap: Record<string, string> = {
    'c_red': '#ff0000',
    'c_light_red': '#ff4444',
    'c_yellow': '#ffff00',
    'c_green': '#00aa00',
    'c_light_green': '#00ff00',
    'c_blue': '#0000ff',
    'c_light_blue': '#4444ff',
    'c_cyan': '#00ffff',
    'c_magenta': '#ff00ff',
    'c_brown': '#aa5500',
    'c_pink': '#ff55aa',
    'c_white': '#ffffff',
    'c_light_gray': '#aaaaaa',
    'c_dark_gray': '#555555',
    'c_black': '#000000',
  }

  return colorMap[color] || color
}
