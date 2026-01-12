import type { InputAction } from '../types'

/**
 * 键盘事件到输入动作的映射
 */
export function keyboardEventToAction(event: KeyboardEvent): InputAction | null {
  const key = event.key.toLowerCase()

  // 方向键或 WASD 移动
  switch (key) {
    case 'arrowup':
    case 'w':
      return { type: 'move', direction: 'n' }
    case 'arrowdown':
    case 's':
      return { type: 'move', direction: 's' }
    case 'arrowleft':
    case 'a':
      return { type: 'move', direction: 'w' }
    case 'arrowright':
    case 'd':
      return { type: 'move', direction: 'e' }
    case 'q':
      return { type: 'move', direction: 'nw' }
    case 'e':
      return { type: 'move', direction: 'ne' }
    case 'z':
      return { type: 'move', direction: 'sw' }
    case 'c':
      return { type: 'move', direction: 'se' }
    case ' ':
      return { type: 'wait' }
    case 'escape':
      return { type: 'quit' }
    case 'enter':
      return { type: 'interact' }
    default:
      return null
  }
}

/**
 * 获取移动方向的方向向量
 */
export function getDirectionVector(direction: string) {
  const vectors: Record<string, { dx: number; dy: number }> = {
    n: { dx: 0, dy: -1 },
    ne: { dx: 1, dy: -1 },
    e: { dx: 1, dy: 0 },
    se: { dx: 1, dy: 1 },
    s: { dx: 0, dy: 1 },
    sw: { dx: -1, dy: 1 },
    w: { dx: -1, dy: 0 },
    nw: { dx: -1, dy: -1 },
  }

  return vectors[direction] || { dx: 0, dy: 0 }
}
