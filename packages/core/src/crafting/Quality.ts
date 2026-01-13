/**
 * Quality - 质量系统
 *
 * 参考 Cataclysm-DDA 的 quality 系统
 * 质量系统用于处理工具的质量要求和匹配
 */

import { List, Map, Set } from 'immutable';
import type {
  QualityId,
  QualityLevel,
  QualityRequirement,
  QualityMatchResult,
  QualityDefinitionProps,
  QualityData,
} from './types';
import { QualityLevelEnum } from './types';

// ============================================================================
// QualityDefinition - 质量定义类
// ============================================================================

/**
 * QualityDefinition - 质量定义类
 *
 * 定义质量的静态属性
 */
export class QualityDefinition {
  readonly id!: QualityId;
  readonly name!: string;
  readonly description!: string;
  readonly relatedTools!: Set<string>;
  readonly relatedItemTypes!: Set<string>;
  readonly defaultLevel!: QualityLevel;

  private constructor(props: QualityDefinitionProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description ?? '';
    this.relatedTools = Set(props.relatedTools ?? []);
    this.relatedItemTypes = Set(props.relatedItemTypes ?? []);
    this.defaultLevel = props.defaultLevel ?? QualityLevelEnum.NORMAL;

    Object.freeze(this);
  }

  // ========== 工厂方法 ==========

  /**
   * 创建质量定义
   */
  static create(props: QualityDefinitionProps): QualityDefinition {
    return new QualityDefinition(props);
  }

  /**
   * 创建简单的质量定义
   */
  static simple(
    id: QualityId,
    name: string,
    relatedTools?: string[]
  ): QualityDefinition {
    return QualityDefinition.create({
      id,
      name,
      relatedTools,
    });
  }

  // ========== 查询方法 ==========

  /**
   * 检查工具是否与此质量相关
   *
   * @param toolId 工具 ID
   * @returns 是否相关
   */
  isRelatedToTool(toolId: string): boolean {
    return this.relatedTools.has(toolId);
  }

  /**
   * 检查物品类型是否与此质量相关
   *
   * @param itemType 物品类型
   * @returns 是否相关
   */
  isRelatedToItemType(itemType: string): boolean {
    return this.relatedItemTypes.has(itemType);
  }

  /**
   * 获取质量等级名称
   *
   * @param level 质量等级
   * @returns 等级名称
   */
  getLevelName(level: QualityLevel): string {
    switch (level) {
      case QualityLevelEnum.AWFUL:
        return '极差';
      case QualityLevelEnum.BAD:
        return '差';
      case QualityLevelEnum.POOR:
        return '较差';
      case QualityLevelEnum.NORMAL:
        return '普通';
      case QualityLevelEnum.GOOD:
        return '良好';
      case QualityLevelEnum.EXCELLENT:
        return '优秀';
      default:
        return '未知';
    }
  }

  // ========== 显示方法 ==========

  /**
   * 获取显示名称
   */
  getDisplayName(): string {
    return this.name;
  }

  /**
   * 获取显示描述
   */
  getDisplayDescription(): string {
    const lines = [
      `=== ${this.name} ===`,
      this.description,
      '',
      `相关工具: ${this.relatedTools.toArray().join(', ') || '无'}`,
      `相关物品类型: ${this.relatedItemTypes.toArray().join(', ') || '无'}`,
      `默认等级: ${this.getLevelName(this.defaultLevel)}`,
    ];

    return lines.join('\n');
  }
}

// ============================================================================
// QualityManager - 质量管理器
// ============================================================================

/**
 * QualityManager - 质量管理器类
 *
 * 处理质量要求的匹配和验证
 */
export class QualityManager {
  /**
   * 检查质量是否满足要求
   *
   * @param availableQualities 可用的质量列表
   * @param requirements 质量要求列表
   * @returns 匹配结果
   */
  static checkQualityRequirements(
    availableQualities: List<QualityData>,
    requirements: List<QualityRequirement>
  ): QualityMatchResult {
    const qualityMap = Map<QualityId, QualityLevel>(
      availableQualities.map(q => [q.qualityId, q.level])
    );

    const matchedQualities: QualityId[] = [];
    const missingRequired: QualityRequirement[] = [];
    const insufficientLevel: Array<{ qualityId: QualityId; required: QualityLevel; has: QualityLevel }> = [];

    for (const requirement of requirements) {
      const availableLevel = qualityMap.get(requirement.qualityId);

      if (availableLevel === undefined) {
        // 质量不存在
        if (requirement.required) {
          missingRequired.push(requirement);
        }
      } else if (availableLevel < requirement.minLevel) {
        // 质量等级不足
        insufficientLevel.push({
          qualityId: requirement.qualityId,
          required: requirement.minLevel,
          has: availableLevel,
        });
      } else {
        // 质量匹配
        matchedQualities.push(requirement.qualityId);
      }
    }

    const matches = missingRequired.length === 0 && insufficientLevel.length === 0;

    return {
      matches,
      matchedQualities,
      missingRequired,
      insufficientLevel,
    };
  }

  /**
   * 计算最佳质量匹配
   *
   * 当有多个物品可用时，选择最佳的质量组合
   *
   * @param candidateQualities 候选物品的质量列表
   * @param requirements 质量要求列表
   * @returns 最佳匹配索引，如果没有匹配返回 -1
   */
  static findBestQualityMatch(
    candidateQualities: List<List<QualityData>>,
    requirements: List<QualityRequirement>
  ): number {
    let bestIndex = -1;
    let bestScore = -1;

    for (let i = 0; i < candidateQualities.size; i++) {
      const result = QualityManager.checkQualityRequirements(
        candidateQualities.get(i, List()),
        requirements
      );

      if (!result.matches) {
        continue;
      }

      // 计算匹配分数
      let score = result.matchedQualities.length;

      // 等级越高，分数越高
      for (const qualityId of result.matchedQualities) {
        const qualities = candidateQualities.get(i, List<QualityData>());
        const quality = qualities.find((q: QualityData) => q.qualityId === qualityId);
        if (quality) {
          score += quality.level * 0.1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  /**
   * 获取质量等级差异
   *
   * @param requiredLevel 要求的质量等级
   * @param actualLevel 实际的质量等级
   * @returns 等级差异（负数表示实际等级低于要求）
   */
  static getQualityLevelDifference(
    requiredLevel: QualityLevel,
    actualLevel: QualityLevel
  ): number {
    return actualLevel - requiredLevel;
  }

  /**
   * 计算质量等级对制作时间的影响
   *
   * @param qualityDifference 质量等级差异
   * @param baseTime 基础时间
   * @returns 调整后的时间
   */
  static adjustTimeByQuality(
    qualityDifference: number,
    baseTime: number
  ): number {
    // 每级差异影响 10% 的时间
    const multiplier = 1.0 - (qualityDifference * 0.1);
    return Math.max(baseTime * 0.2, baseTime * multiplier);
  }

  /**
   * 计算质量等级对成功率的影响
   *
   * @param qualityDifference 质量等级差异
   * @param baseSuccessRate 基础成功率
   * @returns 调整后的成功率
   */
  static adjustSuccessRateByQuality(
    qualityDifference: number,
    baseSuccessRate: number
  ): number {
    // 每级差异影响 5% 的成功率
    const bonus = qualityDifference * 0.05;
    return Math.max(0.05, Math.min(1.0, baseSuccessRate + bonus));
  }

  /**
   * 获取质量描述
   *
   * @param quality 质量数据
   * @param definition 质量定义（可选）
   * @returns 描述字符串
   */
  static getQualityDescription(
    quality: QualityData,
    definition?: QualityDefinition
  ): string {
    const name = definition?.name || quality.qualityId;
    const levelName = definition?.getLevelName(quality.level) || `Lv.${quality.level}`;
    return `${name} (${levelName})`;
  }

  /**
   * 获取质量要求描述
   *
   * @param requirement 质量要求
   * @param definition 质量定义（可选）
   * @returns 描述字符串
   */
  static getRequirementDescription(
    requirement: QualityRequirement,
    definition?: QualityDefinition
  ): string {
    const name = definition?.name || requirement.qualityId;
    const levelName = definition?.getLevelName(requirement.minLevel) || `Lv.${requirement.minLevel}`;
    const required = requirement.required ? ' [必需]' : '';
    return `${name} ${levelName}${required}`;
  }

  /**
   * 获取匹配结果描述
   *
   * @param result 匹配结果
   * @returns 描述字符串
   */
  static getMatchResultDescription(result: QualityMatchResult): string {
    const lines: string[] = [];

    if (result.matches) {
      lines.push('✓ 质量要求满足');
    } else {
      lines.push('✗ 质量要求不满足');
    }

    if (result.matchedQualities.length > 0) {
      lines.push(`已匹配: ${result.matchedQualities.length} 个质量`);
    }

    if (result.missingRequired.length > 0) {
      lines.push(`缺少必需质量: ${result.missingRequired.length} 个`);
    }

    if (result.insufficientLevel.length > 0) {
      lines.push(`质量等级不足: ${result.insufficientLevel.length} 个`);
    }

    return lines.join('\n');
  }
}

// ============================================================================
// QualityDefinitions - 预定义质量定义
// ============================================================================

/**
 * 预定义质量定义
 */
export const QualityDefinitions = {
  // 锤击/打击
  HAMMER: QualityDefinition.simple(
    'quality_hammer' as any,
    '锤击',
    ['hammer', 'sledgehammer']
  ),

  // 切割
  CUT: QualityDefinition.simple(
    'quality_cut' as any,
    '切割',
    ['knife', 'hatchet', 'machete']
  ),

  // 钻孔
  DRILL: QualityDefinition.simple(
    'quality_drill' as any,
    '钻孔',
    ['drill']
  ),

  // 螺丝
  SCREW: QualityDefinition.simple(
    'quality_screw' as any,
    '螺丝',
    ['screwdriver']
  ),

  // 缝纫
  SEW: QualityDefinition.simple(
    'quality_sew' as any,
    '缝纫',
    ['needle']
  ),

  // 熔接
  WELD: QualityDefinition.simple(
    'quality_weld' as any,
    '熔接',
    ['welder']
  ),

  // 锯切
  SAW: QualityDefinition.simple(
    'quality_saw' as any,
    '锯切',
    ['saw']
  ),

  // 扳手
  WRENCH: QualityDefinition.simple(
    'quality_wrench' as any,
    '扳手',
    ['wrench']
  ),

  // 钳子
  PLIER: QualityDefinition.simple(
    'quality_plier' as any,
    '钳子',
    ['pliers']
  ),

  // 木工
  CHISEL: QualityDefinition.simple(
    'quality_chisel' as any,
    '木工',
    ['chisel']
  ),

  // 熔炼
  SMELT: QualityDefinition.simple(
    'quality_smelt' as any,
    '熔炼',
    ['furnace', 'forge']
  ),

  // 研磨
  GRIND: QualityDefinition.simple(
    'quality_grind' as any,
    '研磨',
    ['grinder', 'mortar']
  ),

  // 搅拌
  MIX: QualityDefinition.simple(
    'quality_mix' as any,
    '搅拌',
    ['mixing_bowl']
  ),

  // 烹饪
  COOK: QualityDefinition.simple(
    'quality_cook' as any,
    '烹饪',
    ['hotplate', 'stove', 'oven']
  ),

  // 熨烫
  IRON: QualityDefinition.simple(
    'quality_iron' as any,
    '熨烫',
    ['iron']
  ),

  // 测量
  MEASURE: QualityDefinition.simple(
    'quality_measure' as any,
    '测量',
    ['tape_measure', 'ruler']
  ),
};
