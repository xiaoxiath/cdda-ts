import { MapGenFunction, MapGenContext } from './MapGenFunction';
import { Submap, SUBMAP_SIZE } from '../map/Submap';
import { MapTile } from '../map/MapTile';
import { Tripoint } from '../coordinates/Tripoint';

/**
 * 空地生成器
 *
 * 生成全为空地的 submap
 */
export class MapGenEmpty extends MapGenFunction {
  readonly id = 'empty';
  readonly name = 'Empty';

  generate(context: MapGenContext): Submap {
    // t_null = 0, 空地
    return Submap.createUniform(0);
  }

  getWeight(): number {
    return 1;
  }
}

/**
 * 草地生成器
 *
 * 生成全为草地的 submap
 */
export class MapGenGrass extends MapGenFunction {
  readonly id = 'grass';
  readonly name = 'Grass';

  generate(context: MapGenContext): Submap {
    // t_grass = 1（假设，实际应该从 terrain data 获取）
    return Submap.createUniform(1);
  }

  getWeight(): number {
    return 10;
  }
}

/**
 * 森林生成器
 *
 * 生成带有树木的 submap
 */
export class MapGenForest extends MapGenFunction {
  readonly id = 'forest';
  readonly name = 'Forest';

  generate(context: MapGenContext): Submap {
    // 假设 t_dirt = 5 作为基础
    let submap = Submap.createUniform(5);

    // 随机放置树木
    // 假设 furniture_tree = 100
    const treeDensity = 0.3; // 30% 的方块有树

    for (let y = 0; y < SUBMAP_SIZE; y++) {
      for (let x = 0; x < SUBMAP_SIZE; x++) {
        if (Math.random() < treeDensity) {
          const treeTile = new MapTile({
            terrain: 5, // t_dirt
            furniture: 100, // 假设的树 ID
          });
          submap = submap.setTile(x, y, treeTile);
        }
      }
    }

    return submap;
  }

  getWeight(): number {
    return 5;
  }
}

/**
 * 房间生成器
 *
 * 生成基本的房间结构
 */
export class MapGenRoom extends MapGenFunction {
  readonly id = 'room_empty';
  readonly name = 'Empty Room';

  generate(context: MapGenContext): Submap {
    // 假设 t_floor = 10, t_wall = 11
    const floorId = 10;
    const wallId = 11;

    let submap = Submap.createUniform(floorId);

    // 添加墙壁
    for (let i = 0; i < SUBMAP_SIZE; i++) {
      // 上墙
      submap = submap.setTile(i, 0, new MapTile({ terrain: wallId }));
      // 下墙
      submap = submap.setTile(i, SUBMAP_SIZE - 1, new MapTile({ terrain: wallId }));
      // 左墙
      submap = submap.setTile(0, i, new MapTile({ terrain: wallId }));
      // 右墙
      submap = submap.setTile(SUBMAP_SIZE - 1, i, new MapTile({ terrain: wallId }));
    }

    return submap;
  }

  getWeight(): number {
    return 3;
  }
}

/**
 * 道路生成器
 *
 * 生成道路 submap
 */
export class MapGenRoad extends MapGenFunction {
  readonly id = 'road';
  readonly name = 'Road';

  generate(context: MapGenContext): Submap {
    // 假设 t_pavement = 20
    const pavementId = 20;
    return Submap.createUniform(pavementId);
  }

  getWeight(): number {
    return 2;
  }
}

/**
 * 随机生成器
 *
 * 随机选择地形填充
 */
export class MapGenRandom extends MapGenFunction {
  readonly id = 'random';
  readonly name = 'Random';

  private readonly minTerrain: number;
  private readonly maxTerrain: number;

  constructor(minTerrain = 0, maxTerrain = 10) {
    super();
    this.minTerrain = minTerrain;
    this.maxTerrain = maxTerrain;
  }

  generate(context: MapGenContext): Submap {
    let submap = Submap.createUniform(this.minTerrain);

    for (let y = 0; y < SUBMAP_SIZE; y++) {
      for (let x = 0; x < SUBMAP_SIZE; x++) {
        const randomTerrain =
          Math.floor(Math.random() * (this.maxTerrain - this.minTerrain + 1)) +
          this.minTerrain;
        const tile = new MapTile({ terrain: randomTerrain });
        submap = submap.setTile(x, y, tile);
      }
    }

    return submap;
  }

  getWeight(): number {
    return 1;
  }
}

/**
 * 噪声生成器
 *
 * 使用简单的噪声算法生成地形
 */
export class MapGenNoise extends MapGenFunction {
  readonly id = 'noise';
  readonly name = 'Noise';

  private readonly baseTerrain: number;
  private readonly variation: number;
  private readonly scale: number;

  constructor(baseTerrain = 1, variation = 2, scale = 0.2) {
    super();
    this.baseTerrain = baseTerrain;
    this.variation = variation;
    this.scale = scale;
  }

  generate(context: MapGenContext): Submap {
    let submap = Submap.createUniform(this.baseTerrain);

    // 使用简单的伪随机噪声
    for (let y = 0; y < SUBMAP_SIZE; y++) {
      for (let x = 0; x < SUBMAP_SIZE; x++) {
        const noise = this.simplexNoise(x * this.scale, y * this.scale, context.seed);
        const terrainVariation = Math.floor(noise * this.variation);
        const terrain = Math.max(
          0,
          this.baseTerrain + terrainVariation
        );
        const tile = new MapTile({ terrain });
        submap = submap.setTile(x, y, tile);
      }
    }

    return submap;
  }

  getWeight(): number {
    return 2;
  }

  /**
   * 简单的噪声函数（简化版的 Simplex 噪声）
   */
  private simplexNoise(x: number, y: number, seed: number): number {
    // 简化的噪声函数，实际应该使用更复杂的算法
    const sin = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return (sin - Math.floor(sin)) * 2 - 1;
  }
}

/**
 * 内置生成器集合
 */
export const BUILTIN_GENERATORS = [
  new MapGenEmpty(),
  new MapGenGrass(),
  new MapGenForest(),
  new MapGenRoom(),
  new MapGenRoad(),
  new MapGenRandom(0, 5),
  new MapGenNoise(1, 2, 0.3),
];

/**
 * 根据权重随机选择生成器
 */
export function selectRandomGenerator(
  generators: MapGenFunction[],
  context: MapGenContext
): MapGenFunction | null {
  const applicable = generators.filter((gen) => gen.canApply(context));

  if (applicable.length === 0) {
    return null;
  }

  // 计算总权重
  const totalWeight = applicable.reduce((sum, gen) => sum + gen.getWeight(context), 0);

  // 随机选择
  let random = Math.random() * totalWeight;
  for (const gen of applicable) {
    random -= gen.getWeight(context);
    if (random <= 0) {
      return gen;
    }
  }

  return applicable[applicable.length - 1];
}

/**
 * 获取内置生成器
 */
export function getBuiltinGenerator(id: string): MapGenFunction | undefined {
  return BUILTIN_GENERATORS.find((gen) => gen.id === id);
}
