import { CataclysmMapGenParser, CataclysmMapGenLoader } from './src/mapgen/CataclysmMapGenParser';
import { PaletteResolver } from './src/mapgen/PaletteResolver';
import { readFileSync } from 'fs';
import { join } from 'path';

// 测试数据（从 house_w_6.json）
const mapgenData = {
  "type": "mapgen",
  "om_terrain": "house_w_6_roof",
  "object": {
    "fill_ter": "t_shingle_flat_roof",
    "rows": [
      "                        ",
      "                        ",
      "    ----------------    ",
      "    -..............-    ",
      "    -..............-    ",
      "    -......&.......-    ",
      "    5..............-    ",
      "    ----------------    ",
    ],
    "palettes": ["roof_palette"],
    "terrain": {
      ".": "t_shingle_flat_roof"
    }
  }
};

// 创建 loader
const loader = new CataclysmMapGenLoader();

// 加载调色板数据
const palettePath = join(process.cwd(), '../../Cataclysm-DDA/data/json/mapgen_palettes/roof_palette.json');
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

console.log('\n解析前的 terrain 映射:');
console.log('  . ->', parsed.terrain.get('.'));
console.log('  & ->', parsed.terrain.get('&'));
console.log('  5 ->', parsed.terrain.get('5'));
console.log('  - ->', parsed.terrain.get('-'));

// 解析调色板
console.log('\n解析调色板...');
const resolver = new PaletteResolver(loader, { debug: true });
const resolved = resolver.resolve(parsed);

console.log('\n解析后的 terrain 映射:');
console.log('  . ->', resolved.terrain.get('.'));
console.log('  & ->', resolved.terrain.get('&'));
console.log('  5 ->', resolved.terrain.get('5'));
console.log('  - ->', resolved.terrain.get('-'));

console.log('\n解析后的 furniture 映射:');
console.log('  & ->', resolved.furniture.get('&'));
console.log('  5 ->', resolved.furniture.get('5'));

console.log('\n解析后的 nested 映射:');
console.log('  5 ->', JSON.stringify(resolved.nested.get('5')));
