/**
 * DL-Code-Tutor - 主应用组件
 */

import { useState, useEffect } from 'react';
import Header from './components/Header';
import UploadSection from './components/UploadSection';
import KnowledgeSection from './components/KnowledgeSection';
import ResultSection from './components/ResultSection';
import PermissionModal from './components/PermissionModal';
import SettingsPanel from './components/SettingsPanel';
import Footer from './components/Footer';
import { getElectronAPI } from './utils/electron';
import './App.css';

interface PermissionRequest {
  id: string;
  filePath: string;
  fileType: 'code' | 'log' | 'unknown';
  fileSize: number;
}

function App() {
  const [pendingPermission, setPendingPermission] = useState<PermissionRequest | null>(null);
  const [rememberChoice, setRememberChoice] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState('');
  const [progress, setProgress] = useState('');

  const electron = getElectronAPI();

  useEffect(() => {
    // 监听权限请求
    electron.onPermissionRequest((request: PermissionRequest) => {
      setPendingPermission(request);
    });

    // 监听分析进度
    electron.onAnalysisProgress((chunk: string) => {
      setProgress(prev => prev + chunk);
    });
  }, [electron]);

  const handlePermissionResponse = (granted: boolean) => {
    electron.respondToPermission({
      id: pendingPermission!.id,
      granted,
      remember: rememberChoice
    });
    setPendingPermission(null);
    setRememberChoice(false);
  };

  const handleAnalyze = async (filePath: string, logPath?: string) => {
    setIsAnalyzing(true);
    setResult('');
    setProgress('');

    try {
      const response = logPath
        ? await electron.analyzeWithLog(filePath, logPath)
        : await electron.analyzeCode(filePath);

      if (response.success) {
        setResult(response.result || '');
      } else {
        setResult(`错误: ${response.error}`);
      }
    } catch (error) {
      setResult(`错误: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app">
      <Header />

      <main className="main-content">
        <SettingsPanel />

        <UploadSection
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          progress={progress}
        />

        <KnowledgeSection />

        {(result || progress) && (
          <ResultSection result={result || progress} />
        )}
      </main>

      <Footer onClearPermissions={async () => {
        await electron.clearPermissions();
      }} />

      {pendingPermission && (
        <PermissionModal
          request={pendingPermission}
          rememberChoice={rememberChoice}
          onRememberChange={setRememberChoice}
          onResponse={handlePermissionResponse}
        />
      )}
    </div>
  );
}

export default App;
