@echo off
set CLAUDE_CODE_GIT_BASH_PATH=G:\Git\usr\bin\bash.exe
set ANTHROPIC_API_KEY=test-key
set ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
cd /d C:\Users\Lenovo\AppData\Roaming\dl-code-tutor\DL-Code-Tutor\workspace
G:\node\node.exe C:\Users\Lenovo\AppData\Roaming\npm\node_modules\@anthropic-ai\claude-code\cli.js
pause
