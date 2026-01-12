/**
 * CDDA UI Widget 系统 - 类型定义
 *
 * 参考 Cataclysm-DDA 的 UI 配置格式 (data/json/ui/)
 */

/**
 * UI Widget 样式类型
 */
export type WidgetStyle =
  | 'text'       // 文本显示
  | 'number'     // 数字显示
  | 'graph'      // 图形显示 (ASCII 艺术)
  | 'layout'     // 布局容器
  | 'sidebar'    // 侧边栏
  | 'clause'     // 条件子句 (用于选择不同的文本)
  | 'gauge'      // 仪表盘/进度条

/**
 * Widget 标志位
 */
export type WidgetFlag =
  | 'W_LABEL_NONE'         // 不显示标签
  | 'W_NO_PADDING'         // 无内边距
  | 'W_DISABLED_BY_DEFAULT' // 默认禁用

/**
 * CDDA 颜色名称
 */
export type CddaColor =
  | 'c_black'
  | 'c_red'
  | 'c_green'
  | 'c_blue'
  | 'c_yellow'
  | 'c_magenta'
  | 'c_cyan'
  | 'c_white'
  | 'c_light_gray'
  | 'c_light_red'
  | 'c_light_green'
  | 'c_light_blue'
  | 'c_light_yellow'
  | 'c_light_magenta'
  | 'c_light_cyan'
  | 'c_brown'
  | 'c_pink'
  | 'c_dark_gray'
  | 'c_real_blue'

/**
 * CDDA 颜色到 CSS 颜色的映射
 */
export const CDDA_COLOR_MAP: Record<CddaColor, string> = {
  c_black: '#000000',
  c_red: '#800000',
  c_green: '#008000',
  c_blue: '#000080',
  c_yellow: '#808000',
  c_magenta: '#800080',
  c_cyan: '#008080',
  c_white: '#c0c0c0',
  c_light_gray: '#808080',
  c_light_red: '#ff0000',
  c_light_green: '#00ff00',
  c_light_blue: '#0000ff',
  c_light_yellow: '#ffff00',
  c_light_magenta: '#ff00ff',
  c_light_cyan: '#00ffff',
  c_brown: '#804000',
  c_pink: '#ff80c0',
  c_dark_gray: '#404040',
  c_real_blue: '#4169e1',
}

/**
 * 文本标签配置
 */
export interface LabelConfig {
  str: string
  ctxt?: string
}

/**
 * 基础 Widget 配置
 */
export interface BaseWidgetConfig {
  id: string
  type: 'widget'
  style: WidgetStyle
  label?: string | LabelConfig
  var?: string
  width?: number
  height?: number
  padding?: number
  separator?: string
  text_align?: 'left' | 'center' | 'right'
  flags?: WidgetFlag[]
  colors?: CddaColor[]
  symbols?: string
  fill?: 'bucket' | 'line'
  arrange?: 'rows' | 'columns'
  widgets?: string[]
  copy_from?: string
  bodypart?: BodyPart
  condition?: Condition
  clauses?: Clause[]
}

/**
 * 条件子句配置
 */
export interface Clause {
  id: string
  text: string
  color: CddaColor
  condition: Condition
}

/**
 * 条件表达式
 */
export type Condition =
  | { math: [string] }
  | { and: Condition[] }
  | { or: Condition[] }
  | { not: Condition }

/**
 * 身体部位
 */
export type BodyPart =
  | 'head'
  | 'torso'
  | 'arm_l'
  | 'arm_r'
  | 'leg_l'
  | 'leg_r'

/**
 * Widget 配置类型
 */
export type WidgetConfig = BaseWidgetConfig

/**
 * 侧边栏配置
 */
export interface SidebarConfig {
  id: string
  type: 'widget'
  style: 'sidebar'
  label?: string | LabelConfig
  width: number
  padding: number
  separator: string
  widgets: string[]
}

/**
 * UI 配置集合
 */
export interface UIConfig {
  widgets: WidgetConfig[]
  sidebars: SidebarConfig[]
}

/**
 * Widget 渲染属性
 */
export interface WidgetRenderProps {
  config: WidgetConfig
  value?: any
  children?: React.ReactNode
}

/**
 * Widget 计算值
 */
export interface WidgetValues {
  // 玩家属性
  hp?: Record<BodyPart, number>
  hp_max?: Record<BodyPart, number>
  str?: number
  dex?: number
  int?: number
  per?: number
  speed?: number
  move_cost?: number
  move_mode?: string

  // 需求状态
  hunger?: number
  thirst?: number
  fatigue?: number
  sleepiness?: number
  pain?: number
  stamina?: number
  focus?: number
  mood?: number
  morale?: number

  // 环境状态
  temperature?: number
  body_temp?: number
  wind_speed?: number
  light_level?: number
  moon_phase?: number
  weather?: string
  sound?: number

  // 位置信息
  place?: string
  territory?: string
  overmap_text?: string
  overmap_loc_text?: string

  // 时间信息
  time?: string
  date?: string
  turn?: number

  // 战斗状态
  wielding?: string
  style?: string

  // 载具状态
  vehicle_speed?: number
  vehicle_fuel?: number
  vehicle_azimuth?: number

  // 其他
  safe_mode?: boolean
  power_level?: number
  cardio_fit?: number
  weariness?: number
  activity_level?: string
  weary_malus?: number
}

/**
 * 图形填充模式
 */
export type GraphFill = 'bucket' | 'line'

/**
 * 图形符号
 */
export interface GraphSymbols {
  empty: string
  partial: string
  full: string
}
