import { CataclysmMapGenParser, CataclysmMapGenLoader } from './src/mapgen/CataclysmMapGenParser';
import { PaletteResolver } from './src/mapgen/PaletteResolver';
import { readFileSync } from 'fs';
import { join } from 'path';

// 测试数据（从 faction_buildings.json）
const mapgenData = {
  "type": "mapgen",
  "om_terrain": ["faction_base_blacksmith_4"],
  "object": {
    "faction_owner": [{
      "id": "your_followers",
      "x": [0, 23],
      "y": [0, 23]
    }],
    "fill_ter": "t_floor",
    "rows": [
      ",,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,**''***''''**,,,,,,,",
      ",,,,*''''tt'''''*,___,,,",
      ",,,,''''''''''''',_K_,,,",
      ",,,,''f'''''''''',___,,,",
      ",,,,''f'''''''''',,,,,,,",
      ",,,,'''''A''''''',,,,,,,",
      ",,,,*'''''''''''*,,,,,,,",
      ",,,,**''''*''''**,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,"
    ],
    "palettes": ["acidia_camp_palette"]
  }
};

// 创建 loader
const loader = new CataclysmMapGenLoader();

// 加载调色板数据
const palettePath = join(process.cwd(), '../../Cataclysm-DDA/data/json/mapgen_palettes/acidia_camp_palette.json');
const paletteContent = readFileSync(palettePath, 'utf-8');
const paletteJson = JSON.parse(paletteContent);

const paletteCount = loader.paletteCount();
console.log('加载调色板...');
loader.loadArray(Array.isArray(paletteJson) ? paletteJson : [paletteJson]);
const newPaletteCount = loader.paletteCount();
console.log(`加载了 ${newPaletteCount - paletteCount} 个调色板`);

// 解析 mapgen
console.log('\n解析 mapgen...');
const parsed = CataclysmMapGenParser.parse(mapgenData);

console.log('\n解析前的字符映射（部分）:');
console.log('  , ->', parsed.terrain.get(','), 'furniture:', parsed.furniture.get(','));
console.log('  * ->', parsed.terrain.get('*'), 'furniture:', parsed.furniture.get('*'));
console.log("  ' ->", parsed.terrain.get("'"), 'furniture:', parsed.furniture.get("'"));
console.log('  t ->', parsed.terrain.get('t'), 'furniture:', parsed.furniture.get('t'));
console.log('  f ->', parsed.terrain.get('f'), 'furniture:', parsed.furniture.get('f'));
console.log('  A ->', parsed.terrain.get('A'), 'furniture:', parsed.furniture.get('A'));
console.log('  K ->', parsed.terrain.get('K'), 'furniture:', parsed.furniture.get('K'));

// 解析调色板
console.log('\n解析调色板...');
const resolver = new PaletteResolver(loader, { debug: true });
const resolved = resolver.resolve(parsed);

console.log('\n解析后的字符映射（部分）:');
console.log('  , ->', resolved.terrain.get(','), 'furniture:', resolved.furniture.get(','));
console.log('  * ->', resolved.terrain.get('*'), 'furniture:', resolved.furniture.get('*'));
console.log("  ' ->", resolved.terrain.get("'"), 'furniture:', resolved.furniture.get("'"));
console.log('  t ->', resolved.terrain.get('t'), 'furniture:', resolved.furniture.get('t'));
console.log('  f ->', resolved.terrain.get('f'), 'furniture:', resolved.furniture.get('f'));
console.log('  A ->', resolved.terrain.get('A'), 'furniture:', resolved.furniture.get('A'));
console.log('  K ->', resolved.terrain.get('K'), 'furniture:', resolved.furniture.get('K'));

// 打印第10-17行的解析结果
console.log('\n第10-17行解析结果:');
for (let y = 9; y < 17; y++) {
  const row = resolved.rows[y];
  const chars = row.split('');
  const mapped = chars.map(c => {
    const t = resolved.terrain.get(c) || '?';
    const f = resolved.furniture.get(c);
    return f ? `${t}+${f}` : t;
  }).join(' | ');
  console.log(`Row ${y + 1}: ${mapped.substring(0, 100)}...`);
}
