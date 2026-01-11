/**
 * Simple Game Example - 简单游戏示例
 *
 * 演示如何使用游戏循环和简单的 CLI 渲染器
 */

import { GameMap, posToSubmap } from './map/GameMap';
import { Submap, SUBMAP_SIZE } from './map/Submap';
import { Avatar } from './creature/Avatar';
import { GameState, GameLoop } from './game';
import { SimpleRenderer, SimpleInputHandler } from './cli';
import { Tripoint } from './coordinates/Tripoint';

/**
 * 主函数
 */
async function main() {
  console.log('正在初始化游戏...\n');

  // 创建地图
  let map = new GameMap();

  // 初始化玩家周围的地图（创建一个简单的房间）
  const origin = new Tripoint({ x: 0, y: 0, z: 0 });
  const smPos = posToSubmap(origin);

  // 创建初始子地图（12x12 的简单房间）
  let initialSubmap = Submap.createEmpty();

  // 填充子地图数据
  for (let y = 0; y < SUBMAP_SIZE; y++) {
    for (let x = 0; x < SUBMAP_SIZE; x++) {
      // 边界是墙
      if (x === 0 || x === SUBMAP_SIZE - 1 || y === 0 || y === SUBMAP_SIZE - 1) {
        initialSubmap = initialSubmap.setTerrain(x, y, 1); // 墙
      } else {
        initialSubmap = initialSubmap.setTerrain(x, y, 0); // 地板
      }
    }
  }

  // 将子地图添加到游戏中
  map = map.setSubmapAt(smPos, initialSubmap);

  // 创建玩家
  const player = new Avatar(
    'player_001',
    new Tripoint({ x: 0, y: 0, z: 0 }),
    '玩家'
  );

  // 创建游戏状态
  let gameState = GameState.create(map, player);

  // 添加一些 NPC
  // const npcManager = new NPCManager();
  // const npc = new NPC('npc_001', new Tripoint({ x: 5, y: 5, z: 0 }), '测试 NPC', 'NC_SOLDIER', 5, 'no_faction');
  // npcManager.addNPC(npc);
  // gameState = gameState.withNPCs(npcManager);

  // 创建输入处理器
  const inputHandler = new SimpleInputHandler();

  // 创建渲染器
  const renderer = new SimpleRenderer({
    mapWidth: 40,
    mapHeight: 15,
    showStats: true,
    showMessages: true,
  });

  // 显示按键帮助
  console.log(inputHandler.formatHelp());
  console.log('\n按任意键开始游戏...\n');

  // 等待用户按下任意键
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  // 创建游戏循环
  const gameLoop = new GameLoop(
    gameState,
    inputHandler.createHandler(),
    (state) => renderer.render(state),
    {
      turnBased: true,
    }
  );

  // 启动游戏循环
  try {
    await gameLoop.start();
  } catch (error) {
    console.error('游戏错误:', error);
  } finally {
    // 清理资源
    inputHandler.cleanup();
    console.log('\n感谢游玩！');
  }
}

// 运行主函数
main().catch(console.error);
