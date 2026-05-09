export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API Route untuk mendapatkan subdomain
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
          headers: { 'Content-Type': 'application/json' }        });
      }
    }

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>⚡ Cloudflare Worker Deployer Pro</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemirror.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/theme/dracula.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --secondary-gradient: linear-gradient(135deg, #2c3e50, #34495e);
            --success-gradient: linear-gradient(135deg, #27ae60, #219a52);
            --danger-gradient: linear-gradient(135deg, #e74c3c, #c0392b);
            --warning-gradient: linear-gradient(135deg, #f39c12, #e67e22);
            --bg-color: #f4f7f6;
            --container-bg: #ffffff;
            --text-color: #2c3e50;
            --text-muted: #7f8c8d;
            --border-color: #e0e0e0;
            --input-bg: #ffffff;
            --panel-bg: #f8f9fa;
        }

        body.dark-mode {
            --primary-gradient: linear-gradient(135deg, #4b6cb7 0%, #182848 100%);
            --secondary-gradient: linear-gradient(135deg, #1a252f, #2c3e50);
            --bg-color: #121212;
            --container-bg: #1e1e1e;
            --text-color: #e0e0e0;
            --text-muted: #aaaaaa;
            --border-color: #333333;
            --input-bg: #2a2a2a;
            --panel-bg: #222222;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--bg-color);
            background-image: var(--primary-gradient);
            min-height: 100vh;
            padding: 20px;
            color: var(--text-color);
            transition: background 0.3s ease, color 0.3s ease;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: var(--container-bg);
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            overflow: hidden;
            position: relative;
            transition: background 0.3s ease;
        }
        .top-controls {
            position: fixed;
            top: 20px;
            left: 20px;
            display: flex;
            gap: 10px;
            z-index: 10000;
        }
        .control-btn {
            background: var(--secondary-gradient);
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
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            filter: brightness(1.1);
        }
        .header {
            background: var(--secondary-gradient);
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
            background: var(--panel-bg);
            padding: 80px 20px 20px 20px;
            border-right: 1px solid var(--border-color);
            transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 9999;
            overflow-y: auto;
            box-shadow: 2px 0 10px rgba(0,0,0,0.2);
        }
        .account-panel.active { left: 0; }

        .panel-card {
            background: var(--container-bg);
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            border: 1px solid var(--border-color);
        }
        .panel-card h3 {
            color: var(--text-color);
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 1.1em;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 10px;
        }
        .form-group { margin-bottom: 15px; }
        label {
            display: block;
            margin-bottom: 6px;
            font-weight: 600;
            color: var(--text-color);
            font-size: 13px;
        }
        input, select, textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid var(--border-color);
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.3s ease;
            font-family: inherit;
            background: var(--input-bg);
            color: var(--text-color);
        }
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
        }

        .btn {
            background: var(--primary-gradient);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            filter: brightness(1.1);
        }
        .btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
        }
        .btn-success { background: var(--success-gradient); }
        .btn-warning { background: var(--warning-gradient); }
        .btn-danger { background: var(--danger-gradient); }

        .account-list { max-height: 300px; overflow-y: auto; padding-right: 5px; }
        .account-item {
            background: var(--input-bg);
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            border: 1px solid var(--border-color);
            border-left-width: 4px;
        }
        .account-item:hover {
            transform: translateX(5px);
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            border-left-color: #2980b9;
        }
        .account-item.active {
            border-left-color: #27ae60;
            background: rgba(39, 174, 96, 0.1);
        }
        .account-email {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 5px;
            word-break: break-all;
        }
        .account-stats { font-size: 11px; color: var(--text-muted); }
        .account-actions { display: flex; gap: 5px; margin-top: 10px; }
        .action-btn {
            background: var(--danger-gradient);
            color: white;
            border: none;
            padding: 6px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            transition: filter 0.3s ease;
            flex: 1;
        }
        .action-btn:hover { filter: brightness(1.2); }

        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-muted);
            background: var(--input-bg);
            border-radius: 10px;
            border: 2px dashed var(--border-color);
        }
        .empty-state i { font-size: 3em; margin-bottom: 15px; opacity: 0.5; }

        .main-content { padding: 40px; }

        .stats { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
        .stat-item {
            flex: 1;
            min-width: 120px;
            background: var(--container-bg);
            padding: 25px 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            border: 1px solid var(--border-color);
            transition: transform 0.3s ease;
        }
        .stat-item:hover { transform: translateY(-5px); }
        .stat-number { font-size: 2.2em; font-weight: bold; color: #667eea; line-height: 1; }
        .stat-label { font-size: 0.9em; color: var(--text-muted); margin-top: 8px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;}

        .card {
            background: var(--container-bg);
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            margin-bottom: 30px;
            border: 1px solid var(--border-color);
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 15px;
        }
        .card h3 {
            color: var(--text-color);
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1.4em;
        }

        .current-account {
            background: rgba(52, 152, 219, 0.1);
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            border-left: 4px solid #3498db;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .current-account-info { display: flex; align-items: center; gap: 10px; }

        /* Search Bar */
        .search-bar {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .search-bar input {
            flex: 1;
            padding-left: 35px;
        }
        .search-wrapper {
            position: relative;
            flex: 1;
        }
        .search-wrapper i {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
        }

        .results-section {
            max-height: 600px;
            overflow-y: auto;
            padding-right: 10px;
        }
        .worker-item {
            background: var(--panel-bg);
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #27ae60;
            margin-bottom: 15px;
            position: relative;
            border: 1px solid var(--border-color);
            border-left-width: 4px;
            transition: all 0.3s ease;
        }
        .worker-item:hover {
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transform: scale(1.01);
        }
        .worker-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            flex-wrap: wrap;
            gap: 10px;
        }
        .worker-name { font-weight: 700; font-size: 1.1em; display: flex; align-items: center; gap: 10px;}
        .badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            color: white;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .badge-manual { background: #9b59b6; }
        .badge-url { background: #3498db; }

        .config-value {
            background: var(--input-bg);
            padding: 12px 45px 12px 12px;
            border-radius: 6px;
            border: 1px solid var(--border-color);
            word-break: break-all;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 13px;
            position: relative;
            color: #d35400;
        }
        body.dark-mode .config-value { color: #e67e22; }

        .copy-btn {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: var(--primary-gradient);
            color: white;
            border: none;
            width: 30px;
            height: 30px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        .copy-btn:hover { filter: brightness(1.2); }

        .worker-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px dashed var(--border-color);
        }

        .loading-overlay {
            display: none;
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255,255,255,0.8);
            z-index: 50;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            border-radius: 12px;
            backdrop-filter: blur(4px);
        }
        body.dark-mode .loading-overlay { background: rgba(30,30,30,0.8); }
        .loading-overlay.active { display: flex; }

        .spinner {
            border: 4px solid rgba(0,0,0,0.1);
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin-bottom: 15px;
        }
        body.dark-mode .spinner { border-color: rgba(255,255,255,0.1); border-top-color: #667eea; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(3px);
            z-index: 9998;
        }
        .overlay.active { display: block; }

        /* CodeMirror Overrides */
        .CodeMirror {
            height: 300px;
            border: 2px solid var(--border-color);
            border-radius: 0 0 8px 8px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 14px;
        }
        .CodeMirror-focused { border-color: #3498db; box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2); }

        .code-editor-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background: var(--panel-bg);
            border: 2px solid var(--border-color);
            border-bottom: none;
            border-radius: 8px 8px 0 0;
            font-weight: 600;
        }

        .edit-mode-indicator {
            background: rgba(243, 156, 18, 0.1);
            border: 1px solid #f39c12;
            color: #d35400;
            padding: 12px 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
            align-items: center;
            justify-content: space-between;
            font-weight: 600;
        }
        body.dark-mode .edit-mode-indicator { color: #f39c12; }
        .edit-mode-indicator.active { display: flex; }

        /* Data Management Modal */
        .modal {
            display: none;
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            background: var(--container-bg);
            padding: 30px;
            border-radius: 15px;
            z-index: 10001;
            box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            width: 90%;
            max-width: 500px;
            opacity: 0;
            transition: all 0.3s ease;
        }
        .modal.active {
            display: block;
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 10px;
        }
        .modal-close {
            background: none; border: none; font-size: 1.5em; cursor: pointer; color: var(--text-muted);
        }
        .data-actions { display: flex; gap: 10px; margin-top: 20px; }

        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: var(--bg-color); }
        ::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #a0aec0; }
        body.dark-mode ::-webkit-scrollbar-thumb { background: #4a5568; }

        @media (max-width: 768px) {
            .stats { flex-direction: column; }
            .main-content { padding: 20px; padding-top: 80px; }
            .header { padding: 30px 15px; }
            .worker-header { flex-direction: column; align-items: flex-start; }
        }
    </style>
</head>
<body>
    <div class="top-controls">
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

    <!-- Data Management Modal -->
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
        <div class="panel-card">
            <h3><i class="fas fa-plus-circle"></i> Tambah Akun</h3>
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

            <div class="current-account" id="current-account-info" style="display: none;">
                <div class="current-account-info">
                    <i class="fas fa-user-circle fa-2x" style="color: #3498db;"></i>
                    <div>
                        <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">Akun Aktif</div>
                        <strong id="current-account-email" style="font-size: 16px;">-</strong>
                    </div>
                </div>
                <span class="badge badge-url" id="current-account-stats">0 Workers</span>
            </div>

            <div class="card" style="position: relative;">
                <div class="loading-overlay" id="deploy-loading">
                    <div class="spinner"></div>
                    <h3 style="color: var(--text-color);">Memproses...</h3>
                    <p style="color: var(--text-muted);">Mohon tunggu sebentar</p>
                </div>

                <div class="card-header">
                    <h3><i class="fas fa-rocket text-primary"></i> Setup Worker</h3>
                </div>

                <div class="edit-mode-indicator" id="edit-mode-indicator">
                    <span><i class="fas fa-pen"></i> Mode Edit: <strong id="editing-worker-name"></strong></span>
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
                    <div class="code-editor-header">
                        <span><i class="fab fa-js" style="color: #f1c40f;"></i> worker.js</span>
                        <div>
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

    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemirror.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/mode/javascript/javascript.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/toastify-js"></script>
    <script>
        let accounts = JSON.parse(localStorage.getItem('cf-accounts') || '[]');
        let workers = JSON.parse(localStorage.getItem('cf-workers') || '[]');
        let currentAccountId = localStorage.getItem('current-account-id') || null;
        let editingWorkerId = null;
        let editor;
        let isDarkMode = localStorage.getItem('dark-mode') === 'true';

        document.addEventListener('DOMContentLoaded', function() {
            initEditor();
            applyTheme();
            initializeUI();
        });

        function initEditor() {
            const textarea = document.getElementById('manual-code');
            editor = CodeMirror.fromTextArea(textarea, {
                mode: "javascript",
                theme: isDarkMode ? "dracula" : "default",
                lineNumbers: true,
                autoCloseBrackets: true,
                matchBrackets: true,
                indentUnit: 4,
                tabSize: 4,
                lineWrapping: true
            });

            const defaultCode = \`export default {\n  async fetch(request, env, ctx) {\n    return new Response('Hello from Worker Deployer Pro!');\n  },\n};\`;
            editor.setValue(defaultCode);
        }

        function showToast(message, type = 'success') {
            Toastify({
                text: message,
                duration: 3000,
                gravity: "top",
                position: "right",
                style: {
                    background: type === 'success' ? "linear-gradient(to right, #00b09b, #96c93d)" :
                                type === 'error' ? "linear-gradient(to right, #ff5f6d, #ffc371)" :
                                "linear-gradient(to right, #f1c40f, #f39c12)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    fontWeight: "500"
                }
            }).showToast();
        }

        function applyTheme() {
            if (isDarkMode) {
                document.body.classList.add('dark-mode');
                document.getElementById('theme-icon').className = 'fas fa-sun';
                if(editor) editor.setOption("theme", "dracula");
            } else {
                document.body.classList.remove('dark-mode');
                document.getElementById('theme-icon').className = 'fas fa-moon';
                if(editor) editor.setOption("theme", "default");
            }
        }

        function toggleDarkMode() {
            isDarkMode = !isDarkMode;
            localStorage.setItem('dark-mode', isDarkMode);
            applyTheme();
        }

        function initializeUI() {
            if (accounts.length > 0) {
                if (!currentAccountId || !accounts.find(a => a.id === currentAccountId)) {
                    currentAccountId = accounts[0].id;
                }
                selectAccount(currentAccountId);
            } else {
                updateAccountList();
                updateWorkerList();
                updateStats();
            }
        }

        function toggleAccountPanel() {
            document.getElementById('account-panel').classList.toggle('active');
            document.getElementById('overlay').classList.toggle('active');
        }

        function openDataModal() {
            document.getElementById('data-modal').classList.add('active');
            document.getElementById('overlay').classList.add('active');
            document.getElementById('account-panel').classList.remove('active');
        }

        function closeOverlays() {
            document.getElementById('account-panel').classList.remove('active');
            document.getElementById('data-modal').classList.remove('active');
            document.getElementById('overlay').classList.remove('active');
        }

        function toggleScriptSource() {
            const type = document.getElementById('script-select').value;
            const customGroup = document.getElementById('custom-url-group');
            const manualGroup = document.getElementById('manual-code-group');

            if (type === 'custom') {
                customGroup.style.display = 'block';
                manualGroup.style.display = 'none';
            } else {
                customGroup.style.display = 'none';
                manualGroup.style.display = 'block';
                setTimeout(() => editor.refresh(), 10);
            }
        }

        function formatCode() {
            let code = editor.getValue();
            code = code.replace(/^\s+$/gm, '').replace(/\n{3,}/g, '\n\n');
            editor.setValue(code);
            showToast('Kode berhasil dirapihkan');
        }

        // ... [Data Management Functions] ...
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

        function importData(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.accounts && data.workers) {
                        if(confirm('Data saat ini akan ditimpa. Lanjutkan?')) {
                            accounts = data.accounts;
                            workers = data.workers;
                            saveData();
                            currentAccountId = accounts.length > 0 ? accounts[0].id : null;
                            initializeUI();
                            showToast('Data berhasil diimport');
                            closeOverlays();
                        }
                    } else {
                        showToast('Format file backup tidak valid', 'error');
                    }
                } catch(err) {
                    showToast('Gagal membaca file JSON', 'error');
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        }

        function saveData() {
            localStorage.setItem('cf-accounts', JSON.stringify(accounts));
            localStorage.setItem('cf-workers', JSON.stringify(workers));
            if(currentAccountId) localStorage.setItem('current-account-id', currentAccountId);
        }

        // ... [Account Logic] ...
        async function addNewAccount() {
            const email = document.getElementById('new-account-email').value.trim();
            const apiKey = document.getElementById('new-account-key').value.trim();
            const btn = document.getElementById('add-acc-btn');

            if (!email || !apiKey) return showToast('Email dan API Key wajib diisi!', 'error');
            if (accounts.find(a => a.email === email)) return showToast('Akun sudah terdaftar!', 'error');

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

                const newAcc = { id: Date.now().toString(36), email, apiKey, subdomain: data.subdomain, createdAt: new Date().toISOString() };
                accounts.push(newAcc);
                saveData();

                document.getElementById('new-account-email').value = '';
                document.getElementById('new-account-key').value = '';
                selectAccount(newAcc.id);
                showToast(\`Berhasil tambah akun. Subdomain: \${data.subdomain}\`);
            } catch (err) {
                showToast('Gagal: ' + err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Simpan';
            }
        }

        function selectAccount(id) {
            currentAccountId = id;
            saveData();
            updateAccountList();
            updateWorkerList();
            updateStats();

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

        function deleteAccount(id, e) {
            e.stopPropagation();
            if(!confirm('Hapus akun ini beserta semua workers terkait di lokal?')) return;
            accounts = accounts.filter(a => a.id !== id);
            workers = workers.filter(w => w.accountId !== id);
            if(currentAccountId === id) currentAccountId = accounts.length ? accounts[0].id : null;
            saveData();
            initializeUI();
            showToast('Akun dihapus');
        }

        function updateAccountList() {
            const list = document.getElementById('account-list');
            if (!accounts.length) {
                list.innerHTML = \`<div class="empty-state"><i class="fas fa-ghost"></i><p>Belum ada akun</p></div>\`;
                return;
            }
            list.innerHTML = accounts.map(a => \`
                <div class="account-item \${a.id === currentAccountId ? 'active' : ''}" onclick="selectAccount('\${a.id}')">
                    <div class="account-email">\${a.email}</div>
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

            let payload = { email: acc.email, globalAPIKey: acc.apiKey, workerName: name };
            if (type === 'custom') {
                if(!url) return showToast('URL Script wajib diisi!', 'error');
                payload.githubUrl = url;
            } else {
                if(code.length < 10) return showToast('Kode terlalu pendek!', 'error');
                payload.scriptContent = code;
            }

            document.getElementById('deploy-loading').classList.add('active');

            try {
                // Ensure subdomain exists
                if(!acc.subdomain) {
                    const res = await fetch('/api/subdomain', { method: 'POST', body: JSON.stringify({email:acc.email, apiKey:acc.apiKey}) });
                    const d = await res.json();
                    if(d.success) { acc.subdomain = d.subdomain; saveData(); }
                }

                const res = await fetch('https://proxy.ambe.workers.dev/', {
                    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (!data.success) throw new Error(data.error || 'Deploy gagal');

                let subUrl = data.sub ? data.sub.replace(/\/sub$/, '') : '';
                if(subUrl && acc.subdomain && subUrl.includes('.workers.dev') && !subUrl.includes(acc.subdomain)) {
                    subUrl = subUrl.replace('.workers.dev', \`.\${acc.subdomain}.workers.dev\`);
                }

                const wData = {
                    id: editingWorkerId || Date.now().toString(36),
                    accountId: acc.id,
                    workerName: name,
                    sourceType: type,
                    githubUrl: type === 'custom' ? url : '',
                    manualCode: type === 'manual' ? code : '',
                    sub: subUrl,
                    timestamp: new Date().toISOString()
                };

                if (editingWorkerId) {
                    const idx = workers.findIndex(w => w.id === editingWorkerId);
                    if(idx>-1) workers[idx] = {...workers[idx], ...wData};
                    showToast('Worker diupdate!');
                    cancelEdit();
                } else {
                    workers.unshift(wData);
                    showToast('Worker berhasil dideploy!');
                    document.getElementById('workerName').value = '';
                }

                saveData();
                updateWorkerList();
                updateStats();

            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                document.getElementById('deploy-loading').classList.remove('active');
            }
        }

        function filterWorkers() {
            updateWorkerList(document.getElementById('search-input').value.toLowerCase());
        }

        function updateWorkerList(filterText = '') {
            const list = document.getElementById('worker-list');
            if(!currentAccountId) { list.innerHTML = ''; return; }

            let accWorkers = workers.filter(w => w.accountId === currentAccountId);
            if(filterText) {
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
                        <div class="worker-name">\${w.workerName} \${badge}</div>
                        <div style="font-size: 11px; color: var(--text-muted);"><i class="far fa-clock"></i> \${new Date(w.timestamp).toLocaleString()}</div>
                    </div>
                    <div style="position: relative; margin-bottom: 10px;">
                        <div class="config-value">\${w.sub || 'N/A'}</div>
                        \${w.sub ? \`<button class="copy-btn" onclick="copyText('\${w.sub}')" title="Copy URL"><i class="fas fa-copy"></i></button>\` : ''}
                    </div>
                    <div class="worker-actions">
                        <button class="btn btn-warning" style="flex:1; padding: 6px;" onclick="editWorker('\${w.id}')"><i class="fas fa-pen"></i> Edit</button>
                        <button class="btn btn-danger" style="flex:1; padding: 6px;" onclick="deleteWorker('\${w.id}')"><i class="fas fa-trash"></i> Hapus</button>
                    </div>
                </div>
                \`;
            }).join('');
        }

        function editWorker(id) {
            const w = workers.find(x => x.id === id);
            if(!w) return;
            editingWorkerId = id;

            document.getElementById('edit-mode-indicator').classList.add('active');
            document.getElementById('editing-worker-name').textContent = w.workerName;
            document.getElementById('workerName').value = w.workerName;

            document.getElementById('script-select').value = w.sourceType || 'manual';
            toggleScriptSource();

            if(w.sourceType === 'custom') {
                document.getElementById('custom-url').value = w.githubUrl || '';
            } else {
                editor.setValue(w.manualCode || '');
            }

            document.getElementById('deploy-btn-text').textContent = 'Update Worker';
            document.getElementById('deploy-btn').className = 'btn btn-warning';
            window.scrollTo({top: 0, behavior: 'smooth'});
        }

        function cancelEdit() {
            editingWorkerId = null;
            document.getElementById('edit-mode-indicator').classList.remove('active');
            document.getElementById('workerName').value = '';
            document.getElementById('deploy-btn-text').textContent = 'Deploy Worker Sekarang';
            document.getElementById('deploy-btn').className = 'btn btn-primary';
        }

        function deleteWorker(id) {
            if(!confirm('Hapus worker dari list lokal? (Ini tidak menghapus di Cloudflare)')) return;
            workers = workers.filter(w => w.id !== id);
            saveData();
            if(editingWorkerId === id) cancelEdit();
            updateWorkerList();
            updateStats();
            showToast('Worker dihapus dari lokal');
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
            showToast('URL disalin ke clipboard');
        }
    </script>
</body>
</html>
`
    return new Response(html, {
      headers: {
        'content-type': 'text/html;charset=UTF-8',
      },
    });
  },
};
