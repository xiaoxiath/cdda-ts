/**
 * UI Widget 系统 - 导出模块
 */

// 类型定义
export * from './types'

// UI 配置加载器
export { getUIConfigLoader, UIConfigLoader } from './UIConfigLoader'

// Widget 组件
export { WidgetRenderer, getWidgetValue, getWidgetMaxValue, getHPColor, resolveColor } from './widgets/WidgetRenderer'
export { TextWidget } from './widgets/TextWidget'
export { NumberWidget } from './widgets/NumberWidget'
export { GraphWidget } from './widgets/GraphWidget'
export { LayoutWidget } from './widgets/LayoutWidget'
export { ClauseWidget } from './widgets/ClauseWidget'
