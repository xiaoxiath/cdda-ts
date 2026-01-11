/**
 * Nested Mapgen Tests
 *
 * 测试嵌套 mapgen 功能，验证 mapgen 可以引用其他 mapgen (chunks)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CataclysmMapGenGenerator } from '../CataclysmMapGenGenerator';
import { CataclysmMapGenLoader } from '../CataclysmMapGenParser';
import { PaletteResolver } from '../PaletteResolver';
import { TerrainLoader } from '../../terrain/TerrainLoader';
import { FurnitureLoader } from '../../furniture/FurnitureLoader';
import { TrapLoader } from '../../trap/TrapLoader';
import { MapGenContext } from '../MapGenFunction';
import { GameMap } from '../../map/GameMap';
import { Tripoint } from '../../coordinates/Tripoint';
import { ParsedMapGenData } from '../CataclysmMapGenParser';

describe('Nested Mapgen Tests', () => {
  let terrainLoader: TerrainLoader;
  let furnitureLoader: FurnitureLoader;
  let trapLoader: TrapLoader;
  let mapgenLoader: CataclysmMapGenLoader;
  let context: MapGenContext;

  beforeEach(async () => {
    // 创建加载器
    terrainLoader = new TerrainLoader();
    furnitureLoader = new FurnitureLoader();
    trapLoader = new TrapLoader();
    mapgenLoader = new CataclysmMapGenLoader();

    // 加载基础地形
    await terrainLoader.loadFromJson([
      { type: 'terrain', id: 't_dirt', name: 'dirt', symbol: ':', color: 'brown', flags: [] },
      { type: 'terrain', id: 't_floor', name: 'floor', symbol: '.', color: 'light_gray', flags: [] },
      { type: 'terrain', id: 't_wall', name: 'wall', symbol: '#', color: 'light_gray', flags: ['FLAT'] },
      { type: 'terrain', id: 't_grass', name: 'grass', symbol: '"', color: 'green', flags: [] },
      { type: 'terrain', id: 't_roof', name: 'roof', symbol: 'x', color: 'dark_gray', flags: [] },
      { type: 'terrain', id: 't_water', name: 'water', symbol: '~', color: 'blue', flags: [] },
      { type: 'terrain', id: 't_door_c', name: 'door', symbol: '+', color: 'brown', flags: [] },
    ]);

    await furnitureLoader.loadFromJson([
      { type: 'furniture', id: 'f_chair', name: 'chair', symbol: '[', color: 'light_gray', flags: [] },
      { type: 'furniture', id: 'f_table', name: 'table', symbol: '_', color: 'brown', flags: [] },
      { type: 'furniture', id: 'f_bed', name: 'bed', symbol: '\\', color: 'white', flags: [] },
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

  it('should generate nested mapgen with single chunk', () => {
    console.log('\n🧩 测试简单嵌套 mapgen (单个 chunk)\n');

    // 创建一个 chunk mapgen (屋顶片段)
    const roofChunkData: ParsedMapGenData = {
      id: 'test_roof_chunk',
      width: 4,
      height: 4,
      rows: [
        'xxxx',
        'xxxx',
        'xxxx',
        'xxxx',
      ],
      terrain: new Map([['x', 't_roof']]),
      furniture: new Map(),
      items: new Map(),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    // 创建主 mapgen，其中 '.' 字符引用嵌套的屋顶 chunk
    const mainMapgenData: ParsedMapGenData = {
      id: 'house_with_roof',
      width: 8,
      height: 8,
      rows: [
        '........',
        '........',
        '........',
        '........',
        '####....',
        '#......#',
        '#......#',
        '########',
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
      nested: new Map([
        ['.', { chunk: 'test_roof_chunk' }],
      ]),
      flags: new Set(),
      raw: {} as any,
    };

    // 注册 chunk 到 loader
    mapgenLoader.register(roofChunkData);
    mapgenLoader.register(mainMapgenData);

    // 创建生成器（需要传入 mapgenLoader 才能解析嵌套）
    const generator = new CataclysmMapGenGenerator(mainMapgenData, {
      terrain: terrainLoader,
      furniture: furnitureLoader,
      trap: trapLoader,
    }, {
      mapgenLoader,
    });

    const submap = generator.generate(context);

    console.log('生成的嵌套 mapgen:');
    for (let y = 0; y < 8; y++) {
      let line = '';
      for (let x = 0; x < 8; x++) {
        const tile = submap.tiles!.getTile(x, y);
        const terrain = terrainLoader.getData().get(tile.terrain);
        line += terrain ? terrain.symbol : '?';
      }
      console.log(line);
    }

    // 验证：所有 '.' 字符都应该被嵌套的 roof chunk 替换
    const roofTile = submap.tiles!.getTile(0, 0);
    const roofTerrain = terrainLoader.getData().get(roofTile.terrain);
    expect(roofTerrain?.name).toBe('roof');

    // 墙壁部分仍然是墙
    const wallTile = submap.tiles!.getTile(0, 4);
    const wallTerrain = terrainLoader.getData().get(wallTile.terrain);
    expect(wallTerrain?.name).toBe('wall');

    // 位置 (1, 5) 是 '.'，所以应该也是屋顶（嵌套映射）
    const floorTile = submap.tiles!.getTile(1, 5);
    const floorTerrain = terrainLoader.getData().get(floorTile.terrain);
    expect(floorTerrain?.name).toBe('roof');  // 修改：因为 '.' 有嵌套映射到 roof chunk

    console.log('\n✅ 嵌套 mapgen 生成成功');
  });

  it('should handle weighted nested chunk selection', () => {
    console.log('\n🎲 测试加权嵌套 chunk 选择\n');

    // 创建两个不同的 chunk
    const grassChunkData: ParsedMapGenData = {
      id: 'grass_chunk',
      width: 2,
      height: 2,
      rows: [
        '::',
        '::',
      ],
      terrain: new Map([[':', 't_dirt']]),
      furniture: new Map(),
      items: new Map(),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    const waterChunkData: ParsedMapGenData = {
      id: 'water_chunk',
      width: 2,
      height: 2,
      rows: [
        '~~',
        '~~',
      ],
      terrain: new Map([['~', 't_water']]),
      furniture: new Map(),
      items: new Map(),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    // 主 mapgen，使用加权选项
    const mainMapgenData: ParsedMapGenData = {
      id: 'weighted_chunks',
      width: 6,
      height: 6,
      rows: [
        '......',
        '......',
        '......',
        '......',
        '......',
        '......',
      ],
      terrain: new Map([['.', 't_grass']]),
      furniture: new Map(),
      items: new Map(),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      nested: new Map([
        ['.', { chunks: [['grass_chunk', 70], ['water_chunk', 30]] }],
      ]),
      flags: new Set(),
      raw: {} as any,
    };

    mapgenLoader.register(grassChunkData);
    mapgenLoader.register(waterChunkData);
    mapgenLoader.register(mainMapgenData);

    const generator = new CataclysmMapGenGenerator(mainMapgenData, {
      terrain: terrainLoader,
      furniture: furnitureLoader,
      trap: trapLoader,
    }, {
      mapgenLoader,
    });

    const submap = generator.generate(context);

    console.log('生成的加权 chunk 地图:');
    for (let y = 0; y < 6; y++) {
      let line = '';
      for (let x = 0; x < 6; x++) {
        const tile = submap.tiles!.getTile(x, y);
        const terrain = terrainLoader.getData().get(tile.terrain);
        line += terrain ? terrain.symbol : '?';
      }
      console.log(line);
    }

    // 统计地形类型
    let dirtCount = 0;
    let waterCount = 0;
    let grassCount = 0;

    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        const tile = submap.tiles!.getTile(x, y);
        const terrain = terrainLoader.getData().get(tile.terrain);
        if (terrain) {
          if (terrain.name === 'dirt') dirtCount++;
          else if (terrain.name === 'water') waterCount++;
          else if (terrain.name === 'grass') grassCount++;
        }
      }
    }

    console.log(`\n地形统计:`);
    console.log(`  泥土: ${dirtCount} 块`);
    console.log(`  水: ${waterCount} 块`);
    console.log(`  草: ${grassCount} 块`);

    // 验证至少有一些地形生成
    expect(dirtCount + waterCount).toBeGreaterThan(0);

    console.log('\n✅ 加权 chunk 选择成功');
  });

  it('should handle nested mapgen with offsets (x_delta, y_delta)', () => {
    console.log('\n📐 测试带偏移的嵌套 mapgen\n');

    // 创建一个 4x4 的 pattern chunk
    const patternChunkData: ParsedMapGenData = {
      id: 'pattern_chunk',
      width: 4,
      height: 4,
      rows: [
        'AB##',
        'AB##',
        '####',
        '####',
      ],
      terrain: new Map([
        ['#', 't_wall'],
        ['A', 't_floor'],
        ['B', 't_water'],
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

    // 主 mapgen，使用 x_delta 和 y_delta
    const mainMapgenData: ParsedMapGenData = {
      id: 'offset_chunks',
      width: 8,
      height: 8,
      rows: [
        '........',
        '........',
        '........',
        '........',
        '........',
        '........',
        '........',
        '........',
      ],
      terrain: new Map([['.', 't_grass']]),
      furniture: new Map(),
      items: new Map(),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      // 每个位置都使用不同的偏移从 chunk 中取瓦片
      nested: new Map([
        ['.', {
          chunk: 'pattern_chunk',
          x_delta: 0,
          y_delta: 0,
        }],
      ]),
      flags: new Set(),
      raw: {} as any,
    };

    mapgenLoader.register(patternChunkData);
    mapgenLoader.register(mainMapgenData);

    const generator = new CataclysmMapGenGenerator(mainMapgenData, {
      terrain: terrainLoader,
      furniture: furnitureLoader,
      trap: trapLoader,
    }, {
      mapgenLoader,
    });

    const submap = generator.generate(context);

    console.log('生成的偏移 chunk 地图 (所有位置都取 chunk 的 0,0 位置):');
    for (let y = 0; y < 8; y++) {
      let line = '';
      for (let x = 0; x < 8; x++) {
        const tile = submap.tiles!.getTile(x, y);
        const terrain = terrainLoader.getData().get(tile.terrain);
        line += terrain ? terrain.symbol : '?';
      }
      console.log(line);
    }

    // 验证：所有位置都应该是地板（因为都取 chunk 的 0,0）
    const sampleTile = submap.tiles!.getTile(0, 0);
    const sampleTerrain = terrainLoader.getData().get(sampleTile.terrain);
    expect(sampleTerrain?.name).toBe('floor');

    console.log('\n✅ 偏移嵌套 mapgen 成功');
  });

  it('should fall back to default terrain when chunk not found', () => {
    console.log('\n⚠️ 测试缺失 chunk 的回退处理\n');

    const mainMapgenData: ParsedMapGenData = {
      id: 'missing_chunk',
      width: 6,
      height: 6,
      rows: [
        '......',
        '......',
        '......',
        '......',
        '......',
        '......',
      ],
      terrain: new Map([['.', 't_grass']]),
      furniture: new Map(),
      items: new Map(),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      // 引用一个不存在的 chunk
      nested: new Map([
        ['.', { chunk: 'nonexistent_chunk' }],
      ]),
      flags: new Set(),
      raw: {} as any,
    };

    mapgenLoader.register(mainMapgenData);

    const generator = new CataclysmMapGenGenerator(mainMapgenData, {
      terrain: terrainLoader,
      furniture: furnitureLoader,
      trap: trapLoader,
    }, {
      mapgenLoader,
    });

    const submap = generator.generate(context);

    console.log('生成的地图 (缺失 chunk，应使用默认):');

    // 验证：瓦片应该有有效的地形（使用默认映射）
    let hasValidTerrain = false;
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        const tile = submap.tiles!.getTile(x, y);
        if (tile.terrain !== 0) {
          hasValidTerrain = true;
        }
      }
    }

    expect(hasValidTerrain).toBe(true);
    console.log('✅ 缺失 chunk 回退处理成功');
  });

  it('should handle chunks_list for random chunk selection', () => {
    console.log('\n🎰 测试 chunks_list 随机选择\n');

    // 创建三个不同的 chunk
    const chunk1Data: ParsedMapGenData = {
      id: 'chunk_A',
      width: 2,
      height: 2,
      rows: ['AA', 'AA'],
      terrain: new Map([['A', 't_floor']]),
      furniture: new Map(),
      items: new Map(),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    const chunk2Data: ParsedMapGenData = {
      id: 'chunk_B',
      width: 2,
      height: 2,
      rows: ['BB', 'BB'],
      terrain: new Map([['B', 't_water']]),
      furniture: new Map(),
      items: new Map(),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    const chunk3Data: ParsedMapGenData = {
      id: 'chunk_C',
      width: 2,
      height: 2,
      rows: ['CC', 'CC'],
      terrain: new Map([['C', 't_roof']]),
      furniture: new Map(),
      items: new Map(),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      nested: new Map(),
      flags: new Set(),
      raw: {} as any,
    };

    const mainMapgenData: ParsedMapGenData = {
      id: 'random_chunks',
      width: 6,
      height: 6,
      rows: [
        '......',
        '......',
        '......',
        '......',
        '......',
        '......',
      ],
      terrain: new Map([['.', 't_grass']]),
      furniture: new Map(),
      items: new Map(),
      placeItems: [],
      placeMonsters: [],
      placeNested: [],
      nested: new Map([
        ['.', { chunks_list: ['chunk_A', 'chunk_B', 'chunk_C'] }],
      ]),
      flags: new Set(),
      raw: {} as any,
    };

    mapgenLoader.register(chunk1Data);
    mapgenLoader.register(chunk2Data);
    mapgenLoader.register(chunk3Data);
    mapgenLoader.register(mainMapgenData);

    const generator = new CataclysmMapGenGenerator(mainMapgenData, {
      terrain: terrainLoader,
      furniture: furnitureLoader,
      trap: trapLoader,
    }, {
      mapgenLoader,
    });

    const submap = generator.generate(context);

    console.log('生成的随机 chunk 地图:');
    for (let y = 0; y < 6; y++) {
      let line = '';
      for (let x = 0; x < 6; x++) {
        const tile = submap.tiles!.getTile(x, y);
        const terrain = terrainLoader.getData().get(tile.terrain);
        line += terrain ? terrain.symbol : '?';
      }
      console.log(line);
    }

    // 验证：至少有有效的地形
    const tile = submap.tiles!.getTile(0, 0);
    expect(tile.terrain).not.toBe(0);

    console.log('\n✅ chunks_list 随机选择成功');
  });
});
