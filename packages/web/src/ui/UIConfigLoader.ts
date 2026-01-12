/**
 * CDDA UI 配置加载器
 *
 * 负责从 Cataclysm-DDA 的 JSON 配置文件加载 UI 定义
 */

import type {
  UIConfig,
  WidgetConfig,
  SidebarConfig,
  WidgetStyle,
  CddaColor,
  BodyPart,
  LabelConfig,
  Condition,
  Clause,
} from './types'

/**
 * UI 配置加载器类
 */
export class UIConfigLoader {
  private widgets: Map<string, WidgetConfig> = new Map()
  private sidebars: Map<string, SidebarConfig> = new Map()
  private loaded = false

  /**
   * 加载所有 UI 配置
   */
  async loadAll(config: { dataPath: string }): Promise<void> {
    if (this.loaded) return

    try {
      // 加载 UI 配置文件
      const uiPath = `${config.dataPath}/json/ui`

      // 加载各个 UI 模块
      await this.loadWidgetConfigs(uiPath)
      await this.loadSidebarConfigs(uiPath)

      // 处理继承关系
      this.processInheritance()

      this.loaded = true
      console.log(`[UIConfigLoader] Loaded ${this.widgets.size} widgets, ${this.sidebars.size} sidebars`)
    } catch (error) {
      console.error('[UIConfigLoader] Failed to load UI config:', error)
      throw error
    }
  }

  /**
   * 加载 widget 配置文件
   */
  private async loadWidgetConfigs(uiPath: string): Promise<void> {
    const widgetFiles = [
      'health.json',
      'hp.json',
      'hunger.json',
      'thirst.json',
      'sleepiness.json',
      'pain.json',
      'stamina.json',
      'stats.json',
      'speed.json',
      'movement.json',
      'focus.json',
      'mood.json',
      'morale.json',
      'place.json',
      'time.json',
      'date.json',
      'weather.json',
      'moon.json',
      'lighting.json',
      'wind.json',
      'env_temp.json',
      'body_temp.json',
      'sound.json',
      'safe_mode.json',
      'power.json',
      'wield.json',
      'ma_style.json',
      'vehicle.json',
      'cardio.json',
      'weariness.json',
      'activity.json',
      'encumbrance.json',
      'bodypart_status.json',
      'bodypart_armor.json',
      'bodypart_color_text.json',
      'body_graph.json',
      'compass.json',
      'compass_danger.json',
      'overmap.json',
      'layout.json',
      'separator.json',
      'weight.json',
      'carry_weight.json',
      'radiation.json',
      'warmth.json',
      'wetness.json',
    ]

    for (const file of widgetFiles) {
      try {
        const response = await fetch(`${uiPath}/${file}`)
        if (!response.ok) continue

        const configs: WidgetConfig[] = await response.json()

        for (const config of configs) {
          if (config.type === 'widget') {
            this.widgets.set(config.id, config)
          }
        }
      } catch (error) {
        console.warn(`[UIConfigLoader] Failed to load ${file}:`, error)
      }
    }
  }

  /**
   * 加载侧边栏配置文件
   */
  private async loadSidebarConfigs(uiPath: string): Promise<void> {
    const sidebarFiles = [
      'sidebar.json',
      'sidebar-legacy-classic.json',
      'sidebar-legacy-compact.json',
      'sidebar-thick.json',
      'sidebar-mobile.json',
    ]

    for (const file of sidebarFiles) {
      try {
        const response = await fetch(`${uiPath}/${file}`)
        if (!response.ok) continue

        const configs: SidebarConfig[] = await response.json()

        for (const config of configs) {
          if (config.style === 'sidebar') {
            this.sidebars.set(config.id, config)
          }
        }
      } catch (error) {
        console.warn(`[UIConfigLoader] Failed to load ${file}:`, error)
      }
    }
  }

  /**
   * 处理配置继承关系 (copy-from)
   */
  private processInheritance(): void {
    const processed = new Set<string>()

    const processConfig = (id: string): void => {
      if (processed.has(id)) return

      const config = this.widgets.get(id)
      if (!config) return

      processed.add(id)

      // 处理 copy-from 继承
      if ('copy_from' in config && config.copy_from) {
        const parentConfig = this.widgets.get(config.copy_from)
        if (parentConfig) {
          processConfig(config.copy_from)
          this.applyInheritance(config, parentConfig)
        }
      }

      // 处理 label 中的 copy-from
      if ('copy-from' in config && typeof config['copy-from'] === 'string') {
        const parentConfig = this.widgets.get(config['copy-from'])
        if (parentConfig) {
          processConfig(config['copy-from'])
          this.applyInheritance(config, parentConfig)
        }
      }
    }

    // 处理所有 widget
    for (const id of this.widgets.keys()) {
      processConfig(id)
    }

    // 处理侧边栏中的 widget 引用
    for (const sidebar of this.sidebars.values()) {
      for (const widgetId of sidebar.widgets) {
        processConfig(widgetId)
      }
    }
  }

  /**
   * 应用继承配置
   */
  private applyInheritance(child: WidgetConfig, parent: WidgetConfig): void {
    // 跳过 id 和 type
    const skipKeys = new Set(['id', 'type'])

    for (const [key, parentValue] of Object.entries(parent)) {
      if (skipKeys.has(key)) continue

      // 只继承子对象中没有的属性
      if (!(key in child)) {
        (child as any)[key] = parentValue
      }
    }
  }

  /**
   * 获取 widget 配置
   */
  getWidget(id: string): WidgetConfig | undefined {
    return this.widgets.get(id)
  }

  /**
   * 获取侧边栏配置
   */
  getSidebar(id: string): SidebarConfig | undefined {
    return this.sidebars.get(id)
  }

  /**
   * 获取所有侧边栏
   */
  getAllSidebars(): Map<string, SidebarConfig> {
    return new Map(this.sidebars)
  }

  /**
   * 解析侧边栏的 widget 列表
   */
  resolveSidebarWidgets(sidebarId: string): WidgetConfig[] {
    const sidebar = this.sidebars.get(sidebarId)
    if (!sidebar) return []

    const widgets: WidgetConfig[] = []

    for (const widgetId of sidebar.widgets) {
      const widget = this.widgets.get(widgetId)
      if (widget) {
        widgets.push(widget)
        // 如果是布局 widget，递归解析其子 widgets
        if (widget.style === 'layout' && widget.widgets) {
          this.resolveLayoutWidgets(widget, widgets)
        }
      }
    }

    return widgets
  }

  /**
   * 递归解析布局中的 widgets
   */
  private resolveLayoutWidgets(layout: WidgetConfig, result: WidgetConfig[]): void {
    if (!layout.widgets) return

    for (const widgetId of layout.widgets) {
      const widget = this.widgets.get(widgetId)
      if (widget) {
        result.push(widget)
        // 递归处理嵌套布局
        if (widget.style === 'layout' && widget.widgets) {
          this.resolveLayoutWidgets(widget, result)
        }
      }
    }
  }

  /**
   * 检查是否已加载
   */
  isLoaded(): boolean {
    return this.loaded
  }
}

// 单例实例
let uiConfigLoaderInstance: UIConfigLoader | null = null

/**
 * 获取 UI 配置加载器实例
 */
export function getUIConfigLoader(): UIConfigLoader {
  if (!uiConfigLoaderInstance) {
    uiConfigLoaderInstance = new UIConfigLoader()
  }
  return uiConfigLoaderInstance
}
