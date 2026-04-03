/**
 * Footer 组件
 */

import { useState } from 'react';

export default function Footer({ onClearPermissions }: { onClearPermissions: () => void }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <footer className="footer">
      <p className="footer-text">
        🔒 所有分析在本地进行，代码不会上传到任何服务器
      </p>

      <div className="footer-links">
        <button onClick={() => window.electron.openKnowledgeFolder()}>
          打开知识库文件夹
        </button>
        <span className="separator">|</span>
        <button
          onClick={() => {
            if (confirm('确定要清除所有权限记录吗？')) {
              onClearPermissions();
            }
          }}
        >
          清除权限记录
        </button>
      </div>
    </footer>
  );
}
