/**
 * 物品系统使用示例
 *
 * 本文件展示了如何使用物品系统的各个功能
 */

import {
  ItemType,
  Item,
  ItemFactory,
  ItemLoader,
  Inventory,
  ItemPocket,
  ItemContents,
  createItemTypeId,
  createMaterialId,
  createItemFlagSet,
  createQualityId,
  ItemCategory,
} from './index';
import { Map, Set } from 'immutable';

// ============================================================================
// 示例 1: 定义和创建物品
// ============================================================================

export function example1_DefiningItems() {
  console.log('=== 示例 1: 定义和创建物品 ===\n');

  // 定义一个工具类型
  const hammerType = ItemType.create({
    id: createItemTypeId('hammer'),
    name: 'Hammer',
    description: 'A simple hammer for construction work',
    symbol: '(',
    color: 'light_gray',
    weight: 500,        // 500g
    volume: 500,        // 500ml
    price: 500,         // $5.00
    stackable: true,
    stackSize: 1,
    category: ItemCategory.TOOL,
    material: [createMaterialId('steel')],
    flags: Set(),
    qualities: Map([
      [createQualityId('HAMMER'), 1],
      [createQualityId('BUTCHER'), 1],
    ]),
    tool: {
      maximumCharges: 100,
    },
  });

  // 创建工具实例
  const hammer = Item.create(hammerType);

  console.log(`物品名称: ${hammer.name}`);
  console.log(`物品重量: ${hammer.getWeight()}g`);
  console.log(`物品体积: ${hammer.getVolume()}ml`);
  console.log(`是否为工具: ${hammer.isTool()}`);
  console.log(`品质等级: ${hammer.type.getQualityLevel(createQualityId('HAMMER'))}`);

  return { hammerType, hammer };
}

// ============================================================================
// 示例 2: 物品状态变化
// ============================================================================

export function example2_ItemStateChanges() {
  console.log('\n=== 示例 2: 物品状态变化 ===\n');

  const { hammer } = example1_DefiningItems();

  // 消耗物品（如工具使用）
  const usedOnce = hammer.consumeOne();
  console.log(`使用后电荷: ${usedOnce.charges}`);

  // 添加损坏
  const damagedHammer = hammer.addDamage(100);
  console.log(`损坏程度: ${damagedHammer.damage}`);
  console.log(`是否损坏: ${damagedHammer.isDamaged()}`);
  console.log(`显示名称: ${damagedHammer.getDisplayName()}`);

  // 修复物品
  const repairedHammer = damagedHammer.repair(50);
  console.log(`修复后损坏: ${repairedHammer.damage}`);

  // 切换激活状态（如手电筒）
  const flashlightType = ItemType.create({
    id: createItemTypeId('flashlight'),
    name: 'Flashlight',
    description: 'A battery-powered flashlight',
    weight: 200,
    volume: 300,
    category: ItemCategory.TOOL,
    material: [createMaterialId('plastic')],
    flags: Set(),
    qualities: Map(),
    tool: {
      maximumCharges: 100,
    },
  });

  const flashlight = Item.createWithCharges(flashlightType, 50);
  console.log(`初始激活: ${flashlight.active}`);

  const activatedFlashlight = flashlight.toggleActive();
  console.log(`切换后激活: ${activatedFlashlight.active}`);
}

// ============================================================================
// 示例 3: 容器系统
// ============================================================================

export function example3_ContainerSystem() {
  console.log('\n=== 示例 3: 容器系统 ===\n');

  // 创建一个背包容器
  const backpackPocket = ItemPocket.createContainer(
    10000,  // 10L 体积
    20000   // 20kg 重量
  );

  console.log(`背包容量: ${backpackPocket.getCapacity()}ml`);
  console.log(`背包重量容量: ${backpackPocket.getWeightCapacity()}g`);
  console.log(`背包是否为空: ${backpackPocket.isEmpty()}`);

  // 添加物品到背包
  const bandageType = ItemType.create({
    id: createItemTypeId('bandage'),
    name: 'Bandage',
    description: 'A clean bandage',
    weight: 50,
    volume: 100,
    category: ItemCategory.FOOD,
    material: [createMaterialId('cotton')],
    flags: Set(),
    qualities: Map(),
  });

  const bandage1 = Item.create(bandageType);
  const bandage2 = Item.create(bandageType);

  const backpackWithOne = backpackPocket.addItem(bandage1);
  console.log(`添加 1 个绷带后物品数: ${backpackWithOne.getItemCount()}`);
  console.log(`当前重量: ${backpackWithOne.getWeight()}g`);

  const backpackWithTwo = backpackWithOne.addItem(bandage2);
  console.log(`添加 2 个绷带后物品数: ${backpackWithTwo.getItemCount()}`);
  console.log(`剩余体积: ${backpackWithTwo.getRemainingCapacity()}ml`);
}

// ============================================================================
// 示例 4: 物品栏管理
// ============================================================================

export function example4_InventoryManagement() {
  console.log('\n=== 示例 4: 物品栏管理 ===\n');

  // 创建角色物品栏（最多 100 个位置）
  const inventory = Inventory.create(100);

  // 创建几种物品
  const pistolType = ItemType.create({
    id: createItemTypeId('pistol_9mm'),
    name: '9mm Pistol',
    description: 'A standard 9mm pistol',
    weight: 800,
    volume: 750,
    category: ItemCategory.GUN,
    material: [createMaterialId('steel')],
    flags: Set(),
    qualities: Map(),
    gun: {
      ammo: [createItemTypeId('9mm') as any],
      range: 8,
      dispersion: 120,
    },
  });

  const ammoType = ItemType.create({
    id: createItemTypeId('9mm'),
    name: '9mm Round',
    description: 'A 9mm bullet',
    weight: 10,
    volume: 20,
    category: ItemCategory.AMMO,
    material: [createMaterialId('brass')],
    flags: Set(),
    qualities: Map(),
  });

  // 添加物品到物品栏
  const pistol = Item.create(pistolType);
  const ammo1 = Item.createWithCharges(ammoType, 30);
  const ammo2 = Item.createWithCharges(ammoType, 30);

  let updatedInventory = inventory.addItem(pistol);
  updatedInventory = updatedInventory.addItem(ammo1);
  updatedInventory = updatedInventory.addItem(ammo2);

  console.log(`物品栏物品数: ${updatedInventory.getItemCount()}`);
  console.log(`物品栏栈数: ${updatedInventory.getStackCount()}`);
  console.log(`9mm 弹药总数: ${updatedInventory.countCharges(createItemTypeId('9mm'))}`);

  // 整理物品栏
  const organizedInventory = updatedInventory.restack();
  console.log(`整理后栈数: ${organizedInventory.getStackCount()}`);

  // 访问所有物品
  console.log('\n物品栏内容:');
  organizedInventory.visitItems((item) => {
    console.log(`  - ${item.getDisplayName()}: ${item.getWeight()}g`);
    return 0; // 继续访问
  });
}

// ============================================================================
// 示例 5: 物品工厂
// ============================================================================

export function example5_ItemFactory() {
  console.log('\n=== 示例 5: 物品工厂 ===\n');

  // 创建物品工厂
  const factory = ItemFactory.create();

  // 定义几种物品类型
  const swordType = ItemType.create({
    id: createItemTypeId('sword_steel'),
    name: 'Steel Sword',
    description: 'A sharp steel sword',
    weight: 1200,
    volume: 1500,
    category: ItemCategory.WEAPON,
    material: [createMaterialId('steel')],
    flags: Set(),
    qualities: Map([
      [createQualityId('CUT'), 2],
      [createQualityId('STAB'), 1],
    ]),
  });

  const shieldType = ItemType.create({
    id: createItemTypeId('shield_steel'),
    name: 'Steel Shield',
    description: 'A sturdy steel shield',
    weight: 2000,
    volume: 1000,
    category: ItemCategory.ARMOR,
    material: [createMaterialId('steel')],
    flags: Set(),
    qualities: Map(),
    armor: {
      coverage: 60,
      encumbrance: 15,
    },
  });

  // 添加类型到工厂
  factory.addType(swordType);
  factory.addType(shieldType);

  // 从工厂创建物品
  const sword = factory.createItem(createItemTypeId('sword_steel'));
  const shield = factory.createItem(createItemTypeId('shield_steel'));

  console.log(`创建的剑: ${sword?.name}`);
  console.log(`创建的盾: ${shield?.name}`);
  console.log(`剑的切割品质: ${sword?.type.getQualityLevel(createQualityId('CUT'))}`);
  console.log(`盾的覆盖率: ${shield?.type.armor?.coverage}`);

  // 创建运行时物品类型
  const factoryWithRuntime = factory.createRuntimeType(
    createItemTypeId('custom_sword'),
    'Custom Magic Sword',
    'A sword created at runtime'
  );

  const customItemType = factoryWithRuntime.getType(createItemTypeId('custom_sword'));
  console.log(`\n运行时创建物品: ${customItemType?.name}`);
}

// ============================================================================
// 示例 6: 嵌套容器
// ============================================================================

export function example6_NestedContainers() {
  console.log('\n=== 示例 6: 嵌套容器 ===\n');

  // 定义一个背包类型
  const backpackType = ItemType.create({
    id: createItemTypeId('backpack'),
    name: 'Backpack',
    description: 'A sturdy backpack',
    weight: 500,
    volume: 1000,
    category: ItemCategory.CONTAINER,
    material: [createMaterialId('leather')],
    flags: Set(),
    qualities: Map(),
  });

  // 定义一个小袋子类型
  const pouchType = ItemType.create({
    id: createItemTypeId('pouch'),
    name: 'Small Pouch',
    description: 'A small pouch for small items',
    weight: 100,
    volume: 200,
    category: ItemCategory.CONTAINER,
    material: [createMaterialId('leather')],
    flags: Set(),
    qualities: Map(),
  });

  // 定义一个小物品
  const coinType = ItemType.create({
    id: createItemTypeId('coin'),
    name: 'Coin',
    description: 'A gold coin',
    weight: 5,
    volume: 10,
    category: ItemCategory.MISCELLANEOUS,
    material: [createMaterialId('gold')],
    flags: Set(),
    qualities: Map(),
  });

  // 创建物品实例
  const backpack = Item.create(backpackType);
  const pouch = Item.create(pouchType);
  const coin1 = Item.create(coinType);
  const coin2 = Item.create(coinType);
  const coin3 = Item.create(coinType);

  // 将硬币放入袋子
  const pouchWithCoins = pouch.addItem(coin1).addItem(coin2);

  // 将袋子放入背包
  const backpackWithPouch = backpack.addItem(pouchWithCoins);

  // 将剩余硬币放入背包
  const finalBackpack = backpackWithPouch.addItem(coin3);

  // 统计所有物品
  let totalItems = 0;
  finalBackpack.contents.visitItems((item) => {
    totalItems++;
    console.log(`找到物品: ${item.name}`);
    return 0; // 继续访问子项
  });

  console.log(`\n背包中总物品数: ${totalItems}`);
  console.log(`背包总重量: ${finalBackpack.getWeight()}g`);
}

// ============================================================================
// 示例 7: 从 JSON 加载数据
// ============================================================================

export async function example7_LoadFromJson() {
  console.log('\n=== 示例 7: 从 JSON 加载数据 ===\n');

  // 模拟 JSON 数据
  const jsonData = [
    {
      id: 'torch',
      type: 'TOOL',
      name: 'Torch',
      description: 'A simple wooden torch',
      symbol: '/',
      color: 'yellow',
      weight: '300 g',
      volume: '500 ml',
      material: ['wood'],
      maximum_charges: 50,
    },
    {
      id: 'apple',
      type: 'FOOD',
      name: 'Apple',
      description: 'A fresh red apple',
      symbol: '%',
      color: 'red',
      weight: '100 g',
      volume: '250 ml',
      material: ['flesh'],
      calories: 50,
      quench: 10,
    },
  ];

  // 从 JSON 数组加载
  const factory = await ItemFactory.fromJsonArray(
    jsonData as any,
    ItemLoader.parseItemType
  );

  // 创建物品
  const torch = factory.createItem(createItemTypeId('torch'));
  const apple = factory.createItem(createItemTypeId('apple'));

  console.log(`加载的火把: ${torch?.name}`);
  console.log(`火把最大电荷: ${torch?.type.tool?.maximumCharges}`);
  console.log(`加载的苹果: ${apple?.name}`);
  console.log(`苹果卡路里: ${apple?.type.comestible?.calories}`);
}

// ============================================================================
// 主函数 - 运行所有示例
// ============================================================================

export async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║       物品系统使用示例 - Cataclysm-DDA TypeScript         ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  example1_DefiningItems();
  example2_ItemStateChanges();
  example3_ContainerSystem();
  example4_InventoryManagement();
  example5_ItemFactory();
  example6_NestedContainers();
  await example7_LoadFromJson();

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    所有示例运行完成                        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}
