/**
 * TalkTrial - 对话技能检定系统
 *
 * 实现对话中的各种技能检定，包括欺骗、说服、威吓等。
 * 对应 CDDA 的对话 trial 系统。
 */

import type { DialogueContext, TrialConfig, TrialResult as TrialResultEnum } from './types';
import { TrialType } from './types';
import type { SkillId } from '../skill';

/**
 * TalkTrial JSON 格式
 * 用于从 JSON 加载检定配置
 */
export interface TalkTrialJson {
  readonly type: TrialType | string;
  readonly difficulty?: number;
  readonly skill?: string;
  readonly condition?: string;
  readonly success?: string;
  readonly failure?: string;
  readonly partial?: string;
}

/**
 * TalkTrial - 对话技能检定
 *
 * 执行对话中的技能检定，决定玩家的行动是否成功。
 */
export class TalkTrial {
  readonly type: TrialType;
  readonly difficulty: number;
  readonly skill?: SkillId;
  readonly condition?: string;
  readonly successLine?: string;
  readonly failureLine?: string;
  readonly partialLine?: string;

  private constructor(props: {
    type: TrialType;
    difficulty?: number;
    skill?: SkillId;
    condition?: string;
    successLine?: string;
    failureLine?: string;
    partialLine?: string;
  }) {
    this.type = props.type;
    this.difficulty = props.difficulty ?? 0;
    this.skill = props.skill;
    this.condition = props.condition;
    this.successLine = props.successLine;
    this.failureLine = props.failureLine;
    this.partialLine = props.partialLine;

    Object.freeze(this);
  }

  /**
   * 创建 TalkTrial
   */
  static create(props: {
    type: TrialType;
    difficulty?: number;
    skill?: SkillId;
    condition?: string;
    successLine?: string;
    failureLine?: string;
    partialLine?: string;
  }): TalkTrial {
    return new TalkTrial(props);
  }

  /**
   * 从 JSON 创建 TalkTrial
   */
  static fromJson(json: TalkTrialJson): TalkTrial {
    // 将字符串类型转换为枚举
    let trialType: TrialType;
    const typeStr = json.type.toUpperCase();
    if (Object.values(TrialType).includes(typeStr as TrialType)) {
      trialType = typeStr as TrialType;
    } else {
      trialType = TrialType.CONDITION;
    }

    return new TalkTrial({
      type: trialType,
      difficulty: json.difficulty ?? 0,
      skill: json.skill as SkillId,
      condition: json.condition,
      successLine: json.success,
      failureLine: json.failure,
      partialLine: json.partial,
    });
  }

  /**
   * 执行检定
   * @param ctx - 对话上下文
   * @returns 检定结果
   */
  execute(ctx: DialogueContext): TrialResultEnum {
    switch (this.type) {
      case TrialType.LIE:
        return this.checkLie(ctx);
      case TrialType.PERSUADE:
        return this.checkPersuade(ctx);
      case TrialType.INTIMIDATE:
        return this.checkIntimidate(ctx);
      case TrialType.SKILL_CHECK:
        return this.checkSkill(ctx);
      case TrialType.CONDITION:
        return this.checkCondition(ctx);
      default:
        return 'failure' as TrialResultEnum;
    }
  }

  /**
   * 欺骗检定
   * 基于玩家的 speech 技能和 NPC 的智力
   */
  private checkLie(ctx: DialogueContext): TrialResultEnum {
    const playerSkill = ctx.player.getSkillLevel('speech' as SkillId);
    const npcIntelligence = ctx.npc.getStat('intelligence');

    // 难度修正
    const adjustedDifficulty = this.difficulty + npcIntelligence;

    // 投骰子 (d10)
    const roll = Math.random() * 10;
    const total = roll + playerSkill;

    if (total >= adjustedDifficulty + 5) {
      return 'success' as TrialResultEnum;
    } else if (total >= adjustedDifficulty) {
      return 'partial' as TrialResultEnum;
    }
    return 'failure' as TrialResultEnum;
  }

  /**
   * 说服检定
   * 基于 speech 技能和 NPC 的态度
   */
  private checkPersuade(ctx: DialogueContext): TrialResultEnum {
    // 假设 Talker 接口有 getAttitude 方法
    const npcAttitude = (ctx.npc as { getAttitude?: () => number })?.getAttitude?.() ?? 5;
    const playerSkill = ctx.player.getSkillLevel('speech' as SkillId);

    // 态度越好，说服越容易
    const attitudeBonus = (npcAttitude - 5) * 2;
    const adjustedDifficulty = Math.max(0, this.difficulty - attitudeBonus);

    const roll = Math.random() * 10;
    const total = roll + playerSkill;

    if (total >= adjustedDifficulty + 5) {
      return 'success' as TrialResultEnum;
    } else if (total >= adjustedDifficulty) {
      return 'partial' as TrialResultEnum;
    }
    return 'failure' as TrialResultEnum;
  }

  /**
   * 威吓检定
   * 基于玩家的强度和 NPC 的意志
   */
  private checkIntimidate(ctx: DialogueContext): TrialResultEnum {
    const playerStrength = ctx.player.getStat('strength');
    const npcWillpower = ctx.npc.getStat('intelligence'); // CDDA 使用智力作为意志

    const adjustedDifficulty = this.difficulty + npcWillpower - playerStrength;

    const roll = Math.random() * 10;

    // 威吓需要更高的投骰结果
    if (roll >= adjustedDifficulty + 6) {
      return 'success' as TrialResultEnum;
    } else if (roll >= adjustedDifficulty + 3) {
      return 'partial' as TrialResultEnum;
    }
    return 'failure' as TrialResultEnum;
  }

  /**
   * 技能检定
   * 通用的技能检定
   */
  private checkSkill(ctx: DialogueContext): TrialResultEnum {
    if (!this.skill) {
      return 'failure' as TrialResultEnum;
    }

    const playerSkill = ctx.player.getSkillLevel(this.skill);

    // 如果没有技能等级，直接失败
    if (playerSkill <= 0) {
      return 'failure' as TrialResultEnum;
    }

    const roll = Math.random() * 10;
    const total = roll + playerSkill;

    if (total >= this.difficulty + 5) {
      return 'success' as TrialResultEnum;
    } else if (total >= this.difficulty) {
      return 'partial' as TrialResultEnum;
    }
    return 'failure' as TrialResultEnum;
  }

  /**
   * 条件检定
   * 简单的布尔条件检查
   */
  private checkCondition(ctx: DialogueContext): TrialResultEnum {
    if (!this.condition) {
      return 'success' as TrialResultEnum;
    }

    // 这里需要与 DialogueCondition 集成
    // 暂时返回成功，后续会实现完整的条件解析
    // const result = DialogueCondition.evaluate(this.condition, ctx);
    // return result ? 'success' as TrialResultEnum : 'failure' as TrialResultEnum;

    return 'success' as TrialResultEnum;
  }

  /**
   * 获取结果对应的对话文本
   */
  getResultText(result: TrialResultEnum): string {
    switch (result) {
      case 'success':
        return this.successLine || '成功！';
      case 'failure':
        return this.failureLine || '失败...';
      case 'partial':
        return this.partialLine || '部分成功';
      default:
        return '';
    }
  }

  /**
   * 转换为 JSON
   */
  toJson(): TalkTrialJson {
    return {
      type: this.type,
      difficulty: this.difficulty || undefined,
      skill: this.skill,
      condition: this.condition,
      success: this.successLine,
      failure: this.failureLine,
      partial: this.partialLine,
    };
  }
}

/**
 * 创建一个欺骗检定
 */
export function createLieTrial(difficulty: number = 5): TalkTrial {
  return TalkTrial.create({
    type: TrialType.LIE,
    difficulty,
    successLine: '他们相信了你的话。',
    failureLine: '他们看起来不太相信你。',
    partialLine: '他们似乎有些怀疑，但还是接受了。',
  });
}

/**
 * 创建一个说服检定
 */
export function createPersuadeTrial(difficulty: number = 5): TalkTrial {
  return TalkTrial.create({
    type: TrialType.PERSUADE,
    difficulty,
    successLine: '你说服了他们。',
    failureLine: '他们拒绝被说服。',
    partialLine: '他们考虑了一下，说也许吧。',
  });
}

/**
 * 创建一个威吓检定
 */
export function createIntimidateTrial(difficulty: number = 5): TalkTrial {
  return TalkTrial.create({
    type: TrialType.INTIMIDATE,
    difficulty,
    successLine: '他们被吓住了。',
    failureLine: '他们没有被吓到。',
    partialLine: '他们看起来有些紧张。',
  });
}
