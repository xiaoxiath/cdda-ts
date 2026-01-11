/**
 * Test script to generate a house mapgen with palette resolution
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { CataclysmMapGenParser } from './src/mapgen/CataclysmMapGenParser';
import { CataclysmMapGenGenerator } from './src/mapgen/CataclysmMapGenGenerator';
import { CataclysmMapGenLoader } from './src/mapgen/CataclysmMapGenParser';
import { PaletteResolver } from './src/mapgen/PaletteResolver';
import { TerrainLoader } from './src/terrain/TerrainLoader';
import { FurnitureLoader } from './src/furniture/FurnitureLoader';
import { TrapLoader } from './src/trap/TrapLoader';
import { GameMap } from './src/map/GameMap';
import { Tripoint } from './src/coordinates/Tripoint';

async function main() {
  console.log('🏠 测试房屋地图生成（带调色板解析）\n');

  // Initialize loaders
  const terrainLoader = new TerrainLoader();
  const furnitureLoader = new FurnitureLoader();
  const trapLoader = new TrapLoader();
  const mapgenLoader = new CataclysmMapGenLoader();
  const paletteResolver = new PaletteResolver(mapgenLoader);

  const dataPath = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json';
  const furnitureTerrainDir = join(dataPath, 'furniture_and_terrain');
  const paletteDir = join(dataPath, 'mapgen_palettes');

  // Load terrain data
  console.log('加载地形数据...');
  const terrainFiles = readdirSync(furnitureTerrainDir).filter(f => f.startsWith('terrain-') && f.endsWith('.json'));
  for (const file of terrainFiles) {
    try {
      const filePath = join(furnitureTerrainDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      const jsonArray = Array.isArray(json) ? json : [json];
      await terrainLoader.loadFromJson(jsonArray);
    } catch (error) {
      // Skip errors silently
    }
  }
  console.log(`✅ 加载了 ${terrainLoader.getAll().length} 个地形定义`);

  // Load furniture data
  console.log('加载家具数据...');
  const furnitureFiles = readdirSync(furnitureTerrainDir).filter(f =>
    (f.startsWith('furniture-') || f.startsWith('furniture_')) && f.endsWith('.json')
  );
  for (const file of furnitureFiles) {
    try {
      const filePath = join(furnitureTerrainDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      const jsonArray = Array.isArray(json) ? json : [json];
      await furnitureLoader.loadFromJson(jsonArray);
    } catch (error) {
      // Skip errors silently
    }
  }
  console.log(`✅ 从 ${furnitureFiles.length} 个文件加载了 ${furnitureLoader.getAll().length} 个家具定义`);

  // Load palettes
  console.log('\n加载调色板数据...');
  const paletteFiles = readdirSync(paletteDir).filter(f => f.endsWith('.json'));
  let loadedPalettes = 0;
  for (const file of paletteFiles) {
    try {
      const filePath = join(paletteDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      const jsonArray = Array.isArray(json) ? json : [json];
      mapgenLoader.loadArray(jsonArray);
      loadedPalettes += jsonArray.length;
    } catch (error) {
      // Skip errors silently
    }
  }
  console.log(`✅ 从 ${paletteFiles.length} 个文件加载了 ${loadedPalettes} 个调色板定义`);

  // Load a house mapgen
  const mapgenPath = join(dataPath, 'mapgen', 'house', 'bungalow01.json');
  console.log(`\n读取 mapgen 文件: ${mapgenPath}`);
  const mapgenContent = readFileSync(mapgenPath, 'utf-8');
  const mapgenData = JSON.parse(mapgenContent);

  // Get first mapgen from array
  const houseMapgen = Array.isArray(mapgenData) ? mapgenData[0] : mapgenData;

  console.log(`\n选择的 mapgen:`);
  console.log(`  OM Terrain: ${houseMapgen.om_terrain || houseMapgen.omm || 'N/A'}`);

  // Parse the mapgen
  console.log('\n解析 mapgen...');
  console.log(`  原始 JSON fill_ter: ${houseMapgen.object?.fill_ter || 'N/A'}`);
  let parsed = CataclysmMapGenParser.parse(houseMapgen);
  console.log(`✅ 解析成功`);
  console.log(`  尺寸: ${parsed.width}x${parsed.height}`);
  console.log(`  填充地形 (fillTerrain): ${parsed.fillTerrain || 'N/A'}`);
  console.log(`  原始地形映射数: ${parsed.terrain.size}`);
  console.log(`  原始家具映射数: ${parsed.furniture.size}`);
  console.log(`  调色板引用数: ${parsed.palettes?.length || 0}`);

  if (parsed.palettes && parsed.palettes.length > 0) {
    console.log(`  调色板列表: ${parsed.palettes.join(', ')}`);

    // Resolve palettes
    console.log('\n解析调色板引用...');
    parsed = paletteResolver.resolve(parsed);
    console.log(`✅ 调色板解析完成`);
    console.log(`  解析后地形映射数: ${parsed.terrain.size}`);
    console.log(`  解析后家具映射数: ${parsed.furniture.size}`);

    // Show sample of resolved mappings
    console.log(`\n解析后的地形映射示例 (前 15 个):`);
    let count = 0;
    parsed.terrain.forEach((value, key) => {
      if (count < 15) {
        console.log(`  '${key}' => ${JSON.stringify(value)}`);
        count++;
      }
    });
  }

  // Create generator
  console.log('\n创建生成器...');

  // Debug: Check which symbols in rows are missing mappings
  console.log(`\n检查行中的符号映射:`);
  const missingSymbols = new Set<string>();
  for (let y = 0; y < Math.min(3, parsed.height); y++) {
    const row = parsed.rows[y];
    for (const char of row) {
      if (!parsed.terrain.has(char) && !parsed.furniture.has(char)) {
        missingSymbols.add(char);
      }
    }
  }
  if (missingSymbols.size > 0) {
    console.log(`  缺失映射的符号: ${Array.from(missingSymbols).join(', ')}`);
  } else {
    console.log(`  所有符号都有映射`);
  }
  const generator = new CataclysmMapGenGenerator(parsed, {
    terrain: terrainLoader,
    furniture: furnitureLoader,
    trap: trapLoader,
  });

  // Generate map
  console.log('\n生成地图...');
  const map = new GameMap();
  const context = {
    seed: Date.now(),
    position: new Tripoint({ x: 0, y: 0, z: 0 }),
    map,
    params: {},
    depth: 0,
  };

  const submap = generator.generate(context);
  console.log('✅ 生成成功');

  // Display the map (only the portion that fits in SUBMAP_SIZE)
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('生成的地图:');
  console.log('═══════════════════════════════════════════════════════════\n');

  const SUBMAP_SIZE = 12; // Defined in Submap class
  const mapWidth = parsed.width;
  const mapHeight = parsed.height;
  const displayWidth = Math.min(mapWidth, SUBMAP_SIZE);
  const displayHeight = Math.min(mapHeight, SUBMAP_SIZE);

  console.log(`Mapgen 尺寸: ${mapWidth}x${mapHeight}`);
  console.log(`显示: ${displayWidth}x${displayHeight} (Submap 限制为 ${SUBMAP_SIZE}x${SUBMAP_SIZE})\n`);

  for (let y = 0; y < displayHeight; y++) {
    let line = '';
    for (let x = 0; x < displayWidth; x++) {
      const terrainId = submap.getTerrain(x, y);
      const tile = submap.getTile(x, y);

      // Check for furniture first
      if (tile && tile.furniture !== 0 && tile.furniture !== null) {
        const furniture = furnitureLoader.getData().get(tile.furniture);
        if (furniture) {
          line += furniture.symbol;
          continue;
        }
      }

      // Then terrain
      const terrain = terrainLoader.getData().get(terrainId);
      if (terrain) {
        line += terrain.symbol;
      } else {
        line += '?';
      }
    }
    console.log(line);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('\n✅ 测试完成');
}

main().catch(console.error);
