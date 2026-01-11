#!/usr/bin/env node

/**
 * 地形系统使用示例
 *
 * 演示如何加载和使用地形数据
 */

import { TerrainLoader } from './TerrainLoader';
import { TerrainFlag } from './types';

async function main() {
  console.log('=== Cataclysm-DDA Web - 地形系统示例 ===\n');

  // 1. 创建加载器
  const loader = new TerrainLoader();

  // 2. 加载测试数据
  console.log('正在加载地形数据...');
  const testData = await import('./__tests__/test-data.json');
  await loader.loadFromJson(testData.default);

  const data = loader.getData();
  console.log(`✓ 加载了 ${data.size()} 个地形\n`);

  // 3. 显示统计信息
  const stats = loader.getStats();
  console.log('=== 地形统计 ===');
  console.log(`总数: ${stats.total}`);
  console.log('按符号分组:');
  Object.entries(stats.bySymbol)
    .sort(([, a], [, b]) => b - a)
    .forEach(([symbol, count]) => {
      console.log(`  ${symbol}: ${count}`);
    });
  console.log();

  // 4. 演示地形查询
  console.log('=== 地形查询示例 ===');

  const dirt = data.findByName('dirt');
  if (dirt) {
    console.log('泥土 (dirt):');
    console.log(`  符号: ${dirt.symbol}`);
    console.log(`  颜色: ${dirt.color}`);
    console.log(`  移动消耗: ${dirt.getMoveCost()}`);
    console.log(`  透明: ${dirt.isTransparent() ? '是' : '否'}`);
    console.log(`  可通行: ${dirt.isPassable() ? '是' : '否'}`);
    console.log(`  可建造: ${dirt.canBuildOn() ? '是' : '否'}`);
    console.log(`  可挖掘: ${dirt.flags.has(TerrainFlag.DIGGABLE) ? '是' : '否'}`);
    console.log();
  }

  const wall = data.findByName('wooden wall');
  if (wall) {
    console.log('木墙 (wooden wall):');
    console.log(`  符号: ${wall.symbol}`);
    console.log(`  颜色: ${wall.color}`);
    console.log(`  移动消耗: ${wall.getMoveCost()}`);
    console.log(`  透明: ${wall.isTransparent() ? '是' : '否'}`);
    console.log(`  可通行: ${wall.isPassable() ? '是' : '否'}`);
    console.log(`  可破坏: ${wall.isBashable() ? '是' : '否'}`);
    if (wall.isBashable()) {
      console.log(`  破坏难度: ${wall.getBashDifficulty()}`);
    }
    console.log(`  连接组: ${wall.getConnectGroup() || '无'}`);
    console.log();
  }

  const door = data.findByName('closed door');
  if (door) {
    console.log('关闭的门 (closed door):');
    console.log(`  符号: ${door.symbol}`);
    console.log(`  可打开: ${door.canOpen() ? '是' : '否'}`);
    console.log(`  可关闭: ${door.canClose() ? '是' : '否'}`);
    if (door.open) {
      const openDoor = data.get(door.open);
      console.log(`  打开后: ${openDoor?.name || '未知'}`);
    }
    console.log();
  }

  // 5. 演示过滤功能
  console.log('=== 地形过滤示例 ===');

  const walls = data.getWalls();
  console.log(`墙的数量: ${walls.length}`);
  walls.forEach((w) => console.log(`  - ${w.name}`));
  console.log();

  const flat = data.getFlatTerrains();
  console.log(`平坦地形数量: ${flat.length}`);
  console.log(
    '示例: ' + flat.slice(0, 5).map((f) => f.name).join(', ') + (flat.length > 5 ? '...' : '')
  );
  console.log();

  // 6. 演示连接组
  console.log('=== 连接组示例 ===');
  const connectedTerrain = data.getAll().filter((t) => t.getConnectGroup());
  const byGroup: Record<string, string[]> = {};

  connectedTerrain.forEach((t) => {
    const group = t.getConnectGroup()!;
    if (!byGroup[group]) byGroup[group] = [];
    byGroup[group].push(t.name);
  });

  Object.entries(byGroup).forEach(([group, names]) => {
    console.log(`${group}: ${names.join(', ')}`);
  });
  console.log();

  // 7. 演示危险地形
  console.log('=== 危险地形 ===');
  const dangerous = data.getAll().filter((t) => t.isDangerous());
  dangerous.forEach((t) => {
    const reasons = [];
    if (t.flags.has(TerrainFlag.LIQUID)) reasons.push('液体');
    if (t.hasTrap()) reasons.push('陷阱');
    console.log(`  ${t.name}: ${reasons.join(', ')}`);
  });
  console.log();

  // 8. 演示渲染信息
  console.log('=== 渲染示例 ===');
  console.log('简单的 5x5 地图:');

  // 创建一个小地图示例
  const mapData = [
    ['t_wall_wood', 't_wall_wood', 't_wall_wood', 't_wall_wood', 't_wall_wood'],
    ['t_wall_wood', 't_floor', 't_floor', 't_door_c', 't_wall_wood'],
    ['t_wall_wood', 't_floor', 't_floor', 't_floor', 't_wall_wood'],
    ['t_wall_wood', 't_floor', 't_floor', 't_floor', 't_wall_wood'],
    ['t_wall_wood', 't_wall_wood', 't_wall_wood', 't_wall_wood', 't_wall_wood'],
  ];

  for (const row of mapData) {
    let line = '';
    for (const terrainName of row) {
      const terrain = data.findByName(terrainName);
      if (terrain) {
        const info = terrain.getDisplayInfo();
        line += info.symbol + ' ';
      }
    }
    console.log(line);
  }
  console.log();

  // 9. 游戏机制示例
  console.log('=== 游戏机制示例 ===');

  console.log('移动计算:');
  const floor = data.findByName('floor');
  const grass = data.findByName('grass');
  console.log(`  地板上移动: ${floor?.getMoveCost()} AP`);
  console.log(`  草地上移动: ${grass?.getMoveCost()} AP`);
  console.log(`  墙壁移动: ${wall?.getMoveCost()} AP (不可通行)`);
  console.log();

  console.log('建造检查:');
  console.log(`  可以在地板上建造: ${floor?.canBuildOn() ? '是' : '否'}`);
  console.log(`  可以在墙上建造: ${wall?.canBuildOn() ? '是' : '否'}`);
  console.log();

  console.log('破坏检查:');
  console.log(`  墙可破坏: ${wall?.isBashable() ? '是' : '否'}`);
  console.log(`  需要力量: ${wall?.getBashDifficulty() || 0}`);
  if (wall?.bash) {
    console.log(`  破坏音效: "${wall.bash.sound}"`);
    if (wall.bash.items) {
      console.log(`  掉落物品: ${wall.bash.items.map((i) => i.item).join(', ')}`);
    }
  }
  console.log();

  console.log('=== 示例完成 ===');
}

// 运行示例
main().catch((error) => {
  console.error('错误:', error);
  process.exit(1);
});
