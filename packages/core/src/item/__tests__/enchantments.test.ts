/**
 * enchantments 测试
 *
 * 测试物品附魔和变体系统的各种功能
 */

import { describe, it, expect } from 'vitest';
import { List, Map, Set } from 'immutable';
import { Item } from '../Item';
import { ItemType } from '../ItemType';
import { ItemContents } from '../ItemContents';
import {
  EnchantmentType,
  VariantType,
  EnchantmentManager,
  VariantManager,
  fireEnchantment,
  frostEnchantment,
  speedEnchantment,
  nightVisionEnchantment,
  steelMaterialVariant,
  leatherMaterialVariant,
  silverMaterialVariant,
  damagedConditionVariant,
  wornConditionVariant,
  highQualityVariant,
  superiorQualityVariant,
  createEnchantment,
  createVariant,
  enchantItem,
  type Enchantment,
  type EnchantmentEffect,
  type ItemVariant,
  type VariantOverride,
} from '../enchantments';
import { createItemTypeId, type ItemFlagType } from '../types';

// Helper function to create a test item
function createTestItem(props: {
  id: string;
  name?: string;
  damage?: number;
}): Item {
  const itemType = new ItemType({
    id: createItemTypeId(props.id),
    name: props.name || props.id,
    description: 'Test item',
    stackable: false,
    stackSize: 1,
    category: 'misc' as any,
    weight: 1 as any,
    volume: 1 as any,
    material: ['steel' as any],
    symbol: '?',
    color: 'white',
  });

  const item = new Item({
    type: itemType,
    charges: 0,
    damage: props.damage ?? 0,
    contents: new ItemContents(),
  });

  // Mock item methods
  (item as any).isDamaged = () => (item.damage ?? 0) > 0;
  (item as any).isBroken = () => (item.damage ?? 0) >= 4000;

  // Add setItemVar mock
  (item as any).setItemVar = function(key: string, value: any) {
    const newVars = this.itemVars.set(key, value);
    return this.set('itemVars', newVars);
  };

  return item as Item;
}

describe('enchantments - EnchantmentType', () => {
  it('should have all expected enchantment types', () => {
    expect(EnchantmentType.STAT_BOOST).toBe('STAT_BOOST');
    expect(EnchantmentType.STAT_PENALTY).toBe('STAT_PENALTY');
    expect(EnchantmentType.DAMAGE_BOOST).toBe('DAMAGE_BOOST');
    expect(EnchantmentType.ARMOR_BOOST).toBe('ARMOR_BOOST');
    expect(EnchantmentType.FIRE_RESIST).toBe('FIRE_RESIST');
    expect(EnchantmentType.NIGHT_VISION).toBe('NIGHT_VISION');
  });
});

describe('enchantments - VariantType', () => {
  it('should have all expected variant types', () => {
    expect(VariantType.MATERIAL).toBe('MATERIAL');
    expect(VariantType.COLOR).toBe('COLOR');
    expect(VariantType.STYLE).toBe('STYLE');
    expect(VariantType.QUALITY).toBe('QUALITY');
    expect(VariantType.SIZE).toBe('SIZE');
    expect(VariantType.CONDITION).toBe('CONDITION');
  });
});

describe('enchantments - 内置附魔定义', () => {
  describe('fireEnchantment', () => {
    it('should have correct properties', () => {
      expect(fireEnchantment.id).toBe('fire_enchantment');
      expect(fireEnchantment.name).toBe('火焰附魔');
      expect(fireEnchantment.intensity).toBe(1);
      expect(fireEnchantment.effects.size).toBe(2);
    });

    it('should have damage boost effect', () => {
      const damageEffect = fireEnchantment.effects.find(e => e.type === EnchantmentType.DAMAGE_BOOST);
      expect(damageEffect).toBeDefined();
      expect(damageEffect?.value).toBe(5);
      expect(damageEffect?.message).toBe('火焰伤害 +5');
    });

    it('should have fire resist effect', () => {
      const resistEffect = fireEnchantment.effects.find(e => e.type === EnchantmentType.FIRE_RESIST);
      expect(resistEffect).toBeDefined();
      expect(resistEffect?.value).toBe(1);
    });

    it('should add FIRE flag', () => {
      expect(fireEnchantment.addedFlags).toBeDefined();
      expect(fireEnchantment.addedFlags!.has('FIRE' as ItemFlagType)).toBe(true);
    });
  });

  describe('frostEnchantment', () => {
    it('should have correct properties', () => {
      expect(frostEnchantment.id).toBe('frost_enchantment');
      expect(frostEnchantment.name).toBe('冰霜附魔');
      expect(frostEnchantment.intensity).toBe(1);
    });

    it('should have cold resist effect', () => {
      const resistEffect = frostEnchantment.effects.find(e => e.type === EnchantmentType.COLD_RESIST);
      expect(resistEffect).toBeDefined();
    });

    it('should add FROST flag', () => {
      expect(frostEnchantment.addedFlags!.has('FROST' as ItemFlagType)).toBe(true);
    });
  });

  describe('speedEnchantment', () => {
    it('should have speed and accuracy boost', () => {
      const speedEffect = speedEnchantment.effects.find(e => e.type === EnchantmentType.SPEED_BOOST);
      const accuracyEffect = speedEnchantment.effects.find(e => e.type === EnchantmentType.ACCURACY_BOOST);

      expect(speedEffect?.value).toBe(10);
      expect(accuracyEffect?.value).toBe(5);
    });
  });

  describe('nightVisionEnchantment', () => {
    it('should have permanent night vision effect', () => {
      const nightVisionEffect = nightVisionEnchantment.effects.find(e => e.type === EnchantmentType.NIGHT_VISION);

      expect(nightVisionEffect).toBeDefined();
      expect(nightVisionEffect?.permanent).toBe(true);
    });
  });
});

describe('enchantments - 内置变体定义', () => {
  describe('material variants', () => {
    it('steelMaterialVariant should increase weight and armor', () => {
      expect(steelMaterialVariant.id).toBe('steel_material');
      expect(steelMaterialVariant.overrides.weightMod).toBe(1.1);
      expect(steelMaterialVariant.overrides.armorMod).toBe(1.2);
    });

    it('leatherMaterialVariant should decrease weight and armor', () => {
      expect(leatherMaterialVariant.id).toBe('leather_material');
      expect(leatherMaterialVariant.overrides.weightMod).toBe(0.8);
      expect(leatherMaterialVariant.overrides.armorMod).toBe(0.8);
    });

    it('silverMaterialVariant should add damage and SILVER flag', () => {
      expect(silverMaterialVariant.overrides.damageMod).toBe(1.5);
      expect(silverMaterialVariant.overrides.addFlags).toBeDefined();
      expect(silverMaterialVariant.overrides.addFlags!.has('SILVER' as ItemFlagType)).toBe(true);
    });
  });

  describe('condition variants', () => {
    it('damagedConditionVariant should have condition', () => {
      expect(damagedConditionVariant.type).toBe(VariantType.CONDITION);
      expect(damagedConditionVariant.condition).toBeDefined();
    });

    it('damagedConditionVariant condition should check item damage', () => {
      const damagedItem = createTestItem({ id: 'sword', damage: 100 });
      const brokenItem = createTestItem({ id: 'sword', damage: 4000 });
      const newItem = createTestItem({ id: 'sword', damage: 0 });

      expect(damagedConditionVariant.condition!(damagedItem)).toBe(true);
      expect(damagedConditionVariant.condition!(brokenItem)).toBe(false);
      expect(damagedConditionVariant.condition!(newItem)).toBe(false);
    });

    it('wornConditionVariant should check for damage > 1000', () => {
      const wornItem = createTestItem({ id: 'armor', damage: 1500 });
      const goodItem = createTestItem({ id: 'armor', damage: 500 });

      expect(wornConditionVariant.condition!(wornItem)).toBe(true);
      expect(wornConditionVariant.condition!(goodItem)).toBe(false);
    });
  });

  describe('quality variants', () => {
    it('highQualityVariant should boost damage and armor', () => {
      expect(highQualityVariant.type).toBe(VariantType.QUALITY);
      expect(highQualityVariant.overrides.damageMod).toBe(0.2);
      expect(highQualityVariant.overrides.armorMod).toBe(1.1);
    });

    it('superiorQualityVariant should have higher bonuses', () => {
      expect(superiorQualityVariant.overrides.damageMod).toBe(0.5);
      expect(superiorQualityVariant.overrides.armorMod).toBe(1.3);
      expect(superiorQualityVariant.overrides.priceMod).toBe(5.0);
    });
  });
});

describe('enchantments - EnchantmentManager', () => {
  describe('create', () => {
    it('should create empty manager', () => {
      const manager = EnchantmentManager.create();

      expect(manager.getEnchantments().size).toBe(0);
    });
  });

  describe('addEnchantment', () => {
    it('should add enchantment to manager', () => {
      const manager = EnchantmentManager.create();
      const newManager = manager.addEnchantment(fireEnchantment);

      expect(newManager.getEnchantments().size).toBe(1);
      expect(newManager.getEnchantments().get(0)?.id).toBe('fire_enchantment');
    });

    it('should return new manager (immutable)', () => {
      const manager = EnchantmentManager.create();
      const newManager = manager.addEnchantment(fireEnchantment);

      expect(manager.getEnchantments().size).toBe(0);
      expect(newManager.getEnchantments().size).toBe(1);
    });

    it('should add multiple enchantments', () => {
      let manager = EnchantmentManager.create();
      manager = manager.addEnchantment(fireEnchantment);
      manager = manager.addEnchantment(frostEnchantment);

      expect(manager.getEnchantments().size).toBe(2);
    });
  });

  describe('removeEnchantment', () => {
    it('should remove enchantment by id', () => {
      let manager = EnchantmentManager.create();
      manager = manager.addEnchantment(fireEnchantment);
      manager = manager.addEnchantment(frostEnchantment);

      const newManager = manager.removeEnchantment('fire_enchantment');

      expect(newManager.getEnchantments().size).toBe(1);
      expect(newManager.getEnchantments().get(0)?.id).toBe('frost_enchantment');
    });

    it('should return unchanged manager if enchantment not found', () => {
      let manager = EnchantmentManager.create();
      manager = manager.addEnchantment(fireEnchantment);

      const newManager = manager.removeEnchantment('non_existent');

      expect(newManager.getEnchantments().size).toBe(1);
    });
  });

  describe('getEnchantmentsByType', () => {
    it('should get enchantments by type', () => {
      let manager = EnchantmentManager.create();
      manager = manager.addEnchantment(fireEnchantment);
      manager = manager.addEnchantment(frostEnchantment);
      manager = manager.addEnchantment(speedEnchantment);

      const damageBoostEnchants = manager.getEnchantmentsByType(EnchantmentType.DAMAGE_BOOST);

      expect(damageBoostEnchant.size).toBe(2);
    });
  });

  describe('hasEnchantmentType', () => {
    it('should return true when enchantment type exists', () => {
      let manager = EnchantmentManager.create();
      manager = manager.addEnchantment(fireEnchantment);

      expect(manager.hasEnchantmentType(EnchantmentType.DAMAGE_BOOST)).toBe(true);
      expect(manager.hasEnchantmentType(EnchantmentType.FIRE_RESIST)).toBe(true);
    });

    it('should return false when enchantment type does not exist', () => {
      const manager = EnchantmentManager.create();

      expect(manager.hasEnchantmentType(EnchantmentType.DAMAGE_BOOST)).toBe(false);
    });
  });

  describe('getStatBonus', () => {
    it('should calculate stat bonus from enchantments', () => {
      const enchantment: Enchantment = {
        id: 'str_boost',
        name: 'Strength Boost',
        effects: List([
          { type: EnchantmentType.STAT_BOOST, id: 'strength', value: 5 },
          { type: EnchantmentType.STAT_BOOST, id: 'dexterity', value: 3 },
        ]),
      };

      const manager = EnchantmentManager.create().addEnchantment(enchantment);

      expect(manager.getStatBonus('strength')).toBe(5);
      expect(manager.getStatBonus('dexterity')).toBe(3);
      expect(manager.getStatBonus('intelligence')).toBe(0);
    });

    it('should include penalties in calculation', () => {
      const enchantment: Enchantment = {
        id: 'mixed',
        name: 'Mixed',
        effects: List([
          { type: EnchantmentType.STAT_BOOST, id: 'strength', value: 5 },
          { type: EnchantmentType.STAT_PENALTY, id: 'strength', value: -2 },
        ]),
      };

      const manager = EnchantmentManager.create().addEnchantment(enchantment);

      expect(manager.getStatBonus('strength')).toBe(3); // 5 + (-2)
    });
  });

  describe('getDamageBonus', () => {
    it('should calculate damage bonus', () => {
      const enchantment: Enchantment = {
        id: 'damage_boost',
        name: 'Damage Boost',
        effects: List([
          { type: EnchantmentType.DAMAGE_BOOST, value: 10 },
        ]),
      };

      const manager = EnchantmentManager.create().addEnchantment(enchantment);

      expect(manager.getDamageBonus()).toBe(10);
    });

    it('should include penalties', () => {
      const enchantment: Enchantment = {
        id: 'cursed',
        name: 'Cursed',
        effects: List([
          { type: EnchantmentType.DAMAGE_BOOST, value: 5 },
          { type: EnchantmentType.DAMAGE_PENALTY, value: -3 },
        ]),
      };

      const manager = EnchantmentManager.create().addEnchantment(enchantment);

      expect(manager.getDamageBonus()).toBe(2); // 5 + (-3)
    });
  });

  describe('getArmorBonus', () => {
    it('should calculate armor bonus', () => {
      const enchantment: Enchantment = {
        id: 'armor_boost',
        name: 'Armor Boost',
        effects: List([
          { type: EnchantmentType.ARMOR_BOOST, value: 5 },
        ]),
      };

      const manager = EnchantmentManager.create().addEnchantment(enchantment);

      expect(manager.getArmorBonus()).toBe(5);
    });
  });

  describe('getSpeedBonus', () => {
    it('should calculate speed bonus', () => {
      const manager = EnchantmentManager.create().addEnchantment(speedEnchantment);

      expect(manager.getSpeedBonus()).toBe(10);
    });
  });

  describe('hasResistance', () => {
    it('should return true for fire resistance', () => {
      const manager = EnchantmentManager.create().addEnchantment(fireEnchantment);

      expect(manager.hasResistance('fire')).toBe(true);
      expect(manager.hasResistance('cold')).toBe(false);
    });

    it('should return true for cold resistance', () => {
      const manager = EnchantmentManager.create().addEnchantment(frostEnchantment);

      expect(manager.hasResistance('cold')).toBe(true);
    });

    it('should return false for unknown resistance', () => {
      const manager = EnchantmentManager.create();

      expect(manager.hasResistance('unknown')).toBe(false);
    });
  });

  describe('getAddedFlags', () => {
    it('should return all added flags', () => {
      const manager = EnchantmentManager.create()
        .addEnchantment(fireEnchantment)
        .addEnchantment(frostEnchantment);

      const flags = manager.getAddedFlags();

      expect(flags.has('FIRE' as ItemFlagType)).toBe(true);
      expect(flags.has('FROST' as ItemFlagType)).toBe(true);
    });

    it('should return empty set when no flags added', () => {
      const manager = EnchantmentManager.create();

      expect(manager.getAddedFlags().size).toBe(0);
    });
  });

  describe('toJson and fromJson', () => {
    it('should serialize and deserialize enchantments', () => {
      const manager = EnchantmentManager.create().addEnchantment(fireEnchantment);

      const json = manager.toJson();
      const restored = EnchantmentManager.fromJson(json);

      expect(restored.getEnchantments().size).toBe(1);
      expect(restored.getEnchantments().get(0)?.id).toBe('fire_enchantment');
    });

    it('should serialize multiple enchantments', () => {
      let manager = EnchantmentManager.create();
      manager = manager.addEnchantment(fireEnchantment);
      manager = manager.addEnchantment(speedEnchantment);

      const json = manager.toJson();
      const restored = EnchantmentManager.fromJson(json);

      expect(restored.getEnchantments().size).toBe(2);
    });
  });
});

describe('enchantments - VariantManager', () => {
  describe('create', () => {
    it('should create empty manager', () => {
      const manager = VariantManager.create();

      // Cannot directly access variants, but we can test behavior
      expect(manager.getVariant('test' as any)).toBeUndefined();
    });
  });

  describe('registerVariant', () => {
    it('should register variant', () => {
      const variant: ItemVariant = {
        id: 'test_variant' as any,
        type: VariantType.MATERIAL,
        name: 'Test',
        baseItemId: 'base_item' as any,
        overrides: {},
      };

      const manager = VariantManager.create().registerVariant(variant);

      expect(manager.getVariant('test_variant' as any)).toBeDefined();
    });
  });

  describe('getVariantsForItem', () => {
    it('should get all variants for base item', () => {
      let manager = VariantManager.create();

      const variant1: ItemVariant = {
        id: 'variant1' as any,
        type: VariantType.MATERIAL,
        name: 'Variant 1',
        baseItemId: 'sword' as any,
        overrides: {},
      };

      const variant2: ItemVariant = {
        id: 'variant2' as any,
        type: VariantType.COLOR,
        name: 'Variant 2',
        baseItemId: 'sword' as any,
        overrides: {},
      };

      const otherVariant: ItemVariant = {
        id: 'other' as any,
        type: VariantType.MATERIAL,
        name: 'Other',
        baseItemId: 'armor' as any,
        overrides: {},
      };

      manager = manager.registerVariant(variant1);
      manager = manager.registerVariant(variant2);
      manager = manager.registerVariant(otherVariant);

      const swordVariants = manager.getVariantsForItem('sword' as any);

      expect(swordVariants.length).toBe(2);
    });
  });

  describe('checkVariantCondition', () => {
    it('should return true when no condition', () => {
      const variant: ItemVariant = {
        id: 'test' as any,
        type: VariantType.MATERIAL,
        name: 'Test',
        baseItemId: 'base' as any,
        overrides: {},
      };

      const manager = VariantManager.create();
      const item = createTestItem({ id: 'test_item' });

      expect(manager.checkVariantCondition(item, variant)).toBe(true);
    });

    it('should evaluate condition function', () => {
      const item = createTestItem({ id: 'sword', damage: 500 });

      const manager = VariantManager.create();

      // Worn condition requires damage > 1000
      expect(manager.checkVariantCondition(item, wornConditionVariant)).toBe(false);

      // Damaged condition should pass for damaged but not broken
      expect(manager.checkVariantCondition(item, damagedConditionVariant)).toBe(true);
    });
  });

  describe('applyVariant', () => {
    it('should apply variant enchantments to item', () => {
      const item = createTestItem({ id: 'sword' });

      const variant: ItemVariant = {
        id: 'enchanted_variant' as any,
        type: VariantType.QUALITY,
        name: 'Enchanted',
        baseItemId: 'sword' as any,
        overrides: {},
        enchantments: List([fireEnchantment]),
      };

      const manager = VariantManager.create();
      const result = manager.applyVariant(item, variant);

      // Should have enchantment flags set in itemVars
      expect(result.itemVars.get('enchantment_fire_enchantment')).toBe(true);
    });
  });
});

describe('enchantments - 工厂函数', () => {
  describe('createEnchantment', () => {
    it('should create enchantment with minimal params', () => {
      const enchantment = createEnchantment(
        'test_id',
        'Test Enchantment',
        [{ type: EnchantmentType.DAMAGE_BOOST, value: 5 }]
      );

      expect(enchantment.id).toBe('test_id');
      expect(enchantment.name).toBe('Test Enchantment');
      expect(enchantment.effects.size).toBe(1);
      expect(enchantment.intensity).toBe(1);
    });

    it('should create enchantment with all options', () => {
      const enchantment = createEnchantment(
        'full_id',
        'Full Enchantment',
        [{ type: EnchantmentType.ARMOR_BOOST, value: 10 }],
        {
          description: 'A fully specified enchantment',
          intensity: 3,
          addedFlags: new Set(['TEST' as ItemFlagType]),
          removedFlags: new Set(['REMOVE_ME' as ItemFlagType]),
        }
      );

      expect(enchantment.description).toBe('A fully specified enchantment');
      expect(enchantment.intensity).toBe(3);
      expect(enchantment.addedFlags!.has('TEST' as ItemFlagType)).toBe(true);
    });
  });

  describe('createVariant', () => {
    it('should create variant with minimal params', () => {
      const variant = createVariant(
        'test_variant',
        VariantType.MATERIAL,
        'Test Material',
        'base_item' as any,
        {}
      );

      expect(variant.id).toBe('test_variant');
      expect(variant.type).toBe(VariantType.MATERIAL);
      expect(variant.baseItemId).toBe('base_item');
    });

    it('should create variant with enchantments', () => {
      const variant = createVariant(
        'magic_variant',
        VariantType.QUALITY,
        'Magic',
        'base' as any,
        {},
        [fireEnchantment, frostEnchantment]
      );

      expect(variant.enchantments!.size).toBe(2);
    });
  });
});

describe('enchantments - enchantItem', () => {
  it('should enchant item and return manager', () => {
    const item = createTestItem({ id: 'sword' });

    const result = enchantItem(item, fireEnchantment);

    expect(result.item.itemVars.get('enchantment_fire_enchantment')).toBe(true);
    expect(result.item.itemVars.get('enchantment_fire_enchantment_intensity')).toBe(1);
    expect(result.manager.getEnchantments().size).toBe(1);
  });
});
