/**
 * ItemLoader - 物品数据加载器
 *
 * 从 JSON 文件加载物品类型定义
 * 参考 Cataclysm-DDA 的 init.h 和 generic_factory.h
 */

import { Set, Map } from 'immutable';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  ItemTypeId,
  ItemFlagType,
  JsonObject,
  MaterialId,
  QualityId,
  SkillId,
  AmmoTypeId,
  Mass,
  Volume,
} from './types';
import { ItemCategory } from './types';
import {
  createItemTypeId,
  createMaterialId,
  createQualityId,
  createSkillId,
  createAmmoTypeId,
  createItemFlagSet,
} from './types';
import { ItemType } from './ItemType';
import { ItemFactory } from './ItemFactory';
import {
  ToolSlot,
  ComestibleSlot,
  ArmorSlot,
  GunSlot,
  AmmoSlot,
  BookSlot,
  ModSlot,
} from './ItemType';

// ============ 辅助函数 ============

/**
 * 解析物品标志
 */
function parseItemFlag(flag: string): ItemFlagType | null {
  if (flag.startsWith('FLAG_')) {
    return flag.substring(5) as ItemFlagType;
  }
  return flag as ItemFlagType;
}

/**
 * 解析物品标志集合
 */
function parseItemFlags(flags: string[]): Set<ItemFlagType> {
  return Set(flags as ItemFlagType[]);
}

/**
 * 解析材料 ID
 */
function parseMaterialId(id: string): MaterialId {
  return createMaterialId(id);
}

/**
 * 解析品质映射
 */
function parseQualities(qualities: Record<string, number>): Map<QualityId, number> {
  const entries: [QualityId, number][] = [];
  for (const [key, value] of Object.entries(qualities)) {
    entries.push([createQualityId(key), value]);
  }
  return Map(entries);
}

/**
 * 解析质量（字符串格式）
 */
function parseMass(massStr: string): Mass {
  // 支持格式: "100 g", "100g", "100 kg", "100kg"
  const match = massStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(mg|g|kg)?$/);
  if (!match) {
    console.warn(`Invalid mass format: ${massStr}`);
    return 100; // 默认 100g
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || 'g';

  switch (unit) {
    case 'mg':
      return value / 1000;
    case 'kg':
      return value * 1000;
    case 'g':
    default:
      return value;
  }
}

/**
 * 解析体积（字符串格式）
 */
function parseVolume(volumeStr: string): Volume {
  // 支持格式: "100 ml", "100ml", "100 L", "100L"
  const match = volumeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(ml|l)?$/);
  if (!match) {
    console.warn(`Invalid volume format: ${volumeStr}`);
    return 250; // 默认 250ml
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || 'ml';

  switch (unit) {
    case 'l':
      return value * 1000;
    case 'ml':
    default:
      return value;
  }
}

/**
 * 解析物品类别
 */
function parseCategory(category: string): ItemCategory {
  const upperCat = category.toUpperCase();
  if (Object.values(ItemCategory).includes(upperCat as ItemCategory)) {
    return upperCat as ItemCategory;
  }
  return ItemCategory.MISCELLANEOUS;
}

/**
 * 解析技能 ID
 */
function parseSkillId(id: string): SkillId {
  return createSkillId(id);
}

/**
 * 解析弹药类型 ID
 */
function parseAmmoTypeId(id: string): AmmoTypeId {
  return createAmmoTypeId(id);
}

// ============ ItemLoader 类 ============

/**
 * 解析结果 - 包含原始 JSON 和解析后的类型
 */
interface ParsedItem {
  json: JsonObject;
  type?: ItemType;
  isAbstract: boolean;
}

/**
 * ItemLoader - 物品数据加载器
 */
export class ItemLoader {
  /**
   * 解析单个物品类型 JSON 对象
   */
  static parseItemType(json: JsonObject): ItemType | null {
    try {
      // 基础属性
      const id = createItemTypeId(json['id'] as string);
      const name = json['name'] as string;
      const description = json['description'] as string | undefined;
      const symbol = json['symbol'] as string | undefined;
      const color = json['color'] as string | undefined;

      // 物理属性
      const weight = json['weight'] ? parseMass(json['weight'] as string) : 100;
      const volume = json['volume'] ? parseVolume(json['volume'] as string) : 250;
      const price = json['price'] as number | undefined;
      const stackable = json['stackable'] as boolean | undefined;
      const stackSize = json['stack_size'] as number | undefined;

      // 分类
      const category = parseCategory(json['type'] as string);
      const subcategory = json['subcategory'] as string | undefined;

      // 材料和标志
      const materials = (json['material'] as string[])?.map(parseMaterialId) || [];
      const flags = json['flags'] ? parseItemFlags(json['flags'] as string[]) : Set<ItemFlagType>();
      const qualities = json['qualities'] ? parseQualities(json['qualities'] as Record<string, number>) : Map<QualityId, number>();

      // 构建基础属性
      const props = {
        id,
        name,
        description,
        symbol,
        color,
        weight,
        volume,
        price,
        stackable,
        stackSize,
        category,
        subcategory,
        material: materials,
        flags,
        qualities,
      };

      // 根据类型解析插槽
      let type: ItemType;

      switch (category) {
        case ItemCategory.TOOL:
          type = ItemType.create({
            ...props,
            tool: ItemLoader.parseToolSlot(json),
          });
          break;

        case ItemCategory.COMESTIBLE:
        case ItemCategory.FOOD:
          type = ItemType.create({
            ...props,
            comestible: ItemLoader.parseComestibleSlot(json),
          });
          break;

        case ItemCategory.ARMOR:
          type = ItemType.create({
            ...props,
            armor: ItemLoader.parseArmorSlot(json),
          });
          break;

        case ItemCategory.GUN:
          type = ItemType.create({
            ...props,
            gun: ItemLoader.parseGunSlot(json),
          });
          break;

        case ItemCategory.AMMO:
          type = ItemType.create({
            ...props,
            ammo: ItemLoader.parseAmmoSlot(json),
          });
          break;

        case ItemCategory.BOOK:
          type = ItemType.create({
            ...props,
            book: ItemLoader.parseBookSlot(json),
          });
          break;

        case ItemCategory.GUNMOD:
          type = ItemType.create({
            ...props,
            mod: ItemLoader.parseModSlot(json),
          });
          break;

        case ItemCategory.BIONIC:
          type = ItemType.create({
            ...props,
            bionic: ItemLoader.parseBionicSlot(json),
          });
          break;

        case ItemCategory.ENGINE:
          type = ItemType.create({
            ...props,
            engine: ItemLoader.parseEngineSlot(json),
          });
          break;

        case ItemCategory.WHEEL:
          type = ItemType.create({
            ...props,
            wheel: ItemLoader.parseWheelSlot(json),
          });
          break;

        case ItemCategory.FURNITURE:
          type = ItemType.create({
            ...props,
            furniture: ItemLoader.parseFurnitureSlot(json),
          });
          break;

        case ItemCategory.PET_ARMOR:
          type = ItemType.create({
            ...props,
            petArmor: ItemLoader.parsePetArmorSlot(json),
          });
          break;

        default:
          type = ItemType.create({
            ...props,
            generic: ItemLoader.parseGenericSlot(json),
          });
          break;
      }

      return type;
    } catch (error) {
      console.error('Failed to parse item type:', error);
      return null;
    }
  }

  /**
   * 解析工具插槽
   */
  private static parseToolSlot(json: JsonObject): ToolSlot | undefined {
    const hasToolFields = json['maximum_charges'] !== undefined ||
                         json['ammo_capacity'] !== undefined;
    if (!hasToolFields) return undefined;

    return {
      maximumCharges: json['maximum_charges'] as number,
      ammoCapacity: json['ammo_capacity'] as number,
      rechargeMultiplier: json['recharge_multiplier'] as number,
      sub: json['sub'] as string,
      powerDraw: json['power_draw'] as number,
    };
  }

  /**
   * 解析可消耗物品插槽
   */
  private static parseComestibleSlot(json: JsonObject): ComestibleSlot | undefined {
    const hasComestibleFields = json['calories'] !== undefined ||
                                json['quench'] !== undefined ||
                                json['fun'] !== undefined;
    if (!hasComestibleFields) return undefined;

    return {
      quota: json['quota'] as any,
      stim: json['stim'] as number,
      healthy: json['healthy'] as number,
      parasiteChance: json['parasite_chance'] as number,
      radiationDecay: json['radiation_decay'] as number,
      addictionType: json['addiction_type'] as string,
      addictionPotential: json['addiction_potential'] as number,
      calories: json['calories'] as number,
      quench: json['quench'] as number,
      fun: json['fun'] as number,
      time: json['time'] as number,
      saturates: json['satiates'] as string,
      materialTypes: json['material_types'] as MaterialId[],
      modifiable: json['modifiable'] as boolean,
      monotony: json['monotony'] as number,
      likeFatigue: json['like_fatigue'] as number,
      likeFlavor: json['like_flavor'] as boolean,
      favoriteMeal: json['favorite_meal'] as boolean,
    };
  }

  /**
   * 解析护甲插槽
   */
  private static parseArmorSlot(json: JsonObject): ArmorSlot | undefined {
    const hasArmorFields = json['coverage'] !== undefined ||
                          json['encumbrance'] !== undefined;
    if (!hasArmorFields) return undefined;

    return {
      coverage: json['coverage'] as number,
      covers: json['covers'] as string[],
      encumbrance: json['encumbrance'] as number,
      maxEncumbrance: json['max_encumbrance'] as number,
      powerArmor: json['power_armor'] as boolean,
      environmentalProtection: json['environmental_protection'] as number,
      thickness: json['thickness'] as number,
      materialThickness: json['material_thickness'] as number,
      rigid: json['rigid'] as boolean,
      materialId: json['material_id'] as string,
      warmth: json['warmth'] as number,
      weightCapacityBonus: json['weight_capacity_bonus'] as number,
      powerDraw: json['power_draw'] as number,
      coversAll: json['covers_all'] as boolean,
    };
  }

  /**
   * 解析枪械插槽
   */
  private static parseGunSlot(json: JsonObject): GunSlot | undefined {
    const hasGunFields = json['ammo'] !== undefined ||
                        json['range'] !== undefined;
    if (!hasGunFields) return undefined;

    return {
      skill: json['skill'] ? parseSkillId(json['skill'] as string) : undefined,
      ammo: (json['ammo'] as string[])?.map(parseAmmoTypeId),
      range: json['range'] as number,
      rangedDamage: json['ranged_damage'] as number,
      dispersion: json['dispersion'] as number,
      reloadTime: json['reload_time'] as number,
      reload: json['reload'] as number,
      barrelVolume: json['barrel_volume'] as number,
      defaultAmmo: json['default_ammo'] as string,
      magazineSize: json['magazine_size'] as number | string[],
      magazineWell: json['magazine_well'] as string,
      builtInMod: json['builtin_mod'] as string,
      modLocations: json['mod_locations'] as string[],
      blackpowder: json['blackpowder'] as boolean,
      useContents: json['use_contents'] as boolean,
      durability: json['durability'] as number,
      burst: json['burst'] as number,
      reloadNoise: json['reload_noise'] as string,
      reloadNoiseVolume: json['reload_noise_volume'] as number,
      fireNoise: json['fire_noise'] as string,
      fireNoiseVolume: json['fire_noise_volume'] as number,
      fireSound: json['fire_sound'] as string,
      reloadSound: json['reload_sound'] as string,
      ammoToFire: json['ammo_to_fire'] as number,
    };
  }

  /**
   * 解析弹药插槽
   */
  private static parseAmmoSlot(json: JsonObject): AmmoSlot | undefined {
    if (!json['ammo_type']) return undefined;

    return {
      type: parseAmmoTypeId(json['ammo_type'] as string),
      casing: json['casing'] as string,
      drop: json['drop'] as string,
      dropChance: json['drop_chance'] as number,
      dropActive: json['drop_active'] as boolean,
      shape: json['shape'] as boolean,
      stackSize: json['stack_size'] as number,
    };
  }

  /**
   * 解析书籍插槽
   */
  private static parseBookSlot(json: JsonObject): BookSlot | undefined {
    const hasBookFields = json['skill'] !== undefined ||
                        json['intelligence'] !== undefined;
    if (!hasBookFields) return undefined;

    return {
      level: json['level'] as number,
      requiredLevel: json['required_level'] as number,
      time: json['time'] as number,
      fun: json['fun'] as number,
      intelligence: json['intelligence'] as number,
      skill: json['skill'] ? parseSkillId(json['skill'] as string) : undefined,
      requiredSkills: json['required_skills'] as any,
      chapters: json['chapters'] as any,
    };
  }

  /**
   * 解析改装件插槽
   */
  private static parseModSlot(json: JsonObject): ModSlot | undefined {
    const hasModFields = json['dispersion_modifier'] !== undefined ||
                       json['damage_modifier'] !== undefined;
    if (!hasModFields) return undefined;

    return {
      ammoModifier: json['ammo_modifier'] as string,
      capacityBonus: json['capacity_bonus'] as number,
      dispersionModifier: json['dispersion_modifier'] as number,
      damageModifier: json['damage_modifier'] as number,
      rangeModifier: json['range_modifier'] as number,
      reloadTimeModifier: json['reload_time_modifier'] as number,
      loudnessModifier: json['loudness_modifier'] as number,
      ammoConsumptionModifier: json['ammo_consumption_modifier'] as number,
      magazineSizeModifier: json['magazine_size_modifier'] as number,
      speedModifier: json['speed_modifier'] as number,
      aimSpeedModifier: json['aim_speed_modifier'] as number,
      recoilModifier: json['recoil_modifier'] as number,
      handlingModifier: json['handling_modifier'] as number,
      upsDamageModifier: json['ups_damage_modifier'] as number,
      upsChargesMultiplier: json['ups_charges_multiplier'] as number,
      upsMagSizeBonus: json['ups_mag_size_bonus'] as number,
      targetEncumbrance: json['target_encumbrance'] as number,
      mode: json['mode'] as string,
      modTargets: json['mod_targets'] as string[],
      addMod: json['add_mod'] as string[],
      deleteMod: json['delete_mod'] as string[],
      acceptableAmmo: json['acceptable_ammo'] as string[],
      barrelLength: json['barrel_length'] as number,
      rangeModifierBase: json['range_modifier_base'] as number,
      minStrRequired: json['min_str_required'] as number,
    };
  }

  /**
   * 解析义体插槽
   */
  private static parseBionicSlot(json: JsonObject): any {
    // TODO: 实现义体插槽解析
    return undefined;
  }

  /**
   * 解析引擎插槽
   */
  private static parseEngineSlot(json: JsonObject): any {
    // TODO: 实现引擎插槽解析
    return undefined;
  }

  /**
   * 解析轮子插槽
   */
  private static parseWheelSlot(json: JsonObject): any {
    // TODO: 实现轮子插槽解析
    return undefined;
  }

  /**
   * 解析家具插槽
   */
  private static parseFurnitureSlot(json: JsonObject): any {
    // TODO: 实现家具插槽解析
    return undefined;
  }

  /**
   * 解析宠物护甲插槽
   */
  private static parsePetArmorSlot(json: JsonObject): any {
    // TODO: 实现宠物护甲插槽解析
    return undefined;
  }

  /**
   * 解析通用插槽
   */
  private static parseGenericSlot(json: JsonObject): any {
    return {
      bash: json['bash'] as number,
      cut: json['cut'] as number,
      toHit: json['to_hit'] as number,
      techniques: json['techniques'] as string[],
      threw: json['threw'] as number,
    };
  }

  // ============ copy-from 继承支持 ============

  /**
   * 处理 copy-from 继承
   */
  private static applyInheritance(
    json: JsonObject,
    registry: Map<string, ParsedItem>
  ): JsonObject {
    const copyFrom = json['copy-from'] as string | undefined;
    if (!copyFrom) {
      return json;
    }

    const parent = registry.get(copyFrom);
    if (!parent) {
      console.warn(`copy-from target not found: ${copyFrom}`);
      return json;
    }

    // 递归处理父类的继承
    const parentJson = parent.isAbstract
      ? this.applyInheritance(parent.json, registry)
      : parent.json;

    // 合并属性
    const merged: JsonObject = { ...parentJson };

    // 处理 replace_flags
    const replaceFlags = json['replace_flags'] as boolean | undefined;

    // 合并各个属性
    for (const [key, value] of Object.entries(json)) {
      // 跳过特殊的控制字段
      if (key === 'copy-from' || key === 'abstract' || key === 'replace_flags') {
        continue;
      }

      // 特殊处理 flags
      if (key === 'flags') {
        if (replaceFlags) {
          // 替换模式：完全替换
          merged[key] = value;
        } else {
          // 扩展模式：合并 flags
          const parentFlags = (parentJson[key] as string[]) || [];
          const childFlags = value as string[];
          merged[key] = [...new Set([...parentFlags, ...childFlags])];
        }
      }
      // 数组属性：子类覆盖
      else if (Array.isArray(value)) {
        merged[key] = value;
      }
      // 对象属性：深度合并
      else if (typeof value === 'object' && value !== null) {
        const parentValue = parentJson[key];
        if (typeof parentValue === 'object' && parentValue !== null) {
          merged[key] = { ...parentValue, ...value };
        } else {
          merged[key] = value;
        }
      }
      // 其他属性：子类覆盖
      else {
        merged[key] = value;
      }
    }

    return merged;
  }

  /**
   * 解析物品并构建继承关系
   */
  private static parseWithInheritance(jsonArray: JsonObject[]): ItemType[] {
    const types: ItemType[] = [];
    // 使用原生 JS Map (不是 Immutable.Map)
    // 存储原始 JSON 和 merged JSON
    const originalRegistry = new globalThis.Map<string, JsonObject>();
    const mergedRegistry = new globalThis.Map<string, JsonObject>();
    const abstracts = new globalThis.Set<string>();

    // 第一遍：初始化 registry 并标记 abstract 物品
    for (const json of jsonArray) {
      const id = json['id'] as string;
      if (!id) continue;

      const isAbstract = json['abstract'] as boolean | undefined;
      if (isAbstract === true) {
        abstracts.add(id);
      }

      // 存储原始 JSON
      originalRegistry.set(id, json);
      // 初始时 merged JSON 与原始相同
      mergedRegistry.set(id, json);
    }

    // 第二遍：迭代处理继承直到稳定（处理多级继承）
    let maxIterations = jsonArray.length + 1;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      let changed = false;

      for (const json of jsonArray) {
        const id = json['id'] as string;
        if (!id) continue;

        const originalJson = originalRegistry.get(id)!;
        const copyFrom = originalJson['copy-from'] as string | undefined;
        if (!copyFrom) continue;

        const parentJson = mergedRegistry.get(copyFrom);
        if (!parentJson) continue;

        // 获取当前合并后的版本
        const currentMerged = mergedRegistry.get(id)!;

        // 使用原始 child JSON 进行合并（保留 replace_flags 等属性）
        const newMerged = this.mergeJson(parentJson, originalJson);

        // 检查是否有变化
        if (JSON.stringify(currentMerged) !== JSON.stringify(newMerged)) {
          mergedRegistry.set(id, newMerged);
          changed = true;
        }
      }

      // 如果没有变化，提前退出
      if (!changed) break;
    }

    // 第三遍：创建类型
    for (const json of jsonArray) {
      const id = json['id'] as string;
      if (!id) continue;

      // 跳过 abstract 物品
      if (abstracts.has(id)) {
        continue;
      }

      // 获取合并后的 JSON
      const mergedJson = mergedRegistry.get(id) || json;

      // 解析类型
      const type = ItemLoader.parseItemType(mergedJson);
      if (type) {
        types.push(type);
      }
    }

    return types;
  }

  /**
   * 合并两个 JSON 对象（用于 copy-from 继承）
   */
  private static mergeJson(parent: JsonObject, child: JsonObject): JsonObject {
    const merged: JsonObject = { ...parent };

    // 处理 replace_flags
    const replaceFlags = child['replace_flags'] as boolean | undefined;

    // 合并各个属性
    for (const [key, value] of Object.entries(child)) {
      // 跳过特殊的控制字段
      if (key === 'copy-from' || key === 'abstract' || key === 'replace_flags') {
        continue;
      }

      // 特殊处理 flags
      if (key === 'flags') {
        if (replaceFlags) {
          // 替换模式：完全替换
          merged[key] = value;
        } else {
          // 扩展模式：合并 flags
          const parentFlags = (parent[key] as string[]) || [];
          const childFlags = value as string[];
          merged[key] = [...new Set([...parentFlags, ...childFlags])];
        }
      }
      // 数组属性：子类覆盖
      else if (Array.isArray(value)) {
        merged[key] = value;
      }
      // 对象属性：深度合并
      else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const parentValue = parent[key];
        if (typeof parentValue === 'object' && parentValue !== null && !Array.isArray(parentValue)) {
          merged[key] = { ...parentValue, ...value };
        } else {
          merged[key] = value;
        }
      }
      // 其他属性：子类覆盖（但只有当值不为 undefined 时）
      else if (value !== undefined) {
        merged[key] = value;
      }
    }

    return merged;
  }

  // ============ 文件加载 ============

  /**
   * 从 JSON 文件加载物品类型
   */
  static async loadFromFile(filePath: string): Promise<ItemFactory> {
    const content = await fs.readFile(filePath, 'utf-8');
    const jsonArray = JSON.parse(content) as JsonObject[];
    return ItemLoader.fromJsonArray(jsonArray);
  }

  /**
   * 从 JSON 数组加载物品类型（支持 copy-from 继承）
   */
  static fromJsonArray(jsonArray: JsonObject[]): ItemFactory {
    const factory = ItemFactory.create();
    const types = ItemLoader.parseWithInheritance(jsonArray);
    return factory.addTypes(types);
  }

  /**
   * 从目录加载所有物品 JSON 文件
   */
  static async loadFromDirectory(dirPath: string): Promise<ItemFactory> {
    const factory = ItemFactory.create();

    try {
      const files = await fs.readdir(dirPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        const filePath = path.join(dirPath, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const jsonArray = JSON.parse(content) as JsonObject[];

          for (const json of jsonArray) {
            const type = ItemLoader.parseItemType(json);
            if (type) {
              factory.addType(type);
            }
          }
        } catch (error) {
          console.error(`Failed to load ${file}:`, error);
        }
      }
    } catch (error) {
      console.error(`Failed to read directory ${dirPath}:`, error);
    }

    return factory;
  }
}
