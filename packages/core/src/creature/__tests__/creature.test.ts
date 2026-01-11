/**
 * Creature 系统测试
 *
 * 测试生物基类和玩家角色
 */

import { describe, it, expect } from 'vitest';
import { Creature } from '../Creature';
import { Avatar } from '../Avatar';
import { Tripoint } from '../../coordinates/Tripoint';
import { BodyPartId, CreatureType, CreatureSize } from '../types';
import { GameMap } from '../../map/GameMap';

describe('Creature System', () => {
  describe('Avatar - 玩家角色', () => {
    it('should create avatar with basic properties', () => {
      const position = new Tripoint({ x: 5, y: 5, z: 0 });
      const avatar = new Avatar('player1', position, 'Alice', {
        str: 10,
        dex: 12,
        int: 14,
        per: 11,
      });

      expect(avatar.id).toBe('player1');
      expect(avatar.name).toBe('Alice');
      expect(avatar.position).toBe(position);
      expect(avatar.size).toBe(CreatureSize.MEDIUM);
      expect(avatar.stats.str).toBe(10);
      expect(avatar.stats.dex).toBe(12);
      expect(avatar.stats.int).toBe(14);
      expect(avatar.stats.per).toBe(11);
    });

    it('should have default stats if not provided', () => {
      const position = new Tripoint({ x: 0, y: 0, z: 0 });
      const avatar = new Avatar('player1', position, 'Bob');

      expect(avatar.stats.str).toBe(8);
      expect(avatar.stats.dex).toBe(8);
      expect(avatar.stats.int).toBe(8);
      expect(avatar.stats.per).toBe(8);
    });

    it('should correctly identify as avatar', () => {
      const avatar = new Avatar('player1', new Tripoint({ x: 0, y: 0, z: 0 }), 'Test');

      expect(avatar.isAvatar()).toBe(true);
      expect(avatar.isMonster()).toBe(false);
      expect(avatar.isNPC()).toBe(false);
      expect(avatar.getType()).toBe(CreatureType.AVATAR);
    });

    it('should have body parts with HP', () => {
      const avatar = new Avatar('player1', new Tripoint({ x: 0, y: 0, z: 0 }), 'Test');

      // 检查躯干
      const torsoHP = avatar.getHP(BodyPartId.TORSO);
      const torsoMaxHP = avatar.getHPMax(BodyPartId.TORSO);
      expect(torsoHP).toBe(80);
      expect(torsoMaxHP).toBe(80);

      // 检查头部
      const headHP = avatar.getHP(BodyPartId.HEAD);
      expect(headHP).toBe(60);

      // 检查左臂
      const leftArmHP = avatar.getHP(BodyPartId.ARM_L);
      expect(leftArmHP).toBe(50);
    });

    it('should return undefined for non-existent body part', () => {
      const avatar = new Avatar('player1', new Tripoint({ x: 0, y: 0, z: 0 }), 'Test');

      // 注意：BodyPartId 是枚举，所有值都应该存在
      // 但如果是数字 999 这种无效值，应该返回 undefined
      const invalidHP = avatar.getHP(999 as BodyPartId);
      expect(invalidHP).toBeUndefined();
    });

    it('should not be dead initially', () => {
      const avatar = new Avatar('player1', new Tripoint({ x: 0, y: 0, z: 0 }), 'Test');

      expect(avatar.isDead()).toBe(false);
      expect(avatar.isDowned()).toBe(false);
    });

    it('should be dead when head HP is 0', () => {
      const avatar = new Avatar('player1', new Tripoint({ x: 0, y: 0, z: 0 }), 'Test');

      avatar.takeDamage(BodyPartId.HEAD, 100);

      expect(avatar.isDead()).toBe(true);
    });

    it('should be dead when torso HP is 0', () => {
      const avatar = new Avatar('player1', new Tripoint({ x: 0, y: 0, z: 0 }), 'Test');

      avatar.takeDamage(BodyPartId.TORSO, 100);

      expect(avatar.isDead()).toBe(true);
    });

    it('should be downed when both legs are destroyed', () => {
      const avatar = new Avatar('player1', new Tripoint({ x: 0, y: 0, z: 0 }), 'Test');

      avatar.takeDamage(BodyPartId.LEG_L, 100);
      avatar.takeDamage(BodyPartId.LEG_R, 100);

      expect(avatar.isDowned()).toBe(true);
    });

    it('should not be downed when only one leg is destroyed', () => {
      const avatar = new Avatar('player1', new Tripoint({ x: 0, y: 0, z: 0 }), 'Test');

      avatar.takeDamage(BodyPartId.LEG_L, 100);

      expect(avatar.isDowned()).toBe(false);
    });

    it('should take damage correctly', () => {
      const avatar = new Avatar('player1', new Tripoint({ x: 0, y: 0, z: 0 }), 'Test');

      const initialHP = avatar.getHP(BodyPartId.ARM_L);
      expect(initialHP).toBe(50);

      const stillAlive = avatar.takeDamage(BodyPartId.ARM_L, 20);
      expect(stillAlive).toBe(true);

      const newHP = avatar.getHP(BodyPartId.ARM_L);
      expect(newHP).toBe(30);
    });

    it('should heal correctly', () => {
      const avatar = new Avatar('player1', new Tripoint({ x: 0, y: 0, z: 0 }), 'Test');

      avatar.takeDamage(BodyPartId.ARM_L, 30);
      expect(avatar.getHP(BodyPartId.ARM_L)).toBe(20);

      avatar.heal(BodyPartId.ARM_L, 15);
      expect(avatar.getHP(BodyPartId.ARM_L)).toBe(35);

      // 治疗不应该超过最大值
      avatar.heal(BodyPartId.ARM_L, 100);
      expect(avatar.getHP(BodyPartId.ARM_L)).toBe(50); // max HP
    });

    it('should calculate weight correctly', () => {
      const avatar = new Avatar('player1', new Tripoint({ x: 0, y: 0, z: 0 }), 'Test');

      const weight = avatar.getWeight();
      expect(weight).toBe(70000); // 70kg in grams
    });

    it('should get health status', () => {
      const avatar = new Avatar('player1', new Tripoint({ x: 0, y: 0, z: 0 }), 'Test');

      // 初始状态应该健康
      expect(avatar.getHealthStatus()).toBe('健康');

      // 对多个部位造成伤害
      // 总HP ≈ 590，造成约100点伤害
      avatar.takeDamage(BodyPartId.TORSO, 50);  // 躯干 80 -> 30
      avatar.takeDamage(BodyPartId.HEAD, 30);   // 头部 60 -> 30
      avatar.takeDamage(BodyPartId.ARM_L, 20);  // 左臂 50 -> 30
      expect(avatar.getHealthStatus()).toBe('轻微受伤');

      // 造成更多伤害，总共约200点伤害
      avatar.takeDamage(BodyPartId.ARM_R, 50);  // 右臂 50 -> 0
      avatar.takeDamage(BodyPartId.LEG_L, 50);  // 左腿 60 -> 10
      avatar.takeDamage(BodyPartId.LEG_R, 50);  // 右腿 60 -> 10
      expect(avatar.getHealthStatus()).toBe('中度受伤');
    });

    it('should get description', () => {
      const position = new Tripoint({ x: 10, y: 20, z: 5 });
      const avatar = new Avatar('player1', position, 'Test');

      const description = avatar.getDescription();
      expect(description).toContain('Test');
      expect(description).toContain('健康');
      expect(description).toContain('(10, 20, 5)');
    });
  });

  describe('Creature Base Class', () => {
    it('should check position equality', () => {
      const pos1 = new Tripoint({ x: 5, y: 5, z: 0 });
      const pos2 = new Tripoint({ x: 5, y: 5, z: 0 });
      const pos3 = new Tripoint({ x: 6, y: 5, z: 0 });

      const avatar = new Avatar('player1', pos1, 'Test');

      expect(avatar.atSamePosition(pos2)).toBe(true);
      expect(avatar.atSamePosition(pos3)).toBe(false);
    });

    it('should check position equality with another creature', () => {
      const pos = new Tripoint({ x: 5, y: 5, z: 0 });
      const avatar1 = new Avatar('player1', pos, 'Test1');
      const avatar2 = new Avatar('player2', pos, 'Test2');

      expect(avatar1.atSamePosition(avatar2)).toBe(true);
    });

    it('should move to new position', () => {
      const oldPos = new Tripoint({ x: 5, y: 5, z: 0 });
      const newPos = new Tripoint({ x: 6, y: 5, z: 0 });
      const avatar = new Avatar('player1', oldPos, 'Test');

      avatar.moveTo(newPos);

      expect(avatar.position).toBe(newPos);
    });
  });

  describe('GameMap Integration', () => {
    it('should add creature to map', () => {
      const map = new GameMap();
      const position = new Tripoint({ x: 5, y: 5, z: 0 });
      const avatar = new Avatar('player1', position, 'Alice');

      const newMap = map.addCreature(avatar);

      expect(newMap.creatures.size).toBe(1);
      expect(newMap.getCreature('player1')).toBe(avatar);
    });

    it('should retrieve creature at position', () => {
      const map = new GameMap();
      const position = new Tripoint({ x: 10, y: 10, z: 0 });
      const avatar = new Avatar('player1', position, 'Alice');

      const newMap = map.addCreature(avatar);

      const found = newMap.getCreatureAt(position);
      expect(found).toBe(avatar);
    });

    it('should return undefined for empty position', () => {
      const map = new GameMap();
      const position = new Tripoint({ x: 10, y: 10, z: 0 });

      const found = map.getCreatureAt(position);
      expect(found).toBeUndefined();
    });

    it('should remove creature from map', () => {
      const map = new GameMap();
      const avatar = new Avatar('player1', new Tripoint({ x: 0, y: 0, z: 0 }), 'Alice');

      const mapWithCreature = map.addCreature(avatar);
      expect(mapWithCreature.creatures.size).toBe(1);

      const mapWithoutCreature = mapWithCreature.removeCreature('player1');
      expect(mapWithoutCreature.creatures.size).toBe(0);
      expect(mapWithoutCreature.getCreature('player1')).toBeUndefined();
    });

    it('should get all creatures', () => {
      const map = new GameMap();

      const avatar1 = new Avatar('player1', new Tripoint({ x: 0, y: 0, z: 0 }), 'Alice');
      const avatar2 = new Avatar('player2', new Tripoint({ x: 10, y: 10, z: 0 }), 'Bob');

      const newMap = map.addCreature(avatar1).addCreature(avatar2);

      const allCreatures = newMap.getAllCreatures();
      expect(allCreatures.length).toBe(2);
      expect(allCreatures).toContain(avatar1);
      expect(allCreatures).toContain(avatar2);
    });

    it('should get creatures in range', () => {
      const map = new GameMap();
      const center = new Tripoint({ x: 10, y: 10, z: 0 });

      const avatar1 = new Avatar('player1', center, 'Alice');
      const avatar2 = new Avatar('player2', new Tripoint({ x: 12, y: 10, z: 0 }), 'Bob'); // distance 2
      const avatar3 = new Avatar('player3', new Tripoint({ x: 20, y: 10, z: 0 }), 'Charlie'); // distance 10

      const newMap = map.addCreature(avatar1).addCreature(avatar2).addCreature(avatar3);

      const inRange = newMap.getCreaturesInRange(center, 5);
      expect(inRange.length).toBe(2);
      expect(inRange).toContain(avatar1);
      expect(inRange).toContain(avatar2);
      expect(inRange).not.toContain(avatar3);
    });

    it('should update creature position', () => {
      const map = new GameMap();
      const oldPos = new Tripoint({ x: 5, y: 5, z: 0 });
      const newPos = new Tripoint({ x: 6, y: 5, z: 0 });
      const avatar = new Avatar('player1', oldPos, 'Alice');

      const mapWithCreature = map.addCreature(avatar);
      expect(mapWithCreature.getCreatureAt(oldPos)).toBe(avatar);
      expect(mapWithCreature.getCreatureAt(newPos)).toBeUndefined();

      const mapWithNewPos = mapWithCreature.updateCreaturePosition('player1', newPos);
      expect(mapWithNewPos.getCreatureAt(oldPos)).toBeUndefined();
      expect(mapWithNewPos.getCreatureAt(newPos)).toBe(avatar);
    });

    it('should preserve immutability when updating', () => {
      const map = new GameMap();
      const position = new Tripoint({ x: 5, y: 5, z: 0 });
      const avatar = new Avatar('player1', position, 'Alice');

      const newMap = map.addCreature(avatar);

      // 原地图应该没有被修改
      expect(map.creatures.size).toBe(0);
      expect(newMap.creatures.size).toBe(1);
    });
  });
});
