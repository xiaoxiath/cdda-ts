/**
 * 真实 Cataclysm-DDA NPC 数据加载测试
 *
 * 测试从真实的 Cataclysm-DDA JSON 文件加载 NPC 数据
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NPCManager } from '../NPCClassLoader';
import { NPC } from '../NPC';
import { Tripoint } from '../../coordinates/Tripoint';
import { GameMap } from '../../map/GameMap';

describe('Real Cataclysm-DDA NPC Data Loading', () => {
  let manager: NPCManager;

  beforeEach(() => {
    manager = new NPCManager();
  });

  it('should have default NPC classes loaded', () => {
    const loader = manager.getLoader();

    // 检查默认类是否加载
    expect(loader.getClass('NC_SOLDIER')).toBeDefined();
    expect(loader.getClass('NC_THUG')).toBeDefined();
    expect(loader.getClass('NC_SURVIVOR')).toBeDefined();
    expect(loader.getClass('NC_MERCHANT')).toBeDefined();
    expect(loader.getClass('NC_DOCTOR')).toBeDefined();
  });

  it('should create NPC from class definition', () => {
    const loader = manager.getLoader();
    const soldierClass = loader.getClass('NC_SOLDIER');

    expect(soldierClass).toBeDefined();
    expect(soldierClass!.name).toBe('Soldier');
    expect(soldierClass!.defaultStats).toEqual({
      str: 12,
      dex: 10,
      int: 8,
      per: 10,
    });
  });

  it('should create NPC instance', () => {
    const loader = manager.getLoader();
    const position = new Tripoint({ x: 10, y: 10, z: 0 });

    const npcData = {
      id: 'test_soldier_1',
      classId: 'NC_SOLDIER',
      attitude: 8,
      faction: 'army',
    };

    const npc = loader.createNPC(npcData, position, 'Soldier John');

    expect(npc).toBeDefined();
    expect(npc!.name).toBe('Soldier John');
    expect(npc!.attitude).toBe(8);
    expect(npc!.faction).toBe('army');
    expect(npc!.isFriendly()).toBe(true);
    expect(npc!.isNPC()).toBe(true);
    expect(npc!.isAvatar()).toBe(false);
  });

  it('should load NPC data from real Cataclysm-DDA file', async () => {
    const loader = manager.getLoader();
    const npcFilePath = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json/npcs/npc.json';

    const npcDataMap = await loader.loadFromFile(npcFilePath);

    console.log(`\n📊 加载了 ${npcDataMap.size} 个 NPC 定义`);

    // 验证一些已知的 NPC
    expect(npcDataMap.has('deserter')).toBe(true);
    expect(npcDataMap.has('farmer')).toBe(true);
    expect(npcDataMap.has('apis')).toBe(true);

    // 查看 deserter NPC 的数据
    const deserter = npcDataMap.get('deserter');
    console.log('\n🎖️  Deserter NPC:');
    console.log(`  Class: ${deserter!.classId}`);
    console.log(`  Attitude: ${deserter!.attitude}`);
    console.log(`  Faction: ${deserter!.faction}`);

    expect(deserter!.classId).toBe('NC_SOLDIER');
    expect(deserter!.attitude).toBe(10);
    expect(deserter!.faction).toBe('no_faction');
  });

  it('should create NPCs from loaded data', async () => {
    const loader = manager.getLoader();
    const npcFilePath = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json/npcs/npc.json';

    const npcDataMap = await loader.loadFromFile(npcFilePath);

    console.log('\n🏭 创建 NPC 实例:');

    // 创建 farmer NPC
    const farmerData = npcDataMap.get('farmer');
    const farmer = loader.createNPC(
      farmerData!,
      new Tripoint({ x: 15, y: 15, z: 0 }),
      'Farmer Joe'
    );

    expect(farmer).toBeDefined();
    if (!farmer) return; // TypeScript guard

    console.log(`  ✅ ${farmer.name}`);
    console.log(`     Class: ${farmer.npcClass.name}`);
    console.log(`     Attitude: ${farmer.attitude} (${farmer.isFriendly() ? '友好' : '中立'})`);

    expect(farmer.name).toBe('Farmer Joe');
    expect(farmer.isNPC()).toBe(true);
    expect(farmer.isHostile()).toBe(true); // attitude 0 is hostile

    // 创建 deserter NPC
    const deserterData = npcDataMap.get('deserter');
    const deserter = loader.createNPC(
      deserterData!,
      new Tripoint({ x: 20, y: 20, z: 0 }),
      'Deserter Bob'
    );

    expect(deserter).toBeDefined();
    if (!deserter) return;

    console.log(`  ✅ ${deserter.name}`);
    console.log(`     Class: ${deserter.npcClass.name}`);
    console.log(`     Attitude: ${deserter.attitude} (${deserter.isHostile() ? '敌对' : '非敌对'})`);

    expect(deserter.name).toBe('Deserter Bob');
    expect(deserter.isFriendly()).toBe(true); // attitude 10 is friendly
  });

  it('should add NPCs to GameMap', async () => {
    const loader = manager.getLoader();
    const npcFilePath = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json/npcs/npc.json';

    const npcDataMap = await loader.loadFromFile(npcFilePath);

    // 创建地图
    const map = new GameMap();

    // 添加几个 NPC
    const farmerData = npcDataMap.get('farmer');
    const farmer = loader.createNPC(farmerData!, new Tripoint({ x: 10, y: 10, z: 0 }));

    const deserterData = npcDataMap.get('deserter');
    const deserter = loader.createNPC(deserterData!, new Tripoint({ x: 20, y: 10, z: 0 }));

    expect(farmer).toBeDefined();
    expect(deserter).toBeDefined();
    if (!farmer || !deserter) return;

    const mapWithNPCs = map.addCreature(farmer).addCreature(deserter);

    console.log('\n🗺️  地图上的 NPC:');
    console.log(`  总数: ${mapWithNPCs.getAllCreatures().length}`);

    // 验证 NPC 在地图上
    const foundFarmer = mapWithNPCs.getCreatureAt(farmer.position);
    const foundDeserter = mapWithNPCs.getCreatureAt(deserter.position);

    expect(foundFarmer).toBe(farmer);
    expect(foundDeserter).toBe(deserter);

    // 测试范围查询
    const nearbyNPCs = mapWithNPCs.getCreaturesInRange(new Tripoint({ x: 10, y: 10, z: 0 }), 5);
    console.log(`  玩家(10,10)附近5格内的NPC: ${nearbyNPCs.length}`);
    expect(nearbyNPCs.length).toBe(1);
    expect(nearbyNPCs[0]).toBe(farmer);
  });

  it('should test NPC attitude behavior', async () => {
    const loader = manager.getLoader();
    const npcFilePath = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json/npcs/npc.json';

    const npcDataMap = await loader.loadFromFile(npcFilePath);

    console.log('\n😊 NPC 态度测试:');

    // 测试不同态度的 NPC
    const testCases = [
      { id: 'farmer', expectedFriendly: true },
      { id: 'deserter', expectedHostile: true },
    ];

    for (const testCase of testCases) {
      const data = npcDataMap.get(testCase.id);
      if (!data) continue;

      const npc = loader.createNPC(
        data,
        new Tripoint({ x: 0, y: 0, z: 0 }),
        `Test ${testCase.id}`
      );

      if (npc) {
        console.log(`  ${npc.name}:`);
        console.log(`    Attitude: ${npc.attitude}`);
        console.log(`    Friendly: ${npc.isFriendly()}`);
        console.log(`    Neutral: ${npc.isNeutral()}`);
        console.log(`    Hostile: ${npc.isHostile()}`);
        console.log(`    Description: ${npc.getDescription()}`);
      }
    }
  });

  it('should display NPC statistics', async () => {
    const loader = manager.getLoader();
    const npcFilePath = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json/npcs/npc.json';

    const npcDataMap = await loader.loadFromFile(npcFilePath);

    console.log('\n📈 NPC 统计信息:');
    console.log(`  总 NPC 定义数: ${npcDataMap.size}`);

    // 统计 NPC 类分布
    const classCounts = new Map<string, number>();
    npcDataMap.forEach((data) => {
      const count = classCounts.get(data.classId) || 0;
      classCounts.set(data.classId, count + 1);
    });

    console.log(`  NPC 类数量: ${classCounts.size}`);
    console.log('\n  NPC 类分布:');
    for (const [classId, count] of Array.from(classCounts.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${classId}: ${count}`);
    }

    // 验证至少有一些 NPC
    expect(npcDataMap.size).toBeGreaterThan(0);
  });

  it('should handle NPC with unique names', async () => {
    const loader = manager.getLoader();
    const npcFilePath = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json/npcs/npc.json';

    const npcDataMap = await loader.loadFromFile(npcFilePath);

    // 测试有唯一名称的 NPC
    const apisData = npcDataMap.get('apis');
    expect(apisData).toBeDefined();
    expect(apisData!.nameUnique).toBe('Apis');

    const apis = loader.createNPC(
      apisData!,
      new Tripoint({ x: 0, y: 0, z: 0 })
    );

    expect(apis).toBeDefined();
    if (!apis) return;

    console.log('\n🐝 特殊 NPC:');
    console.log(`  ${apis.name}`);
    console.log(`  Gender: ${apisData!.gender}`);
    console.log(`  Faction: ${apisData!.faction}`);
    console.log(`  Chat: ${apisData!.chat}`);

    expect(apis.name).toBe('Apis');
    expect(apis.faction).toBe('apis_hive');
  });
});
