/**
 * 检查是否在 Electron 环境中运行
 */
export const isElectron = (): boolean => {
  return window && typeof window.electron !== 'undefined';
};

/**
 * 获取 Electron API，如果不存在则返回 mock 对象
 */
export const getElectronAPI = () => {
  if (isElectron()) {
    return window.electron;
  }

  // 开发环境下的 mock 实现
  return {
    analyzeCode: async (filePath: string) => {
      console.log('[Mock] analyzeCode:', filePath);
      return { success: true, result: '这是开发模式下的模拟输出\n\n代码分析功能需要在 Electron 环境中运行。' };
    },
    analyzeWithLog: async (codePath: string, logPath: string) => {
      console.log('[Mock] analyzeWithLog:', codePath, logPath);
      return { success: true, result: '这是开发模式下的模拟输出\n\n代码分析功能需要在 Electron 环境中运行。' };
    },
    fetchPapers: async (count: number, days: number) => {
      console.log('[Mock] fetchPapers:', count, days);
      return { success: true, result: '模拟：已获取最新论文' };
    },
    getKnowledgeStatus: async () => {
      console.log('[Mock] getKnowledgeStatus');
      return { paperCount: 3, knowledgePath: '/mock/path', canEdit: true };
    },
    openKnowledgeFolder: async () => {
      console.log('[Mock] openKnowledgeFolder');
      alert('开发模式：此功能需要在 Electron 环境中运行');
    },
    getPermissionsHistory: async () => {
      console.log('[Mock] getPermissionsHistory');
      return [];
    },
    clearPermissions: async () => {
      console.log('[Mock] clearPermissions');
      return { success: true };
    },
    stopClaude: async () => {
      console.log('[Mock] stopClaude');
      return { success: true, message: '模拟：已停止 Claude 进程' };
    },
    getClaudeStatus: async () => {
      console.log('[Mock] getClaudeStatus');
      return { isRunning: false, hasApiKey: false, hasCustomUrl: false, provider: 'anthropic' };
    },
    setApiConfig: async (config: { apiKey?: string; baseUrl?: string; provider?: string }) => {
      console.log('[Mock] setApiConfig:', config);
      return { success: true };
    },
    getApiConfig: async () => {
      console.log('[Mock] getApiConfig');
      return { success: true, apiKey: '', baseUrl: '', provider: 'anthropic', hasKey: false };
    },
    setApiKey: async (apiKey: string) => {
      console.log('[Mock] setApiKey:', apiKey.substring(0, 4) + '...');
      return { success: true };
    },
    getApiKey: async () => {
      console.log('[Mock] getApiKey');
      return { success: true, apiKey: '', hasKey: false };
    },
    onPermissionRequest: (callback: any) => {
      console.log('[Mock] onPermissionRequest registered');
    },
    respondToPermission: (response: any) => {
      console.log('[Mock] respondToPermission:', response);
    },
    onAnalysisProgress: (callback: any) => {
      console.log('[Mock] onAnalysisProgress registered');
    },
    onClaudeStatusChanged: (callback: any) => {
      console.log('[Mock] onClaudeStatusChanged registered');
    }
  };
};
