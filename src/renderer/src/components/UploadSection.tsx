/**
 * UploadSection 组件 - 文件上传区域
 */

import { useState, useRef } from 'react';

interface UploadSectionProps {
  onAnalyze: (filePath: string, logPath?: string) => void;
  isAnalyzing: boolean;
  progress: string;
}

export default function UploadSection({ onAnalyze, isAnalyzing, progress }: UploadSectionProps) {
  const [codeFile, setCodeFile] = useState<File | null>(null);
  const [logFile, setLogFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const logInputRef = useRef<HTMLInputElement>(null);

  const handleCodeFileSelect = (file: File) => {
    if (file.name.endsWith('.py') || file.name.endsWith('.ipynb')) {
      setCodeFile(file);
    } else {
      alert('请选择 Python 代码文件 (.py 或 .ipynb)');
    }
  };

  const handleLogFileSelect = (file: File) => {
    if (file.name.endsWith('.log') || file.name.endsWith('.txt') || file.name.endsWith('.json')) {
      setLogFile(file);
    } else {
      alert('请选择日志文件 (.log, .txt 或 .json)');
    }
  };

  const handleDrop = (e: React.DragEvent, type: 'code' | 'log') => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (type === 'code') {
      handleCodeFileSelect(file);
    } else {
      handleLogFileSelect(file);
    }
  };

  const handleAnalyze = () => {
    if (!codeFile) {
      alert('请先选择代码文件');
      return;
    }

    // 注意：这里使用的是文件路径，但在 Electron 中需要特殊处理
    // 在实际应用中，文件路径会通过 Electron API 获取
    const filePath = (codeFile as any).path;
    const logPath = logFile ? (logFile as any).path : undefined;
    onAnalyze(filePath, logPath);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <section className="upload-section">
      <div className="upload-grid">
        {/* 代码文件上传 */}
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => handleDrop(e, 'code')}
        >
          <input
            ref={codeInputRef}
            type="file"
            accept=".py,.ipynb"
            onChange={(e) => e.target.files?.[0] && handleCodeFileSelect(e.target.files[0])}
            style={{ display: 'none' }}
          />
          <div className="drop-zone-content" onClick={() => codeInputRef.current?.click()}>
            <div className="drop-zone-icon">📄</div>
            <p className="drop-zone-title">代码文件</p>
            <p className="drop-zone-hint">.py, .ipynb</p>
          </div>

          {codeFile && (
            <div className="file-info">
              <span className="file-name">{codeFile.name}</span>
              <span className="file-size">{formatFileSize(codeFile.size)}</span>
              <button
                className="file-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  setCodeFile(null);
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* 日志文件上传（可选） */}
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => handleDrop(e, 'log')}
        >
          <input
            ref={logInputRef}
            type="file"
            accept=".log,.txt,.json"
            onChange={(e) => e.target.files?.[0] && handleLogFileSelect(e.target.files[0])}
            style={{ display: 'none' }}
          />
          <div className="drop-zone-content" onClick={() => logInputRef.current?.click()}>
            <div className="drop-zone-icon">📊</div>
            <p className="drop-zone-title">日志文件（可选）</p>
            <p className="drop-zone-hint">.log, .txt, .json</p>
          </div>

          {logFile && (
            <div className="file-info">
              <span className="file-name">{logFile.name}</span>
              <span className="file-size">{formatFileSize(logFile.size)}</span>
              <button
                className="file-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  setLogFile(null);
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 分析按钮 */}
      <div className="analyze-actions">
        <button
          className="btn-analyze"
          onClick={handleAnalyze}
          disabled={!codeFile || isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <span className="spinner"></span>
              分析中...
            </>
          ) : (
            '开始分析'
          )}
        </button>

        {isAnalyzing && progress && (
          <div className="progress-indicator">
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
            <p className="progress-text">正在分析...</p>
          </div>
        )}
      </div>
    </section>
  );
}
