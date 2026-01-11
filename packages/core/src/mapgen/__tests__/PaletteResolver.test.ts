/**
 * PaletteResolver 测试
 *
 * 测试调色板解析和合并功能
 */
import { describe, it, expect } from 'vitest';
import { CataclysmMapGenLoader } from '../CataclysmMapGenParser';
import { PaletteResolver } from '../PaletteResolver';
import { ParsedMapGenData } from '../CataclysmMapGenParser';

describe('PaletteResolver', () => {
  let loader: CataclysmMapGenLoader;
  let resolver: PaletteResolver;

  beforeEach(() => {
    loader = new CataclysmMapGenLoader();
    resolver = new PaletteResolver(loader);
  });

  describe('调色板解析', () => {
    it('should load palettes from JSON array', () => {
      const json = [
        {
          type: 'palette',
          id: 'test_palette',
          object: {
            terrain: {
              '.': 't_floor',
              '#': 't_wall',
            },
            furniture: {
              'c': 'f_chair',
              't': 'f_table',
            },
          },
        },
      ];

      loader.loadArray(json);

      const palette = loader.getPalette('test_palette');
      expect(palette).toBeDefined();
      expect(palette?.id).toBe('test_palette');
      expect(palette?.terrain).toEqual({
        '.': 't_floor',
        '#': 't_wall',
      });
      expect(palette?.furniture).toEqual({
        c: 'f_chair',
        t: 'f_table',
      });
    });

    it('should load multiple palettes', () => {
      const json = [
        {
          type: 'palette',
          id: 'palette1',
          object: {
            terrain: { '.': 't_floor' },
          },
        },
        {
          type: 'palette',
          id: 'palette2',
          object: {
            terrain: { '#': 't_wall' },
          },
        },
      ];

      loader.loadArray(json);

      expect(loader.paletteCount()).toBe(2);
      expect(loader.getPalette('palette1')).toBeDefined();
      expect(loader.getPalette('palette2')).toBeDefined();
    });
  });

  describe('调色板合并', () => {
    it('should merge palette mappings into mapgen', () => {
      // 加载调色板
      const paletteJson = {
        type: 'palette' as const,
        id: 'test_palette',
        object: {
          terrain: {
            '.': 't_floor',
            '#': 't_wall',
          },
          furniture: {
            'c': 'f_chair',
          },
        },
      };

      loader.loadArray([paletteJson]);

      // 创建使用调色板的 mapgen
      const mapgenData: ParsedMapGenData = {
        id: 'test_mapgen',
        width: 12,
        height: 12,
        rows: Array(12).fill('............'),
        palettes: ['test_palette'],
        terrain: new Map(), // 空的，应该从调色板获取
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      // 解析调色板
      const resolved = resolver.resolve(mapgenData);

      // 验证调色板映射已合并
      expect(resolved.terrain.get('.')).toBe('t_floor');
      expect(resolved.terrain.get('#')).toBe('t_wall');
      expect(resolved.furniture.get('c')).toBe('f_chair');
    });

    it('should not override mapgen own mappings with palette', () => {
      // 加载调色板
      const paletteJson = {
        type: 'palette' as const,
        id: 'test_palette',
        object: {
          terrain: {
            '.': 't_floor_palette',
            '#': 't_wall_palette',
          },
        },
      };

      loader.loadArray([paletteJson]);

      // 创建有自己映射的 mapgen
      const mapgenData: ParsedMapGenData = {
        id: 'test_mapgen',
        width: 12,
        height: 12,
        rows: Array(12).fill('............'),
        palettes: ['test_palette'],
        terrain: new Map([
          // mapgen 自己定义了 '.' 的映射
          ['.', 't_floor_custom'],
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

      // 解析调色板
      const resolved = resolver.resolve(mapgenData);

      // 验证：mapgen 自己的映射优先
      expect(resolved.terrain.get('.')).toBe('t_floor_custom');
      // 验证：调色板的映射仍然可用
      expect(resolved.terrain.get('#')).toBe('t_wall_palette');
    });

    it('should merge multiple palettes in order', () => {
      // 加载两个调色板
      loader.loadArray([
        {
          type: 'palette' as const,
          id: 'palette1',
          object: {
            terrain: {
              '.': 't_floor_1',
              '#': 't_wall_1',
            },
          },
        },
        {
          type: 'palette' as const,
          id: 'palette2',
          object: {
            terrain: {
              // 注意：palette2 试图覆盖 '.'，但由于 palette1 已经定义了 '.'，
              // palette2 的定义不会被应用（调色板不会覆盖已存在的映射）
              '.': 't_floor_2',
              '+': 't_door',
            },
          },
        },
      ]);

      // 创建使用两个调色板的 mapgen
      const mapgenData: ParsedMapGenData = {
        id: 'test_mapgen',
        width: 12,
        height: 12,
        rows: Array(12).fill('............'),
        palettes: ['palette1', 'palette2'],
        terrain: new Map(),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      // 解析调色板
      const resolved = resolver.resolve(mapgenData);

      // palette1 的 '.' 应该被保留（palette2 不会覆盖）
      expect(resolved.terrain.get('.')).toBe('t_floor_1');
      // palette1 的 '#' 应该保留
      expect(resolved.terrain.get('#')).toBe('t_wall_1');
      // palette2 的 '+' 应该存在
      expect(resolved.terrain.get('+')).toBe('t_door');
    });

    it('should handle missing palettes gracefully', () => {
      const mapgenData: ParsedMapGenData = {
        id: 'test_mapgen',
        width: 12,
        height: 12,
        rows: Array(12).fill('............'),
        palettes: ['nonexistent_palette'],
        terrain: new Map(),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      // 应该不抛出错误
      expect(() => resolver.resolve(mapgenData)).not.toThrow();

      // 应该返回原始数据
      const resolved = resolver.resolve(mapgenData);
      expect(resolved.palettes).toEqual(['nonexistent_palette']);
    });

    it('should handle mapgen without palettes', () => {
      const mapgenData: ParsedMapGenData = {
        id: 'test_mapgen',
        width: 12,
        height: 12,
        rows: Array(12).fill('............'),
        palettes: undefined, // 没有调色板
        terrain: new Map([['.', 't_floor']]),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      const resolved = resolver.resolve(mapgenData);

      // 应该直接返回原始数据
      expect(resolved).toBe(mapgenData);
      expect(resolved.terrain.get('.')).toBe('t_floor');
    });

    it('should handle empty palette array', () => {
      const mapgenData: ParsedMapGenData = {
        id: 'test_mapgen',
        width: 12,
        height: 12,
        rows: Array(12).fill('............'),
        palettes: [], // 空数组
        terrain: new Map([['.', 't_floor']]),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      const resolved = resolver.resolve(mapgenData);

      // 应该直接返回原始数据
      expect(resolved.terrain.get('.')).toBe('t_floor');
    });
  });

  describe('批量解析', () => {
    it('should resolve array of mapgens', () => {
      loader.loadArray([
        {
          type: 'palette' as const,
          id: 'test_palette',
          object: {
            terrain: { '.': 't_floor' },
          },
        },
      ]);

      const mapgen1: ParsedMapGenData = {
        id: 'mapgen1',
        width: 12,
        height: 12,
        rows: Array(12).fill('............'),
        palettes: ['test_palette'],
        terrain: new Map(),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      const mapgen2: ParsedMapGenData = {
        id: 'mapgen2',
        width: 12,
        height: 12,
        rows: Array(12).fill('............'),
        palettes: undefined,
        terrain: new Map([['.', 't_dirt']]),
        furniture: new Map(),
        items: new Map(),
        placeItems: [],
        placeMonsters: [],
        placeNested: [],
        nested: new Map(),
        flags: new Set(),
        raw: {} as any,
      };

      const resolved = resolver.resolveArray([mapgen1, mapgen2]);

      expect(resolved).toHaveLength(2);
      expect(resolved[0].terrain.get('.')).toBe('t_floor');
      expect(resolved[1].terrain.get('.')).toBe('t_dirt');
    });
  });
});
