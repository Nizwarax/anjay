export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/subdomain' && request.method === 'POST') {
      try {
        const { email, apiKey } = await request.json();

        const accountsRes = await fetch('https://api.cloudflare.com/client/v4/accounts', {
          headers: {
            'X-Auth-Email': email,
            'X-Auth-Key': apiKey,
            'Content-Type': 'application/json'
          }
        });
        const accountsData = await accountsRes.json();

        if (!accountsData.success || accountsData.result.length === 0) {
          return new Response(JSON.stringify({ success: false, error: 'Gagal mendapatkan akun Cloudflare' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const accountId = accountsData.result[0].id;

        const subRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`, {
          headers: {
            'X-Auth-Email': email,
            'X-Auth-Key': apiKey,
            'Content-Type': 'application/json'
          }
        });
        const subData = await subRes.json();

        if (!subData.success) {
          return new Response(JSON.stringify({ success: false, error: 'Gagal mendapatkan workers subdomain' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({
          success: true,
          subdomain: subData.result.subdomain
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Worker Deployer Pro</title>

    <!-- CodeMirror -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemirror.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/theme/monokai.min.css">

    <!-- Toastify -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css">

    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary: #3498db;
            --primary-dark: #2980b9;
            --secondary: #2c3e50;
            --bg-body: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --bg-card: #ffffff;
            --text-color: #2c3e50;
            --text-muted: #7f8c8d;
            --border-color: #e0e0e0;
            --hover-bg: #f8f9fa;
        }

        [data-theme="dark"] {
            --primary: #5dade2;
            --primary-dark: #3498db;
            --secondary: #ecf0f1;
            --bg-body: linear-gradient(135deg, #1a1c2c 0%, #4a192c 100%);
            --bg-card: #2c3e50;
            --text-color: #ecf0f1;
            --text-muted: #bdc3c7;
            --border-color: #34495e;
            --hover-bg: #34495e;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--bg-body);
            color: var(--text-color);
            min-height: 100vh;
            padding: 20px;
            transition: all 0.3s ease;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: var(--bg-card);
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            overflow: hidden;
            position: relative;
        }

        .control-panel {
            position: fixed;
            top: 20px;
            left: 20px;
            display: flex;
            gap: 10px;
            z-index: 100;
        }

        .control-btn {
            background: #2c3e50;
            color: white;
            border: none;
            padding: 12px 15px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .control-btn:hover {
            background: #34495e;
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }

        .header {
            background: linear-gradient(135deg, #2c3e50, #34495e);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 5px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .header p { font-size: 1.1em; opacity: 0.8; }

        .account-panel {
            position: fixed;
            top: 0;
            left: -400px;
            width: 350px;
            max-width: 85vw;
            height: 100vh;
            background: var(--bg-card);
            padding: 80px 20px 20px 20px;
            border-right: 1px solid var(--border-color);
            transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 99;
            overflow-y: auto;
            box-shadow: 5px 0 15px rgba(0,0,0,0.1);
        }
        .account-panel.active { left: 0; }

        .overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(3px);
            z-index: 98;
            opacity: 0;
            transition: opacity 0.3s;
        }
        .overlay.active { display: block; opacity: 1; }

        .modal {
            display: none;
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            background: var(--bg-card);
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 1000;
            min-width: 300px;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .modal.active { display: block; opacity: 1; transform: translate(-50%, -50%) scale(1); }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .modal-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: var(--text-color);
        }

        .btn {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(52, 152, 219, 0.3);
        }
        .btn-success { background: linear-gradient(135deg, #27ae60, #219a52); }
        .btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); }
        .btn-warning { background: linear-gradient(135deg, #f39c12, #e67e22); }
        .btn-danger { background: linear-gradient(135deg, #e74c3c, #c0392b); }

        .action-btn {
            background: #e74c3c;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
            transition: background 0.3s ease;
        }
        .action-btn:hover { background: #c0392b; }

        .worker-action-btn {
            flex: 1;
            padding: 8px 12px;
            border: none;
            border-radius: 5px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
        }
        .worker-action-btn.edit {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
        }
        .worker-action-btn.edit:hover {
            transform: translateY(-1px);
            box-shadow: 0 3px 8px rgba(52, 152, 219, 0.3);
        }
        .worker-action-btn.delete {
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
        }
        .worker-action-btn.delete:hover {
            transform: translateY(-1px);
            box-shadow: 0 3px 8px rgba(231, 76, 60, 0.3);
        }

        .form-group { margin-bottom: 15px; }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: var(--text-color);
            font-size: 13px;
        }
        input, select {
            width: 100%;
            padding: 10px 12px;
            border: 2px solid var(--border-color);
            border-radius: 6px;
            font-size: 14px;
            transition: all 0.3s ease;
            background: var(--bg-card);
            color: var(--text-color);
            font-family: inherit;
        }
        input:focus, select:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
        }

        .CodeMirror {
            height: 300px;
            border-radius: 0 0 6px 6px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            border: 1px solid var(--border-color);
            border-top: none;
        }

        .code-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: var(--hover-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px 6px 0 0;
            font-size: 12px;
            color: var(--text-muted);
        }

        .main-content { padding: 30px; }
        .stats { display: flex; gap: 15px; margin-bottom: 25px; flex-wrap: wrap; }
        .stat-item {
            flex: 1;
            min-width: 120px;
            background: var(--bg-card);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border: 1px solid var(--border-color);
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            transition: transform 0.3s;
        }
        .stat-item:hover { transform: translateY(-5px); }
        .stat-number { font-size: 2em; font-weight: bold; color: var(--primary); }
        .stat-label { font-size: 0.85em; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; }

        .card {
            background: var(--bg-card);
            border-radius: 10px;
            border: 1px solid var(--border-color);
            padding: 25px;
            margin-bottom: 25px;
        }
        .card-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
            color: var(--text-color);
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 10px;
        }

        .worker-item {
            background: var(--hover-bg);
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid var(--primary);
            margin-bottom: 15px;
            transition: all 0.3s ease;
        }
        .worker-item:hover { transform: translateX(5px); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .worker-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .worker-name { font-weight: bold; color: var(--text-color); font-size: 1.1em; }
        .config-value {
            background: var(--bg-card);
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid var(--border-color);
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
            color: var(--text-color);
        }
        .copy-btn {
            position: absolute;
            right: 5px;
            top: 50%;
            transform: translateY(-50%);
            background: var(--primary);
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            transition: 0.2s;
        }
        .copy-btn:hover { background: var(--primary-dark); }

        .worker-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px dashed var(--border-color);
        }

        .search-bar {
            margin-bottom: 20px;
        }
        .search-wrapper {
            position: relative;
        }
        .search-wrapper i {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
        }
        .search-wrapper input {
            padding-left: 40px;
        }

        .account-item {
            padding: 15px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: 0.2s;
        }
        .account-item:hover { border-color: var(--primary); background: var(--hover-bg); }
        .account-item.active { border-color: var(--primary); background: rgba(52, 152, 219, 0.1); }
        .account-email { font-weight: bold; margin-bottom: 5px; word-break: break-all; }
        .account-stats { font-size: 11px; color: var(--text-muted); }
        .account-actions { margin-top: 10px; text-align: right; }

        .empty-state { text-align: center; padding: 40px 20px; color: var(--text-muted); }
        .empty-state i { font-size: 3em; margin-bottom: 15px; opacity: 0.5; }

        .badge {
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            color: white;
        }
        .badge-manual { background: #9b59b6; }
        .badge-url { background: #3498db; }

        .data-actions {
            display: flex;
            gap: 10px;
        }
    </style>
</head>
<body>
    <div class="control-panel">
        <button class="control-btn" id="menu-btn" onclick="toggleAccountPanel()">
            <i class="fas fa-bars"></i> Akun
        </button>
        <button class="control-btn" onclick="toggleDarkMode()" title="Toggle Dark Mode">
            <i class="fas fa-moon" id="theme-icon"></i>
        </button>
        <button class="control-btn" onclick="openDataModal()" title="Backup / Restore">
            <i class="fas fa-database"></i>
        </button>
    </div>

    <div class="overlay" id="overlay" onclick="closeOverlays()"></div>

    <div class="modal" id="data-modal">
        <div class="modal-header">
            <h3><i class="fas fa-database"></i> Backup & Restore</h3>
            <button class="modal-close" onclick="closeOverlays()">&times;</button>
        </div>
        <p style="margin-bottom: 15px; font-size: 14px; color: var(--text-muted);">
            Simpan atau muat ulang data akun dan workers Anda. Pastikan untuk menyimpan file backup di tempat yang aman.
        </p>
        <div class="data-actions">
            <button class="btn btn-primary" onclick="exportData()">
                <i class="fas fa-download"></i> Export JSON
            </button>
            <button class="btn btn-warning" onclick="document.getElementById('import-file').click()">
                <i class="fas fa-upload"></i> Import JSON
            </button>
            <input type="file" id="import-file" style="display:none" accept=".json" onchange="importData(event)">
        </div>
    </div>

    <div class="account-panel" id="account-panel">
        <div class="card" style="margin-bottom: 20px; padding: 15px;">
            <h3 style="margin-bottom: 15px;"><i class="fas fa-plus-circle"></i> Tambah Akun</h3>
            <div class="form-group">
                <label>Email Cloudflare</label>
                <input type="email" id="new-account-email" placeholder="admin@domain.com">
            </div>
            <div class="form-group">
                <label>Global API Key</label>
                <input type="password" id="new-account-key" placeholder="••••••••••••••••">
            </div>
            <button class="btn btn-success" onclick="addNewAccount()" id="add-acc-btn">
                <i class="fas fa-save"></i> Simpan
            </button>
        </div>

        <h4 style="margin-bottom: 15px; color: var(--text-color);"><i class="fas fa-users"></i> Akun Tersimpan</h4>
        <div class="account-list" id="account-list"></div>
    </div>

    <div class="container">
        <div class="header">
            <h1><i class="fas fa-bolt" style="color: #f1c40f;"></i> Worker Deployer Pro</h1>
            <p>Deploy & Manage Cloudflare Workers with ease</p>
        </div>

        <div class="main-content">
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-number" id="total-accounts">0</div>
                    <div class="stat-label">Akun</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number" id="total-workers">0</div>
                    <div class="stat-label">Total Workers</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number" id="active-workers">0</div>
                    <div class="stat-label">Di Akun Ini</div>
                </div>
            </div>

            <div class="card" id="current-account-info" style="display: none; background: rgba(52, 152, 219, 0.1); border-color: var(--primary); align-items: center; gap: 10px; padding: 15px;">
                <i class="fas fa-user-circle" style="font-size: 24px; color: var(--primary);"></i>
                <div style="flex: 1;">
                    <div style="font-size: 12px; color: var(--text-muted);">Akun Aktif</div>
                    <strong id="current-account-email" style="font-size: 16px;"></strong>
                    <span id="current-account-stats" style="font-size: 12px; margin-left: 10px; color: var(--text-muted);"></span>
                </div>
            </div>

            <div class="card">
                <div class="card-header" style="justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <h3><i class="fas fa-rocket"></i> Setup Worker</h3>
                    </div>
                </div>

                <div id="edit-mode-indicator" style="display: none; background: rgba(243, 156, 18, 0.1); border: 1px solid #f39c12; padding: 10px 15px; border-radius: 8px; margin-bottom: 20px; align-items: center; justify-content: space-between;">
                    <div>
                        <i class="fas fa-edit" style="color: #f39c12;"></i> Mode Edit: <strong id="editing-worker-name"></strong>
                    </div>
                    <button class="btn btn-danger" style="width: auto; padding: 6px 12px; font-size: 12px;" onclick="cancelEdit()">
                        Batal Edit
                    </button>
                </div>

                <div class="form-group">
                    <label>Nama Worker</label>
                    <input type="text" id="workerName" placeholder="my-awesome-worker">
                </div>

                <div class="form-group">
                    <label>Sumber Script</label>
                    <select id="script-select" onchange="toggleScriptSource()">
                        <option value="manual">✍️ Tulis Kode Manual (Editor)</option>
                        <option value="custom">🔗 Gunakan Custom URL (GitHub Raw/Gist)</option>
                    </select>
                </div>

                <div class="form-group" id="custom-url-group" style="display:none;">
                    <label>URL Script <small>(Raw URL)</small></label>
                    <input type="text" id="custom-url" placeholder="https://raw.githubusercontent.com/...">
                </div>

                <div class="form-group" id="manual-code-group">
                    <label>Kode Worker</label>
                    <div class="code-header">
                        <span><i class="fab fa-js" style="color: #f1c40f;"></i> worker.js</span>
                        <div style="display: flex; gap: 5px;">
                            <button class="action-btn" style="background: #3498db;" onclick="formatCode()"><i class="fas fa-align-left"></i> Format</button>
                            <button class="action-btn" onclick="editor.setValue('')"><i class="fas fa-eraser"></i> Clear</button>
                        </div>
                    </div>
                    <textarea id="manual-code"></textarea>
                </div>

                <button class="btn btn-primary" style="margin-top: 10px;" onclick="deployWorker()" id="deploy-btn">
                    <i class="fas fa-cloud-upload-alt"></i> <span id="deploy-btn-text">Deploy Worker Sekarang</span>
                </button>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-server"></i> Manajemen Workers</h3>
                </div>

                <div class="search-bar">
                    <div class="search-wrapper">
                        <i class="fas fa-search"></i>
                        <input type="text" id="search-input" placeholder="Cari nama worker..." oninput="filterWorkers()">
                    </div>
                </div>

                <div class="results-section" id="worker-list"></div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemirror.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/mode/javascript/javascript.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/toastify-js"></script>

    <script>
        let accounts = JSON.parse(localStorage.getItem('cf-accounts') || '[]');
        let workers = JSON.parse(localStorage.getItem('cf-workers') || '[]');
        let currentAccountId = localStorage.getItem('current-account-id');
        let editingWorkerId = null;
        let editor;

        document.addEventListener('DOMContentLoaded', () => {
            initTheme();
            initEditor();
            initializeUI();
        });

        // ... [Theme & UI Logic] ...
        function initTheme() {
            const isDark = localStorage.getItem('dark-mode') === 'true';
            if (isDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
                document.getElementById('theme-icon').className = 'fas fa-sun';
            }
        }

        function toggleDarkMode() {
            const root = document.documentElement;
            const isDark = root.hasAttribute('data-theme');
            if (isDark) {
                root.removeAttribute('data-theme');
                localStorage.setItem('dark-mode', 'false');
                document.getElementById('theme-icon').className = 'fas fa-moon';
                editor.setOption('theme', 'default');
            } else {
                root.setAttribute('data-theme', 'dark');
                localStorage.setItem('dark-mode', 'true');
                document.getElementById('theme-icon').className = 'fas fa-sun';
                editor.setOption('theme', 'monokai');
            }
        }

        function showToast(text, type = 'info') {
            const bg = type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db';
            Toastify({
                text: text,
                duration: 3000,
                gravity: "bottom",
                position: "right",
                style: { background: bg, borderRadius: "8px", fontSize: "14px", fontFamily: "inherit" }
            }).showToast();
        }

        function initEditor() {
            const isDark = localStorage.getItem('dark-mode') === 'true';
            editor = CodeMirror.fromTextArea(document.getElementById('manual-code'), {
                mode: 'javascript',
                lineNumbers: true,
                theme: isDark ? 'monokai' : 'default',
                indentUnit: 2,
                tabSize: 2,
                viewportMargin: Infinity
            });

            const defaultCode = \`export default {
  async fetch(request, env, ctx) {
    return new Response('Hello from Worker Deployer Pro!');
  },
};\`;
            editor.setValue(defaultCode);
        }

        function toggleScriptSource() {
            const val = document.getElementById('script-select').value;
            document.getElementById('custom-url-group').style.display = val === 'custom' ? 'block' : 'none';
            document.getElementById('manual-code-group').style.display = val === 'manual' ? 'block' : 'none';
            if (val === 'manual') setTimeout(() => editor.refresh(), 50);
        }

        function formatCode() {
            let code = editor.getValue();
            code = code.replace(/^\\s+$/gm, '').replace(/\\n{3,}/g, '\\n\\n');
            editor.setValue(code);
            showToast('Kode berhasil dirapihkan');
        }

        // ... [Data Management Functions] ...
        function openDataModal() {
            document.getElementById('overlay').classList.add('active');
            document.getElementById('data-modal').classList.add('active');
        }

        function exportData() {
            const data = { accounts, workers };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`worker_deployer_backup_\${new Date().toISOString().slice(0,10)}.json\`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Data berhasil diexport');
            closeOverlays();
        }

        function importData(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const parsed = JSON.parse(ev.target.result);
                    if (parsed.accounts && parsed.workers) {
                        accounts = parsed.accounts;
                        workers = parsed.workers;
                        saveData();
                        initializeUI();
                        showToast('Data berhasil diimport', 'success');
                    } else {
                        throw new Error('Format tidak valid');
                    }
                } catch(err) {
                    showToast('Gagal import data', 'error');
                }
            };
            reader.readAsText(file);
            closeOverlays();
        }

        // ... [Core Logic] ...
        function toggleAccountPanel() {
            document.getElementById('account-panel').classList.toggle('active');
            document.getElementById('overlay').classList.toggle('active');
        }

        function closeOverlays() {
            document.getElementById('account-panel').classList.remove('active');
            document.getElementById('overlay').classList.remove('active');
            document.getElementById('data-modal').classList.remove('active');
        }

        function initializeUI() {
            if (accounts.length > 0 && (!currentAccountId || !accounts.find(a => a.id === currentAccountId))) {
                currentAccountId = accounts[0].id;
                localStorage.setItem('current-account-id', currentAccountId);
            }
            updateAccountList();
            updateStats();
            filterWorkers();
        }

        function saveData() {
            localStorage.setItem('cf-accounts', JSON.stringify(accounts));
            localStorage.setItem('cf-workers', JSON.stringify(workers));
        }

        async function addNewAccount() {
            const email = document.getElementById('new-account-email').value.trim();
            const apiKey = document.getElementById('new-account-key').value.trim();
            if (!email || !apiKey) return showToast('Email dan API Key wajib diisi!', 'error');
            if (accounts.find(a => a.email === email)) return showToast('Akun sudah ada!', 'error');

            const btn = document.getElementById('add-acc-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifikasi...';

            try {
                const res = await fetch('/api/subdomain', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, apiKey })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error);

                const newAcc = { id: Date.now().toString(36), email, apiKey, subdomain: data.subdomain };
                accounts.push(newAcc);
                saveData();

                document.getElementById('new-account-email').value = '';
                document.getElementById('new-account-key').value = '';
                selectAccount(newAcc.id);
                showToast(\`Berhasil tambah akun. Subdomain: \${data.subdomain}\`, 'success');
            } catch (err) {
                showToast('Gagal: ' + err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Simpan';
            }
        }

        function selectAccount(id) {
            currentAccountId = id;
            localStorage.setItem('current-account-id', id);
            initializeUI();

            const acc = accounts.find(a => a.id === id);
            const info = document.getElementById('current-account-info');
            if (acc) {
                info.style.display = 'flex';
                document.getElementById('current-account-email').textContent = acc.email;
                document.getElementById('current-account-stats').textContent = \`\${workers.filter(w => w.accountId === id).length} Workers\`;
            } else {
                info.style.display = 'none';
            }
            closeOverlays();
        }

        function deleteAccount(id, ev) {
            ev.stopPropagation();
            if (!confirm('Yakin ingin menghapus akun ini?')) return;
            accounts = accounts.filter(a => a.id !== id);
            workers = workers.filter(w => w.accountId !== id);
            saveData();
            if (currentAccountId === id) {
                currentAccountId = accounts.length ? accounts[0].id : null;
                if(currentAccountId) localStorage.setItem('current-account-id', currentAccountId);
                else localStorage.removeItem('current-account-id');
            }
            initializeUI();
            showToast('Akun dihapus');
        }


        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function updateAccountList() {
            const list = document.getElementById('account-list');
            if (!accounts.length) {
                list.innerHTML = \`<div class="empty-state"><i class="fas fa-ghost"></i><p>Belum ada akun</p></div>\`;
                return;
            }
            list.innerHTML = accounts.map(a => \`
                <div class="account-item \${a.id === currentAccountId ? 'active' : ''}" onclick="selectAccount('\${a.id}')">
                    <div class="account-email">\${escapeHtml(a.email)}</div>
                    <div class="account-stats">\${workers.filter(w=>w.accountId===a.id).length} workers</div>
                    <div class="account-actions">
                        <button class="action-btn" onclick="deleteAccount('\${a.id}', event)"><i class="fas fa-trash"></i> Hapus</button>
                    </div>
                </div>
            \`).join('');
        }

        // ... [Worker Logic] ...
        async function deployWorker() {
            if (!currentAccountId) return showToast('Pilih akun dulu!', 'error');
            const acc = accounts.find(a => a.id === currentAccountId);

            const name = document.getElementById('workerName').value.trim();
            const type = document.getElementById('script-select').value;
            const url = document.getElementById('custom-url').value.trim();
            const code = editor.getValue();

            if (!name) return showToast('Nama worker wajib diisi!', 'error');
            if (!editingWorkerId && workers.find(w => w.accountId === acc.id && w.workerName === name)) {
                return showToast('Nama worker sudah ada!', 'error');
            }

            const payload = { email: acc.email, globalAPIKey: acc.apiKey, workerName: name };
            if (type === 'custom') {
                if (!url) return showToast('URL wajib diisi!', 'error');
                payload.githubUrl = url;
            } else {
                if (!code || code.length < 10) return showToast('Kode tidak valid!', 'error');
                payload.scriptContent = code;
            }

            const btn = document.getElementById('deploy-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (editingWorkerId ? 'Updating...' : 'Deploying...');

            try {
                const res = await fetch('https://proxy.ambe.workers.dev/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (!data.success) throw new Error(data.error || 'Deploy gagal');

                let subUrl = data.sub ? data.sub.replace(/\\/sub\$/, '') : '';
                if(subUrl && acc.subdomain && subUrl.includes('.workers.dev') && !subUrl.includes(acc.subdomain)) {
                    subUrl = subUrl.replace('.workers.dev', \`.\${acc.subdomain}.workers.dev\`);
                }

                const wData = {
                    id: editingWorkerId || Date.now().toString(36),
                    accountId: acc.id,
                    workerName: name,
                    sourceType: type,
                    githubUrl: url,
                    manualCode: type === 'manual' ? code : null,
                    sub: subUrl,
                    timestamp: Date.now()
                };

                if (editingWorkerId) {
                    const idx = workers.findIndex(w => w.id === editingWorkerId);
                    if(idx !== -1) workers[idx] = wData;
                    showToast(\`Worker "\${name}" diupdate!\`, 'success');
                    cancelEdit();
                } else {
                    workers.unshift(wData);
                    showToast(\`Worker "\${name}" berhasil dibuat!\`, 'success');
                    document.getElementById('workerName').value = '';
                    document.getElementById('custom-url').value = '';
                    editor.setValue('');
                }

                saveData();
                initializeUI();
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> <span id="deploy-btn-text">' + (editingWorkerId ? 'Update Worker' : 'Deploy Worker Sekarang') + '</span>';
            }
        }

        function filterWorkers() {
            const list = document.getElementById('worker-list');
            const filterText = document.getElementById('search-input').value.toLowerCase();

            let accWorkers = currentAccountId ? workers.filter(w => w.accountId === currentAccountId) : [];

            if (filterText) {
                accWorkers = accWorkers.filter(w => w.workerName.toLowerCase().includes(filterText));
            }

            if (!accWorkers.length) {
                list.innerHTML = \`<div class="empty-state"><i class="fas fa-box-open"></i><p>\${filterText ? 'Pencarian tidak ditemukan' : 'Belum ada worker di akun ini'}</p></div>\`;
                return;
            }

            list.innerHTML = accWorkers.map(w => {
                const badge = w.sourceType === 'manual' ? '<span class="badge badge-manual">Manual</span>' : '<span class="badge badge-url">URL</span>';
                return \`
                <div class="worker-item">
                    <div class="worker-header">
                        <div class="worker-name">\${escapeHtml(w.workerName)} \${badge}</div>
                        <div style="font-size: 11px; color: var(--text-muted);"><i class="far fa-clock"></i> \${new Date(w.timestamp).toLocaleString()}</div>
                    </div>
                    <div style="position: relative; margin-bottom: 10px;">
                        <div class="config-value">\${w.sub || 'N/A'}</div>
                        \${w.sub ? \`<button class="copy-btn" onclick="copyText('\${w.sub.replace(/'/g, "\\\\'")}')" title="Copy URL"><i class="fas fa-copy"></i></button>\` : ''}
                    </div>
                    <div class="worker-actions">
                        <button class="worker-action-btn edit" onclick="editWorker('\${w.id}')"><i class="fas fa-edit"></i> Edit</button>
                        <button class="worker-action-btn delete" onclick="deleteWorker('\${w.id}')"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
                \`;
            }).join('');
        }

        function editWorker(id) {
            const w = workers.find(x => x.id === id);
            if(!w) return;
            editingWorkerId = id;

            document.getElementById('edit-mode-indicator').style.display = 'flex';
            document.getElementById('editing-worker-name').textContent = w.workerName;
            document.getElementById('workerName').value = w.workerName;

            document.getElementById('script-select').value = w.sourceType || 'manual';
            toggleScriptSource();

            if(w.sourceType === 'custom') {
                document.getElementById('custom-url').value = w.githubUrl || '';
            } else {
                if(w.manualCode) {
                    editor.setValue(w.manualCode);
                }
            }

            document.getElementById('deploy-btn-text').textContent = 'Update Worker';
            document.getElementById('deploy-btn').className = 'btn btn-warning';
            window.scrollTo({top: 0, behavior: 'smooth'});
        }

        function cancelEdit() {
            editingWorkerId = null;
            document.getElementById('edit-mode-indicator').style.display = 'none';
            document.getElementById('workerName').value = '';
            document.getElementById('script-select').value = 'manual';
            toggleScriptSource();
            editor.setValue('');
            document.getElementById('deploy-btn-text').textContent = 'Deploy Worker Sekarang';
            document.getElementById('deploy-btn').className = 'btn btn-primary';
        }

        function deleteWorker(id) {
            if(!confirm('Yakin hapus worker ini dari riwayat lokal? (Tidak menghapus di Cloudflare)')) return;
            workers = workers.filter(w => w.id !== id);
            saveData();
            filterWorkers();
            updateStats();
            if(editingWorkerId === id) cancelEdit();
            showToast('Worker dihapus', 'success');
        }

        function updateStats() {
            document.getElementById('total-accounts').textContent = accounts.length;
            document.getElementById('total-workers').textContent = workers.length;
            document.getElementById('active-workers').textContent = currentAccountId ? workers.filter(w=>w.accountId===currentAccountId).length : 0;

            if(currentAccountId) {
                document.getElementById('current-account-stats').textContent = \`\${workers.filter(w=>w.accountId===currentAccountId).length} Workers\`;
            }
        }

        function copyText(txt) {
            navigator.clipboard.writeText(txt);
            showToast('Disalin ke clipboard!', 'success');
        }
    </script>
</body>
</html>`;
    return new Response(html, {
      headers: {
        'content-type': 'text/html;charset=UTF-8',
      },
    });
  },
};
