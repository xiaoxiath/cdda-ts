/**
 * EquipmentSlot 单元测试
 */

import { describe, it, expect } from 'vitest';
import { EquipmentSlot, EquipmentSlots, AllEquipmentSlots } from '../EquipmentSlot';
import { EquipmentSlotType, EquipmentLayer } from '../types';

describe('EquipmentSlot', () => {
  describe('factory methods', () => {
    it('should create head slot', () => {
      const slot = EquipmentSlot.head();

      expect(slot.type).toBe(EquipmentSlotType.HEAD);
      expect(slot.name).toBe('头部');
      expect(slot.capacity).toBe(1);
      expect(slot.validLayers.includes(EquipmentLayer.HEAD_LAYER)).toBe(true);
      expect(slot.validLayers.includes(EquipmentLayer.OUTER_LAYER)).toBe(true);
    });

    it('should create eyes slot', () => {
      const slot = EquipmentSlot.eyes();

      expect(slot.type).toBe(EquipmentSlotType.EYES);
      expect(slot.name).toBe('眼睛');
      expect(slot.capacity).toBe(1);
    });

    it('should create ears slot with capacity 2', () => {
      const slot = EquipmentSlot.ears();

      expect(slot.type).toBe(EquipmentSlotType.EARS);
      expect(slot.capacity).toBe(2);
    });

    it('should create finger slot with capacity 10', () => {
      const slot = EquipmentSlot.finger();

      expect(slot.type).toBe(EquipmentSlotType.FINGER);
      expect(slot.capacity).toBe(10);
    });

    it('should create torso slots with different layers', () => {
      const outer = EquipmentSlot.torsoOuter();
      const middle = EquipmentSlot.torsoMiddle();
      const inner = EquipmentSlot.torsoInner();

      expect(outer.type).toBe(EquipmentSlotType.TORSO_OUTER);
      expect(outer.validLayers.includes(EquipmentLayer.OUTER_LAYER)).toBe(true);

      expect(middle.type).toBe(EquipmentSlotType.TORSO_MIDDLE);
      expect(middle.validLayers.includes(EquipmentLayer.MID_LAYER)).toBe(true);

      expect(inner.type).toBe(EquipmentSlotType.TORSO_INNER);
      expect(inner.validLayers.includes(EquipmentLayer.BASE_LAYER)).toBe(true);
    });
  });

  describe('query methods', () => {
    it('should check valid layer', () => {
      const slot = EquipmentSlot.torsoOuter();

      expect(slot.isValidLayer(EquipmentLayer.OUTER_LAYER)).toBe(true);
      expect(slot.isValidLayer(EquipmentLayer.MID_LAYER)).toBe(false);
      expect(slot.isValidLayer(EquipmentLayer.BASE_LAYER)).toBe(false);
    });

    it('should check if full', () => {
      const slot = EquipmentSlot.head();

      expect(slot.isFull(0)).toBe(false);
      expect(slot.isFull(1)).toBe(true);
      expect(slot.isFull(2)).toBe(true);
    });

    it('should check unlimited capacity', () => {
      const slot = EquipmentSlot.create({
        id: 'test' as any,
        type: EquipmentSlotType.HEAD,
        name: 'Test',
        description: '',
        validLayers: [EquipmentLayer.HEAD_LAYER],
        capacity: 0,
        required: false,
      });

      expect(slot.isFull(0)).toBe(false);
      expect(slot.isFull(100)).toBe(false);
      expect(slot.isFull(1000)).toBe(false);
    });

    it('should get available capacity', () => {
      const slot = EquipmentSlot.head();

      expect(slot.getAvailableCapacity(0)).toBe(1);
      expect(slot.getAvailableCapacity(1)).toBe(0);
      expect(slot.getAvailableCapacity(2)).toBe(0);
    });

    it('should get unlimited available capacity', () => {
      const slot = EquipmentSlot.create({
        id: 'test' as any,
        type: EquipmentSlotType.HEAD,
        name: 'Test',
        description: '',
        validLayers: [EquipmentLayer.HEAD_LAYER],
        capacity: 0,
        required: false,
      });

      expect(slot.getAvailableCapacity(0)).toBe(Infinity);
      expect(slot.getAvailableCapacity(100)).toBe(Infinity);
    });
  });

  describe('display methods', () => {
    it('should get display name', () => {
      const slot = EquipmentSlot.head();

      expect(slot.getDisplayName()).toBe('头部 (1 个)');
    });

    it('should get unlimited capacity description', () => {
      const slot = EquipmentSlot.create({
        id: 'test' as any,
        type: EquipmentSlotType.HEAD,
        name: 'Test',
        description: '',
        validLayers: [EquipmentLayer.HEAD_LAYER],
        capacity: 0,
        required: false,
      });

      expect(slot.getDisplayName()).toBe('Test (无限)');
    });

    it('should get capacity description', () => {
      const slot = EquipmentSlot.head();

      expect(slot.getCapacityDescription()).toBe('1 个');
    });

    it('should get unlimited capacity description', () => {
      const slot = EquipmentSlot.create({
        id: 'test' as any,
        type: EquipmentSlotType.HEAD,
        name: 'Test',
        description: '',
        validLayers: [EquipmentLayer.HEAD_LAYER],
        capacity: 0,
        required: false,
      });

      expect(slot.getCapacityDescription()).toBe('无限');
    });
  });

  describe('serialization', () => {
    it('should convert to JSON and back', () => {
      const original = EquipmentSlot.head();

      const json = original.toJson();
      expect(json.id).toBeDefined();
      expect(json.type).toBe(EquipmentSlotType.HEAD);
      expect(json.name).toBe('头部');
      expect(json.capacity).toBe(1);

      const restored = EquipmentSlot.fromJson(json);
      expect(restored.id).toBe(original.id);
      expect(restored.type).toBe(original.type);
      expect(restored.name).toBe(original.name);
      expect(restored.capacity).toBe(original.capacity);
    });
  });

  describe('predefined slots', () => {
    it('should have all predefined slots', () => {
      expect(EquipmentSlots.HEAD).toBeDefined();
      expect(EquipmentSlots.EYES).toBeDefined();
      expect(EquipmentSlots.MOUTH).toBeDefined();
      expect(EquipmentSlots.EARS).toBeDefined();
      expect(EquipmentSlots.NECK).toBeDefined();
      expect(EquipmentSlots.TORSO_OUTER).toBeDefined();
      expect(EquipmentSlots.TORSO_MIDDLE).toBeDefined();
      expect(EquipmentSlots.TORSO_INNER).toBeDefined();
      expect(EquipmentSlots.HANDS).toBeDefined();
      expect(EquipmentSlots.FINGER).toBeDefined();
      expect(EquipmentSlots.WRIST).toBeDefined();
      expect(EquipmentSlots.LEGS).toBeDefined();
      expect(EquipmentSlots.FEET).toBeDefined();
      expect(EquipmentSlots.BACK).toBeDefined();
      expect(EquipmentSlots.WAIST).toBeDefined();
      expect(EquipmentSlots.HAND_PRIMARY).toBeDefined();
      expect(EquipmentSlots.HAND_SECONDARY).toBeDefined();
    });

    it('should have all slots in array', () => {
      expect(AllEquipmentSlots.length).toBe(17);
    });
  });
});
