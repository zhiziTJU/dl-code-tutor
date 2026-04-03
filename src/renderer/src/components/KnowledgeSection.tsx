/**
 * KnowledgeSection 组件 - 知识库管理
 */

import { useState, useEffect } from 'react';

export default function KnowledgeSection() {
  const [status, setStatus] = useState({ paperCount: 0, knowledgePath: '' });
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    const result = await window.electron.getKnowledgeStatus();
    setStatus(result);
  };

  const handleFetchPapers = async () => {
    if (!confirm('确定要爬取最新论文吗？这可能需要几分钟时间。')) {
      return;
    }

    setIsFetching(true);
    try {
      const response = await window.electron.fetchPapers(10, 7);
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
    await window.electron.openKnowledgeFolder();
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
