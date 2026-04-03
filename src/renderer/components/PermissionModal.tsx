/**
 * PermissionModal 组件 - 权限请求弹窗
 */

import { useEffect } from 'react';

interface PermissionRequest {
  id: string;
  filePath: string;
  fileType: 'code' | 'log' | 'unknown';
  fileSize: number;
}

interface PermissionModalProps {
  request: PermissionRequest;
  rememberChoice: boolean;
  onRememberChange: (remember: boolean) => void;
  onResponse: (granted: boolean) => void;
}

export default function PermissionModal({
  request,
  rememberChoice,
  onRememberChange,
  onResponse
}: PermissionModalProps) {
  // 禁止背景滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileTypeLabel = (type: string): string => {
    switch (type) {
      case 'code': return '代码文件';
      case 'log': return '日志文件';
      default: return '文件';
    }
  };

  const getFileIcon = (type: string): string => {
    switch (type) {
      case 'code': return '📄';
      case 'log': return '📊';
      default: return '📁';
    }
  };

  return (
    <div className="permission-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) {
        onResponse(false);
      }
    }}>
      <div className="permission-modal">
        <div className="permission-header">
          <h2>⚠️ 权限请求</h2>
        </div>

        <div className="permission-body">
          <p className="permission-intro">程序请求访问以下文件：</p>

          <div className="file-card">
            <div className="file-card-icon">{getFileIcon(request.fileType)}</div>
            <div className="file-card-info">
              <p className="file-path">{request.filePath}</p>
              <p className="file-meta">
                类型: {getFileTypeLabel(request.fileType)} | 大小: {formatFileSize(request.fileSize)}
              </p>
            </div>
          </div>

          <div className="security-notice">
            <h3>🔒 程序承诺</h3>
            <ul>
              <li>✓ 仅读取文件内容进行分析</li>
              <li>✓ 不会修改或删除原文件</li>
              <li>✓ 分析结果仅保存在程序目录中</li>
              <li>✓ 所有操作在程序沙箱内进行</li>
            </ul>
          </div>

          <label className="remember-checkbox">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => onRememberChange(e.target.checked)}
            />
            记住我的选择，对此目录的文件不再询问
          </label>
        </div>

        <div className="permission-footer">
          <button
            className="btn-deny"
            onClick={() => onResponse(false)}
          >
            拒绝
          </button>
          <button
            className="btn-allow"
            onClick={() => onResponse(true)}
          >
            允许
          </button>
        </div>
      </div>
    </div>
  );
}
