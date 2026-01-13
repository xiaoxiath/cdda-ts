/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * 日志配置
 */
interface LoggerConfig {
  level: LogLevel
  enableSource: boolean
  enableTimestamp: boolean
  enableColor: boolean
}

/**
 * 颜色代码（用于浏览器控制台）
 */
const COLORS = {
  reset: 'reset',
  debug: '#808080',      // 灰色
  info: '#4a9eff',       // 蓝色
  warn: '#ff9800',       // 橙色
  error: '#f44336',      // 红色
  success: '#4caf50',    // 绿色
}

/**
 * 日志前缀样式
 */
const PREFIX_STYLES = {
  [LogLevel.DEBUG]: 'color: #808080; font-weight: bold;',
  [LogLevel.INFO]: 'color: #4a9eff; font-weight: bold;',
  [LogLevel.WARN]: 'color: #ff9800; font-weight: bold;',
  [LogLevel.ERROR]: 'color: #f44336; font-weight: bold;',
}

/**
 * 日志级别名称
 */
const LEVEL_NAMES = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
}

/**
 * 日志类别
 */
export enum LogCategory {
  GAME = 'GAME',
  RENDERER = 'RENDERER',
  MAP = 'MAP',
  INPUT = 'INPUT',
  UI = 'UI',
  DATA = 'DATA',
  NETWORK = 'NETWORK',
  TILESET = 'TILESET',
  PALETTE = 'PALETTE',
}

/**
 * 日志管理器类
 *
 * 提供统一的日志接口，支持日志级别控制、分类和格式化
 */
class LoggerManager {
  private config: LoggerConfig = {
    level: LogLevel.INFO,       // 默认级别：INFO
    enableSource: true,          // 显示日志来源
    enableTimestamp: false,      // 不显示时间戳（浏览器已有）
    enableColor: true,           // 启用颜色
  }

  private categoryLevels: Map<LogCategory, LogLevel> = new Map()

  /**
   * 设置全局日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.level = level
  }

  /**
   * 获取全局日志级别
   */
  getLevel(): LogLevel {
    return this.config.level
  }

  /**
   * 设置特定类别的日志级别
   */
  setCategoryLevel(category: LogCategory, level: LogLevel): void {
    this.categoryLevels.set(category, level)
  }

  /**
   * 获取特定类别的日志级别
   */
  getCategoryLevel(category: LogCategory): LogLevel | null {
    return this.categoryLevels.get(category) || null
  }

  /**
   * 设置日志配置
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 检查是否应该输出该级别的日志
   */
  private shouldLog(level: LogLevel, category?: LogCategory): boolean {
    // 检查类别级别
    if (category && this.categoryLevels.has(category)) {
      return level >= (this.categoryLevels.get(category)!)
    }
    // 检查全局级别
    return level >= this.config.level
  }

  /**
   * 格式化日志前缀
   */
  private formatPrefix(level: LogLevel, category?: LogCategory): string[] {
    const parts: string[] = []

    if (this.config.enableTimestamp) {
      parts.push(`[${new Date().toISOString()}]`)
    }

    if (category) {
      parts.push(`[${category}]`)
    }

    parts.push(`[${LEVEL_NAMES[level]}]`)

    return parts
  }

  /**
   * 内部日志方法
   */
  private log(
    level: LogLevel,
    category: LogCategory | undefined,
    message: string,
    ...args: unknown[]
  ): void {
    if (!this.shouldLog(level, category)) {
      return
    }

    const prefix = this.formatPrefix(level, category)
    const prefixStr = prefix.join(' ')
    const style = PREFIX_STYLES[level]

    // 使用浏览器控制台的样式化输出
    if (this.config.enableColor) {
      console.log(`%c${prefixStr}`, style, message, ...args)
    } else {
      console.log(prefixStr, message, ...args)
    }
  }

  /**
   * DEBUG 级别日志
   */
  debug(category: LogCategory, message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, category, message, ...args)
  }

  /**
   * INFO 级别日志
   */
  info(category: LogCategory, message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, category, message, ...args)
  }

  /**
   * WARN 级别日志
   */
  warn(category: LogCategory, message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, category, message, ...args)
  }

  /**
   * ERROR 级别日志
   */
  error(category: LogCategory, message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, category, message, ...args)
  }

  /**
   * 成功消息（INFO 级别的特殊形式）
   */
  success(category: LogCategory, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.INFO, category)) {
      return
    }
    const prefix = this.formatPrefix(LogLevel.INFO, category)
    const prefixStr = prefix.join(' ')
    console.log(`%c${prefixStr}`, 'color: #4caf50; font-weight: bold;', message, ...args)
  }

  /**
   * 调试数据（用于表格或对象）
   */
  table(category: LogCategory, data: unknown): void {
    if (!this.shouldLog(LogLevel.DEBUG, category)) {
      return
    }
    const prefix = this.formatPrefix(LogLevel.DEBUG, category)
    console.log(prefix.join(' '))
    console.table(data)
  }

  /**
   * 分组日志
   */
  group(category: LogCategory, title: string, collapsed: boolean = false): void {
    if (!this.shouldLog(LogLevel.DEBUG, category)) {
      return
    }
    const prefix = this.formatPrefix(LogLevel.DEBUG, category)
    const titleStr = `${prefix.join(' ')} ${title}`

    if (collapsed) {
      console.groupCollapsed(titleStr)
    } else {
      console.group(titleStr)
    }
  }

  /**
   * 结束分组
   */
  groupEnd(): void {
    console.groupEnd()
  }

  /**
   * 断言
   */
  assert(category: LogCategory, condition: boolean, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.ERROR, category)) {
      return
    }
    const prefix = this.formatPrefix(LogLevel.ERROR, category)
    console.assert(condition, `${prefix.join(' ')} ${message}`, ...args)
  }

  /**
   * 计时开始
   */
  time(category: LogCategory, label: string): void {
    if (!this.shouldLog(LogLevel.DEBUG, category)) {
      return
    }
    const prefix = this.formatPrefix(LogLevel.DEBUG, category)
    console.time(`${prefix.join(' ')} ${label}`)
  }

  /**
   * 计时结束
   */
  timeEnd(category: LogCategory, label: string): void {
    if (!this.shouldLog(LogLevel.DEBUG, category)) {
      return
    }
    const prefix = this.formatPrefix(LogLevel.DEBUG, category)
    console.timeEnd(`${prefix.join(' ')} ${label}`)
  }

  /**
   * 追踪调用栈
   */
  trace(category: LogCategory, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.DEBUG, category)) {
      return
    }
    const prefix = this.formatPrefix(LogLevel.DEBUG, category)
    console.trace(`${prefix.join(' ')} ${message}`, ...args)
  }
}

// 创建全局单例
const logger = new LoggerManager()

// 从 localStorage 读取日志级别配置
if (typeof window !== 'undefined') {
  try {
    const savedLevel = localStorage.getItem('cdda_log_level')
    if (savedLevel !== null) {
      logger.setLevel(parseInt(savedLevel, 10))
    }

    // 开发模式下默认 DEBUG 级别
    if (import.meta.env?.DEV) {
      logger.setLevel(LogLevel.DEBUG)
    }
  } catch {
    // 忽略 localStorage 错误
  }
}

// 导出便捷函数
export const debug = (category: LogCategory, message: string, ...args: unknown[]) =>
  logger.debug(category, message, ...args)

export const info = (category: LogCategory, message: string, ...args: unknown[]) =>
  logger.info(category, message, ...args)

export const warn = (category: LogCategory, message: string, ...args: unknown[]) =>
  logger.warn(category, message, ...args)

export const error = (category: LogCategory, message: string, ...args: unknown[]) =>
  logger.error(category, message, ...args)

export const success = (category: LogCategory, message: string, ...args: unknown[]) =>
  logger.success(category, message, ...args)

export const table = (category: LogCategory, data: unknown) =>
  logger.table(category, data)

export const group = (category: LogCategory, title: string, collapsed?: boolean) =>
  logger.group(category, title, collapsed)

export const groupEnd = () => logger.groupEnd()

export const assert = (category: LogCategory, condition: boolean, message: string, ...args: unknown[]) =>
  logger.assert(category, condition, message, ...args)

export const time = (category: LogCategory, label: string) =>
  logger.time(category, label)

export const timeEnd = (category: LogCategory, label: string) =>
  logger.timeEnd(category, label)

export const trace = (category: LogCategory, message: string, ...args: unknown[]) =>
  logger.trace(category, message, ...args)

// 导出 logger 实例和类
export { logger }
export { LoggerManager as LoggerClass }
export type { LoggerConfig }
export default logger
