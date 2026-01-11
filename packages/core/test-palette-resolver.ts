/**
 * Test script to verify PaletteResolver with parameterized palettes
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { CataclysmMapGenParser } from './src/mapgen/CataclysmMapGenParser';
import { CataclysmMapGenLoader } from './src/mapgen/CataclysmMapGenParser';
import { PaletteResolver } from './src/mapgen/PaletteResolver';

async function main() {
  console.log('🎨 测试 PaletteResolver - 参数化调色板支持\n');

  // Initialize loaders
  const mapgenLoader = new CataclysmMapGenLoader();
  const paletteResolver = new PaletteResolver(mapgenLoader, { debug: true });

  const dataPath = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json';
  const paletteDir = join(dataPath, 'mapgen_palettes');

  // Load palettes
  console.log('加载调色板数据...');
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

  console.log(`✅ 从 ${paletteFiles.length} 个文件加载了 ${loadedPalettes} 个调色板定义\n`);

  // Test 1: Direct palette reference (traditional)
  console.log('═══════════════════════════════════════════════════════════');
  console.log('测试 1: 直接调色板引用');
  console.log('═══════════════════════════════════════════════════════════\n');

  const testMapgen1 = {
    id: 'test_direct_palette',
    width: 12,
    height: 12,
    rows: ['.'.repeat(12)],
    fillTerrain: 't_grass',
    terrain: new Map(),
    furniture: new Map(),
    items: new Map(),
    placeItems: [],
    placeMonsters: [],
    placeNested: [],
    nested: new Map(),
    flags: new Set(),
    raw: {} as any,
    palettes: ['standard_domestic_palette'], // 直接引用
  };

  const resolved1 = paletteResolver.resolve(testMapgen1);
  console.log(`  原始调色板: ${JSON.stringify(testMapgen1.palettes)}`);
  console.log(`  解析后地形映射数: ${resolved1.terrain.size}`);
  console.log(`  解析后家具映射数: ${resolved1.furniture.size}\n`);

  // Test 2: Parameterized palette reference
  console.log('═══════════════════════════════════════════════════════════');
  console.log('测试 2: 参数化调色板引用');
  console.log('═══════════════════════════════════════════════════════════\n');

  const testMapgen2 = {
    id: 'test_param_palette',
    width: 12,
    height: 12,
    rows: ['.'.repeat(12)],
    fillTerrain: 't_grass',
    terrain: new Map(),
    furniture: new Map(),
    items: new Map(),
    placeItems: [],
    placeMonsters: [],
    placeNested: [],
    nested: new Map(),
    flags: new Set(),
    raw: {} as any,
    palettes: [{ param: 'construction_palette' }], // 参数引用
  };

  const resolved2 = paletteResolver.resolve(testMapgen2);
  console.log(`  原始调色板: ${JSON.stringify(testMapgen2.palettes)}`);
  console.log(`  解析后地形映射数: ${resolved2.terrain.size}`);
  console.log(`  解析后家具映射数: ${resolved2.furniture.size}\n`);

  // Test 3: Nested palette references
  console.log('═══════════════════════════════════════════════════════════');
  console.log('测试 3: 嵌套调色板引用');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Find palettes that have nested palettes
  const allPalettes = mapgenLoader.getAllPalettes();
  const palettesWithNested = allPalettes.filter(p => p.palettes && p.palettes.length > 0);

  console.log(`  找到 ${palettesWithNested.length} 个嵌套调色板:\n`);

  if (palettesWithNested.length > 0) {
    // Test first few nested palettes
    const testCount = Math.min(3, palettesWithNested.length);
    for (let i = 0; i < testCount; i++) {
      const palette = palettesWithNested[i];
      console.log(`  ${i + 1}. ${palette.id}`);
      console.log(`     嵌套调色板: ${JSON.stringify(palette.palettes)}\n`);

      const testMapgen = {
        id: `test_nested_${i}`,
        width: 12,
        height: 12,
        rows: ['.'.repeat(12)],
        fillTerrain: 't_grass',
        terrain: new Map(),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
        palettes: [palette.id],
      };

      const resolved = paletteResolver.resolve(testMapgen);
      console.log(`     解析后地形映射: ${resolved.terrain.size}, 家具映射: ${resolved.furniture.size}\n`);
    }
  } else {
    console.log('  ⚠️  未找到嵌套调色板示例\n');
  }

  // Test 4: Missing symbol check
  console.log('═══════════════════════════════════════════════════════════');
  console.log('测试 4: bungalow01 缺失符号检查');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Load real bungalow01 mapgen
  const mapgenPath = join(dataPath, 'mapgen', 'house', 'bungalow01.json');
  try {
    const mapgenContent = readFileSync(mapgenPath, 'utf-8');
    const mapgenData = JSON.parse(mapgenContent);
    const bungalowMapgen = Array.isArray(mapgenData) ? mapgenData[0] : mapgenData;

    const parsed = CataclysmMapGenParser.parse(bungalowMapgen);
    const resolved = paletteResolver.resolve(parsed);

    console.log(`  Mapgen: ${bungalowMapgen.om_terrain || bungalowMapgen.omm}`);
    console.log(`  调色板: ${JSON.stringify(parsed.palettes)}`);
    console.log(`  填充地形 (fill_ter): ${parsed.fillTerrain || 'N/A'}`);
    console.log(`  原始地形映射数: ${parsed.terrain.size}`);
    console.log(`  解析后地形映射数: ${resolved.terrain.size}\n`);

    // Check for missing symbols
    const missingSymbols = new Set<string>();
    const mappedSymbols = new Set<string>();

    // Collect all mapped symbols
    resolved.terrain.forEach((_, char) => mappedSymbols.add(char));
    resolved.furniture.forEach((_, char) => mappedSymbols.add(char));

    // Check symbols in first 3 rows
    for (let y = 0; y < Math.min(3, parsed.height); y++) {
      const row = parsed.rows[y];
      for (const char of row) {
        if (!mappedSymbols.has(char)) {
          missingSymbols.add(char);
        }
      }
    }

    if (missingSymbols.size > 0) {
      console.log(`  ℹ️  未明确映射的符号 (将使用 fill_ter): ${Array.from(missingSymbols).join(', ')}`);
      console.log(`  ℹ️  这是正常的 - Cataclysm-DDA 中未映射的字符使用 fill_ter 作为默认值`);
    } else {
      console.log(`  ✅ 所有符号都有明确映射！`);
    }

    // Show mapping statistics
    const totalMappings = resolved.terrain.size + resolved.furniture.size;
    console.log(`\n  📊 映射统计:`);
    console.log(`     地形映射: ${resolved.terrain.size}`);
    console.log(`     家具映射: ${resolved.furniture.size}`);
    console.log(`     总映射数: ${totalMappings}`);
    console.log(`     覆盖率提升: ${((totalMappings / (totalMappings + missingSymbols.size)) * 100).toFixed(1)}%`);
  } catch (error) {
    console.log(`  ❌ 加载 bungalow01 失败: ${(error as Error).message}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ 测试完成');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
