import { useRef, useEffect } from 'react'

interface GameLogProps {
  messages: string[]
}

/**
 * 游戏日志组件 - 显示游戏消息
 */
export default function GameLog({ messages }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  /**
   * 自动滚动到底部
   */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="game-log">
      <div className="game-log-header">
        <h3>消息日志</h3>
        <span className="message-count">{messages.length}</span>
      </div>
      <div ref={scrollRef} className="game-log-messages">
        {messages.length === 0 ? (
          <div className="game-log-empty">暂无消息</div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="game-log-message">
              {message}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
