/**
 * 多 Submap 生成可视化
 *
 * 展示大型 mapgen 如何被分割为多个 submap
 */
import { describe, it, expect } from 'vitest';
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
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Multi-Submap Generation Visualization', () => {
  const DATA_PATH = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json';

  let terrainLoader: TerrainLoader;
  let furnitureLoader: FurnitureLoader;
  let trapLoader: TrapLoader;
  let mapgenLoader: CataclysmMapGenLoader;
  let paletteResolver: PaletteResolver;
  let context: MapGenContext;

  beforeAll(async () => {
    // Initialize loaders
    terrainLoader = new TerrainLoader();
    furnitureLoader = new FurnitureLoader();
    trapLoader = new TrapLoader();
    mapgenLoader = new CataclysmMapGenLoader();
    paletteResolver = new PaletteResolver(mapgenLoader);

    // Load minimal terrain data
    await terrainLoader.loadFromJson([
      { type: 'terrain', id: 't_dirt', name: 'dirt', symbol: '.', color: 'brown', flags: [] },
      { type: 'terrain', id: 't_floor', name: 'floor', symbol: '.', color: 'light_gray', flags: [] },
      { type: 'terrain', id: 't_wall', name: 'wall', symbol: '#', color: 'light_gray', flags: ['FLAT'] },
      { type: 'terrain', id: 't_grass', name: 'grass', symbol: '"', color: 'green', flags: [] },
      { type: 'terrain', id: 't_door_c', name: 'door', symbol: '+', color: 'brown', flags: [] },
      { type: 'terrain', id: 't_window', name: 'window', symbol: '=', color: 'cyan', flags: [] },
    ]);

    await furnitureLoader.loadFromJson([
      { type: 'furniture', id: 'f_chair', name: 'chair', symbol: '[', color: 'light_gray', flags: [] },
      { type: 'furniture', id: 'f_table', name: 'table', symbol: '_', color: 'brown', flags: [] },
      { type: 'furniture', id: 'f_bed', name: 'bed', symbol: '\\', color: 'white', flags: [] },
      { type: 'furniture', id: 'f_counter', name: 'counter', symbol: 'C', color: 'light_gray', flags: [] },
    ]);

    const map = new GameMap();
    context = {
      position: new Tripoint(0, 0, 0),
      seed: 42,
      map,
      params: {},
      depth: 0,
    };
  });

  it('should visualize 24x24 house split into 4 submaps', () => {
    console.log('\n' + '='.repeat(80));
    console.log('🏠 可视化 24x24 房屋分割为 4 个 Submap');
    console.log('='.repeat(80) + '\n');

    // Create a simple 24x24 house layout
    const rows: string[] = [];

    // Roof
    rows.push('########################');

    // Top floor with windows and door
    rows.push('#......................#');
    rows.push('#..+=..............=+..#');
    rows.push('#..|.................|..#');
    rows.push('#..+=..............=+..#');
    rows.push('#......................#');

    // Middle section (wall)
    rows.push('########################');

    // Bottom floor with furniture
    rows.push('#......................#');
    rows.push('#...._.......[......._..#');
    rows.push('#...._.......[......._..#');
    rows.push('#......................#');
    rows.push('#..........\\...........#');
    rows.push('#......................#');

    // Floor
    rows.push('########################');

    const mapgenData: ParsedMapGenData = {
      id: 'visual_house_24x24',
      width: 24,
      height: 24,
      rows,
      terrain: new Map([
        ['#', 't_wall'],
        ['.', 't_floor'],
        ['+', 't_door_c'],
        ['=', 't_window'],
        ['|', 't_floor'],
      ]),
      furniture: new Map([
        ['_', 'f_table'],
        ['[', 'f_chair'],
        ['\\', 'f_bed'],
      ]),
      items: new Map([
        ['$', { item: 'coin_gold' }],
        ['*', { item: 'sword' }],
      ]),
      placeItems: [
        { item: 'potion', x: 3, y: 3 },
        { item: 'food', x: 18, y: 18 },
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

    const result = generator.generateMultiple(context);

    // Show grid overview
    console.log('📐 Mapgen 网格概览:');
    console.log(`   总尺寸: ${result.mapgenWidth}x${result.mapgenHeight} 瓦片`);
    console.log(`   Submap 尺寸: 12x12 瓦片`);
    console.log(`   网格: ${result.submapGridWidth}x${result.submapGridHeight} = ${result.submaps.length} 个 submaps\n`);

    // Visualize the grid layout
    console.log('┌─────────────┬─────────────┐');
    console.log('│  Submap (0,0)  │  Submap (1,0)  │');
    console.log('│   瓦片 0-11    │   瓦片 12-23   │');
    console.log('├─────────────┼─────────────┤');
    console.log('│  Submap (0,1)  │  Submap (1,1)  │');
    console.log('│   瓦片 12-23   │   瓦片 24-35   │');
    console.log('└─────────────┴─────────────┘\n');

    // Show each submap with content
    result.submaps.forEach((submapResult, index) => {
      const { gridX, gridY, globalPosition } = submapResult.position;
      const submap = submapResult.submap;

      const itemSpawns = submap.spawns.filter(s => s.type === 'item');
      const monsterSpawns = submap.spawns.filter(s => s.type === 'monster');

      // Create spawn position sets for quick lookup
      const itemPos = new Set(itemSpawns.map(s => `${s.position.x},${s.position.y}`));
      const monsterPos = new Set(monsterSpawns.map(s => `${s.position.x},${s.position.y}`));

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📍 Submap ${index} (grid: ${gridX},${gridY})`);
      console.log(`   全局位置: (${globalPosition.x}, ${globalPosition.y})`);
      console.log(`   物品: ${itemSpawns.length} 个, 怪物: ${monsterSpawns.length} 只\n`);

      // Build visualization grid
      console.log('   Legend: #=墙, .=地板, +=门, ==窗, _=桌子, [=椅子, \\=床, $=物品');

      for (let y = 0; y < 12; y++) {
        let line = '   ';
        for (let x = 0; x < 12; x++) {
          const key = `${x},${y}`;

          if (monsterPos.has(key)) {
            line += 'M';
          } else if (itemPos.has(key)) {
            line += '$';
          } else {
            const tile = submap.tiles!.getTile(x, y);
            if (tile.furniture && tile.furniture !== 0) {
              const furn = furnitureLoader.getData().get(tile.furniture);
              line += furn ? furn.symbol : '?';
            } else {
              const terrain = terrainLoader.getData().get(tile.terrain);
              line += terrain ? terrain.symbol : '?';
            }
          }
        }
        console.log(line);
      }

      // List items in this submap
      if (itemSpawns.length > 0) {
        console.log('\n   物品列表:');
        itemSpawns.forEach((spawn, i) => {
          console.log(`     ${i + 1}. (${spawn.position.x}, ${spawn.position.y}): ${spawn.data.item}`);
        });
      }

      console.log();
    });

    // Verify
    expect(result.submaps.length).toBe(4);
    expect(result.mapgenWidth).toBe(24);
    expect(result.mapgenHeight).toBe(24);
  });

  it('should visualize large house map with items across submaps', () => {
    console.log('\n' + '='.repeat(80));
    console.log('🏠 可视化带物品的大型房屋');
    console.log('='.repeat(80) + '\n');

    // Create a 24x24 house with items in different submaps
    const rows: string[] = [];

    // Roof
    rows.push('########################');

    // Rooms
    rows.push('#....$...............$#'); // Items at (4,1) and (20,1)
    rows.push('#......................#');
    rows.push('#..........+...........#'); // Door at center
    rows.push('#......................#');
    rows.push('#..*.............*.....#'); // Items at (2,4) and (16,4)
    rows.push('##########........####');    // Partial walls

    rows.push('#......................#');
    rows.push('#......%...............#'); // Item at (6,7)
    rows.push('#......................#');
    rows.push('#..................=...#'); // Window
    rows.push('#......................#');

    rows.push('########################'); // Floor

    const mapgenData: ParsedMapGenData = {
      id: 'house_with_items',
      width: 24,
      height: 24,
      rows,
      terrain: new Map([
        ['#', 't_wall'],
        ['.', 't_floor'],
        ['+', 't_door_c'],
        ['=', 't_window'],
      ]),
      furniture: new Map(),
      items: new Map([
        ['$', { item: 'gem' }],
        ['*', { item: 'gold_coin' }],
        ['%', { item: 'magic_scroll' }],
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

    const result = generator.generateMultiple(context);

    console.log('📍 物品分布图:\n');

    // Show which submap each item is in
    const itemDistribution = result.submaps.map((submapResult, index) => {
      const itemSpawns = submapResult.submap.spawns.filter(s => s.type === 'item');
      const { gridX, gridY } = submapResult.position;

      return {
        submapIndex: index,
        gridX,
        gridY,
        items: itemSpawns.map(s => ({
          item: s.data.item,
          localPos: `(${s.position.x}, ${s.position.y})`,
          globalPos: `(${s.position.x + gridX * 12}, ${s.position.y + gridY * 12})`,
        })),
      };
    });

    itemDistribution.forEach(({ submapIndex, gridX, gridY, items }) => {
      if (items.length > 0) {
        console.log(`Submap ${submapIndex} (grid ${gridX},${gridY}):`);
        items.forEach(({ item, localPos, globalPos }) => {
          console.log(`  ${item} @ local ${localPos} → global ${globalPos}`);
        });
        console.log();
      }
    });

    // Create ASCII visualization showing item locations
    console.log('📊 完整地图可视化 (24x24):');
    console.log('   图例: #=墙, .=地板, $=宝石, *=金币, %=卷轴\n');

    // Create full 24x24 visualization
    const fullMap: string[][] = Array.from({ length: 24 }, () => Array(24).fill('?'));

    // Fill in terrain
    result.submaps.forEach(submapResult => {
      const { gridX, gridY } = submapResult.position;
      const submap = submapResult.submap;

      // Mark spawn positions
      const itemSpawns = submap.spawns.filter(s => s.type === 'item');
      const itemPositions = new Map(itemSpawns.map(s => [`${s.position.x},${s.position.y}`, s]));

      for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 12; x++) {
          const globalX = gridX * 12 + x;
          const globalY = gridY * 12 + y;

          const key = `${x},${y}`;
          if (itemPositions.has(key)) {
            // Show item
            const item = itemPositions.get(key)!;
            if (item.data.item === 'gem') fullMap[globalY][globalX] = '$';
            else if (item.data.item === 'gold_coin') fullMap[globalY][globalX] = '*';
            else if (item.data.item === 'magic_scroll') fullMap[globalY][globalX] = '%';
          } else {
            // Show terrain/furniture
            const tile = submap.tiles!.getTile(x, y);
            if (tile.furniture && tile.furniture !== 0) {
              const furn = furnitureLoader.getData().get(tile.furniture);
              fullMap[globalY][globalX] = furn ? furn.symbol : '?';
            } else {
              const terrain = terrainLoader.getData().get(tile.terrain);
              fullMap[globalY][globalX] = terrain ? terrain.symbol : '?';
            }
          }
        }
      }
    });

    // Print the map with submap grid indicators
    console.log('   0         1         ');
    console.log('   012345678901234567890123');
    console.log('  ┌────────────┬────────────┐');

    for (let y = 0; y < 24; y++) {
      if (y === 12) {
        console.log('  ├────────────┼────────────┤');
      }
      let line = `${y.toString().padStart(2)} │`;
      for (let x = 0; x < 24; x++) {
        if (x === 12) line += '│';
        line += fullMap[y][x];
      }
      line += '│';
      console.log(line);
    }

    console.log('  └────────────┴────────────┘\n');

    // Show submap boundaries overlay
    console.log('📍 Submap 边界说明:');
    console.log('   左上 (0,0): 瓦片 (0,0) 到 (11,11)');
    console.log('   右上 (1,0): 瓦片 (12,0) 到 (23,11)');
    console.log('   左下 (0,1): 瓦片 (0,12) 到 (11,23)');
    console.log('   右下 (1,1): 瓦片 (12,12) 到 (23,23)');

    expect(result.submaps.length).toBe(4);
  });

  it('should visualize real Cataclysm-DDA house 2storyModern01_basement', () => {
    console.log('\n' + '='.repeat(80));
    console.log('🏠 可视化真实 Cataclysm-DDA 房屋: 2storyModern01_basement (24x24)');
    console.log('='.repeat(80) + '\n');

    // Load real Cataclysm-DDA data
    const terrainFiles = [
      'furniture_and_terrain/terrain-floors-indoor.json',
      'furniture_and_terrain/terrain-floors-outdoors.json',
      'furniture_and_terrain/terrain-walls.json',
      'furniture_and_terrain/terrain-doors.json',
    ];

    for (const file of terrainFiles) {
      try {
        const filePath = join(DATA_PATH, file);
        const content = readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        terrainLoader.loadFromJson(json);
      } catch (error) {
        // Skip if file not found
      }
    }

    const filePath = join(DATA_PATH, 'mapgen/house/2storymodern01.json');
    const content = readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(content);

    mapgenLoader.loadArray(jsonData);
    const mapgenData = mapgenLoader.get('2storyModern01_basement');

    expect(mapgenData).toBeDefined();

    if (mapgenData) {
      const generator = new CataclysmMapGenGenerator(mapgenData, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      }, {
        paletteResolver,
      });

      const result = generator.generateMultiple(context);

      console.log(`📐 Mapgen 信息:`);
      console.log(`   ID: ${mapgenData.id}`);
      console.log(`   尺寸: ${result.mapgenWidth}x${result.mapgenHeight}`);
      console.log(`   Submap 网格: ${result.submapGridWidth}x${result.submapGridHeight}`);
      console.log(`   地形映射: ${mapgenData.terrain.size} 个`);
      console.log(`   家具映射: ${mapgenData.furniture.size} 个`);
      console.log(`   物品映射: ${mapgenData.items.size} 个\n`);

      // Show each submap summary
      console.log('📍 各 Submap 统计:\n');

      const stats = result.submaps.map((submapResult, index) => {
        const { gridX, gridY } = submapResult.position;
        const submap = submapResult.submap;

        const itemSpawns = submap.spawns.filter(s => s.type === 'item');
        const monsterSpawns = submap.spawns.filter(s => s.type === 'monster');

        let furnitureCount = 0;
        let floorCount = 0;
        let wallCount = 0;
        let doorCount = 0;
        let otherCount = 0;

        for (let y = 0; y < 12; y++) {
          for (let x = 0; x < 12; x++) {
            const tile = submap.tiles!.getTile(x, y);
            const terrain = terrainLoader.getData().get(tile.terrain);

            if (tile.furniture && tile.furniture !== 0) {
              furnitureCount++;
            } else if (terrain) {
              const name = terrain.name;
              if (name.includes('floor')) floorCount++;
              else if (name.includes('wall')) wallCount++;
              else if (name.includes('door')) doorCount++;
              else otherCount++;
            }
          }
        }

        return {
          index,
          gridX,
          gridY,
          items: itemSpawns.length,
          monsters: monsterSpawns.length,
          furniture: furnitureCount,
          floor: floorCount,
          wall: wallCount,
          door: doorCount,
          other: otherCount,
        };
      });

      // Print stats table
      console.log('   Submap | Grid | Items | Monsters | Furniture | Floor | Wall | Door | Other');
      console.log('   ' + '─'.repeat(70));
      stats.forEach(s => {
        console.log(
          `   #${s.index.toString().padStart(2)}   | (${s.gridX},${s.gridY}) | ${s.items.toString().padStart(5)} | ${s.monsters.toString().padStart(8)} | ` +
          `${s.furniture.toString().padStart(8)} | ${s.floor.toString().padStart(5)} | ${s.wall.toString().padStart(4)} | ${s.door.toString().padStart(4)} | ${s.other.toString().padStart(5)}`
        );
      });

      // Show preview of first submap
      console.log('\n🎨 Submap 0 预览 (左上角 12x12):\n');
      const firstSubmap = result.submaps[0].submap;
      const itemPositions = new Set(
        firstSubmap.spawns
          .filter(s => s.type === 'item')
          .map(s => `${s.position.x},${s.position.y}`)
      );

      for (let y = 0; y < 12; y++) {
        let line = '   ';
        for (let x = 0; x < 12; x++) {
          const key = `${x},${y}`;
          if (itemPositions.has(key)) {
            line += '$';
          } else {
            const tile = firstSubmap.tiles!.getTile(x, y);
            if (tile.furniture && tile.furniture !== 0) {
              line += 'F';
            } else {
              const terrain = terrainLoader.getData().get(tile.terrain);
              if (terrain) {
                if (terrain.name.includes('floor')) line += '.';
                else if (terrain.name.includes('wall')) line += '#';
                else if (terrain.name.includes('door')) line += '+';
                else line += terrain.symbol || '?';
              } else {
                line += '?';
              }
            }
          }
        }
        console.log(line);
      }

      console.log('\n   图例: #=墙, .=地板, +=门, F=家具, $=物品\n');

      expect(result.submaps.length).toBe(4);
    }
  });
});
