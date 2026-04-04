@echo off
echo ========================================
echo 测试 Claude CLI - 修复版本
echo ========================================
echo.

REM 设置正确的环境变量
echo [1] 设置环境变量...
set CLAUDE_CODE_GIT_BASH_PATH=G:\Git\bin\bash.exe
echo     CLAUDE_CODE_GIT_BASH_PATH=%CLAUDE_CODE_GIT_BASH_PATH%

REM 设置 API 配置（请替换为你的实际 API Key）
set ANTHROPIC_API_KEY=your-api-key-here
set ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/paas/v4/

echo     ANTHROPIC_BASE_URL=%ANTHROPIC_BASE_URL%
echo.

REM 切换到工作目录
echo [2] 切换到工作目录...
cd /d "C:\Users\Lenovo\AppData\Roaming\dl-code-tutor\DL-Code-Tutor\workspace"
echo     当前目录: %CD%
echo.

REM 运行 Claude CLI
echo [3] 启动 Claude CLI...
echo     请输入: /help
echo     然后输入: /skill fetch-papers knowledge:"C:\Users\Lenovo\AppData\Roaming\dl-code-tutor\DL-Code-Tutor\knowledge"
echo.
echo ========================================
echo.

G:\node\node.exe "C:\Users\Lenovo\AppData\Roaming\npm\node_modules\@anthropic-ai\claude-code\cli.js"

pause
