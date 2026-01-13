/**
 * EffectManager 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Map } from 'immutable';
import { EffectManager } from '../EffectManager';
import { EffectDefinition, EffectDefinitions } from '../EffectDefinition';
import { EffectCategory, EffectModifierType } from '../types';

describe('EffectManager', () => {
  let manager: EffectManager;
  let fixedTime: number;

  beforeEach(() => {
    fixedTime = 1000000;
    vi.useFakeTimers().setSystemTime(fixedTime);

    const definitions = Object.values(EffectDefinitions) as EffectDefinition[];
    manager = EffectManager.create(definitions);
  });

  describe('create', () => {
    it('should create empty manager', () => {
      const emptyManager = EffectManager.create([]);

      expect(emptyManager.getEffectCount()).toBe(0);
      expect(emptyManager.getAllEffects().isEmpty()).toBe(true);
    });

    it('should create manager with definitions', () => {
      const defs = [
        EffectDefinitions.POISON_WEAK,
        EffectDefinitions.REGEN_WEAK,
      ];
      const mgr = EffectManager.create(defs);

      expect(mgr.definitions.size).toBe(2);
    });
  });

  describe('apply effects', () => {
    it('should apply new effect', () => {
      const updated = manager.applyEffect('poison_weak' as any, fixedTime);

      expect(updated.getEffectCount()).toBe(1);
      const effect = updated.getEffect('poison_weak' as any);
      expect(effect).toBeDefined();
      expect(effect!.isActive).toBe(true);
    });

    it('should stack stackable effects', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      const effect = updated.getEffect('poison_weak' as any);
      expect(effect!.currentStacks).toBe(3);
    });

    it('should not stack non-stackable effects', () => {
      let updated = manager;
      updated = updated.applyEffect('stunned' as any, fixedTime);
      updated = updated.applyEffect('stunned' as any, fixedTime);

      const effect = updated.getEffect('stunned' as any);
      expect(effect!.currentStacks).toBe(1);
    });

    it('should apply effect with custom duration', () => {
      const updated = manager.applyEffectWithDuration(
        'poison_weak' as any,
        30000,
        fixedTime
      );

      const effect = updated.getEffect('poison_weak' as any);
      expect(effect!.duration).toBe(30000);
    });

    it('should extend duration when applying existing stackable effect', () => {
      let updated = manager;
      updated = updated.applyEffectWithDuration('poison_weak' as any, 30000, fixedTime);
      const first = updated.getEffect('poison_weak' as any)!;
      expect(first.duration).toBe(30000);

      updated = updated.applyEffectWithDuration('poison_weak' as any, 20000, fixedTime + 10000);
      const second = updated.getEffect('poison_weak' as any)!;
      expect(second.duration).toBeGreaterThan(30000);
      expect(second.currentStacks).toBe(2);
    });
  });

  describe('remove effects', () => {
    it('should remove effect', () => {
      let updated = manager.applyEffect('poison_weak' as any, fixedTime);
      expect(updated.getEffectCount()).toBe(1);

      updated = updated.removeEffect('poison_weak' as any);
      expect(updated.getEffectCount()).toBe(0);
    });

    it('should reduce stack when removing stackable effect', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      const effect = updated.getEffect('poison_weak' as any)!;
      expect(effect.currentStacks).toBe(3);

      updated = updated.removeEffect('poison_weak' as any);
      const removed = updated.getEffect('poison_weak' as any)!;
      expect(removed.currentStacks).toBe(2);
    });

    it('should remove all effects', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('regen_weak' as any, fixedTime);
      expect(updated.getEffectCount()).toBe(2);

      updated = updated.removeAllEffects();
      expect(updated.getEffectCount()).toBe(0);
    });

    it('should remove effects by category', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_moderate' as any, fixedTime); // poison category
      updated = updated.applyEffect('regen_weak' as any, fixedTime); // regen category

      expect(updated.getEffectCount()).toBe(3);

      // Remove poison category effects
      updated = updated.removeEffectsByCategory('poison' as any);
      expect(updated.getEffectCount()).toBe(1); // Only regen_weak remains
      expect(updated.hasEffect('regen_weak' as any)).toBe(true);
    });

    it('should remove buffs', () => {
      let updated = manager;
      updated = updated.applyEffect('regen_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      updated = updated.removeBuffs();
      expect(updated.getEffectCount()).toBe(1);
      expect(updated.hasEffect('poison_weak' as any)).toBe(true);
      expect(updated.hasEffect('regen_weak' as any)).toBe(false);
    });

    it('should remove debuffs', () => {
      let updated = manager;
      updated = updated.applyEffect('regen_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      updated = updated.removeDebuffs();
      expect(updated.getEffectCount()).toBe(1);
      expect(updated.hasEffect('regen_weak' as any)).toBe(true);
      expect(updated.hasEffect('poison_weak' as any)).toBe(false);
    });
  });

  describe('query effects', () => {
    it('should check if has effect', () => {
      expect(manager.hasEffect('poison_weak' as any)).toBe(false);

      const withEffect = manager.applyEffect('poison_weak' as any, fixedTime);
      expect(withEffect.hasEffect('poison_weak' as any)).toBe(true);
    });

    it('should get active effects', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('regen_weak' as any, fixedTime);

      const active = updated.getActiveEffects();
      expect(active.size).toBe(2);
    });

    it('should get effects by category', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime); // poison
      updated = updated.applyEffect('poison_moderate' as any, fixedTime); // poison
      updated = updated.applyEffect('regen_weak' as any, fixedTime); // regen

      const poisonEffects = updated.getEffectsByCategory('poison' as any);
      expect(poisonEffects.size).toBe(2);
    });

    it('should get buffs', () => {
      let updated = manager;
      updated = updated.applyEffect('regen_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      const buffs = updated.getBuffs();
      expect(buffs.size).toBe(1);
      expect(buffs.first()!.definition.id).toBe('regen_weak' as any);
    });

    it('should get debuffs', () => {
      let updated = manager;
      updated = updated.applyEffect('regen_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      const debuffs = updated.getDebuffs();
      expect(debuffs.size).toBe(1);
      expect(debuffs.first()!.definition.id).toBe('poison_weak' as any);
    });

    it('should check if has effect category', () => {
      expect(manager.hasEffectCategory('poison' as any)).toBe(false);

      const withPoison = manager.applyEffect('poison_weak' as any, fixedTime);
      expect(withPoison.hasEffectCategory('poison' as any)).toBe(true);
      expect(withPoison.hasEffectCategory('regen' as any)).toBe(false);
    });
  });

  describe('update', () => {
    it('should remove expired effects', () => {
      // Create effect with 5 second duration
      const shortDef = EffectDefinition.create({
        id: 'short' as any,
        name: 'Short',
        category: 'buff' as any,
        durationType: 'short' as any,
      });

      const managerWithShort = EffectManager.create([shortDef]);
      let updated = managerWithShort.applyEffect('short' as any, fixedTime);
      expect(updated.getEffectCount()).toBe(1);

      // Advance time by 11 seconds (effect expires after 10)
      updated = updated.update(fixedTime + 11000);
      expect(updated.getEffectCount()).toBe(0);
    });

    it('should keep non-expired effects', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      // Advance time by 1 second
      updated = updated.update(fixedTime + 1000);
      expect(updated.getEffectCount()).toBe(1);
    });

    it('should keep permanent effects', () => {
      const permanentDef = EffectDefinition.create({
        id: 'perm' as any,
        name: 'Permanent',
        category: 'buff' as any,
        durationType: 'permanent' as any,
      });

      const mgr = EffectManager.create([permanentDef]);
      let updated = mgr.applyEffect('perm' as any, fixedTime);

      // Advance time by a lot
      updated = updated.update(fixedTime + 9999999);
      expect(updated.getEffectCount()).toBe(1);
    });
  });

  describe('modifiers', () => {
    it('should calculate speed modifier', () => {
      // STIMULANT adds +20 to speed
      let updated = manager.applyEffect('stimulant' as any, fixedTime);
      expect(updated.getSpeedModifier()).toBe(20);
    });

    it('should calculate damage modifier', () => {
      // POISON does damage via health reduction
      let updated = manager.applyEffect('poison_weak' as any, fixedTime);
      const mod = updated.getDamageModifier('all');
      // Poison has STAT_ADD on health with negative value
      expect(mod).toBe(0); // No direct damage modifiers
    });

    it('should get modifier value', () => {
      // STIMULANT adds +2 to strength
      let updated = manager.applyEffect('stimulant' as any, fixedTime);
      expect(updated.getModifierValue('strength')).toBe(2);
    });

    it('should not stack non-stackable effects', () => {
      // STIMULANT is not stackable
      let updated = manager;
      updated = updated.applyEffect('stimulant' as any, fixedTime);
      const value1 = updated.getModifierValue('strength');

      updated = updated.applyEffect('stimulant' as any, fixedTime);
      const value2 = updated.getModifierValue('strength');

      // Should not stack - same value
      expect(value1).toBe(2);
      expect(value2).toBe(2);
    });

    it('should calculate armor modifier', () => {
      // 创建一个提供护甲加成的效果
      const armorBuff = EffectDefinition.create({
        id: 'armor_buff' as any,
        name: '护甲强化',
        description: '增加护甲',
        category: EffectCategory.BUFF,
        modifiers: [
          { type: EffectModifierType.ARMOR_ADD, target: 'all', value: 5 },
          { type: EffectModifierType.ARMOR_BONUS, target: 'BASH', value: 3 },
        ],
      });

      const armorManager = EffectManager.create([armorBuff]);
      const updated = armorManager.applyEffect('armor_buff' as any, fixedTime);

      // 'all' 只获取 target='all' 的修饰符: 5 (ADD)
      const allArmor = updated.getArmorModifier('all');
      expect(allArmor).toBe(5);

      // 'BASH' 获取 target='all' + target='BASH': 5 (ADD) + 3 (BONUS) = 8
      const bashArmor = updated.getArmorModifier('BASH' as any);
      expect(bashArmor).toBe(8);

      // 'CUT' 只获取 target='all': 5 (ADD)
      const cutArmor = updated.getArmorModifier('CUT' as any);
      expect(cutArmor).toBe(5);
    });

    it('should calculate armor modifier with multiply', () => {
      const armorBuff = EffectDefinition.create({
        id: 'armor_multiply' as any,
        name: '护甲倍增',
        description: '护甲倍增',
        category: EffectCategory.BUFF,
        modifiers: [
          { type: EffectModifierType.ARMOR_ADD, target: 'all', value: 10 },
          { type: EffectModifierType.ARMOR_MULTIPLY, target: 'all', value: 0.5 },
        ],
      });

      const armorManager = EffectManager.create([armorBuff]);
      const updated = armorManager.applyEffect('armor_multiply' as any, fixedTime);

      // (10 + 0) * (1 + 0.5) = 15
      const armor = updated.getArmorModifier('all');
      expect(armor).toBe(15);
    });

    it('should respect body part for armor modifier', () => {
      // 创建一个局部护甲效果（只影响左臂）
      const bpMap = Map([
        ['ARM_L' as any, 50],
      ]);

      const localArmorBuff = EffectDefinition.create({
        id: 'local_armor' as any,
        name: '局部护甲',
        description: '左臂护甲',
        category: EffectCategory.BUFF,
        modifiers: [
          { type: EffectModifierType.ARMOR_ADD, target: 'all', value: 8 },
        ],
        bpAffected: bpMap,
        isLocal: true,
      });

      const armorManager = EffectManager.create([localArmorBuff]);
      const updated = armorManager.applyEffect('local_armor' as any, fixedTime);

      // 左臂有护甲加成
      const armLArmor = updated.getArmorModifier('all', 'ARM_L' as any);
      expect(armLArmor).toBe(8);

      // 右臂没有护甲加成
      const armRArmor = updated.getArmorModifier('all', 'ARM_R' as any);
      expect(armRArmor).toBe(0);
    });
  });

  describe('statistics', () => {
    it('should get total stacks', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('regen_weak' as any, fixedTime);

      expect(updated.getTotalStacks()).toBe(4); // 3 poison + 1 regen
    });

    it('should get strongest effect', () => {
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('regen_weak' as any, fixedTime);

      const strongest = updated.getStrongestEffect();
      expect(strongest).toBeDefined();
      expect(strongest!.currentStacks).toBe(3);
    });
  });

  describe('serialization', () => {
    it.skip('should convert to JSON and back (require issue)', () => {
      // TODO: Fix the require() issue in EffectManager.fromJson
      let updated = manager;
      updated = updated.applyEffect('poison_weak' as any, fixedTime);
      updated = updated.applyEffect('regen_weak' as any, fixedTime);

      const json = updated.toJson();
      expect(json.effects).toHaveLength(2);
      expect(json.definitions).toHaveLength(Object.keys(EffectDefinitions).length);

      const restored = EffectManager.fromJson(json);
      expect(restored.getEffectCount()).toBe(2);
      expect(restored.hasEffect('poison_weak' as any)).toBe(true);
      expect(restored.hasEffect('regen_weak' as any)).toBe(true);
    });
  });

  describe('display', () => {
    it('should get effect list string', () => {
      let updated = manager;
      updated = updated.applyEffect('regen_weak' as any, fixedTime);
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      const list = updated.getEffectListString(fixedTime);
      expect(list).toContain('增益效果');
      expect(list).toContain('减益效果');
      expect(list).toContain('再生');
      expect(list).toContain('中毒');
    });

    it('should show no effects message when empty', () => {
      const list = manager.getEffectListString(fixedTime);
      expect(list).toBe('没有活跃效果');
    });
  });

  // ========== 效果交互测试 ==========

  describe('effect interactions', () => {
    it('should check effect immunity', () => {
      // 创建一个对 "poison_weak" 免疫的效果定义
      const immuneBuff = EffectDefinition.create({
        id: 'immune_to_poison' as any,
        name: '抗毒体质',
        description: '免疫弱中毒',
        category: EffectCategory.BUFF,
        effectImmunities: ['poison_weak' as any],
      });

      const immuneManager = EffectManager.create([immuneBuff, EffectDefinitions.POISON_WEAK]);

      // 应用免疫效果
      let updated = immuneManager.applyEffect('immune_to_poison' as any, fixedTime);

      // 尝试应用中毒效果 - 应该被免疫
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      // 中毒效果不应该被应用
      expect(updated.getEffectCount()).toBe(1);
      expect(updated.getEffect('poison_weak' as any)).toBeUndefined();
      expect(updated.getEffect('immune_to_poison' as any)).toBeDefined();
    });

    it('should reduce effect duration from other effects', () => {
      // 创建一个减少中毒持续时间的效果
      const durationReducer = EffectDefinition.create({
        id: 'poison_resist' as any,
        name: '抗毒',
        description: '减少中毒持续时间',
        category: EffectCategory.BUFF,
        reducesDuration: Map([['poison_weak' as any, 30000]]), // 减少30秒
      });

      const reducerManager = EffectManager.create([
        durationReducer,
        EffectDefinitions.POISON_WEAK,
      ]);

      // 先应用减少持续时间的效果
      let updated = reducerManager.applyEffect('poison_resist' as any, fixedTime);

      // 再应用中毒效果
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      const poisonEffect = updated.getEffect('poison_weak' as any);
      expect(poisonEffect).toBeDefined();

      // 原始持续时间是60秒，应该被减少到30秒
      expect(poisonEffect!.duration).toBeLessThan(60000);
      expect(poisonEffect!.duration).toBeGreaterThan(0);
    });

    it('should prevent effect when duration reduced to zero', () => {
      // 创建一个完全抵消中毒的效果
      const fullImmunity = EffectDefinition.create({
        id: 'full_poison_immunity' as any,
        name: '完全抗毒',
        description: '完全免疫中毒',
        category: EffectCategory.BUFF,
        reducesDuration: Map([['poison_weak' as any, 999999]]), // 减少大量时间
      });

      const immunityManager = EffectManager.create([
        fullImmunity,
        EffectDefinitions.POISON_WEAK,
      ]);

      // 先应用免疫效果
      let updated = immunityManager.applyEffect('full_poison_immunity' as any, fixedTime);

      // 再应用中毒效果
      updated = updated.applyEffect('poison_weak' as any, fixedTime);

      // 中毒效果应该立即过期
      expect(updated.getEffect('poison_weak' as any)).toBeUndefined();
    });

    it('should check kill effects', () => {
      // 创建一个可以致死的效果
      const deadlyEffect = EffectDefinition.create({
        id: 'deadly_poison' as any,
        name: '剧毒',
        description: '致命毒素',
        category: EffectCategory.POISON,
        canKill: true,
        killMessage: '你死于剧毒！',
      });

      const deadlyManager = EffectManager.create([deadlyEffect]);

      // 应用致死效果
      const updated = deadlyManager.applyEffect('deadly_poison' as any, fixedTime);

      // 检查致死效果
      const killEffects = updated.checkKillEffects();
      expect(killEffects.size).toBe(1);
      expect(killEffects.first()?.definition.id).toBe('deadly_poison');

      // 获取死亡消息
      const killMessage = updated.getKillMessage();
      expect(killMessage).toBe('你死于剧毒！');
    });

    it('should return null when no kill effects present', () => {
      const killMessage = manager.getKillMessage();
      expect(killMessage).toBeNull();

      const killEffects = manager.checkKillEffects();
      expect(killEffects.size).toBe(0);
    });

    it('should check if effect will expire immediately', () => {
      const reducer = EffectDefinition.create({
        id: 'strong_reducer' as any,
        name: '强效抵抗',
        description: '大幅减少效果持续时间',
        category: EffectCategory.BUFF,
        reducesDuration: Map([['poison_weak' as any, 999999]]),
      });

      const reducerManager = EffectManager.create([
        reducer,
        EffectDefinitions.POISON_WEAK,
      ]);

      // 先应用抵抗效果
      let updated = reducerManager.applyEffect('strong_reducer' as any, fixedTime);

      // 检查中毒效果是否会立即过期
      const willExpire = updated.willExpireImmediately('poison_weak' as any);
      expect(willExpire).toBe(true);
    });
  });
});
