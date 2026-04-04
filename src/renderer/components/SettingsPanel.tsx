/**
 * SettingsPanel - 设置面板组件
 * 包含 API Key 管理、自定义 API 端点、进程控制和状态显示
 */

import { useState, useEffect } from 'react';
import { getElectronAPI } from '../utils/electron';

interface ClaudeStatus {
  isRunning: boolean;
  hasApiKey: boolean;
  hasCustomUrl: boolean;
  provider: string;
  model?: string;
}

interface ApiConfig {
  apiKey: string;
  baseUrl: string;
  provider: string;
  model?: string;
  hasKey: boolean;
}

export default function SettingsPanel() {
  const [status, setStatus] = useState<ClaudeStatus>({ isRunning: false, hasApiKey: false, hasCustomUrl: false, provider: 'anthropic' });
  const [apiConfig, setApiConfigState] = useState<ApiConfig>({ apiKey: '', baseUrl: '', provider: 'anthropic', hasKey: false });
  const [showConfigInput, setShowConfigInput] = useState(false);
  const [inputApiKey, setInputApiKey] = useState('');
  const [inputBaseUrl, setInputBaseUrl] = useState('');
  const [inputProvider, setInputProvider] = useState<'anthropic' | 'openai' | 'custom' | 'zhipu'>('anthropic');
  const [message, setMessage] = useState('');

  const electron = getElectronAPI();

  // 加载状态
  useEffect(() => {
    loadStatus();
    loadApiConfig();

    // 监听 Claude 状态变化
    const handleStatusChanged = (newStatus: { isRunning: boolean }) => {
      console.log('[SettingsPanel] Claude status changed:', newStatus);
      setStatus(prev => ({ ...prev, isRunning: newStatus.isRunning }));
    };

    electron.onClaudeStatusChanged?.(handleStatusChanged);

    return () => {
      // 清理监听器（如果需要）
    };
  }, []);

  const loadStatus = async () => {
    const result = await electron.getClaudeStatus();
    setStatus(result);
  };

  const loadApiConfig = async () => {
    const result = await electron.getApiConfig();
    setApiConfigState(result);
    setInputProvider(result.provider as 'anthropic' | 'openai' | 'custom' | 'zhipu');
    if (result.baseUrl) {
      setInputBaseUrl(result.baseUrl);
    }
  };

  const handleStopClaude = async () => {
    const result = await electron.stopClaude();
    if (result.success) {
      setMessage(result.message || '已停止 Claude 进程');
      loadStatus();
    } else {
      setMessage(result.error || '停止失败');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSaveConfig = async () => {
    const config: { apiKey?: string; baseUrl?: string; provider?: string } = {};

    if (inputApiKey.trim()) {
      config.apiKey = inputApiKey.trim();
    }
    if (inputBaseUrl.trim()) {
      config.baseUrl = inputBaseUrl.trim();
    }
    config.provider = inputProvider;

    await electron.setApiConfig(config);
    setInputApiKey('');
    setShowConfigInput(false);
    setMessage('API 配置已保存');
    loadApiConfig();
    loadStatus();
    setTimeout(() => setMessage(''), 3000);
  };

  const handleClearConfig = async () => {
    await electron.setApiConfig({ apiKey: '', baseUrl: '', provider: 'anthropic' });
    setInputApiKey('');
    setInputBaseUrl('');
    setInputProvider('anthropic');
    setMessage('API 配置已清除');
    loadApiConfig();
    loadStatus();
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="settings-panel">
      <h3>⚙️ 设置与状态</h3>

      {/* Claude 运行状态 */}
      <div className="status-section">
        <h4>Claude 状态</h4>
        <div className="status-items">
          <div className="status-item">
            <span className="status-label">运行状态:</span>
            <span className={`status-value ${status.isRunning ? 'running' : 'idle'}`}>
              {status.isRunning ? '🟢 运行中' : '⚪ 空闲'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">API 配置:</span>
            <span className={`status-value ${status.hasApiKey ? 'configured' : 'not-configured'}`}>
              {status.hasApiKey ? '✅ 已配置' : '❌ 未配置'}
            </span>
          </div>
          {status.hasCustomUrl && (
            <div className="status-item">
              <span className="status-label">API 提供商:</span>
              <span className="status-value">{status.provider === 'openai' ? 'OpenAI 兼容' : status.provider}</span>
            </div>
          )}
        </div>

        {status.isRunning && (
          <button className="stop-button" onClick={handleStopClaude}>
            🛑 停止 Claude 进程
          </button>
        )}
      </div>

      {/* API 配置管理 */}
      <div className="apikey-section">
        <h4>API 配置管理</h4>

        {apiConfig.hasKey && !showConfigInput ? (
          <div className="config-display">
            <div className="config-item">
              <span className="config-label">API Key:</span>
              <span className="config-value">{apiConfig.apiKey}</span>
            </div>
            {apiConfig.baseUrl && (
              <div className="config-item">
                <span className="config-label">API 端点:</span>
                <span className="config-value">{apiConfig.baseUrl}</span>
              </div>
            )}
            <div className="config-item">
              <span className="config-label">提供商:</span>
              <span className="config-value">
                {apiConfig.provider === 'openai' ? 'OpenAI 兼容' :
                 apiConfig.provider === 'custom' ? '自定义' :
                 apiConfig.provider === 'zhipu' ? '智谱 AI' : 'Anthropic'}
              </span>
            </div>
            {apiConfig.model && (
              <div className="config-item">
                <span className="config-label">模型:</span>
                <span className="config-value">{apiConfig.model}</span>
              </div>
            )}
            <div className="config-actions">
              <button className="button-small" onClick={() => {
                setShowConfigInput(true);
                setInputBaseUrl(apiConfig.baseUrl || '');
                setInputProvider(apiConfig.provider as 'anthropic' | 'openai' | 'custom' | 'zhipu');
              }}>
                修改
              </button>
              <button className="button-small button-danger" onClick={handleClearConfig}>
                清除
              </button>
            </div>
          </div>
        ) : showConfigInput ? (
          <div className="config-input">
            <div className="input-group">
              <label>API Key:</label>
              <input
                type="password"
                placeholder="输入 API Key (sk-ant-... 或 sk-...)"
                value={inputApiKey}
                onChange={(e) => setInputApiKey(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="input-group">
              <label>API 提供商:</label>
              <select
                value={inputProvider}
                onChange={(e) => {
                  setInputProvider(e.target.value as 'anthropic' | 'openai' | 'custom' | 'zhipu');
                  // 智谱AI 自动设置默认端点
                  if (e.target.value === 'zhipu' && !inputBaseUrl) {
                    setInputBaseUrl('https://open.bigmodel.cn/api/anthropic');
                  }
                }}
                className="input-field"
              >
                <option value="anthropic">Anthropic (官方)</option>
                <option value="zhipu">智谱 AI (GLM)</option>
                <option value="openai">OpenAI 兼容</option>
                <option value="custom">自定义/中转</option>
              </select>
            </div>

            <div className="input-group">
              <label>自定义 API 端点 (可选):</label>
              <input
                type="text"
                placeholder="https://api.example.com/v1 (留空使用默认)"
                value={inputBaseUrl}
                onChange={(e) => setInputBaseUrl(e.target.value)}
                className="input-field"
              />
              <small className="help-text-inline">
                用于第三方中转服务或自建代理
              </small>
            </div>

            <div className="button-group">
              <button className="button-small button-primary" onClick={handleSaveConfig}>
                保存配置
              </button>
              <button className="button-small" onClick={() => {
                setShowConfigInput(false);
                setInputApiKey('');
                setInputBaseUrl('');
              }}>
                取消
              </button>
            </div>
          </div>
        ) : (
          <button className="button-small" onClick={() => setShowConfigInput(true)}>
            🔑 配置 API
          </button>
        )}

        <div className="help-text">
          <p><strong>支持多种 API 提供商：</strong></p>
          <ul>
            <li><strong>Anthropic 官方</strong>: 使用官方 API，获取地址 <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">console.anthropic.com</a></li>
            <li><strong>智谱 AI</strong>: 使用智谱AI GLM 系列模型，获取地址 <a href="https://open.bigmodel.cn/" target="_blank" rel="noopener noreferrer">open.bigmodel.cn</a></li>
            <li><strong>自定义/中转</strong>: 支持第三方中转服务（如 one-api、new-api 等），填写自定义端点地址</li>
            <li><strong>OpenAI 兼容</strong>: 使用兼容 OpenAI 格式的 API 服务</li>
          </ul>
          <p>配置自定义端点时，填写完整的 API 地址（如 https://api.example.com/v1）</p>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`message ${message.includes('失败') || message.includes('错误') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
