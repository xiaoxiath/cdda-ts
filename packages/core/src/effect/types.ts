/**
 * 效果类型 ID
 * 匹配 CDDA efftype_id
 */
export type EffectTypeId = string;

/**
 * 效果强度类型
 */
export enum EffectIntensity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  DEADLY = 'deadly',
}

/**
 * 效果持续时间类型
 */
export enum EffectDuration {
  INSTANT = 'instant',
  SHORT = 'short',
  MEDIUM = 'medium',
  LONG = 'long',
  PERMANENT = 'permanent',
}

/**
 * 效果应用模式
 */
export enum EffectApplyMode {
  /** 立即应用 */
  IMMEDIATE = 'immediate',
  /** 延迟应用 */
  DELAYED = 'delayed',
  /** 周期性应用 */
  PERIODIC = 'periodic',
  /** 条件触发 */
  CONDITIONAL = 'conditional',
}
