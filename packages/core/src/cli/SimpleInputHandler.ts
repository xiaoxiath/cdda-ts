/**
 * SimpleInputHandler - 简单的命令行输入处理器
 *
 * 处理用户键盘输入并转换为游戏动作
 */

import { createInterface } from 'readline';
import { GameAction, InputHandler } from '../game/GameLoop';

/**
 * 按键映射
 */
interface KeyBinding {
  readonly key: string;
  readonly action: GameAction;
  readonly description: string;
}

/**
 * 简单的输入处理器
 */
export class SimpleInputHandler {
  private bindings: Map<string, GameAction>;
  private rl: ReturnType<typeof createInterface>;

  constructor() {
    this.bindings = this.createDefaultBindings();
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // 设置原始模式（直接读取按键）
    process.stdin.setRawMode(true);
  }

  /**
   * 创建默认按键绑定
   */
  private createDefaultBindings(): Map<string, GameAction> {
    return new Map<string, GameAction>([
      // 移动键（Vim 风格）
      ['h', GameAction.MOVE_W],
      ['j', GameAction.MOVE_S],
      ['k', GameAction.MOVE_N],
      ['l', GameAction.MOVE_E],
      ['y', GameAction.MOVE_NW],
      ['u', GameAction.MOVE_NE],
      ['b', GameAction.MOVE_SW],
      ['n', GameAction.MOVE_SE],

      // 移动键（数字键盘）
      ['7', GameAction.MOVE_NW],
      ['8', GameAction.MOVE_N],
      ['9', GameAction.MOVE_NE],
      ['4', GameAction.MOVE_W],
      ['5', GameAction.WAIT],
      ['6', GameAction.MOVE_E],
      ['1', GameAction.MOVE_SW],
      ['2', GameAction.MOVE_S],
      ['3', GameAction.MOVE_SE],

      // 移动键（方向键 - 使用 ANSI 转义序列）
      ['\x1B[A', GameAction.MOVE_N],      // 上
      ['\x1B[B', GameAction.MOVE_S],      // 下
      ['\x1B[C', GameAction.MOVE_E],      // 右
      ['\x1B[D', GameAction.MOVE_W],      // 左

      // 等待
      ['.', GameAction.WAIT],
      [' ', GameAction.WAIT],

      // 楼梯
      ['>', GameAction.MOVE_DOWN],
      ['<', GameAction.MOVE_UP],

      // 系统
      ['q', GameAction.QUIT],
      ['Q', GameAction.QUIT],
      ['\x03', GameAction.QUIT], // Ctrl-C

      // 调试
      ['d', GameAction.DEBUG],
    ]);
  }

  /**
   * 创建输入处理函数
   */
  createHandler(): InputHandler {
    return () => {
      return new Promise<GameAction>((resolve) => {
        let buffer = '';

        const onData = (data: Buffer) => {
          buffer += data.toString();

          // 检查是否是完整的转义序列
          if (buffer.startsWith('\x1B[')) {
            // 方向键序列格式: \x1B[A, \x1B[B, \x1B[C, \x1B[D
            if (buffer.length >= 3) {
              const action = this.bindings.get(buffer);
              if (action) {
                process.stdin.removeListener('data', onData);
                buffer = '';
                resolve(action);
                return;
              }
            }
            // 还没接收完整个序列，继续等待
            return;
          }

          // 普通按键
          if (buffer.length > 0) {
            const str = buffer[0];
            const action = this.bindings.get(str);

            // 清空缓冲区
            buffer = '';

            if (action !== undefined) {
              process.stdin.removeListener('data', onData);
              resolve(action);
            } else if (str === '\x03') {
              // Ctrl-C
              process.stdin.removeListener('data', onData);
              resolve(GameAction.QUIT);
            }
            // 其他按键忽略
          }
        };

        // 监听数据
        process.stdin.on('data', onData);
      });
    };
  }

  /**
   * 获取按键绑定列表
   */
  getBindings(): KeyBinding[] {
    const allBindings: KeyBinding[] = [
      { key: '↑/8/k', action: GameAction.MOVE_N, description: '北' },
      { key: '↓/2/j', action: GameAction.MOVE_S, description: '南' },
      { key: '←/4/h', action: GameAction.MOVE_W, description: '西' },
      { key: '→/6/l', action: GameAction.MOVE_E, description: '东' },
      { key: '7/y', action: GameAction.MOVE_NW, description: '西北' },
      { key: '9/u', action: GameAction.MOVE_NE, description: '东北' },
      { key: '1/b', action: GameAction.MOVE_SW, description: '西南' },
      { key: '3/n', action: GameAction.MOVE_SE, description: '东南' },
      { key: '<', action: GameAction.MOVE_UP, description: '上楼' },
      { key: '>', action: GameAction.MOVE_DOWN, description: '下楼' },
      { key: './空格', action: GameAction.WAIT, description: '等待' },
      { key: 'q', action: GameAction.QUIT, description: '退出' },
      { key: 'd', action: GameAction.DEBUG, description: '调试' },
    ];

    return allBindings;
  }

  /**
   * 格式化按键帮助
   */
  formatHelp(): string {
    const bindings = this.getBindings();

    const lines = [
      '═══════════════════════════════════════════════════════════',
      '按键绑定:',
      '═══════════════════════════════════════════════════════════',
    ];

    // 按功能分组
    const groups = [
      { name: '移动', bindings: bindings.filter(b => b.action.startsWith('move_')) },
      { name: '其他', bindings: bindings.filter(b => !b.action.startsWith('move_')) },
    ];

    for (const group of groups) {
      lines.push(`\n${group.name}:`);
      for (const binding of group.bindings) {
        lines.push(`  ${binding.key.padEnd(8)} - ${binding.description}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    process.stdin.setRawMode(false);
    this.rl.close();
  }
}
