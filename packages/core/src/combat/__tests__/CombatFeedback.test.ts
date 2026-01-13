/**
 * CombatFeedback 测试
 *
 * 测试战斗反馈系统的各种功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Map, List } from 'immutable';
import {
  CombatFeedback,
  FeedbackManager,
  FeedbackType,
  VisualEffect,
  SoundEffect,
  type FeedbackMessage,
  type VisualFeedback,
  type SoundFeedback,
  type CombatFeedbackEvent,
} from '../CombatFeedback';
import { MeleeAttackType } from '../MeleeCombat';
import { FireMode } from '../RangedCombat';
import { DamageInstance } from '../DamageInstance';
import type { BodyPartId } from '../types';

describe('CombatFeedback', () => {
  describe('generateMeleeAttackFeedback', () => {
    it('should generate feedback for successful hit', () => {
      const result = {
        attackerId: 'hero',
        targetId: 'goblin',
        weaponUsed: 'sword',
        attackType: MeleeAttackType.CUT,
        attackResult: {
          hitResult: 'HIT' as any,
          bodyPart: 'TORSO' as BodyPartId,
          rawDamage: DamageInstance.cut(15, 0),
          actualDamage: 12,
          critical: false,
          doubleCrit: false,
          damageDetails: Map(),
        },
        moveCost: 100,
      };

      const feedback = CombatFeedback.generateMeleeAttackFeedback(result);

      expect(feedback.messages.length).toBeGreaterThan(0);
      expect(feedback.sounds.length).toBeGreaterThan(0);
      expect(feedback.visuals.length).toBeGreaterThan(0);

      // Should have hit message
      const hitMessage = feedback.messages.find(m => m.type === FeedbackType.ATTACK_HIT);
      expect(hitMessage).toBeDefined();
      expect(hitMessage?.text).toContain('hero');
      expect(hitMessage?.text).toContain('goblin');
    });

    it('should generate feedback for critical hit', () => {
      const result = {
        attackerId: 'hero',
        targetId: 'dragon',
        weaponUsed: 'greatsword',
        attackType: MeleeAttackType.CUT,
        attackResult: {
          hitResult: 'CRIT' as any,
          bodyPart: 'HEAD' as BodyPartId,
          rawDamage: DamageInstance.cut(30, 0),
          actualDamage: 30,
          critical: true,
          doubleCrit: false,
          damageDetails: Map(),
        },
        moveCost: 120,
      };

      const feedback = CombatFeedback.generateMeleeAttackFeedback(result);

      // Should have critical message
      const critMessage = feedback.messages.find(m => m.type === FeedbackType.ATTACK_CRITICAL);
      expect(critMessage).toBeDefined();
      expect(critMessage?.priority).toBe(8); // Higher priority for crits

      // Should have critical visual effect
      const critVisual = feedback.visuals.find(v => v.effect === VisualEffect.CRITICAL_HIT);
      expect(critVisual).toBeDefined();
      expect(critVisual?.color).toBe('#ff0000');

      // Should have critical sound
      const critSound = feedback.sounds.find(s => s.sound === SoundEffect.MELEE_CRITICAL);
      expect(critSound).toBeDefined();
    });

    it('should generate feedback for missed attack', () => {
      const result = {
        attackerId: 'hero',
        targetId: 'goblin',
        weaponUsed: 'sword',
        attackType: MeleeAttackType.STAB,
        attackResult: {
          hitResult: 'MISS' as any,
          bodyPart: null,
          rawDamage: DamageInstance.stab(10, 0),
          actualDamage: 0,
          critical: false,
          doubleCrit: false,
          damageDetails: Map(),
        },
        moveCost: 80,
      };

      const feedback = CombatFeedback.generateMeleeAttackFeedback(result);

      // Should have miss message
      const missMessage = feedback.messages.find(m => m.type === FeedbackType.ATTACK_MISS);
      expect(missMessage).toBeDefined();
      expect(missMessage?.text).toContain('未命中');

      // Should have miss sound
      const missSound = feedback.sounds.find(s => s.sound === SoundEffect.MELEE_MISS);
      expect(missSound).toBeDefined();

      // Miss should have lower priority
      expect(missMessage?.priority).toBe(2);
    });

    it('should generate feedback for blocked attack', () => {
      const result = {
        attackerId: 'hero',
        targetId: 'knight',
        weaponUsed: 'sword',
        attackType: MeleeAttackType.BASH,
        attackResult: {
          hitResult: 'HIT' as any,
          bodyPart: 'TORSO' as BodyPartId,
          rawDamage: DamageInstance.bash(10, 0),
          actualDamage: 5,
          critical: false,
          doubleCrit: false,
          damageDetails: Map(),
        },
        blockResult: {
          blocked: true,
          blockingWith: 'shield',
          damageReduced: 5,
          durabilityCost: 1,
        },
        moveCost: 100,
      };

      const feedback = CombatFeedback.generateMeleeAttackFeedback(result);

      // Should have block message
      const blockMessage = feedback.messages.find(m => m.type === FeedbackType.ATTACK_BLOCKED);
      expect(blockMessage).toBeDefined();
      expect(blockMessage?.text).toContain('格挡');
      expect(blockMessage?.text).toContain('shield');

      // Should have block visual effect
      const blockVisual = feedback.visuals.find(v => v.effect === VisualEffect.BLOCK_EFFECT);
      expect(blockVisual).toBeDefined();
      expect(blockVisual?.color).toBe('#ffff00');
    });

    it('should generate feedback for dodged attack', () => {
      const result = {
        attackerId: 'hero',
        targetId: 'ninja',
        weaponUsed: 'sword',
        attackType: MeleeAttackType.CUT,
        attackResult: {
          hitResult: 'MISS' as any,
          bodyPart: null,
          rawDamage: DamageInstance.cut(10, 0),
          actualDamage: 0,
          critical: false,
          doubleCrit: false,
          damageDetails: Map(),
        },
        dodgeResult: {
          dodged: true,
          direction: 'left',
          staminaCost: 2,
        },
        moveCost: 100,
      };

      const feedback = CombatFeedback.generateMeleeAttackFeedback(result);

      // Should have dodge message
      const dodgeMessage = feedback.messages.find(m => m.type === FeedbackType.ATTACK_DODGED);
      expect(dodgeMessage).toBeDefined();
      expect(dodgeMessage?.text).toContain('闪避');

      // Should have dodge visual effect
      const dodgeVisual = feedback.visuals.find(v => v.effect === VisualEffect.DODGE_EFFECT);
      expect(dodgeVisual).toBeDefined();
      expect(dodgeVisual?.color).toBe('#00ffff');
    });

    it('should include damage number visual', () => {
      const result = {
        attackerId: 'hero',
        targetId: 'goblin',
        weaponUsed: 'sword',
        attackType: MeleeAttackType.CUT,
        attackResult: {
          hitResult: 'HIT' as any,
          bodyPart: 'ARM_L' as BodyPartId,
          rawDamage: DamageInstance.cut(15, 0),
          actualDamage: 12,
          critical: false,
          doubleCrit: false,
          damageDetails: Map(),
        },
        moveCost: 100,
      };

      const feedback = CombatFeedback.generateMeleeAttackFeedback(result);

      // Should have damage number visual
      const damageVisual = feedback.visuals.find(v => v.effect === VisualEffect.DAMAGE_NUMBER);
      expect(damageVisual).toBeDefined();
      expect(damageVisual?.parameters?.value).toBe(12);
      expect(damageVisual?.color).toBe('#ff4444');

      // Should have blood effect
      const bloodVisual = feedback.visuals.find(v => v.effect === VisualEffect.HIT_BLOOD);
      expect(bloodVisual).toBeDefined();
    });
  });

  describe('generateRangedAttackFeedback', () => {
    it('should generate feedback for single shot hit', () => {
      const result = {
        attackerId: 'sniper',
        targetId: 'enemy',
        weaponUsed: 'rifle',
        distance: 50,
        fireMode: FireMode.SINGLE,
        shotsFired: 1,
        hits: 1,
        totalDamage: 25,
        shotResults: List([
          {
            hit: true,
            bodyPart: 'HEAD' as BodyPartId,
            rawDamage: 25,
            actualDamage: 25,
            penetrated: true,
            ricocheted: false,
            offset: { x: 0, y: 0 },
          },
        ]),
        ammoConsumed: 1,
        moveCost: 80,
        dispersion: 15,
      };

      const feedback = CombatFeedback.generateRangedAttackFeedback(result);

      expect(feedback.messages.length).toBeGreaterThan(0);

      // Should have hit message
      const hitMessage = feedback.messages.find(m => m.type === FeedbackType.ATTACK_HIT);
      expect(hitMessage).toBeDefined();
      expect(hitMessage?.text).toContain('sniper');
      expect(hitMessage?.text).toContain('enemy');

      // Should have damage message
      const damageMessage = feedback.messages.find(m => m.type === FeedbackType.DAMAGE_DEALT);
      expect(damageMessage).toBeDefined();
      expect(damageMessage?.text).toContain('25');

      // Should have gunshot sound
      const gunshotSound = feedback.sounds.find(s => s.sound === SoundEffect.GUNSHOT);
      expect(gunshotSound).toBeDefined();

      // Should have muzzle flash
      const muzzleFlash = feedback.visuals.find(v => v.effect === VisualEffect.MUZZLE_FLASH);
      expect(muzzleFlash).toBeDefined();
      expect(muzzleFlash?.color).toBe('#ffaa00');
    });

    it('should generate feedback for single shot miss', () => {
      const result = {
        attackerId: 'sniper',
        targetId: 'enemy',
        weaponUsed: 'rifle',
        distance: 100,
        fireMode: FireMode.SINGLE,
        shotsFired: 1,
        hits: 0,
        totalDamage: 0,
        shotResults: List([
          {
            hit: false,
            bodyPart: null,
            rawDamage: 0,
            actualDamage: 0,
            penetrated: false,
            ricocheted: false,
            offset: { x: 5, y: 3 },
          },
        ]),
        ammoConsumed: 1,
        moveCost: 80,
        dispersion: 30,
      };

      const feedback = CombatFeedback.generateRangedAttackFeedback(result);

      // Should have miss message
      const missMessage = feedback.messages.find(m => m.type === FeedbackType.ATTACK_MISS);
      expect(missMessage).toBeDefined();
      expect(missMessage?.text).toContain('未命中');
    });

    it('should generate feedback for burst fire', () => {
      const result = {
        attackerId: 'soldier',
        targetId: 'enemy',
        weaponUsed: 'smg',
        distance: 15,
        fireMode: FireMode.BURST,
        shotsFired: 3,
        hits: 2,
        totalDamage: 40,
        shotResults: List(),
        ammoConsumed: 3,
        moveCost: 150,
        dispersion: 45,
      };

      const feedback = CombatFeedback.generateRangedAttackFeedback(result);

      // Should have combat message with shot count
      const combatMessage = feedback.messages.find(m => m.type === FeedbackType.COMBAT_MESSAGE);
      expect(combatMessage).toBeDefined();
      expect(combatMessage?.text).toContain('发射 3 发');
      expect(combatMessage?.text).toContain('命中 2 发');

      // Should have total damage message
      const damageMessage = feedback.messages.find(m => m.type === FeedbackType.DAMAGE_DEALT);
      expect(damageMessage).toBeDefined();
      expect(damageMessage?.text).toContain('40');
    });

    it('should generate feedback for auto fire', () => {
      const result = {
        attackerId: 'machine_gunner',
        targetId: 'enemy',
        weaponUsed: 'assault_rifle',
        distance: 20,
        fireMode: FireMode.AUTO,
        shotsFired: 7,
        hits: 4,
        totalDamage: 85,
        shotResults: List(),
        ammoConsumed: 7,
        moveCost: 200,
        dispersion: 90,
      };

      const feedback = CombatFeedback.generateRangedAttackFeedback(result);

      const combatMessage = feedback.messages.find(m => m.type === FeedbackType.COMBAT_MESSAGE);
      expect(combatMessage).toBeDefined();
      expect(combatMessage?.text).toContain('发射 7 发');
      expect(combatMessage?.text).toContain('命中 4 发');
    });
  });

  describe('generateKillFeedback', () => {
    it('should generate kill feedback with weapon', () => {
      const feedback = CombatFeedback.generateKillFeedback('hero', 'dragon', 'sword');

      expect(feedback.messages.length).toBe(1);
      expect(feedback.messages[0].type).toBe(FeedbackType.KILL_BLOW);
      expect(feedback.messages[0].text).toContain('hero');
      expect(feedback.messages[0].text).toContain('dragon');
      expect(feedback.messages[0].text).toContain('sword');
      expect(feedback.messages[0].text).toContain('击杀');

      // Kill feedback should have highest priority
      expect(feedback.messages[0].priority).toBe(10);

      // Should have visual effect
      expect(feedback.visuals.length).toBe(1);
      expect(feedback.visuals[0].effect).toBe(VisualEffect.CRITICAL_HIT);
      expect(feedback.visuals[0].duration).toBe(800);
    });

    it('should generate kill feedback without weapon', () => {
      const feedback = CombatFeedback.generateKillFeedback('hero', 'goblin');

      expect(feedback.messages[0].text).toContain('hero 击杀了 goblin');
      expect(feedback.messages[0].text).not.toContain('用');
    });
  });

  describe('generateWeaponJamFeedback', () => {
    it('should generate weapon jam feedback', () => {
      const feedback = CombatFeedback.generateWeaponJamFeedback('rifle');

      expect(feedback.messages.length).toBe(1);
      expect(feedback.messages[0].type).toBe(FeedbackType.WEAPON_JAMMED);
      expect(feedback.messages[0].text).toContain('rifle');
      expect(feedback.messages[0].text).toContain('卡壳');

      expect(feedback.sounds.length).toBe(1);
      expect(feedback.sounds[0].sound).toBe(SoundEffect.EMPTY_CLICK);

      // No visuals for jam
      expect(feedback.visuals.length).toBe(0);
    });
  });

  describe('generateWeaponEmptyFeedback', () => {
    it('should generate weapon empty feedback', () => {
      const feedback = CombatFeedback.generateWeaponEmptyFeedback('pistol');

      expect(feedback.messages.length).toBe(1);
      expect(feedback.messages[0].type).toBe(FeedbackType.WEAPON_EMPTY);
      expect(feedback.messages[0].text).toContain('pistol');
      expect(feedback.messages[0].text).toContain('弹药耗尽');

      expect(feedback.sounds.length).toBe(1);
      expect(feedback.sounds[0].sound).toBe(SoundEffect.EMPTY_CLICK);
    });
  });

  describe('generateEffectAppliedFeedback', () => {
    it('should generate effect applied feedback', () => {
      const feedback = CombatFeedback.generateEffectAppliedFeedback('hero', '中毒', 2);

      expect(feedback.messages.length).toBe(1);
      expect(feedback.messages[0].type).toBe(FeedbackType.EFFECT_APPLIED);
      expect(feedback.messages[0].text).toContain('hero');
      expect(feedback.messages[0].text).toContain('中毒');
      expect(feedback.messages[0].text).toContain('(2)');

      expect(feedback.messages[0].data?.effect).toBe('中毒');
      expect(feedback.messages[0].data?.intensity).toBe(2);

      // Should have visual effect for effect application
      expect(feedback.visuals.length).toBe(1);
      expect(feedback.visuals[0].effect).toBe(VisualEffect.DAMAGE_TEXT);
      expect(feedback.visuals[0].parameters?.text).toBe('+中毒');
      expect(feedback.visuals[0].color).toBe('#00ff00');

      // No sounds for effect application
      expect(feedback.sounds.length).toBe(0);
    });
  });

  describe('formatFeedbackEvent', () => {
    it('should format feedback event with all components', () => {
      const event: CombatFeedbackEvent = {
        messages: [
          {
            id: 'msg1',
            type: FeedbackType.ATTACK_HIT,
            text: 'Hero hit goblin',
            priority: 5,
            relatedEntities: { source: 'hero', target: 'goblin' },
            timestamp: 1000,
          },
        ],
        visuals: [
          {
            effect: VisualEffect.HIT_SPARK,
            position: { x: 0, y: 0, z: 0 },
            duration: 200,
          },
        ],
        sounds: [
          {
            sound: SoundEffect.MELEE_HIT,
            volume: 0.8,
          },
        ],
      };

      const formatted = CombatFeedback.formatFeedbackEvent(event);

      expect(formatted).toContain('=== 消息 ===');
      expect(formatted).toContain('ATTACK_HIT');
      expect(formatted).toContain('Hero hit goblin');

      expect(formatted).toContain('=== 视觉效果 ===');
      expect(formatted).toContain('HIT_SPARK');
      expect(formatted).toContain('200ms');

      expect(formatted).toContain('=== 音效 ===');
      expect(formatted).toContain('MELEE_HIT');
      expect(formatted).toContain('音量: 0.8');
    });

    it('should handle empty feedback event', () => {
      const event: CombatFeedbackEvent = {
        messages: [],
        visuals: [],
        sounds: [],
      };

      const formatted = CombatFeedback.formatFeedbackEvent(event);

      // Should return empty string or just headers
      expect(formatted).toBe('');
    });

    it('should handle event with only messages', () => {
      const event: CombatFeedbackEvent = {
        messages: [
          {
            id: 'msg1',
            type: FeedbackType.COMBAT_MESSAGE,
            text: 'Combat started',
            priority: 3,
            relatedEntities: {},
            timestamp: 1000,
          },
        ],
        visuals: [],
        sounds: [],
      };

      const formatted = CombatFeedback.formatFeedbackEvent(event);

      expect(formatted).toContain('=== 消息 ===');
      expect(formatted).not.toContain('=== 视觉效果 ===');
      expect(formatted).not.toContain('=== 音效 ===');
    });
  });

  describe('message IDs are unique', () => {
    it('should generate unique message IDs', () => {
      const feedback1 = CombatFeedback.generateKillFeedback('a', 'b');
      const feedback2 = CombatFeedback.generateKillFeedback('c', 'd');

      expect(feedback1.messages[0].id).not.toBe(feedback2.messages[0].id);
    });
  });
});

describe('FeedbackManager', () => {
  let manager: FeedbackManager;

  beforeEach(() => {
    manager = new FeedbackManager();
  });

  describe('constructor', () => {
    it('should create manager with default max messages', () => {
      const defaultManager = new FeedbackManager();

      expect(defaultManager.getMessages().length).toBe(0);
    });

    it('should create manager with custom max messages', () => {
      const customManager = new FeedbackManager(50);

      expect(customManager.getMessages().length).toBe(0);
    });
  });

  describe('addEvent', () => {
    it('should add messages from event', () => {
      const event: CombatFeedbackEvent = {
        messages: [
          {
            id: 'msg1',
            type: FeedbackType.ATTACK_HIT,
            text: 'Hit message',
            priority: 5,
            relatedEntities: {},
            timestamp: 1000,
          },
          {
            id: 'msg2',
            type: FeedbackType.DAMAGE_DEALT,
            text: 'Damage message',
            priority: 5,
            relatedEntities: {},
            timestamp: 1000,
          },
        ],
        visuals: [],
        sounds: [],
      };

      manager.addEvent(event);

      expect(manager.getMessages().length).toBe(2);
    });

    it('should not add visuals or sounds to queue', () => {
      const event: CombatFeedbackEvent = {
        messages: [
          {
            id: 'msg1',
            type: FeedbackType.ATTACK_HIT,
            text: 'Hit',
            priority: 5,
            relatedEntities: {},
            timestamp: 1000,
          },
        ],
        visuals: [
          {
            effect: VisualEffect.HIT_SPARK,
            position: { x: 0, y: 0, z: 0 },
            duration: 200,
          },
        ],
        sounds: [
          {
            sound: SoundEffect.MELEE_HIT,
            volume: 0.8,
          },
        ],
      };

      manager.addEvent(event);

      // Only messages should be added
      expect(manager.getMessages().length).toBe(1);
    });

    it('should enforce max messages limit', () => {
      const smallManager = new FeedbackManager(5);

      // Add 10 messages
      for (let i = 0; i < 10; i++) {
        smallManager.addEvent({
          messages: [
            {
              id: `msg${i}`,
              type: FeedbackType.COMBAT_MESSAGE,
              text: `Message ${i}`,
              priority: 1,
              relatedEntities: {},
              timestamp: 1000 + i,
            },
          ],
          visuals: [],
          sounds: [],
        });
      }

      // Should only keep last 5
      expect(smallManager.getMessages().length).toBe(5);

      // First message should be from index 5
      expect(smallManager.getMessages()[0].id).toBe('msg5');
    });
  });

  describe('getMessages', () => {
    it('should return copy of message queue', () => {
      const event: CombatFeedbackEvent = {
        messages: [
          {
            id: 'msg1',
            type: FeedbackType.ATTACK_HIT,
            text: 'Hit',
            priority: 5,
            relatedEntities: {},
            timestamp: 1000,
          },
        ],
        visuals: [],
        sounds: [],
      };

      manager.addEvent(event);
      const messages = manager.getMessages();

      expect(messages.length).toBe(1);

      // Modifying returned array should not affect manager
      messages.push({
        id: 'msg2',
        type: FeedbackType.COMBAT_MESSAGE,
        text: 'New',
        priority: 1,
        relatedEntities: {},
        timestamp: 1001,
      });

      expect(manager.getMessages().length).toBe(1);
    });
  });

  describe('getPriorityMessages', () => {
    it('should return messages above default priority threshold', () => {
      // Add messages with different priorities
      manager.addEvent({
        messages: [
          {
            id: 'msg1',
            type: FeedbackType.ATTACK_HIT,
            text: 'Low priority',
            priority: 3,
            relatedEntities: {},
            timestamp: 1000,
          },
        ],
        visuals: [],
        sounds: [],
      });

      manager.addEvent({
        messages: [
          {
            id: 'msg2',
            type: FeedbackType.ATTACK_CRITICAL,
            text: 'High priority',
            priority: 8,
            relatedEntities: {},
            timestamp: 1000,
          },
        ],
        visuals: [],
        sounds: [],
      });

      const priorityMessages = manager.getPriorityMessages();

      expect(priorityMessages.length).toBe(1);
      expect(priorityMessages[0].priority).toBeGreaterThanOrEqual(5);
    });

    it('should return messages above custom priority threshold', () => {
      manager.addEvent({
        messages: [
          {
            id: 'msg1',
            type: FeedbackType.ATTACK_HIT,
            text: 'Medium priority',
            priority: 6,
            relatedEntities: {},
            timestamp: 1000,
          },
        ],
        visuals: [],
        sounds: [],
      });

      manager.addEvent({
        messages: [
          {
            id: 'msg2',
            type: FeedbackType.KILL_BLOW,
            text: 'Highest priority',
            priority: 10,
            relatedEntities: {},
            timestamp: 1000,
          },
        ],
        visuals: [],
        sounds: [],
      });

      const priorityMessages = manager.getPriorityMessages(8);

      expect(priorityMessages.length).toBe(1);
      expect(priorityMessages[0].priority).toBe(10);
    });
  });

  describe('clear', () => {
    it('should clear all messages', () => {
      manager.addEvent({
        messages: [
          {
            id: 'msg1',
            type: FeedbackType.ATTACK_HIT,
            text: 'Hit',
            priority: 5,
            relatedEntities: {},
            timestamp: 1000,
          },
        ],
        visuals: [],
        sounds: [],
      });

      expect(manager.getMessages().length).toBe(1);

      manager.clear();

      expect(manager.getMessages().length).toBe(0);
    });
  });

  describe('getRecentMessages', () => {
    it('should return recent messages', () => {
      // Add 5 messages
      for (let i = 0; i < 5; i++) {
        manager.addEvent({
          messages: [
            {
              id: `msg${i}`,
              type: FeedbackType.COMBAT_MESSAGE,
              text: `Message ${i}`,
              priority: 1,
              relatedEntities: {},
              timestamp: 1000 + i,
            },
          ],
          visuals: [],
          sounds: [],
        });
      }

      const recent = manager.getRecentMessages(3);

      expect(recent.length).toBe(3);
      expect(recent[0].id).toBe('msg2');
      expect(recent[1].id).toBe('msg3');
      expect(recent[2].id).toBe('msg4');
    });

    it('should return all messages if count exceeds queue size', () => {
      manager.addEvent({
        messages: [
          {
            id: 'msg1',
            type: FeedbackType.COMBAT_MESSAGE,
            text: 'Only message',
            priority: 1,
            relatedEntities: {},
            timestamp: 1000,
          },
        ],
        visuals: [],
        sounds: [],
      });

      const recent = manager.getRecentMessages(10);

      expect(recent.length).toBe(1);
    });
  });
});
