/**
 * Header 组件
 */

import { isElectron } from '../utils/electron';

export default function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <span className="logo-icon">📚</span>
          <h1>深度学习代码导师</h1>
        </div>
        <p className="subtitle">AI 驱动的代码分析助手</p>
        {!isElectron() && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: '#ff9800',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            🌐 浏览器开发模式
          </div>
        )}
      </div>
    </header>
  );
}
