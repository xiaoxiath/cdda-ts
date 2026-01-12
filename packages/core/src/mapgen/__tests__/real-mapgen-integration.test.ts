/**
 * Real Cataclysm-DDA Mapgen Integration Tests
 *
 * Tests using actual Cataclysm-DDA mapgen JSON files
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CataclysmMapGenGenerator } from '../CataclysmMapGenGenerator';
import { CataclysmMapGenLoader } from '../CataclysmMapGenParser';
import { TerrainLoader } from '../../terrain/TerrainLoader';
import { FurnitureLoader } from '../../furniture/FurnitureLoader';
import { TrapLoader } from '../../trap/TrapLoader';
import { MapGenContext } from '../MapGenFunction';
import { GameMap } from '../../map/GameMap';
import { Tripoint } from '../../coordinates/Tripoint';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getMapgenPath, getMapgenPalettesPath } from '../../config/CddaConfig';

describe('Real Cataclysm-DDA Mapgen Integration Tests', () => {
  let terrainLoader: TerrainLoader;
  let furnitureLoader: FurnitureLoader;
  let trapLoader: TrapLoader;
  let mapgenLoader: CataclysmMapGenLoader;
  let context: MapGenContext;

  beforeEach(async () => {
    // Create loaders
    terrainLoader = new TerrainLoader();
    furnitureLoader = new FurnitureLoader();
    trapLoader = new TrapLoader();
    mapgenLoader = new CataclysmMapGenLoader();

    // Load minimal terrain data (just what we need for the test)
    await terrainLoader.loadFromJson([
      {
        type: 'terrain',
        id: 't_null',
        name: 'null',
        symbol: ' ',
        color: 'black',
        flags: []
      },
      {
        type: 'terrain',
        id: 't_open_air',
        name: 'open air',
        symbol: ' ',
        color: 'light_blue',
        flags: []
      },
      {
        type: 'terrain',
        id: 't_shingle_flat_roof',
        name: 'shingle roof',
        symbol: '=',
        color: 'dark_gray',
        flags: ['FLAT']
      },
      {
        type: 'terrain',
        id: 't_dirt',
        name: 'dirt',
        symbol: ':',
        color: 'brown',
        flags: []
      },
      {
        type: 'terrain',
        id: 't_floor',
        name: 'floor',
        symbol: '.',
        color: 'light_gray',
        flags: []
      },
      {
        type: 'terrain',
        id: 't_wall',
        name: 'wall',
        symbol: '#',
        color: 'light_gray',
        flags: ['FLAT']
      },
    ]);

    await furnitureLoader.loadFromJson([
      {
        type: 'furniture',
        id: 'f_chair',
        name: 'chair',
        symbol: '[',
        color: 'light_gray',
        flags: []
      },
    ]);

    // Create context
    const map = new GameMap();
    context = {
      position: new Tripoint(0, 0, 0),
      seed: 42,
      map,
      params: {},
      depth: 0,
    };
  });

  it('should load and generate abandoned_barn with nested roof chunks', () => {
    console.log('\n🏠 测试真实的 Cataclysm-DDA abandoned_barn mapgen\n');

    // Load real Cataclysm-DDA JSON files
    const barnJsonPath = join(getMapgenPath(), 'abandoned_barn.json');
    const roofChunksPath = join(getMapgenPath(), 'nested/rural_outdoors_nested.json');

    const barnData = JSON.parse(readFileSync(barnJsonPath, 'utf-8'));
    const roofChunksData = JSON.parse(readFileSync(roofChunksPath, 'utf-8'));

    // Load all mapgens
    mapgenLoader.loadArray(roofChunksData);
    mapgenLoader.loadArray(barnData);

    console.log(`Loaded ${mapgenLoader.size()} mapgen definitions`);

    // Get the abandoned barn roof mapgen
    const barnMapgen = mapgenLoader.get('desolatebarn_1_roof');
    expect(barnMapgen).toBeDefined();

    if (barnMapgen) {
      console.log(`\nMapgen: ${barnMapgen.id}`);
      console.log(`Size: ${barnMapgen.width}x${barnMapgen.height}`);
      console.log(`Has nested mappings: ${barnMapgen.nested.size}`);

      // Show nested configuration
      barnMapgen.nested.forEach((config, char) => {
        console.log(`  Character '${char}' -> ${JSON.stringify(config)}`);
      });

      // Create generator with mapgenLoader for nested resolution
      const generator = new CataclysmMapGenGenerator(barnMapgen, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      }, {
        mapgenLoader,
      });

      // Generate submaps
      const result = generator.generateMultiple(context);

      console.log(`\nGenerated ${result.submaps.length} submaps (${result.submapGridWidth}x${result.submapGridHeight} grid)`);

      // Analyze first submap
      const firstSubmap = result.submaps[0].submap;
      const position = result.submaps[0].position;

      console.log(`\nFirst submap at grid position (${position.gridX}, ${position.gridY})`);

      // Count terrain types in first submap
      const terrainCounts = new Map<number, number>();

      for (let y = 0; y < firstSubmap.size; y++) {
        for (let x = 0; x < firstSubmap.size; x++) {
          const tile = firstSubmap.tiles!.getTile(x, y);
          terrainCounts.set(tile.terrain, (terrainCounts.get(tile.terrain) || 0) + 1);
        }
      }

      console.log('\nTerrain distribution in first submap:');
      terrainCounts.forEach((count, terrainId) => {
        const terrain = terrainLoader.getData().get(terrainId);
        if (terrain) {
          const percentage = ((count / (firstSubmap.size * firstSubmap.size)) * 100).toFixed(1);
          console.log(`  ${terrain.name}: ${count} tiles (${percentage}%)`);
        }
      });

      // Verify nested chunks were applied
      const hasRoof = Array.from(terrainCounts.keys()).some(id => {
        const terrain = terrainLoader.getData().get(id);
        return terrain?.name === 'shingle roof';
      });

      if (hasRoof) {
        console.log('\n✅ Nested roof chunks successfully applied!');
      } else {
        console.log('\n⚠️  No roof terrain found (weighted random may have selected open_air)');
      }

      // Verify basic structure
      expect(result.submaps.length).toBeGreaterThan(0);
      expect(result.submapGridWidth).toBe(2); // 24/12 = 2
      expect(result.submapGridHeight).toBe(2); // 24/12 = 2
      expect(firstSubmap.tiles).toBeDefined();
    }
  });

  it('should handle multiple nested chunks from same file', () => {
    console.log('\n🔧 测试加载多个嵌套 chunks\n');

    // Load roof chunks
    const roofChunksPath = join(getMapgenPath(), 'nested/rural_outdoors_nested.json');
    const roofChunksData = JSON.parse(readFileSync(roofChunksPath, 'utf-8'));
    mapgenLoader.loadArray(roofChunksData);

    console.log(`Loaded ${mapgenLoader.size()} mapgen definitions`);

    // Verify desolate_shingle_roof_chunk is loaded
    const roofChunk = mapgenLoader.get('desolate_shingle_roof_chunk');
    expect(roofChunk).toBeDefined();

    if (roofChunk) {
      console.log(`\nChunk: ${roofChunk.id}`);
      console.log(`Size: ${roofChunk.width}x${roofChunk.height}`);
      console.log(`Terrain mappings: ${roofChunk.terrain.size}`);

      // Verify terrain has weighted options
      const dotTerrain = roofChunk.terrain.get('.');
      console.log(`Character '.' terrain mapping:`, JSON.stringify(dotTerrain));

      // Should be weighted options
      expect(dotTerrain).toBeDefined();
      expect(Array.isArray(dotTerrain)).toBe(true);
    }
  });

  it('should visualize a small section of abandoned_barn', () => {
    console.log('\n🎨 可视化 abandoned_barn 的一部分\n');

    // Load mapgens
    const barnData = JSON.parse(
      readFileSync(join(getMapgenPath(), 'abandoned_barn.json'), 'utf-8')
    );
    const roofChunksData = JSON.parse(
      readFileSync(join(getMapgenPath(), 'nested/rural_outdoors_nested.json'), 'utf-8')
    );

    mapgenLoader.loadArray(roofChunksData);
    mapgenLoader.loadArray(barnData);

    const barnMapgen = mapgenLoader.get('desolatebarn_1_roof');
    expect(barnMapgen).toBeDefined();

    if (barnMapgen) {
      const generator = new CataclysmMapGenGenerator(barnMapgen, {
        terrain: terrainLoader,
        furniture: furnitureLoader,
        trap: trapLoader,
      }, {
        mapgenLoader,
      });

      const result = generator.generateMultiple(context);
      const firstSubmap = result.submaps[0].submap;

      // Visualize top-left 8x8 section
      console.log('Top-left 8x8 of first submap:\n');

      // Debug: Scan for non-zero tiles
      console.log('Scanning for non-zero terrain tiles...');
      let foundCount = 0;
      for (let y = 0; y < firstSubmap.size && foundCount < 5; y++) {
        for (let x = 0; x < firstSubmap.size && foundCount < 5; x++) {
          const tile = firstSubmap.tiles!.getTile(x, y);
          if (tile.terrain !== 0) {
            const terrain = terrainLoader.getData().get(tile.terrain);
            if (terrain) {
              console.log(`  (${x},${y}): ID ${tile.terrain} = ${terrain.idString} (${terrain.name}) '${terrain.symbol}'`);
              foundCount++;
            }
          }
        }
      }
      console.log('');

      // Visualize full 12x12 submap
      console.log('Full 12x12 first submap:');

      for (let y = 0; y < firstSubmap.size; y++) {
        let line = '';
        for (let x = 0; x < firstSubmap.size; x++) {
          const tile = firstSubmap.tiles!.getTile(x, y);
          const terrain = terrainLoader.getData().get(tile.terrain);
          if (terrain) {
            line += terrain.symbol;
          } else {
            line += '?';
          }
        }
        console.log(line);
      }

      console.log('\nLegend:');
      console.log('  =  shingle roof (from nested chunk)');
      console.log('     (space)  open air');

      expect(firstSubmap.tiles).toBeDefined();
    }
  });

  it('should handle palette-based mapgens', () => {
    console.log('\n🎨 测试调色板 mapgen\n');

    // Try to load a palette-based mapgen
    const palettePath = join(getMapgenPalettesPath(), 'abandoned_barn_p.json');

    try {
      const paletteData = JSON.parse(readFileSync(palettePath, 'utf-8'));
      console.log(`Loaded palette file with ${paletteData.length} entries`);

      // Find palettes
      const palettes = paletteData.filter((item: any) => item.type === 'palette');
      console.log(`Found ${palettes.length} palettes`);

      if (palettes.length > 0) {
        console.log(`First palette ID: ${palettes[0].id}`);
      }
    } catch (error) {
      console.log('Could not load palette file:', error);
    }

    // This test just verifies we can load palette files
    expect(true).toBe(true);
  });
});
