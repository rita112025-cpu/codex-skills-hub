# Codex Skills Hub

> 搜尋、比較與管理可重用的 Codex Skills，需要時再安裝，不把所有 workflow 塞進環境

Codex Skills Hub 是 **Codex Skill Registry / Personal Skill Navigator**，不是教學文章站，也不是一次把所有 Skill 安裝進 Codex 的工具。

使用情境：

遇到工作需求
↓
開啟 Skills Hub
↓
搜尋 Skill
↓
查看用途 / 依賴 / 風險 / 來源
↓
需要才安裝

## 定位

本網站不會自動安裝 Skill，也不會在網頁內執行 Shell、自動修改 ~/.codex、儲存 API Key / Token。

所有安裝皆由使用者自行複製安裝指令後貼到終端機執行。

網站顯示的安全資訊只是依公開 repository 及 Skill 內容整理，不代表完整安全稽核。安裝第三方 Skill 前，仍應自行查看 SKILL.md、scripts 與相關權限。

## 功能

- 搜尋：name / title / description / category / useCase / tags / sourceName / requires / notes，即時、大小寫不敏感、中英文皆可
- 分類篩選：Category / UseCase / Risk / Dependency，可同時篩選
- 排序：精選優先 / 名稱 A-Z / 最新加入 / 風險低→高
- 收藏：localStorage ☆/★，只看收藏，重新整理保留
- 我的 Skills：localStorage 手動標記已安裝，UI 寫「手動標記已安裝」，並非偵測到已安裝
- URL Filter：?category=CI&q=github&risk=medium 等，分享後可重現
- Dark Mode：prefers-color-scheme + 手動切換 + localStorage
- 安裝：複製安裝指令按鈕，外部連結另開視窗
- 風險顯示：LOW / MEDIUM / HIGH / 未確認，依證據判定，不可依感覺
- Capability Badges：Scripts / Shell / Network / API Key / MCP / Git Write / Delete / Tests / Dry Run，狀態 ✓ 有 / － 無 / ? 未確認，不單一紅綠燈簡化未知

## 資料來源

第一版主要整理：ComposioHQ/awesome-codex-skills (原 composio-community/awesome-codex-skills)

至少包含：

- skill-creator
- gh-fix-ci
- gh-address-comments
- pr-review-ci-fix
- codebase-migrate
- meeting-notes-and-actions
- spreadsheet-formula-helper
- codebase-recon
- sentry-triage
- issue-triage

每個 Skill 皆依流程：

1. 找到 Skill 資料夾
2. 閱讀 SKILL.md
3. 查看 scripts/ / references/
4. 確認外部服務 / Git 操作 / 可能修改或刪除檔案
5. 建立 JSON，未確認欄位使用 null

## 資料品質

- ID 不重複
- URL 不虛構，skillPath 存在，sourceRepo 正確
- category 合法，risk 合法
- 日期 YYYY-MM-DD
- null 與 false 不混淆，未確認使用 null 或 未確認

## Project Structure

```
codex-skills-hub/
├─ index.html
├─ style.css
├─ app.js
├─ data/
│  └─ skills.json
├─ assets/
│  └─ icons/
├─ README.md
├─ .gitignore
└─ LICENSE
```

## Local Development

不需要 npm install。

```bash
python -m http.server 8000
# http://localhost:8000
```

## GitHub Pages Deployment

1. 建立 repo：codex-skills-hub
2. 推送到 main 分支，根目錄包含 index.html
3. Settings → Pages → Deploy from branch → main / root
4. 網址：https://USERNAME.github.io/codex-skills-hub/

## 安全限制

網站不得加入：

- 第三方 analytics
- 未知 tracking script
- 遠端 executable script
- 直接 Shell execution
- 自動 Git push / 自動安裝 Skill
- API Key / Token 儲存

## Content Security

Skill description 來自 JSON 時避免直接 innerHTML = externalData，使用 textContent 避免 HTML injection。

## License

MIT – 見 LICENSE。
Data sources belong to their respective authors.
