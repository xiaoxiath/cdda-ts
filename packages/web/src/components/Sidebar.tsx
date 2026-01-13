/**
 * 侧边栏组件 - 整合所有 UI Widget
 *
 * 基于 CDDA 的侧边栏配置渲染右侧信息面板
 */

import React, { useEffect, useState, useMemo } from 'react'
import type { GameState } from '../types'
import type { WidgetValues, SidebarConfig } from '../ui/types'
import { WidgetRenderer } from '../ui/widgets/WidgetRenderer'
import { getUIConfigLoader } from '../ui/UIConfigLoader'
import { debug, warn, LogCategory } from '../utils/logger'
import './Sidebar.css'

interface SidebarProps {
  gameState: GameState | null
  sidebarId?: string
  collapsed?: boolean
}

/**
 * 侧边栏组件
 */
export default function Sidebar({ gameState, sidebarId = 'custom_sidebar', collapsed }: SidebarProps) {
  const [sidebarConfig, setSidebarConfig] = useState<SidebarConfig | null>(null)
  const [loaded, setLoaded] = useState(false)

  // 加载侧边栏配置
  useEffect(() => {
    const loadSidebar = async () => {
      const loader = getUIConfigLoader()

      if (!loader.isLoaded()) {
        // 浏览器环境由于 CORS 限制无法直接访问本地 JSON 文件
        // 使用内置默认侧边栏（这是预期行为）
        debug(LogCategory.UI, '使用内置默认侧边栏 (浏览器环境)')
        setLoaded(true)
        return
      }

      const config = loader.getSidebar(sidebarId)
      if (config) {
        setSidebarConfig(config)
      } else {
        warn(LogCategory.UI, `侧边栏配置未找到: ${sidebarId}`)
      }

      setLoaded(true)
    }

    loadSidebar()
  }, [sidebarId])

  // 从游戏状态生成 Widget 值
  const widgetValues = useMemo<WidgetValues>(() => {
    if (!gameState) {
      return {}
    }

    const player = gameState.player
    const map = gameState.map

    // 构建基本值
    const values: WidgetValues = {
      turn: gameState.turn,
    }

    if (player) {
      // 玩家属性
      if ('stats' in player && player.stats) {
        values.str = player.stats.str
        values.dex = player.stats.dex
        values.int = player.stats.int
        values.per = player.stats.per
      }

      // HP 值（模拟数据，实际应从 player 获取）
      values.hp = {
        head: 80,
        torso: 90,
        arm_l: 70,
        arm_r: 75,
        leg_l: 60,
        leg_r: 65,
      }

      values.hp_max = {
        head: 100,
        torso: 100,
        arm_l: 100,
        arm_r: 100,
        leg_l: 100,
        leg_r: 100,
      }

      // 需求状态（模拟数据）
      values.hunger = 50
      values.thirst = 30
      values.sleepiness = 20
      values.pain = 10
      values.stamina = 850
      values.focus = 90
      values.mood = 75

      // 环境状态（模拟数据）
      values.temperature = 20
      values.body_temp = 37
      values.wind_speed = 5
      values.light_level = 80
      values.moon_phase = 3
      values.weather = 'clear'
      values.sound = 15

      // 位置信息（模拟数据）
      values.place = '森林'
      values.territory = '荒野'
      values.overmap_text = '    森林\n   荒野\n    森林'
      values.overmap_loc_text = '森林深处'

      // 时间信息
      values.time = '10:30 AM'
      values.date = 'Spring Day 5'

      // 战斗状态（模拟数据）
      values.wielding = '木棍'
      values.style = '无'

      // 移动状态（模拟数据）
      values.speed = 100
      values.move_cost = 100
      values.move_mode = '步行'
      values.safe_mode = true

      // 其他（模拟数据）
      values.power_level = 500
      values.cardio_fit = 80
      values.weariness = 10
      values.activity_level = '低'
      values.weary_malus = 0
    }

    return values
  }, [gameState])

  if (!loaded) {
    return (
      <div className="sidebar-loading">
        <div className="sidebar-loading-spinner"></div>
        <span>加载侧边栏...</span>
      </div>
    )
  }

  if (collapsed) {
    return null
  }

  // 如果没有配置，使用默认简单侧边栏
  if (!sidebarConfig) {
    return <DefaultSidebar values={widgetValues} />
  }

  const loader = getUIConfigLoader()
  const widgetConfigs = loader.resolveSidebarWidgets(sidebarId)

  return (
    <div className="sidebar">
      {widgetConfigs.map((config) => (
        <WidgetRenderer key={config.id} config={config} values={widgetValues} />
      ))}
    </div>
  )
}

/**
 * 默认侧边栏（当配置未加载时使用）
 */
function DefaultSidebar({ values }: { values: WidgetValues }) {
  return (
    <div className="sidebar sidebar-default">
      {/* HP 显示 */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span className="sidebar-section-title">生命值</span>
        </div>
        <div className="hp-display">
          {values.hp && (
            <>
              <div className="hp-row">
                <span className="hp-label">HEAD</span>
                <span className="hp-bar" style={{ width: `${(values.hp.head / 100) * 100}%`, backgroundColor: getHPColor(values.hp.head, 100) }}></span>
                <span className="hp-value">{values.hp.head}</span>
              </div>
              <div className="hp-row">
                <span className="hp-label">TORSO</span>
                <span className="hp-bar" style={{ width: `${(values.hp.torso / 100) * 100}%`, backgroundColor: getHPColor(values.hp.torso, 100) }}></span>
                <span className="hp-value">{values.hp.torso}</span>
              </div>
              <div className="hp-row">
                <span className="hp-label">L ARM</span>
                <span className="hp-bar" style={{ width: `${(values.hp.arm_l / 100) * 100}%`, backgroundColor: getHPColor(values.hp.arm_l, 100) }}></span>
                <span className="hp-value">{values.hp.arm_l}</span>
              </div>
              <div className="hp-row">
                <span className="hp-label">R ARM</span>
                <span className="hp-bar" style={{ width: `${(values.hp.arm_r / 100) * 100}%`, backgroundColor: getHPColor(values.hp.arm_r, 100) }}></span>
                <span className="hp-value">{values.hp.arm_r}</span>
              </div>
              <div className="hp-row">
                <span className="hp-label">L LEG</span>
                <span className="hp-bar" style={{ width: `${(values.hp.leg_l / 100) * 100}%`, backgroundColor: getHPColor(values.hp.leg_l, 100) }}></span>
                <span className="hp-value">{values.hp.leg_l}</span>
              </div>
              <div className="hp-row">
                <span className="hp-label">R LEG</span>
                <span className="hp-bar" style={{ width: `${(values.hp.leg_r / 100) * 100}%`, backgroundColor: getHPColor(values.hp.leg_r, 100) }}></span>
                <span className="hp-value">{values.hp.leg_r}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 属性 */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span className="sidebar-section-title">属性</span>
        </div>
        <div className="stats-grid">
          {values.str !== undefined && (
            <div className="stat-item">
              <span className="stat-label">STR</span>
              <span className="stat-value">{values.str}</span>
            </div>
          )}
          {values.dex !== undefined && (
            <div className="stat-item">
              <span className="stat-label">DEX</span>
              <span className="stat-value">{values.dex}</span>
            </div>
          )}
          {values.int !== undefined && (
            <div className="stat-item">
              <span className="stat-label">INT</span>
              <span className="stat-value">{values.int}</span>
            </div>
          )}
          {values.per !== undefined && (
            <div className="stat-item">
              <span className="stat-label">PER</span>
              <span className="stat-value">{values.per}</span>
            </div>
          )}
        </div>
      </div>

      {/* 需求 */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span className="sidebar-section-title">需求</span>
        </div>
        <div className="needs-list">
          {values.hunger !== undefined && (
            <div className="need-item">
              <span className="need-label">饥饿</span>
              <NeedBar value={values.hunger} max={100} />
            </div>
          )}
          {values.thirst !== undefined && (
            <div className="need-item">
              <span className="need-label">口渴</span>
              <NeedBar value={values.thirst} max={100} />
            </div>
          )}
          {values.fatigue !== undefined && (
            <div className="need-item">
              <span className="need-label">疲劳</span>
              <NeedBar value={values.fatigue} max={100} />
            </div>
          )}
        </div>
      </div>

      {/* 耐力 */}
      {values.stamina !== undefined && (
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span className="sidebar-section-title">耐力</span>
          </div>
          <div className="stamina-bar">
            <div className="stamina-fill" style={{ width: `${(values.stamina / 1000) * 100}%` }}></div>
          </div>
          <span className="stamina-value">{Math.round(values.stamina)} / 1000</span>
        </div>
      )}
    </div>
  )
}

/**
 * 需求进度条组件
 */
function NeedBar({ value, max }: { value: number; max: number }) {
  const ratio = value / max
  const color = getHPColor(max - value, max) // 反向颜色（值越高越坏）

  return (
    <div className="need-bar-container">
      <div className="need-bar" style={{ width: `${ratio * 100}%`, backgroundColor: color }}></div>
    </div>
  )
}

/**
 * 获取 HP 颜色
 */
function getHPColor(current: number, max: number): string {
  const ratio = max > 0 ? current / max : 0

  if (ratio <= 0.25) return '#ff0000'
  if (ratio <= 0.5) return '#ff8000'
  if (ratio <= 0.75) return '#ffff00'
  return '#00ff00'
}
