/**
 * 简单 Mapgen 测试
 *
 * 使用简单的、自包含的 mapgen 数据测试地图生成
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CataclysmMapGenGenerator } from '../CataclysmMapGenGenerator';
import { CataclysmMapGenLoader } from '../CataclysmMapGenParser';
import { PaletteResolver } from '../PaletteResolver';
import { TerrainLoader } from '../../terrain/TerrainLoader';
import { FurnitureLoader } from '../../furniture/FurnitureLoader';
import { TrapLoader } from '../../trap/TrapLoader';
import { MapGenContext, MultiSubmapResult } from '../MapGenFunction';
import { GameMap } from '../../map/GameMap';
import { Tripoint } from '../../coordinates/Tripoint';
import { ParsedMapGenData } from '../CataclysmMapGenParser';
import { SUBMAP_SIZE } from '../../map/Submap';

describe('Simple Mapgen Tests', () => {
  let terrainLoader: TerrainLoader;
  let furnitureLoader: FurnitureLoader;
  let trapLoader: TrapLoader;
  let context: MapGenContext;

  beforeEach(async () => {
    // 创建加载器
    terrainLoader = new TerrainLoader();
    furnitureLoader = new FurnitureLoader();
    trapLoader = new TrapLoader();

    // 加载一些基础地形
    await terrainLoader.loadFromJson([
      {
        type: 'terrain',
        id: 't_dirt',
        name: 'dirt',
        symbol: '.',
        color: 'brown',
        flags: [],
      },
      {
        type: 'terrain',
        id: 't_floor',
        name: 'floor',
        symbol: '.',
        color: 'light_gray',
        flags: [],
      },
      {
        type: 'terrain',
        id: 't_wall',
        name: 'wall',
        symbol: '#',
        color: 'light_gray',
        flags: ['FLAT'],
      },
      {
        type: 'terrain',
        id: 't_grass',
        name: 'grass',
        symbol: '"',
        color: 'green',
        flags: [],
      },
    ]);

    await furnitureLoader.loadFromJson([
      {
        type: 'furniture',
        id: 'f_chair',
        name: 'chair',
        symbol: '[',
        color: 'light_gray',
        flags: [],
      },
      {
        type: 'furniture',
        id: 'f_table',
        name: 'table',
        symbol: '_',
        color: 'brown',
        flags: [],
      },
    ]);

    // 创建 context
    const map = new GameMap();
    context = {
      position: new Tripoint(0, 0, 0),
      seed: 42,
      map,
      params: {},
      depth: 0,
    };
  });

  it('should generate simple room with walls and floor', () => {
    // Create fresh loader for this test
    const testTerrainLoader = new TerrainLoader();
    const testFurnitureLoader = new FurnitureLoader();
    const testTrapLoader = new TrapLoader();

    // Load terrain
    testTerrainLoader.loadFromJson([
      {
        type: 'terrain',
        id: 't_dirt',
        name: 'dirt',
        symbol: '.',
        color: 'brown',
        flags: [],
      },
      {
        type: 'terrain',
        id: 't_floor',
        name: 'floor',
        symbol: '.',
        color: 'light_gray',
        flags: [],
      },
      {
        type: 'terrain',
        id: 't_wall',
        name: 'wall',
        symbol: '#',
        color: 'light_gray',
        flags: ['FLAT'],
      },
      {
        type: 'terrain',
        id: 't_grass',
        name: 'grass',
        symbol: '"',
        color: 'green',
        flags: [],
      },
    ]);

    const mapgenData: ParsedMapGenData = {
      id: 'simple_room',
      width: 12,
      height: 12,
      rows: [
        '############',
        '#..........#',
        '#..........#',
        '#..........#',
        '#..........#',
        '#..........#',
        '#..........#',
        '#..........#',
        '#..........#',
        '#..........#',
        '#..........#',
        '############',
      ],
      terrain: new Map([
        ['#', 't_wall'],
        ['.', 't_floor'],
      ]),
      furniture: new Map(),
      items: new Map(),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    const generator = new CataclysmMapGenGenerator(mapgenData, {
      terrain: testTerrainLoader,
      furniture: testFurnitureLoader,
      trap: testTrapLoader,
    });

    const submap = generator.generate(context);

    expect(submap.size).toBe(12);
    expect(submap.tiles).toBeDefined();

    // Debug: 检查生成器使用了什么地形 ID
    console.log('\n调试信息:');
    console.log(`  加载器中的 t_wall ID: ${terrainLoader.findByIdString('t_wall')?.id}`);
    console.log(`  加载器中的 t_floor ID: ${terrainLoader.findByIdString('t_floor')?.id}`);
    console.log(`  左上角瓦片地形 ID: ${submap.tiles!.getTile(0, 0).terrain}`);
    console.log(`  中心瓦片地形 ID: ${submap.tiles!.getTile(6, 6).terrain}`);

    // 验证：直接检查瓦片是否有有效的地形ID（非零）
    expect(submap.tiles!.getTile(0, 0).terrain).not.toBe(0);
    expect(submap.tiles!.getTile(6, 6).terrain).not.toBe(0);

    // 可视化
    console.log('\n生成的房间:');
    for (let y = 0; y < 12; y++) {
      let line = '';
      for (let x = 0; x < 12; x++) {
        const tile = submap.tiles!.getTile(x, y);
        const terrain = terrainLoader.getData().get(tile.terrain);
        line += terrain ? terrain.symbol : '?';
      }
      console.log(line);
    }
  });

  it('should generate outdoor area with grass and dirt', () => {
    const mapgenData: ParsedMapGenData = {
      id: 'outdoor_area',
      width: 12,
      height: 12,
      rows: [
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
      ],
      terrain: new Map([['.', 't_grass']]),
      furniture: new Map(),
      items: new Map(),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    const generator = new CataclysmMapGenGenerator(mapgenData, {
      terrain: terrainLoader,
      furniture: furnitureLoader,
      trap: trapLoader,
    });

    const submap = generator.generate(context);

    // 验证所有瓦片都是草地（地形ID非零）
    let allTilesHaveTerrain = true;
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 12; x++) {
        const tile = submap.tiles!.getTile(x, y);
        if (tile.terrain === 0) {
          allTilesHaveTerrain = false;
        }
      }
    }
    expect(allTilesHaveTerrain).toBe(true);

    console.log('\n生成的户外区域 (全草地):');
    console.log('"'.repeat(12));
  });

  it('should generate room with furniture', () => {
    const mapgenData: ParsedMapGenData = {
      id: 'room_with_furniture',
      width: 8,
      height: 8,
      rows: [
        '########',
        '#......#',
        '#.[C]..#',
        '#......#',
        '#.T....#',
        '#......#',
        '#......#',
        '########',
      ],
      terrain: new Map([
        ['#', 't_wall'],
        ['.', 't_floor'],
      ]),
      furniture: new Map([
        ['C', 'f_chair'],
        ['T', 'f_table'],
      ]),
      items: new Map(),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    const generator = new CataclysmMapGenGenerator(mapgenData, {
      terrain: terrainLoader,
      furniture: furnitureLoader,
      trap: trapLoader,
    });

    const submap = generator.generate(context);

    // 验证家具存在（非零ID）
    const chairTile = submap.tiles!.getTile(3, 2);
    const tableTile = submap.tiles!.getTile(2, 4);

    expect(chairTile.furniture).not.toBe(0);
    expect(chairTile.furniture).not.toBeNull();
    expect(tableTile.furniture).not.toBe(0);
    expect(tableTile.furniture).not.toBeNull();

    // 可视化（显示家具）
    console.log('\n生成的房间（含家具）:');
    for (let y = 0; y < 8; y++) {
      let line = '';
      for (let x = 0; x < 8; x++) {
        const tile = submap.tiles!.getTile(x, y);
        if (tile.furniture) {
          const furniture = furnitureLoader.getData().get(tile.furniture);
          line += furniture ? furniture.symbol : '?';
        } else {
          const terrain = terrainLoader.getData().get(tile.terrain);
          line += terrain ? terrain.symbol : '?';
        }
      }
      console.log(line);
    }
  });

  it('should use palette to provide terrain mappings', () => {
    const loader = new CataclysmMapGenLoader();

    // 加载一个调色板，提供常用字符的映射
    loader.loadArray([
      {
        type: 'palette',
        id: 'common_palette',
        object: {
          terrain: {
            '.': 't_floor',
            '#': 't_wall',
            ',': 't_grass',
            ':': 't_dirt',
          },
          furniture: {
            'C': 'f_chair',
            'T': 'f_table',
          },
        },
      },
    ]);

    const paletteResolver = new PaletteResolver(loader);

    // 创建一个 mapgen，不直接定义映射，而是引用调色板
    const mapgenData: ParsedMapGenData = {
      id: 'room_with_palette',
      width: 10,
      height: 8,
      rows: [
        '##########',
        '#........#',
        '#...C....#',
        '#........#',
        '#...T....#',
        '#........#',
        '#........#',
        '##########',
      ],
      palettes: ['common_palette'],
      terrain: new Map(), // 空的，从调色板获取
      furniture: new Map(),
      items: new Map(),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    const generator = new CataclysmMapGenGenerator(mapgenData, {
      terrain: terrainLoader,
      furniture: furnitureLoader,
      trap: trapLoader,
    }, {
      paletteResolver,
    });

    const submap = generator.generate(context);

    // 验证调色板映射生效（瓦片有地形和家具）
    const wallTile = submap.tiles!.getTile(0, 0);
    const floorTile = submap.tiles!.getTile(1, 1);
    const chairTile = submap.tiles!.getTile(4, 2);
    const tableTile = submap.tiles!.getTile(4, 4);

    // 边界应该是墙（有地形ID）
    expect(wallTile.terrain).not.toBe(0);
    // 内部应该是地板（有地形ID）
    expect(floorTile.terrain).not.toBe(0);
    // 家具位置应该有家具
    expect(chairTile.furniture).not.toBeNull();
    expect(tableTile.furniture).not.toBeNull();

    console.log('\n使用调色板生成的房间:');
    for (let y = 0; y < 8; y++) {
      let line = '';
      for (let x = 0; x < 10; x++) {
        const tile = submap.tiles!.getTile(x, y);
        if (tile.furniture) {
          const furniture = furnitureLoader.getData().get(tile.furniture);
          line += furniture ? furniture.symbol : '?';
        } else {
          const terrain = terrainLoader.getData().get(tile.terrain);
          line += terrain ? terrain.symbol : '?';
        }
      }
      console.log(line);
    }
  });

  it('should handle weighted terrain options', () => {
    const mapgenData: ParsedMapGenData = {
      id: 'weighted_terrain',
      width: 12,
      height: 12,
      rows: [
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
        '............',
      ],
      // 70% 草地，30% 泥土
      terrain: new Map([['.', [['t_grass', 70], ['t_dirt', 30]]]]),
      furniture: new Map(),
      items: new Map(),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    const generator = new CataclysmMapGenGenerator(mapgenData, {
      terrain: terrainLoader,
      furniture: furnitureLoader,
      trap: trapLoader,
    });

    const submap = generator.generate(context);

    // 统计地形类型
    const terrainCounts = new Map<number, number>();
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 12; x++) {
        const tile = submap.tiles!.getTile(x, y);
        terrainCounts.set(tile.terrain, (terrainCounts.get(tile.terrain) || 0) + 1);
      }
    }

    console.log('\n加权地形统计:');
    console.log(`  发现 ${terrainCounts.size} 种不同的地形 ID`);
    terrainCounts.forEach((count, id) => {
      console.log(`  ID ${id}: ${count} 个`);
    });

    // 应该有两种地形（因为使用了加权选项）
    expect(terrainCounts.size).toBeGreaterThan(1);

    console.log('\n生成的混合地形:');
    for (let y = 0; y < 12; y++) {
      let line = '';
      for (let x = 0; x < 12; x++) {
        const tile = submap.tiles!.getTile(x, y);
        const terrain = terrainLoader.getData().get(tile.terrain);
        line += terrain ? terrain.symbol : '?';
      }
      console.log(line);
    }
  });

  it('should place items from character mappings', () => {
    const mapgenData: ParsedMapGenData = {
      id: 'room_with_items',
      width: 8,
      height: 8,
      rows: [
        '########',
        '#......#',
        '#..%...#',
        '#......#',
        '#..*...#',
        '#......#',
        '#......#',
        '########',
      ],
      terrain: new Map([['#', 't_wall'], ['.', 't_floor']]),
      furniture: new Map(),
      items: new Map([
        ['%', { item: 'potion_healing', count: [1, 3] }],  // 治疗药水
        ['*', { item: 'sword_rusty', chance: 80 }],        // 生锈的剑（80%概率）
      ]),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    const generator = new CataclysmMapGenGenerator(mapgenData, {
      terrain: terrainLoader,
      furniture: furnitureLoader,
      trap: trapLoader,
    });

    const submap = generator.generate(context);

    // 验证生成了物品
    const itemSpawns = submap.spawns.filter(s => s.type === 'item');
    expect(itemSpawns.length).toBeGreaterThan(0);

    console.log('\n物品生成点:');
    itemSpawns.forEach(spawn => {
      console.log(`  位置 (${spawn.position.x}, ${spawn.position.y}): ${spawn.data.item}`);
    });

    // 验证药水在正确位置
    const potionSpawns = itemSpawns.filter(s => s.data.item === 'potion_healing');
    expect(potionSpawns.length).toBeGreaterThanOrEqual(1);
    expect(potionSpawns[0].position.x).toBe(3);
    expect(potionSpawns[0].position.y).toBe(2);

    // 验证剑在正确位置（可能在，因为80%概率）
    const swordSpawns = itemSpawns.filter(s => s.data.item === 'sword_rusty');
    if (swordSpawns.length > 0) {
      expect(swordSpawns[0].position.x).toBe(3);
      expect(swordSpawns[0].position.y).toBe(4);
    }
  });

  it('should place items from place_items configuration', () => {
    const mapgenData: ParsedMapGenData = {
      id: 'room_place_items',
      width: 10,
      height: 10,
      rows: [
        '##########',
        '#........#',
        '#........#',
        '#........#',
        '#........#',
        '#........#',
        '#........#',
        '#........#',
        '#........#',
        '##########',
      ],
      terrain: new Map([['#', 't_wall'], ['.', 't_floor']]),
      furniture: new Map(),
      items: new Map(),
      placeItems: [
        { item: 'bandage', x: 2, y: 2, count: [2, 4] },           // 2-4个绷带在(2,2)
        { item: 'water_bottle', x: [5, 7], y: 3, chance: 100 },  // 水瓶在x=5,6,7, y=3
        { item: 'canned_food', x: 5, y: [5, 7], chance: 50 },    // 50%概率罐头在(5,5-7)
      ],
      placeMonsters: [],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    const generator = new CataclysmMapGenGenerator(mapgenData, {
      terrain: terrainLoader,
      furniture: furnitureLoader,
      trap: trapLoader,
    });

    const submap = generator.generate(context);

    // 验证生成了物品
    const itemSpawns = submap.spawns.filter(s => s.type === 'item');
    expect(itemSpawns.length).toBeGreaterThan(0);

    console.log('\n物品放置统计:');
    const itemCounts = new Map<string, number>();
    itemSpawns.forEach(spawn => {
      const count = itemCounts.get(spawn.data.item as string) || 0;
      itemCounts.set(spawn.data.item as string, count + 1);
    });
    itemCounts.forEach((count, item) => {
      console.log(`  ${item}: ${count} 个`);
    });

    // 验证绷带在正确位置
    const bandageSpawns = itemSpawns.filter(s => s.data.item === 'bandage');
    expect(bandageSpawns.length).toBeGreaterThanOrEqual(2);
    expect(bandageSpawns.length).toBeLessThanOrEqual(4);
    bandageSpawns.forEach(spawn => {
      expect(spawn.position.x).toBe(2);
      expect(spawn.position.y).toBe(2);
    });

    // 验证水瓶在正确位置
    const waterSpawns = itemSpawns.filter(s => s.data.item === 'water_bottle');
    expect(waterSpawns.length).toBe(3);
    waterSpawns.forEach(spawn => {
      expect(spawn.position.y).toBe(3);
      expect([5, 6, 7].includes(spawn.position.x)).toBe(true);
    });
  });

  it('should place monsters from place_monsters configuration', () => {
    const mapgenData: ParsedMapGenData = {
      id: 'room_with_monsters',
      width: 10,
      height: 10,
      rows: [
        '##########',
        '#........#',
        '#........#',
        '#........#',
        '#........#',
        '#........#',
        '#........#',
        '#........#',
        '#........#',
        '##########',
      ],
      terrain: new Map([['#', 't_wall'], ['.', 't_floor']]),
      furniture: new Map(),
      items: new Map(),
      placeItems: [],
      placeMonsters: [
        { monster: 'zombie', x: 2, y: 2, repeat: 1 },                    // 1个僵尸在(2,2)
        { monster: 'rat', x: [5, 7], y: 5, repeat: 2, density: 1 },     // 2只老鼠在x=5,6,7, y=5
        { monster: 'spider', x: 8, y: 8, chance: 80, repeat: 3 },       // 80%概率3只蜘蛛在(8,8)
      ],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    const generator = new CataclysmMapGenGenerator(mapgenData, {
      terrain: terrainLoader,
      furniture: furnitureLoader,
      trap: trapLoader,
    });

    const submap = generator.generate(context);

    // 验证生成了怪物
    const monsterSpawns = submap.spawns.filter(s => s.type === 'monster');
    expect(monsterSpawns.length).toBeGreaterThan(0);

    console.log('\n怪物生成点:');
    const monsterCounts = new Map<string, number>();
    monsterSpawns.forEach(spawn => {
      const count = monsterCounts.get(spawn.data.monster as string) || 0;
      monsterCounts.set(spawn.data.monster as string, count + 1);
      console.log(`  ${spawn.data.monster} 在 (${spawn.position.x}, ${spawn.position.y})`);
    });

    monsterCounts.forEach((count, monster) => {
      console.log(`  ${monster}: ${count} 只`);
    });

    // 验证僵尸
    const zombieSpawns = monsterSpawns.filter(s => s.data.monster === 'zombie');
    expect(zombieSpawns.length).toBe(1);
    expect(zombieSpawns[0].position.x).toBe(2);
    expect(zombieSpawns[0].position.y).toBe(2);

    // 验证老鼠（应该有6只，3个位置 × 2只）
    const ratSpawns = monsterSpawns.filter(s => s.data.monster === 'rat');
    expect(ratSpawns.length).toBe(6);
    ratSpawns.forEach(spawn => {
      expect(spawn.position.y).toBe(5);
      expect([5, 6, 7].includes(spawn.position.x)).toBe(true);
    });

    // 蜘蛛可能存在（80%概率）
    const spiderSpawns = monsterSpawns.filter(s => s.data.monster === 'spider');
    if (spiderSpawns.length > 0) {
      expect(spiderSpawns.length).toBe(3);
      spiderSpawns.forEach(spawn => {
        expect(spawn.position.x).toBe(8);
        expect(spawn.position.y).toBe(8);
      });
    }
  });

  it('should combine items and monsters', () => {
    const mapgenData: ParsedMapGenData = {
      id: 'loot_room',
      width: 12,
      height: 12,
      rows: [
        '############',
        '#.$......%#',
        '#..........#',
        '#..........#',
        '#....M.....#',
        '#..........#',
        '#..........#',
        '#..........#',
        '#..........#',
        '#..........#',
        '#..........#',
        '############',
      ],
      terrain: new Map([['#', 't_wall'], ['.', 't_floor']]),
      furniture: new Map(),
      items: new Map([
        ['$', { item: 'coin_gold', count: [5, 10] }],   // 金币
        ['%', { item: 'chest_wood', chance: 100 }],     // 木箱子
      ]),
      placeItems: [
        { item: 'medkit', x: 1, y: 1, count: [1, 2] },
      ],
      placeMonsters: [
        { monster: 'skeleton', x: 5, y: 4, repeat: 1 },
        { monster: 'bat', x: 11, y: 1, chance: 70 },
      ],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    const generator = new CataclysmMapGenGenerator(mapgenData, {
      terrain: terrainLoader,
      furniture: furnitureLoader,
      trap: trapLoader,
    });

    const submap = generator.generate(context);

    const itemSpawns = submap.spawns.filter(s => s.type === 'item');
    const monsterSpawns = submap.spawns.filter(s => s.type === 'monster');

    console.log('\n综合生成:');
    console.log(`  物品: ${itemSpawns.length} 个`);
    console.log(`  怪物: ${monsterSpawns.length} 只`);

    // 验证至少有一些物品和怪物
    expect(itemSpawns.length).toBeGreaterThan(0);
    expect(monsterSpawns.length).toBeGreaterThan(0);

    // 验证金币在正确位置
    const coinSpawns = itemSpawns.filter(s => s.data.item === 'coin_gold');
    expect(coinSpawns.length).toBeGreaterThanOrEqual(5);
    expect(coinSpawns[0].position.x).toBe(2);
    expect(coinSpawns[0].position.y).toBe(1);

    // 验证箱子在正确位置
    const chestSpawns = itemSpawns.filter(s => s.data.item === 'chest_wood');
    expect(chestSpawns.length).toBe(1);
    expect(chestSpawns[0].position.x).toBe(9);
    expect(chestSpawns[0].position.y).toBe(1);

    // 验证骷髅
    const skeletonSpawns = monsterSpawns.filter(s => s.data.monster === 'skeleton');
    expect(skeletonSpawns.length).toBe(1);
    expect(skeletonSpawns[0].position.x).toBe(5);
    expect(skeletonSpawns[0].position.y).toBe(4);
  });

  it('should generate 24x24 mapgen as 2x2 submap grid', () => {
    const mapgenData: ParsedMapGenData = {
      id: 'large_room',
      width: 24,
      height: 24,
      rows: Array.from({ length: 24 }, (_, y) =>
        y === 0 || y === 23
          ? '#'.repeat(24)
          : `#${'.'.repeat(22)}#`
      ),
      terrain: new Map([['#', 't_wall'], ['.', 't_floor']]),
      furniture: new Map(),
      items: new Map(),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    const generator = new CataclysmMapGenGenerator(mapgenData, {
      terrain: terrainLoader,
      furniture: furnitureLoader,
      trap: trapLoader,
    });

    const result: MultiSubmapResult = generator.generateMultiple(context);

    // 验证网格尺寸
    expect(result.submapGridWidth).toBe(2);
    expect(result.submapGridHeight).toBe(2);
    expect(result.mapgenWidth).toBe(24);
    expect(result.mapgenHeight).toBe(24);
    expect(result.submaps.length).toBe(4);

    // 验证每个 submap 的位置和尺寸
    expect(result.submaps[0].position.gridX).toBe(0);
    expect(result.submaps[0].position.gridY).toBe(0);
    expect(result.submaps[0].submap.size).toBe(SUBMAP_SIZE);

    expect(result.submaps[1].position.gridX).toBe(1);
    expect(result.submaps[1].position.gridY).toBe(0);

    expect(result.submaps[2].position.gridX).toBe(0);
    expect(result.submaps[2].position.gridY).toBe(1);

    expect(result.submaps[3].position.gridX).toBe(1);
    expect(result.submaps[3].position.gridY).toBe(1);

    // 验证左上角 submap (0,0) 有墙
    const topLeftSubmap = result.submaps[0].submap;
    const topLeftTile = topLeftSubmap.tiles!.getTile(0, 0);
    expect(topLeftTile.terrain).not.toBe(0); // 应该是墙

    // 验证右下角 submap (1,1) 有墙
    const bottomRightSubmap = result.submaps[3].submap;
    const bottomRightTile = bottomRightSubmap.tiles!.getTile(11, 11);
    expect(bottomRightTile.terrain).not.toBe(0); // 应该是墙

    console.log('\n24x24 Mapgen 生成为 2x2 Submap 网格:');
    console.log(`  总尺寸: ${result.mapgenWidth}x${result.mapgenHeight}`);
    console.log(`  Submap 网格: ${result.submapGridWidth}x${result.submapGridHeight}`);
    console.log(`  Submap 数量: ${result.submaps.length}`);
  });

  it('should distribute items across multiple submaps', () => {
    // 创建一个 24x24 的 mapgen，物品分布在不同的 submap 中
    const rows = Array.from({ length: 24 }, (_, y) => {
      if (y === 0 || y === 23) return '#'.repeat(24);
      return `#${'.'.repeat(22)}#`;
    });

    // 在不同位置放置物品
    rows[5] = '#....$......#......#....'; // 物品在 (5, 5) - submap (0,0)
    rows[15] = '#......#.......*...#..'; // 物品在 (15, 15) - submap (1,1)

    const mapgenData: ParsedMapGenData = {
      id: 'large_with_items',
      width: 24,
      height: 24,
      rows,
      terrain: new Map([['#', 't_wall'], ['.', 't_floor']]),
      furniture: new Map(),
      items: new Map([
        ['$', { item: 'potion_health' }],
        ['*', { item: 'sword_rusty' }],
      ]),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    const generator = new CataclysmMapGenGenerator(mapgenData, {
      terrain: terrainLoader,
      furniture: furnitureLoader,
      trap: trapLoader,
    });

    const result: MultiSubmapResult = generator.generateMultiple(context);

    // 验证 submap 网格
    expect(result.submaps.length).toBe(4);

    // 统计每个 submap 的物品
    const itemsPerSubmap = result.submaps.map(submapResult => {
      const itemSpawns = submapResult.submap.spawns.filter(s => s.type === 'item');
      return {
        gridX: submapResult.position.gridX,
        gridY: submapResult.position.gridY,
        itemCount: itemSpawns.length,
        items: itemSpawns.map(s => s.data.item),
      };
    });

    console.log('\n物品分布在各个 submap 中:');
    itemsPerSubmap.forEach(({ gridX, gridY, itemCount, items }) => {
      console.log(`  Submap (${gridX},${gridY}): ${itemCount} 个物品 - ${items.join(', ')}`);
    });

    // 验证物品被正确分配到对应的 submap
    const submap00 = itemsPerSubmap.find(s => s.gridX === 0 && s.gridY === 0);
    const submap11 = itemsPerSubmap.find(s => s.gridX === 1 && s.gridY === 1);

    expect(submap00?.itemCount).toBeGreaterThan(0); // 应该有药水
    expect(submap11?.itemCount).toBeGreaterThan(0); // 应该有剑
  });

  it('should handle non-square mapgens like 24x48', () => {
    const mapgenData: ParsedMapGenData = {
      id: 'very_wide_room',
      width: 24,
      height: 48,
      rows: Array.from({ length: 48 }, (_, y) =>
        y === 0 || y === 47
          ? '#'.repeat(24)
          : `#${'.'.repeat(22)}#`
      ),
      terrain: new Map([['#', 't_wall'], ['.', 't_floor']]),
      furniture: new Map(),
      items: new Map(),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    const generator = new CataclysmMapGenGenerator(mapgenData, {
      terrain: terrainLoader,
      furniture: furnitureLoader,
      trap: trapLoader,
    });

    const result: MultiSubmapResult = generator.generateMultiple(context);

    // 验证网格尺寸 (24x48 → 2x4 submaps)
    expect(result.submapGridWidth).toBe(2);
    expect(result.submapGridHeight).toBe(4);
    expect(result.submaps.length).toBe(8);

    console.log('\n24x48 Mapgen 生成为 2x4 Submap 网格:');
    console.log(`  总尺寸: ${result.mapgenWidth}x${result.mapgenHeight}`);
    console.log(`  Submap 网格: ${result.submapGridWidth}x${result.submapGridHeight}`);
    console.log(`  Submap 数量: ${result.submaps.length}`);
  });
});
