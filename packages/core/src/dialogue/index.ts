/**
 * Dialogue (对话) 系统模块
 *
 * 提供完整的对话系统实现，包括：
 * - Talker 接口：对话参与者抽象
 * - TalkTrial：技能检定系统
 * - TalkResponse：对话回应
 * - TalkTopic：对话主题
 * - Dialogue：对话管理器
 * - DialogueCondition：条件解析器
 * - DialogueEffects：效果处理
 * - NpcClass：NPC 类定义
 * - DialogueLoader：JSON 加载器
 *
 * @module dialogue
 */

// 类型定义
export type {
  TalkTopicId,
  NpcClassId,
  DialogueContext,
  AttitudeValue,
  DynamicLineReplacements,
  DialogueEffect,
  TrialConfig,
  ResponseBranch,
  TopicSwitch,
} from './types';

export {
  TrialType,
  DialogueAction,
  TrialResult,
  TalkerType,
  type TalkTopicType,
} from './types';

// Talker 接口
export {
  Talker,
  AbstractTalker,
  MockTalker,
} from './Talker';

// 技能检定
export {
  TalkTrial,
  type TalkTrialJson,
  createLieTrial,
  createPersuadeTrial,
  createIntimidateTrial,
} from './TalkTrial';

// 对话回应
export {
  TalkResponse,
  type TalkResponseJson,
  createTextResponse,
  createTrialResponse,
  createActionResponse,
} from './TalkResponse';

// 对话主题
export {
  TalkTopic,
  type TalkTopicJson,
  createGreetingTopic,
  createEndTopic,
  createShopTopic,
  CommonTopics,
} from './TalkTopic';

// 对话管理器
export {
  Dialogue,
  DialogueBuilder,
  type DialogueState,
  createDialogueBuilder,
} from './Dialogue';

// 条件解析器
export { DialogueCondition } from './DialogueCondition';

// 效果处理
export {
  DialogueEffects,
  type EffectResult,
  createEffectExecutor,
} from './DialogueEffects';

// NPC 类
export {
  NpcClass,
  type NpcClassJson,
  CommonNpcClasses,
  createDefaultNpcClasses,
} from './NpcClass';

// 数据加载器
export {
  DialogueLoader,
  type DialogueJsonData,
} from './DialogueLoader';

/**
 * 创建对话系统实例
 *
 * 工厂函数，用于快速创建对话系统。
 *
 * @example
 * ```typescript
 * const dialogueSystem = createDialogueSystem();
 * const loader = DialogueLoader.fromJsonFile('data/npc/dialogue.json');
 * ```
 */
export function createDialogueSystem() {
  return {
    loader: DialogueLoader.create(),
    createCondition: (condition: string) => ({
      evaluate: (ctx: DialogueContext) => DialogueCondition.evaluate(condition, ctx),
      validate: () => DialogueCondition.validate(condition),
      dependencies: () => DialogueCondition.getDependencies(condition),
    }),
  };
}
