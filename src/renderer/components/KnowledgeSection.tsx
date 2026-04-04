/**
 * KnowledgeSection 组件 - 知识库管理
 */

import { useState, useEffect, useRef } from 'react';
import { getElectronAPI } from '../utils/electron';

export default function KnowledgeSection() {
  const [status, setStatus] = useState({ paperCount: 0, knowledgePath: '' });
  const [isFetching, setIsFetching] = useState(false);
  const lastFetchTime = useRef<number>(0);
  const FETCH_COOLDOWN = 30000; // 30秒冷却时间

  const electron = getElectronAPI();

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    const result = await electron.getKnowledgeStatus();
    setStatus(result);
  };

  const handleFetchPapers = async () => {
    // 检查冷却时间
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;
    if (timeSinceLastFetch < FETCH_COOLDOWN) {
      const remainingSeconds = Math.ceil((FETCH_COOLDOWN - timeSinceLastFetch) / 1000);
      alert(`请等待 ${remainingSeconds} 秒后再试，避免频繁请求。`);
      return;
    }

    if (!confirm('确定要爬取最新论文吗？这可能需要几分钟时间。\n\n注意：已存在的论文将被跳过，只会添加新论文。')) {
      return;
    }

    lastFetchTime.current = now;
    setIsFetching(true);
    try {
      const response = await electron.fetchPapers(10, 7);
      if (response.success) {
        await loadStatus();
        alert('论文爬取完成！');
      } else {
        alert('爬取失败: ' + response.error);
      }
    } finally {
      setIsFetching(false);
    }
  };

  const handleOpenFolder = async () => {
    await electron.openKnowledgeFolder();
  };

  return (
    <section className="knowledge-section">
      <div className="section-header">
        <h2>📚 知识库</h2>
        <p className="section-description">论文和最佳实践的积累</p>
      </div>

      <div className="knowledge-content">
        <div className="knowledge-stats">
          <div className="stat-card">
            <span className="stat-value">{status.paperCount}</span>
            <span className="stat-label">篇论文</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">📖</span>
            <span className="stat-label">可编辑</span>
          </div>
        </div>

        <div className="knowledge-actions">
          <button
            className="btn-secondary"
            onClick={handleFetchPapers}
            disabled={isFetching}
          >
            {isFetching ? '爬取中...' : '爬取最新 10 篇论文'}
          </button>
          <button
            className="btn-secondary"
            onClick={handleOpenFolder}
          >
            打开知识库文件夹
          </button>
        </div>

        <div className="knowledge-info">
          <p>💡 知识库会随着使用越来越丰富，让分析更精准</p>
        </div>
      </div>
    </section>
  );
}
