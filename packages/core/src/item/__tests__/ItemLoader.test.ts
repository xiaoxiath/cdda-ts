/**
 * ItemLoader 测试
 *
 * 测试物品加载器的各种功能
 */

import { describe, it, expect } from 'vitest';
import { ItemLoader } from '../ItemLoader';
import { ItemFactory } from '../ItemFactory';
import { ItemCategory } from '../types';
import { createItemTypeId } from '../types';

// ============ 辅助函数 ============

function createBasicItemJson(overrides: any = {}): any {
  return {
    id: 'test_item',
    type: 'misc',
    name: 'Test Item',
    symbol: '?',
    color: 'white',
    weight: '100 g',
    volume: '250 ml',
    ...overrides,
  };
}

// ============ 基础解析测试 ============

describe('ItemLoader - 基础解析', () => {
  it('should parse basic item type', () => {
    const json = createBasicItemJson();
    const type = ItemLoader.parseItemType(json);

    expect(type).toBeDefined();
    expect(type?.id).toBe(createItemTypeId('test_item'));
    expect(type?.name).toBe('Test Item');
  });

  it('should parse item with category', () => {
    const json = createBasicItemJson({ type: 'FOOD' });
    const type = ItemLoader.parseItemType(json);

    expect(type?.category).toBe(ItemCategory.FOOD);
  });

  it('should parse item with weight and volume', () => {
    const json = createBasicItemJson({
      weight: '500 g',
      volume: '1 L',
    });
    const type = ItemLoader.parseItemType(json);

    expect(type?.weight).toBe(500);
    expect(type?.volume).toBe(1000);
  });

  it('should parse item with kg weight', () => {
    const json = createBasicItemJson({ weight: '2.5 kg' });
    const type = ItemLoader.parseItemType(json);

    expect(type?.weight).toBe(2500);
  });

  it('should parse item with mg weight', () => {
    const json = createBasicItemJson({ weight: '500 mg' });
    const type = ItemLoader.parseItemType(json);

    expect(type?.weight).toBe(0.5);
  });

  it('should parse item with materials', () => {
    const json = createBasicItemJson({
      material: ['steel', 'wood'],
    });
    const type = ItemLoader.parseItemType(json);

    expect(type?.material.length).toBe(2);
  });

  it('should parse item with flags', () => {
    const json = createBasicItemJson({
      flags: ['FIRE', 'TRADER_AVOID'],
    });
    const type = ItemLoader.parseItemType(json);

    expect(type?.flags.has('FIRE')).toBe(true);
    expect(type?.flags.has('TRADER_AVOID')).toBe(true);
  });

  it('should parse item with qualities', () => {
    const json = createBasicItemJson({
      qualities: { 'CUT': 1, 'HAMMER': 2 },
    });
    const type = ItemLoader.parseItemType(json);

    expect(type?.qualities.size).toBe(2);
  });

  it('should return null for invalid JSON', () => {
    const json = { invalid: 'data' };
    const type = ItemLoader.parseItemType(json);

    expect(type).toBeNull();
  });
});

// ============ 插槽解析测试 ============

describe('ItemLoader - 插槽解析', () => {
  describe('工具插槽', () => {
    it('should parse tool slot', () => {
      const json = createBasicItemJson({
        type: 'TOOL',
        maximum_charges: 100,
        ammo_capacity: 50,
      });
      const type = ItemLoader.parseItemType(json);

      expect(type?.category).toBe(ItemCategory.TOOL);
      expect(type?.tool?.maximumCharges).toBe(100);
    });
  });

  describe('消耗品插槽', () => {
    it('should parse comestible slot', () => {
      const json = createBasicItemJson({
        type: 'FOOD',
        calories: 100,
        quench: 10,
        fun: 5,
      });
      const type = ItemLoader.parseItemType(json);

      expect(type?.category).toBe(ItemCategory.FOOD);
      expect(type?.comestible?.calories).toBe(100);
      expect(type?.comestible?.quench).toBe(10);
    });
  });

  describe('护甲插槽', () => {
    it('should parse armor slot', () => {
      const json = createBasicItemJson({
        type: 'ARMOR',
        coverage: 90,
        encumbrance: 10,
        covers: ['TORSO', 'ARMS'],
      });
      const type = ItemLoader.parseItemType(json);

      expect(type?.category).toBe(ItemCategory.ARMOR);
      expect(type?.armor?.coverage).toBe(90);
      expect(type?.armor?.encumbrance).toBe(10);
    });
  });

  describe('枪械插槽', () => {
    it('should parse gun slot', () => {
      const json = createBasicItemJson({
        type: 'GUN',
        ammo: ['9mm'],
        range: 30,
        magazine_size: 12,
        skill: 'pistol',
      });
      const type = ItemLoader.parseItemType(json);

      expect(type?.category).toBe(ItemCategory.GUN);
      expect(type?.gun?.ammo?.length).toBe(1);
      expect(type?.gun?.range).toBe(30);
      expect(type?.gun?.magazineSize).toBe(12);
    });
  });

  describe('弹药插槽', () => {
    it('should parse ammo slot', () => {
      const json = createBasicItemJson({
        type: 'AMMO',
        ammo_type: '9mm',
        stack_size: 30,
      });
      const type = ItemLoader.parseItemType(json);

      expect(type?.category).toBe(ItemCategory.AMMO);
      expect(type?.ammo?.type).toBe(createItemTypeId('9mm'));
      expect(type?.ammo?.stackSize).toBe(30);
    });
  });

  describe('书籍插槽', () => {
    it('should parse book slot', () => {
      const json = createBasicItemJson({
        type: 'BOOK',
        skill: 'cooking',
        level: 3,
        required_level: 2,
        intelligence: 8,
      });
      const type = ItemLoader.parseItemType(json);

      expect(type?.category).toBe(ItemCategory.BOOK);
      expect(type?.book?.skill).toBe(createItemTypeId('cooking'));
      expect(type?.book?.level).toBe(3);
    });
  });

  describe('改装件插槽', () => {
    it('should parse mod slot', () => {
      const json = createBasicItemJson({
        type: 'GUNMOD',
        dispersion_modifier: -50,
        damage_modifier: 1,
      });
      const type = ItemLoader.parseItemType(json);

      expect(type?.category).toBe(ItemCategory.GUNMOD);
      expect(type?.mod?.dispersionModifier).toBe(-50);
      expect(type?.mod?.damageModifier).toBe(1);
    });
  });
});

// ============ copy-from 继承测试 ============

describe('ItemLoader - copy-from 继承', () => {
  it('should inherit basic properties', () => {
    const baseItem = createBasicItemJson({
      id: 'base_sword',
      type: 'WEAPON',
      name: 'Sword',
      weight: '1000 g',
      volume: '500 ml',
      symbol: '/',
      color: 'light_gray',
      to_hit: 2,
      cut: 10,
    });

    const derivedItem = {
      'copy-from': 'base_sword',
      id: 'steel_sword',
      name: 'Steel Sword',
      weight: '1200 g',
    };

    const factory = ItemLoader.fromJsonArray([baseItem, derivedItem]);

    expect(factory.hasType(createItemTypeId('steel_sword'))).toBe(true);

    const steelSword = factory.getType(createItemTypeId('steel_sword'));
    expect(steelSword).toBeDefined();
    expect(steelSword?.name).toBe('Steel Sword');
    expect(steelSword?.weight).toBe(1200); // overridden
    expect(steelSword?.volume).toBe(500); // inherited
    expect(steelSword?.symbol).toBe('/'); // inherited
  });

  it('should inherit slot properties', () => {
    const baseGun = createBasicItemJson({
      id: 'pistol',
      type: 'GUN',
      name: 'Pistol',
      ammo: ['9mm'],
      range: 20,
      magazine_size: 12,
      dispersion: 300,
    });

    const derivedGun = {
      'copy-from': 'pistol',
      id: 'pistol_silenced',
      name: 'Silenced Pistol',
      dispersion: 200,
    };

    const factory = ItemLoader.fromJsonArray([baseGun, derivedGun]);
    const silencedPistol = factory.getType(createItemTypeId('pistol_silenced'));

    expect(silencedPistol?.gun?.ammo).toBeDefined();
    expect(silencedPistol?.gun?.range).toBe(20); // inherited
    expect(silencedPistol?.gun?.magazineSize).toBe(12); // inherited
    expect(silencedPistol?.gun?.dispersion).toBe(200); // overridden
  });

  it('should handle multi-level inheritance', () => {
    const baseItem = createBasicItemJson({
      id: 'base_armor',
      type: 'ARMOR',
      name: 'Armor',
      coverage: 80,
      encumbrance: 10,
      material: ['leather'],
    });

    const midItem = {
      'copy-from': 'base_armor',
      id: 'studded_armor',
      name: 'Studded Armor',
      coverage: 85,
    };

    const finalItem = {
      'copy-from': 'studded_armor',
      id: 'reinforced_studded_armor',
      name: 'Reinforced Studded Armor',
      encumbrance: 15,
      material: ['steel'],
    };

    const factory = ItemLoader.fromJsonArray([
      baseItem,
      midItem,
      finalItem,
    ]);

    const finalArmor = factory.getType(createItemTypeId('reinforced_studded_armor'));
    expect(finalArmor?.name).toBe('Reinforced Studded Armor');
    expect(finalArmor?.armor?.coverage).toBe(85); // from mid
    expect(finalArmor?.armor?.encumbrance).toBe(15); // overridden
    expect(finalArmor?.material).toContain(createItemTypeId('steel')); // overridden
  });

  it('should inherit flags', () => {
    const baseItem = createBasicItemJson({
      id: 'fire_weapon',
      type: 'WEAPON',
      name: 'Fire Weapon',
      flags: ['FIRE', ' TWOHANDED'],
    });

    const derivedItem = {
      'copy-from': 'fire_weapon',
      id: 'greater_fire_weapon',
      name: 'Greater Fire Weapon',
      flags: ['UNBREAKABLE'],
    };

    const factory = ItemLoader.fromJsonArray([baseItem, derivedItem]);
    const greaterWeapon = factory.getType(createItemTypeId('greater_fire_weapon'));

    expect(greaterWeapon?.flags.has('FIRE')).toBe(true); // inherited
    expect(greaterWeapon?.flags.has(' TWOHANDED')).toBe(true); // inherited
    expect(greaterWeapon?.flags.has('UNBREAKABLE')).toBe(true); // added
  });

  it('should handle abstract items', () => {
    const abstractItem = createBasicItemJson({
      id: 'abstract_gun',
      type: 'GUN',
      abstract: true,
      name: 'Abstract Gun',
      ammo: ['9mm'],
    });

    const concreteItem = {
      'copy-from': 'abstract_gun',
      id: 'concrete_gun',
      name: 'Concrete Gun',
    };

    const factory = ItemLoader.fromJsonArray([abstractItem, concreteItem]);

    // Abstract items should not be added to factory
    expect(factory.hasType(createItemTypeId('abstract_gun'))).toBe(false);

    // But should be available for inheritance
    expect(factory.hasType(createItemTypeId('concrete_gun'))).toBe(true);
  });

  it('should handle replace flags', () => {
    const baseItem = createBasicItemJson({
      id: 'base_item',
      type: 'WEAPON',
      name: 'Base Item',
      flags: ['FLAG1', 'FLAG2'],
    });

    const derivedItem = {
      'copy-from': 'base_item',
      'replace_flags': true,
      id: 'new_item',
      name: 'New Item',
      flags: ['FLAG3'],
    };

    const factory = ItemLoader.fromJsonArray([baseItem, derivedItem]);
    const newItem = factory.getType(createItemTypeId('new_item'));

    expect(newItem?.flags.has('FLAG1')).toBe(false); // replaced
    expect(newItem?.flags.has('FLAG3')).toBe(true); // new flag
  });

  it('should extend flags', () => {
    const baseItem = createBasicItemJson({
      id: 'base_item',
      type: 'WEAPON',
      name: 'Base Item',
      flags: ['FLAG1'],
    });

    const derivedItem = {
      'copy-from': 'base_item',
      id: 'new_item',
      name: 'New Item',
      flags: ['FLAG2'],
    };

    const factory = ItemLoader.fromJsonArray([baseItem, derivedItem]);
    const newItem = factory.getType(createItemTypeId('new_item'));

    expect(newItem?.flags.has('FLAG1')).toBe(true); // inherited
    expect(newItem?.flags.has('FLAG2')).toBe(true); // extended
  });
});

// ============ fromJsonArray 测试 ============

describe('ItemLoader - fromJsonArray', () => {
  it('should create factory from empty array', () => {
    const factory = ItemLoader.fromJsonArray([]);
    expect(factory).toBeDefined();
  });

  it('should create factory with multiple items', () => {
    const items = [
      createBasicItemJson({ id: 'item1' }),
      createBasicItemJson({ id: 'item2' }),
      createBasicItemJson({ id: 'item3' }),
    ];

    const factory = ItemLoader.fromJsonArray(items);

    expect(factory.hasType(createItemTypeId('item1'))).toBe(true);
    expect(factory.hasType(createItemTypeId('item2'))).toBe(true);
    expect(factory.hasType(createItemTypeId('item3'))).toBe(true);
  });

  it('should skip invalid items', () => {
    const items = [
      createBasicItemJson({ id: 'valid_item' }),
      { invalid: 'data' },
      createBasicItemJson({ id: 'another_valid' }),
    ];

    const factory = ItemLoader.fromJsonArray(items);

    expect(factory.hasType(createItemTypeId('valid_item'))).toBe(true);
    expect(factory.hasType(createItemTypeId('another_valid'))).toBe(true);
  });

  it('should handle duplicate IDs (last wins)', () => {
    const items = [
      createBasicItemJson({ id: 'duplicate', name: 'First' }),
      createBasicItemJson({ id: 'duplicate', name: 'Second' }),
    ];

    const factory = ItemLoader.fromJsonArray(items);
    const item = factory.getType(createItemTypeId('duplicate'));

    expect(item?.name).toBe('Second');
  });
});
