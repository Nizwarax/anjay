// ============================================
// VPN CONFIG MANAGER - CLOUDFLARE WORKER
// UI + Backend dalam 1 File
// ============================================

// ============================================
// ⚙️ KONFIGURASI UTAMA - EDIT DI SINI SAJA
// ============================================
const CONFIG = {
    uuid: "3b01a777-55e7-49f6-8637-d94ee69607c6",
    proxyListUrl: "https://raw.githubusercontent.com/papapapapdelesia/Emilia/refs/heads/main/Data/Country-ALIVE.txt",
    checkApiUrl: "https://cprx-ku5.vercel.app/api/check",
    cacheTTL: 300000, // 5 menit dalam milidetik
};
// ============================================
// AKHIR KONFIGURASI - JANGAN UBAH DI BAWAH INI
// ============================================

import { connect } from "cloudflare:sockets";

// ==================== KONSTANTA (Otomatis dari CONFIG) ====================
const uuid = CONFIG.uuid;
const PROXY_LIST_URL = CONFIG.proxyListUrl;
const CHECK_API_URL = CONFIG.checkApiUrl;
const CACHE_TTL = CONFIG.cacheTTL;

// ==================== UI HTML ====================
const UI_HTML = `<!DOCTYPE html>
<html lang="en" id="htmlRoot">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <title>VPN Config Manager</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease; }

        .cloud-blur {
            position: fixed;
            border-radius: 50%;
            filter: blur(80px);
            pointer-events: none;
            z-index: 0;
            animation: floatCloud 20s ease-in-out infinite;
        }

        @keyframes floatCloud {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -30px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        body {
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
            color: #f1f5f9;
        }

        body.light {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            color: #0f172a;
        }

        body.light .glass-deep {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .glass-deep {
            background: rgba(15, 23, 42, 0.5);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .dropdown-menu {
            display: none;
            position: absolute;
            right: 0;
            top: 100%;
            margin-top: 0.5rem;
            width: 280px;
            z-index: 50;
            background: rgba(30, 41, 59, 0.98);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            padding: 12px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }

        body.light .dropdown-menu {
            background: rgba(255, 255, 255, 0.98);
            border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .dropdown-menu.show {
            display: block;
            animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .action-btn { transition: all 0.15s ease; cursor: pointer; }
        .action-btn:active { transform: scale(0.95); }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: bold;
        }

        .status-active {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.4);
        }

        .status-inactive {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .status-checking {
            background: rgba(59, 130, 246, 0.2);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.4);
        }

        .status-delay {
            background: rgba(251, 191, 36, 0.15);
            color: #fbbf24;
            border: 1px solid rgba(251, 191, 36, 0.3);
            font-family: ui-monospace, SFMono-Regular, monospace;
        }
        .status-delay.fast {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            border-color: rgba(16, 185, 129, 0.35);
        }
        .status-delay.medium {
            background: rgba(251, 191, 36, 0.15);
            color: #fbbf24;
            border-color: rgba(251, 191, 36, 0.35);
        }
        .status-delay.slow {
            background: rgba(251, 191, 36, 0.15);
            color: #fbbf24;
            border-color: rgba(251, 191, 36, 0.35);
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 0;
            font-size: 11px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .info-label { color: #94a3b8; }
        .info-value { color: #e2e8f0; font-weight: 600; }

        body.light .info-label { color: #64748b; }
        body.light .info-value { color: #1e293b; }

        .modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(4px);
            z-index: 100;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .modal-overlay.show {
            display: flex;
        }

        .modal-content {
            background: rgba(15, 23, 42, 0.98);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            padding: 24px;
            max-width: 500px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            animation: modalIn 0.3s ease;
        }

        body.light .modal-content {
            background: rgba(255, 255, 255, 0.98);
            border: 1px solid rgba(0, 0, 0, 0.1);
            color: #0f172a;
        }

        @keyframes modalIn {
            from { opacity: 0; transform: scale(0.9) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .modal-close {
            position: sticky;
            top: 0;
            float: right;
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.4);
            color: #ef4444;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            z-index: 10;
        }

        .modal-close:hover {
            background: rgba(239, 68, 68, 0.4);
        }

        .info-btn {
            cursor: pointer;
            transition: all 0.2s;
        }

        .info-btn:hover {
            color: #60a5fa;
            transform: scale(1.1);
        }

        @media (max-width: 768px) {
            .dropdown-menu {
                width: 240px;
                right: -80px;
            }
        }
    </style>
</head>
<body class="min-h-screen py-4 md:py-8 px-3 md:px-6 relative transition-colors duration-300">

    <div class="cloud-blur w-[500px] h-[500px] top-[-150px] left-[-150px]" style="background: radial-gradient(circle, rgba(59,130,246,0.4) 0%, rgba(139,92,246,0.2) 100%);"></div>
    <div class="cloud-blur w-[600px] h-[600px] bottom-[-200px] right-[-200px]" style="background: radial-gradient(circle, rgba(6,182,212,0.3) 0%, rgba(59,130,246,0.15) 100%);"></div>

    <!-- Info Modal -->
    <div class="modal-overlay" id="infoModal">
        <div class="modal-content" id="infoModalContent"></div>
    </div>

    <div class="max-w-7xl mx-auto relative z-10">

        <div class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div class="text-center md:text-left">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-deep text-xs font-semibold mb-3" style="color: #60a5fa;">
                    <i class="fas fa-shield-alt text-[10px]"></i>
                    <span>NETWORK SECURE</span>
                    <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse ml-1"></span>
                </div>
                <h1 class="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    VPN Config Manager
                </h1>
                <p class="text-xs text-slate-500 mt-1">Protocol: VLESS | Trojan | Shadowsocks</p>
            </div>
            <button id="themeToggle" class="fixed top-4 right-4 z-50 w-10 h-10 rounded-full glass-deep flex items-center justify-center text-lg hover:scale-110 transition-all">
                <i class="fas fa-moon"></i>
            </button>
        </div>

        <!-- Dashboard Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div class="glass-deep rounded-xl p-4 flex items-center gap-3">
                <div class="p-2 rounded-lg bg-green-500/20"><i class="fas fa-heartbeat text-green-400"></i></div>
                <div><p class="text-xs text-slate-400">STATUS</p><p class="font-bold text-sm text-green-400">ONLINE</p></div>
            </div>
            <div class="glass-deep rounded-xl p-4 flex items-center gap-3">
                <div class="p-2 rounded-lg bg-blue-500/20"><i class="fas fa-clock text-blue-400"></i></div>
                <div><p class="text-xs text-slate-400">SERVER</p><p class="font-bold text-sm">Cloudflare</p></div>
            </div>
            <div class="glass-deep rounded-xl p-4 flex items-center gap-3">
                <div class="p-2 rounded-lg bg-purple-500/20"><i class="fas fa-microchip text-purple-400"></i></div>
                <div><p class="text-xs text-slate-400">PROTOCOLS</p><p class="font-bold text-sm">VLESS/TRJ/SS</p></div>
            </div>
            <div class="glass-deep rounded-xl p-4 flex items-center gap-3">
                <div class="p-2 rounded-lg bg-amber-500/20"><i class="fas fa-server text-amber-400"></i></div>
                <div><p class="text-xs text-slate-400">PROXIES</p><p class="font-bold text-sm" id="totalProxies">0</p></div>
            </div>
        </div>

        <!-- Current Routing Target -->
        <div class="glass-deep rounded-2xl p-4 md:p-6 mb-6">
            <div class="flex items-center gap-2 mb-3">
                <i class="fas fa-satellite-dish text-cyan-400"></i>
                <h2 class="text-sm font-bold uppercase tracking-wider text-slate-300">Current Routing Target</h2>
            </div>
            <div class="flex flex-wrap gap-4 items-center">
                <div class="bg-white/5 rounded-lg px-4 py-2 flex items-center gap-2">
                    <span class="text-xs text-slate-400">PATH:</span>
                    <span class="text-sm font-mono text-cyan-400 font-bold" id="currentPath">/</span>
                </div>
                <div class="bg-white/5 rounded-lg px-4 py-2 flex items-center gap-2">
                    <span class="text-xs text-slate-400">HOST:</span>
                    <span class="text-sm font-mono text-emerald-400 font-bold" id="currentHost">-</span>
                </div>
                <button onclick="copyCurrentHost()" class="bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5">
                    <i class="fas fa-copy"></i> COPY HOST
                </button>
            </div>
            <p class="text-[11px] text-slate-500 mt-3 flex items-center gap-1">
                <i class="fas fa-info-circle"></i>
                Gunakan path seperti <span class="text-cyan-400 font-mono">/ID</span>, <span class="text-cyan-400 font-mono">/SG</span>, <span class="text-cyan-400 font-mono">/ASIA</span> untuk filter proxy.
            </p>
        </div>

        <!-- Proxy Table -->
        <div class="glass-deep rounded-2xl overflow-hidden shadow-2xl">
            <div class="p-4 md:p-6 border-b" style="border-color: rgba(255,255,255,0.1);">
                <div class="flex flex-col md:flex-row gap-3">
                    <div class="relative group flex-1">
                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <i class="fas fa-search text-slate-500 group-focus-within:text-blue-400 transition-colors"></i>
                        </div>
                        <input type="text" id="searchInput"
                            placeholder="Search country or ISP..."
                            class="w-full bg-white/10 backdrop-blur-sm border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 transition-all">
                    </div>
                    <button onclick="fetchProxies()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap">
                        <i class="fas fa-sync-alt"></i> REFRESH
                    </button>
                </div>
            </div>

            <div class="overflow-x-auto p-2 md:p-4">
                <table class="w-full border-collapse">
                    <thead>
                        <tr class="border-b" style="border-color: rgba(255,255,255,0.05);">
                            <th class="py-4 px-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Location</th>
                            <th class="py-4 px-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden md:table-cell">Provider</th>
                            <th class="py-4 px-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                            <th class="py-4 px-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Info</th>
                            <th class="py-4 px-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Action</th>
                        </tr>
                    </thead>
                    <tbody id="proxyTableBody"></tbody>
                </table>
            </div>

            <div id="loading" class="py-24 text-center flex flex-col items-center gap-4">
                <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                <p class="text-slate-400 text-sm">Fetching proxy list...</p>
            </div>

            <div class="p-4 md:p-6 border-t flex flex-col md:flex-row justify-between items-center gap-4" style="border-color: rgba(255,255,255,0.1);">
                <div id="paginationInfo" class="text-slate-400 text-xs font-mono"></div>
                <div class="flex gap-3 items-center" id="paginationControls"></div>
            </div>
        </div>
    </div>

    <script>
        // ============ KONFIGURASI OTOMATIS (Di-inject dari Worker) ============
        const uuid = '${CONFIG.uuid}';
        const proxyListUrl = '${CONFIG.proxyListUrl}';
        const CHECK_API_URL = '${CONFIG.checkApiUrl}';
        // =====================================================================

        const host = window.location.hostname;
        const VLS_PRE = atob('dmxlc3M6Ly8=');
        const TRJ_PRE = atob('dHJvamFuOi8v');
        const VLS_LBL = atob('W1ZMRVNTLVRMU10=');
        const TRJ_LBL = atob('W1Ryb2phbi1UTFNd');
        const SS_LBL = atob('W1NTLUdhdGNoYU5HXQ==');

        const themeToggleBtn = document.getElementById('themeToggle');
        const bodyElement = document.body;

        themeToggleBtn.addEventListener('click', () => {
            bodyElement.classList.toggle('light');
            const isLight = bodyElement.classList.contains('light');
            themeToggleBtn.innerHTML = isLight ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        });

        if (localStorage.getItem('theme') === 'light') {
            bodyElement.classList.add('light');
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        }

        // Set current host
        document.getElementById('currentPath').innerText = window.location.pathname || '/';
        document.getElementById('currentHost').innerText = host;

        function copyCurrentHost() {
            const hostText = document.getElementById('currentHost').innerText;
            if (hostText && hostText !== '-') {
                navigator.clipboard.writeText(hostText).then(() => {
                    const btn = event.target.closest('button');
                    if (btn) {
                        const orig = btn.innerHTML;
                        btn.innerHTML = '<i class="fas fa-check"></i> COPIED';
                        setTimeout(() => { btn.innerHTML = orig; }, 1500);
                    }
                });
            }
        }

        const countryNameFormatter = new Intl.DisplayNames(['en'], { type: 'region' });

        function getCountryFullName(countryCode) {
            if (!countryCode) return 'Unknown';
            try {
                const upperCode = countryCode.toUpperCase();
                const fullName = countryNameFormatter.of(upperCode);
                return fullName || countryCode;
            } catch (error) {
                return countryCode;
            }
        }

        let allProxies = [];
        let filteredProxies = [];
        let currentPage = 1;
        const itemsPerPage = 10;
        let statusCache = new Map();

        async function checkProxyStatus(ip, port) {
            const cacheKey = ip + ':' + port;
            if (statusCache.has(cacheKey)) return statusCache.get(cacheKey);

            try {
                const apiUrl = CHECK_API_URL + '?ip=' + ip + ':' + port;
                const response = await fetch(apiUrl);
                const data = await response.json();
                const isActive = data.proxyip === true;

                const result = {
                    status: isActive ? 'ACTIVE' : 'INACTIVE',
                    delay: data.delay || 'N/A',
                    speed: data.delay || 'N/A',
                    isp: data.asOrganization || '-',
                    country: data.country || '',
                    asn: data.asn || '',
                    colo: data.colo ? data.colo.iata : '',
                    coloCity: data.colo ? data.colo.city : '',
                    coloRegion: data.colo ? data.colo.region : '',
                    coloCountry: data.colo ? data.colo.cca2 : '',
                    proxyip: data.ip || '',
                    hostname: data.hostname || '',
                    city: data.city || '',
                    region: data.region || '',
                    org: data.asOrganization || ''
                };

                statusCache.set(cacheKey, result);
                return result;
            } catch (error) {
                console.error('Error checking proxy:', error);
                const errorResult = {
                    status: 'ERROR', delay: 'N/A', speed: 'N/A',
                    isp: '', country: '', asn: '', colo: '',
                    coloCity: '', coloRegion: '', coloCountry: '',
                    proxyip: '', hostname: '', city: '', region: '', org: ''
                };
                statusCache.set(cacheKey, errorResult);
                return errorResult;
            }
        }

        async function fetchProxies() {
            document.getElementById('loading').classList.remove('hidden');
            document.getElementById('proxyTableBody').innerHTML = '';
            try {
                const response = await fetch(proxyListUrl);
                const text = await response.text();
                const lines = text.trim().split('\\n');
                allProxies = lines.map(line => {
                    const [ip, port, country, isp] = line.split(',');
                    return {
                        ip, port, country: getCountryFullName(country), isp, countryCode: country,
                        status: null, delay: null, speed: null, checkInfo: null
                    };
                }).filter(p => p.ip && p.port);
                filteredProxies = [...allProxies];
                document.getElementById('totalProxies').innerText = allProxies.length;
                renderTable();
                document.getElementById('loading').classList.add('hidden');
                checkAllProxyStatuses();
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('loading').innerHTML = '<p class="text-red-400">Failed to fetch proxy list</p>';
            }
        }

        async function checkAllProxyStatuses() {
            const batchSize = 5;
            for (let i = 0; i < filteredProxies.length; i += batchSize) {
                const batch = filteredProxies.slice(i, i + batchSize);
                await Promise.all(batch.map(async (proxy, idx) => {
                    const globalIdx = i + idx;
                    const statusData = await checkProxyStatus(proxy.ip, proxy.port);
                    proxy.status = statusData.status;
                    proxy.delay = statusData.delay;
                    proxy.speed = statusData.speed;
                    proxy.checkInfo = statusData;
                    updateProxyRowInTable(globalIdx, proxy);
                }));
            }
        }

        function updateProxyRowInTable(proxyIndex, proxy) {
            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            if (proxyIndex >= start && proxyIndex < end) {
                const rowIndex = proxyIndex - start;
                const tbody = document.getElementById('proxyTableBody');
                const rows = tbody.getElementsByTagName('tr');
                if (rows[rowIndex]) {
                    const statusCell = rows[rowIndex].querySelector('.status-cell');
                    if (statusCell) statusCell.innerHTML = getStatusHtml(proxy);
                }
            }
        }

        // ====== Fungsi bantu: susun nama config dengan kode negara + provider ======
        function buildConfigName(prefix, proxy) {
            const code = (proxy.countryCode || '').toUpperCase();
            const provider = (proxy.isp && proxy.isp !== '-') ? proxy.isp : 'Unknown';
            return prefix + ' ' + code + ' - ' + provider;
        }

        function generateVless(proxy) {
            const path = encodeURIComponent('/' + proxy.ip + '=' + proxy.port);
            const name = buildConfigName(VLS_LBL, proxy);
            return VLS_PRE + uuid + "@" + host + ":443?encryption=none&security=tls&type=ws&host=" + host + "&path=" + path + "&sni=" + host + "#" + encodeURIComponent(name);
        }

        function generateTrojan(proxy) {
            const path = encodeURIComponent('/' + proxy.ip + '=' + proxy.port);
            const name = buildConfigName(TRJ_LBL, proxy);
            return TRJ_PRE + uuid + "@" + host + ":443?security=tls&type=ws&host=" + host + "&path=" + path + "&sni=" + host + "#" + encodeURIComponent(name);
        }

        function generateShadowsocks(proxy) {
            const method = "none";
            const password = uuid;
            const encodedAuth = btoa(method + ':' + password);
            const path = encodeURIComponent('/' + proxy.ip + '=' + proxy.port);
            const name = buildConfigName(SS_LBL, proxy);
            return 'ss://' + encodedAuth + '@' + host + ':443?path=' + path + '&security=tls&host=' + host + '&type=ws&sni=' + host + '#' + encodeURIComponent(name);
        }

        function toggleDropdown(id) {
            const dropdown = document.getElementById('drop-' + id);
            document.querySelectorAll('.dropdown-menu').forEach(el => {
                if(el.id !== 'drop-' + id) el.classList.remove('show');
            });
            dropdown.classList.toggle('show');
        }

        // Info Modal Functions
        function openInfoModal(proxy) {
            const modal = document.getElementById('infoModal');
            const content = document.getElementById('infoModalContent');
            const info = proxy.checkInfo || {};

            const statusColor = info.status === 'ACTIVE' ? 'text-green-400' : 'text-red-400';
            const modalTextColor = bodyElement.classList.contains('light') ? '#0f172a' : '#f1f5f9';
            const delayText = (info.delay && info.delay !== 'N/A')
                ? (String(info.delay).toLowerCase().includes('ms') ? info.delay : info.delay + 'ms')
                : 'N/A';

            content.innerHTML =
                '<span class="modal-close" onclick="closeInfoModal()">&times;</span>' +
                '<div class="flex items-center gap-2 mb-4">' +
                    '<span class="text-2xl">' + getFlagEmoji(proxy.countryCode) + '</span>' +
                    '<div>' +
                        '<h3 class="font-bold text-lg" style="color: ' + modalTextColor + ';">' + proxy.country + ' <span class="text-xs font-mono text-slate-400">(' + (proxy.countryCode || '').toUpperCase() + ')</span></h3>' +
                        '<p class="text-xs font-mono text-slate-400">' + proxy.ip + ':' + proxy.port + '</p>' +
                        '<p class="text-[11px] text-emerald-400 font-semibold mt-0.5">' + (proxy.isp || '-') + '</p>' +
                    '</div>' +
                '</div>' +
                '<div class="space-y-2">' +
                    '<div class="info-row"><span class="info-label">Status</span><span class="info-value ' + statusColor + '">' + (info.status || 'Unknown') + '</span></div>' +
                    '<div class="info-row"><span class="info-label">Delay</span><span class="info-value font-mono">' + delayText + '</span></div>' +
                    '<div class="info-row"><span class="info-label">ISP / Organization</span><span class="info-value">' + (info.isp || info.org || '-') + '</span></div>' +
                    '<div class="info-row"><span class="info-label">ASN</span><span class="info-value font-mono">' + (info.asn || '-') + '</span></div>' +
                    '<div class="info-row"><span class="info-label">Country (Check)</span><span class="info-value">' + (info.country || '-') + '</span></div>' +
                    '<div class="info-row"><span class="info-label">City</span><span class="info-value">' + (info.city || info.coloCity || '-') + '</span></div>' +
                    '<div class="info-row"><span class="info-label">Region</span><span class="info-value">' + (info.region || info.coloRegion || '-') + '</span></div>' +
                    '<div class="info-row"><span class="info-label">Colo (IATA)</span><span class="info-value">' + (info.colo || '-') + '</span></div>' +
                    '<div class="info-row"><span class="info-label">Colo Location</span><span class="info-value">' + (info.coloCity ? info.coloCity + ', ' + info.coloCountry : '-') + '</span></div>' +
                    '<div class="info-row"><span class="info-label">Proxy IP</span><span class="info-value font-mono text-cyan-400">' + (info.proxyip || '-') + '</span></div>' +
                    '<div class="info-row"><span class="info-label">Hostname</span><span class="info-value font-mono">' + (info.hostname || '-') + '</span></div>' +
                    '<div class="info-row" style="border-bottom:none"><span class="info-label">ISP (from List)</span><span class="info-value">' + (proxy.isp || '-') + '</span></div>' +
                '</div>' +
                '<div class="mt-4 pt-3 border-t border-white/10 flex gap-2">' +
                    '<button onclick="copyToClipboardModal(\\'' + proxy.ip + ':' + proxy.port + '\\')" class="flex-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5">' +
                        '<i class="fas fa-copy"></i> Copy IP:Port</button>' +
                '</div>';

            modal.classList.add('show');
        }

        function closeInfoModal() {
            document.getElementById('infoModal').classList.remove('show');
        }

        function copyToClipboardModal(text) {
            navigator.clipboard.writeText(text).then(() => {
                const btns = document.querySelectorAll('#infoModalContent button');
                btns.forEach(btn => {
                    const orig = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => { btn.innerHTML = orig; }, 1500);
                });
            });
        }

        document.addEventListener('click', function(e) {
            if (e.target.id === 'infoModal') closeInfoModal();
        });

        window.onclick = function(event) {
            if (!event.target.closest('.dropdown-container') && !event.target.closest('.info-btn')) {
                document.querySelectorAll('.dropdown-menu').forEach(el => el.classList.remove('show'));
            }
        }

        function copyToClipboard(text, btn) {
            navigator.clipboard.writeText(text).then(() => {
                const original = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => { btn.innerHTML = original; }, 1500);
            });
        }

        function getDelayColorClass(delay) {
            const num = parseFloat(delay);
            if (isNaN(num)) return '';
            if (num < 1000) return 'fast';   // hijau (di bawah 1000ms)
            return 'slow';                    // kuning (1000ms ke atas)
        }

        function getStatusHtml(proxy) {
            let statusHtml;
            if (!proxy.status) {
                statusHtml = '<div class="status-badge status-checking"><i class="fas fa-spinner fa-pulse"></i><span>Checking...</span></div>';
            } else if (proxy.status === 'ACTIVE') {
                statusHtml = '<div class="status-badge status-active"><i class="fas fa-check-circle"></i><span>ACTIVE</span></div>';
            } else if (proxy.status === 'ERROR') {
                statusHtml = '<div class="status-badge status-inactive"><i class="fas fa-exclamation-triangle"></i><span>ERROR</span></div>';
            } else {
                statusHtml = '<div class="status-badge status-inactive"><i class="fas fa-times-circle"></i><span>INACTIVE</span></div>';
            }

            let delayHtml = '';
            if (proxy.status === 'ACTIVE' && proxy.delay && proxy.delay !== 'N/A') {
                let delayText = String(proxy.delay);
                if (!delayText.toLowerCase().includes('ms')) delayText += 'ms';
                const colorClass = getDelayColorClass(proxy.delay);
                delayHtml = '<div class="status-badge status-delay ' + colorClass + '"><i class="fas fa-bolt"></i><span>' + delayText + '</span></div>';
            }

            return '<div class="flex flex-col items-center gap-1">' + statusHtml + delayHtml + '</div>';
        }

        function renderTable() {
            const start = (currentPage - 1) * itemsPerPage;
            const paged = filteredProxies.slice(start, start + itemsPerPage);
            const tbody = document.getElementById('proxyTableBody');
            tbody.innerHTML = '';

            paged.forEach((proxy, idx) => {
                const id = start + idx;
                const vless = generateVless(proxy);
                const trojan = generateTrojan(proxy);
                const shadowsocks = generateShadowsocks(proxy);
                const checkInfo = proxy.checkInfo || {};

                tbody.innerHTML += '<tr class="border-b border-white/5 hover:bg-white/5 transition-all">' +
                    '<td class="py-3 px-4">' +
                        '<div class="flex items-center gap-3">' +
                            '<span class="text-xl md:text-2xl">' + getFlagEmoji(proxy.countryCode) + '</span>' +
                            '<div>' +
                                '<div class="font-bold text-sm md:text-base">' + proxy.country + ' <span class="text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">' + (proxy.countryCode || '').toUpperCase() + '</span></div>' +
                                '<div class="text-[11px] text-emerald-400 font-semibold truncate max-w-[200px]" title="' + (proxy.isp || '') + '">' + (proxy.isp || '-') + '</div>' +
                                '<div class="text-[11px] text-slate-400 font-mono">' + proxy.ip + ':' + proxy.port + '</div>' +
                                (checkInfo.proxyip ? '<div class="text-[10px] text-cyan-400 font-mono">\u2192 ' + checkInfo.proxyip + '</div>' : '') +
                            '</div>' +
                        '</div>' +
                    '</td>' +
                    '<td class="py-3 px-4 hidden md:table-cell">' +
                        '<div class="text-sm">' + (proxy.isp || '-') + '</div>' +
                        (checkInfo.colo ? '<div class="text-[10px] text-slate-400">Colo: ' + checkInfo.colo + '</div>' : '') +
                    '</td>' +
                    '<td class="py-3 px-4 text-center status-cell">' + getStatusHtml(proxy) + '</td>' +
                    '<td class="py-3 px-4 text-center">' +
                        '<button onclick="openInfoModal(filteredProxies[' + (start + idx) + '])" class="info-btn text-slate-400 hover:text-blue-400 transition p-2" title="View Full Info">' +
                            '<i class="fas fa-info-circle text-lg"></i>' +
                        '</button>' +
                    '</td>' +
                    '<td class="py-3 px-4 text-right relative dropdown-container">' +
                        '<button onclick="toggleDropdown(\\'' + id + '\\')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5">' +
                            '<i class="fas fa-cog"></i> Config <i class="fas fa-chevron-down text-[10px]"></i>' +
                        '</button>' +
                        '<div id="drop-' + id + '" class="dropdown-menu">' +
                            '<div class="grid grid-cols-3 gap-2 mb-2">' +
                                '<button onclick="copyToClipboard(\\'' + vless + '\\', this)" class="bg-indigo-600 hover:bg-indigo-700 p-2 rounded-md text-[10px] font-bold text-white flex flex-col items-center gap-1 action-btn">' +
                                    '<i class="fas fa-link"></i> VLESS</button>' +
                                '<button onclick="copyToClipboard(\\'' + trojan + '\\', this)" class="bg-purple-600 hover:bg-purple-700 p-2 rounded-md text-[10px] font-bold text-white flex flex-col items-center gap-1 action-btn">' +
                                    '<i class="fas fa-shield-halved"></i> TROJAN</button>' +
                                '<button onclick="copyToClipboard(\\'' + shadowsocks + '\\', this)" class="bg-cyan-600 hover:bg-cyan-700 p-2 rounded-md text-[10px] font-bold text-white flex flex-col items-center gap-1 action-btn">' +
                                    '<i class="fas fa-lock"></i> SS</button>' +
                            '</div>' +
                            '<div class="border-t border-white/10 pt-2">' +
                                '<button onclick="copyToClipboard(\\'' + proxy.ip + ':' + proxy.port + '\\', this)" class="w-full bg-white/5 hover:bg-white/10 p-2 rounded-md text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1.5 action-btn">' +
                                    '<i class="fas fa-copy"></i> Copy IP:Port</button>' +
                            '</div>' +
                        '</div>' +
                    '</td>' +
                '</tr>';
            });
            updatePagination();
        }

        function updatePagination() {
            const totalPages = Math.ceil(filteredProxies.length / itemsPerPage);
            document.getElementById('paginationInfo').innerText = 'Page ' + currentPage + ' of ' + totalPages + ' (' + filteredProxies.length + ' proxies)';
            const controls = document.getElementById('paginationControls');
            controls.innerHTML = '';
            const btnClass = "px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs hover:bg-white/10 disabled:opacity-30";

            const prev = document.createElement('button');
            prev.className = btnClass; prev.innerHTML = '<i class="fas fa-chevron-left"></i> Prev';
            prev.disabled = currentPage === 1;
            prev.onclick = () => { currentPage--; renderTable(); };

            const next = document.createElement('button');
            next.className = btnClass; next.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
            next.disabled = currentPage === totalPages;
            next.onclick = () => { currentPage++; renderTable(); };

            controls.append(prev, next);
        }

        function getFlagEmoji(countryCode) {
            if (!countryCode || countryCode.length !== 2) return '\uD83C\uDF10';
            const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
            return String.fromCodePoint(...codePoints);
        }

        document.getElementById('searchInput').oninput = (e) => {
            const query = e.target.value.toLowerCase();
            filteredProxies = allProxies.filter(p => p.country.toLowerCase().includes(query) || p.isp.toLowerCase().includes(query));
            currentPage = 1;
            renderTable();
        };

        fetchProxies();
    </script>
</body>
</html>`;

// ==================== BACKEND LOGIC ====================
const str2arr = (str) => new TextEncoder().encode(str);
const arr2str = (arr) => new TextDecoder().decode(arr);
const concat = (...arrays) => {
    const result = new Uint8Array(arrays.reduce((sum, arr) => sum + arr.length, 0));
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
};

const WS_READY_STATE_OPEN = 1;
const WS_READY_STATE_CLOSING = 2;
const DNS_PORT = 53;

const PROTOCOLS = {
    P1: atob('VHJvamFu'),
    P2: atob('VkxFU1M='),
    P3: atob('U2hhZG93c29ja3M=')
};

const DETECTION_PATTERNS = {
    DELIMITER_P1: [0x0d, 0x0a],
    DELIMITER_P1_CHECK: [0x01, 0x03, 0x7f],
    UUID_V4_REGEX: /^\w{8}\w{4}4\w{3}[89ab]\w{3}\w{12}$/,
    BUFFER_MIN_SIZE: 62,
    DELIMITER_OFFSET: 56
};

const ADDRESS_TYPES = { IPV4: 1, DOMAIN: 2, IPV6: 3, DOMAIN_ALT: 3 };
const COMMAND_TYPES = { TCP: 1, UDP: 2, UDP_ALT: 3 };

let prxIP = "";
let cachedProxyList = null;
let cacheTime = 0;

const REGIONS = {
    "ASIA": ["ID", "SG", "MY", "PH", "TH", "VN", "JP", "KR", "CN", "HK", "TW", "IN"],
    "ASIA2": ["ID", "SG", "MY", "PH", "TH", "VN"],
    "ASIA3": ["JP", "KR", "CN", "HK", "TW"],
    "ASEAN": ["ID", "SG", "MY", "PH", "TH", "VN"],
    "SEA": ["ID", "SG", "MY", "PH", "TH", "VN"],
    "EASTASIA": ["JP", "KR", "CN", "HK", "TW"],
    "SOUTHASIA": ["IN", "BD", "PK", "LK", "NP"],
    "EUROPE": ["GB", "FR", "DE", "NL", "IT", "ES", "RU", "UA", "PL", "SE", "NO", "DK", "FI", "CH", "BE", "AT", "CZ", "GR", "PT", "IE", "HU", "RO"],
    "EU": ["GB", "FR", "DE", "NL", "IT", "ES"],
    "EUW": ["GB", "FR", "DE", "NL"],
    "EUE": ["PL", "CZ", "HU", "RO"],
    "AMERICA": ["US", "CA", "MX", "BR", "AR", "CL", "CO", "PE", "VE"],
    "USA": ["US"], "US": ["US"],
    "NORTHAMERICA": ["US", "CA", "MX"],
    "SOUTHAMERICA": ["BR", "AR", "CL", "CO", "PE", "VE"],
    "LATAM": ["MX", "BR", "AR", "CL", "CO", "PE", "VE"],
    "AFRICA": ["ZA", "NG", "EG", "MA", "KE", "DZ", "TN"],
    "OCEANIA": ["AU", "NZ"], "AUSTRALIA": ["AU"],
    "MIDDLEEAST": ["AE", "SA", "IL", "TR", "IR"],
    "GLOBAL": []
};

const MANUAL_PROXY = {
    "SG": ["178.128.80.43:443", "91.192.81.154:2053", "51.79.158.58:8443", "34.143.159.175:443"],
    "ID": ["103.6.207.108:8080"],
    "JP": ["18.179.45.123:443", "52.194.12.34:8443"],
    "US": ["167.172.234.12:443", "159.203.182.32:2053"],
    "AE": ["176.97.66.175:443", "152.32.181.246:44070", "193.123.90.82:12648", "139.185.50.5:14594"]
};

async function fetchProxyList() {
    const now = Date.now();
    if (cachedProxyList && (now - cacheTime) < CACHE_TTL) return cachedProxyList;
    try {
        const response = await fetch(PROXY_LIST_URL);
        const text = await response.text();
        const lines = text.split('\n');
        const proxyMap = new Map();
        for (const line of lines) {
            if (line.trim() && !line.startsWith('#')) {
                const parts = line.split(',');
                if (parts.length >= 3) {
                    const ip = parts[0].trim();
                    const port = parts[1].trim();
                    const country = parts[2].trim();
                    const proxyString = ip + ':' + port;
                    if (!proxyMap.has(country)) proxyMap.set(country, []);
                    proxyMap.get(country).push(proxyString);
                }
            }
        }
        cachedProxyList = proxyMap;
        cacheTime = now;
        return proxyMap;
    } catch (error) {
        return cachedProxyList || new Map();
    }
}

async function getProxyFromPath(pathname) {
    if (!pathname || pathname === '/') return null;
    const parts = pathname.substring(1).split('/');
    const command = parts[0].toUpperCase();
    const proxyMap = await fetchProxyList();
    for (const [country, proxies] of Object.entries(MANUAL_PROXY)) {
        if (!proxyMap.has(country)) proxyMap.set(country, []);
        for (const proxy of proxies) {
            if (!proxyMap.get(country).includes(proxy)) proxyMap.get(country).push(proxy);
        }
    }
    if (proxyMap.has(command)) {
        const proxies = proxyMap.get(command);
        if (proxies && proxies.length > 0) return proxies[Math.floor(Math.random() * proxies.length)];
    }
    const matchIndex = command.match(/^([A-Z]{2})(\d+)$/);
    if (matchIndex && proxyMap.has(matchIndex[1])) {
        const country = matchIndex[1];
        const index = parseInt(matchIndex[2]) - 1;
        const proxies = proxyMap.get(country);
        if (proxies && proxies[index]) return proxies[index];
    }
    if (command === "ALL") {
        const allProxies = [];
        for (const proxies of proxyMap.values()) allProxies.push(...proxies);
        if (allProxies.length > 0) return allProxies[Math.floor(Math.random() * allProxies.length)];
    }
    if (command.startsWith("REGION_") || REGIONS[command]) {
        const regionName = command.startsWith("REGION_") ? command.replace("REGION_", "") : command;
        if (REGIONS[regionName]) {
            const regionProxies = [];
            for (const country of REGIONS[regionName]) {
                if (proxyMap.has(country)) regionProxies.push(...proxyMap.get(country));
            }
            if (regionProxies.length > 0) return regionProxies[Math.floor(Math.random() * regionProxies.length)];
        }
    }
    const ipPortMatch = pathname.match(/^\/([\d\.]+)[:=:-](\d+)$/);
    if (ipPortMatch) return ipPortMatch[1] + ':' + ipPortMatch[2];
    return null;
}

async function detectProtocol(buffer) {
    if (buffer.byteLength >= DETECTION_PATTERNS.BUFFER_MIN_SIZE) {
        const delimiter = buffer.slice(DETECTION_PATTERNS.DELIMITER_OFFSET, DETECTION_PATTERNS.DELIMITER_OFFSET + 4);
        if (delimiter[0] === DETECTION_PATTERNS.DELIMITER_P1[0] && delimiter[1] === DETECTION_PATTERNS.DELIMITER_P1[1]) {
            if (DETECTION_PATTERNS.DELIMITER_P1_CHECK.includes(delimiter[2]) && DETECTION_PATTERNS.DELIMITER_P1_CHECK.concat([0x04]).includes(delimiter[3])) return PROTOCOLS.P1;
        }
    }
    const uuidCheck = buffer.slice(1, 17);
    const hexString = arrayBufferToHex(uuidCheck.buffer);
    if (DETECTION_PATTERNS.UUID_V4_REGEX.test(hexString)) return PROTOCOLS.P2;
    return PROTOCOLS.P3;
}

function parseP3Header(buffer) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const addressType = view.getUint8(0);
    let addressLength = 0, addressValueIndex = 1, addressValue = "";
    switch (addressType) {
        case ADDRESS_TYPES.IPV4:
            addressLength = 4;
            addressValue = new Uint8Array(buffer.slice(addressValueIndex, addressValueIndex + addressLength)).join(".");
            break;
        case ADDRESS_TYPES.DOMAIN_ALT:
            addressLength = buffer[addressValueIndex];
            addressValueIndex += 1;
            addressValue = arr2str(buffer.slice(addressValueIndex, addressValueIndex + addressLength));
            break;
        case ADDRESS_TYPES.IPV6:
            addressLength = 16;
            const dv = new DataView(buffer.slice(addressValueIndex, addressValueIndex + addressLength).buffer);
            const ipv6 = [];
            for (let i = 0; i < 8; i++) ipv6.push(dv.getUint16(i * 2).toString(16));
            addressValue = ipv6.join(":");
            break;
        default:
            return { hasError: true, message: 'Invalid addressType for P3: ' + addressType };
    }
    if (!addressValue) return { hasError: true, message: 'Destination address empty' };
    const portIndex = addressValueIndex + addressLength;
    const portBuffer = buffer.slice(portIndex, portIndex + 2);
    const portRemote = new DataView(portBuffer.buffer, portBuffer.byteOffset, 2).getUint16(0);
    return {
        hasError: false, addressRemote: addressValue, addressType, portRemote,
        rawDataIndex: portIndex + 2, rawClientData: buffer.slice(portIndex + 2), version: null, isUDP: portRemote == DNS_PORT
    };
}

function parseP2Header(buffer) {
    const version = buffer[0];
    let isUDP = false;
    const optLength = buffer[17];
    const cmd = buffer[18 + optLength];
    if (cmd === COMMAND_TYPES.TCP) {} else if (cmd === COMMAND_TYPES.UDP) isUDP = true;
    else return { hasError: true, message: 'Command ' + cmd + ' not supported for P2' };
    const portIndex = 18 + optLength + 1;
    const portBuffer = buffer.slice(portIndex, portIndex + 2);
    const portRemote = new DataView(portBuffer.buffer, portBuffer.byteOffset, 2).getUint16(0);
    let addressIndex = portIndex + 2;
    const addressType = buffer[addressIndex];
    let addressLength = 0, addressValueIndex = addressIndex + 1, addressValue = "";
    switch (addressType) {
        case ADDRESS_TYPES.IPV4:
            addressLength = 4;
            addressValue = new Uint8Array(buffer.slice(addressValueIndex, addressValueIndex + addressLength)).join(".");
            break;
        case ADDRESS_TYPES.DOMAIN:
            addressLength = buffer[addressValueIndex];
            addressValueIndex += 1;
            addressValue = arr2str(buffer.slice(addressValueIndex, addressValueIndex + addressLength));
            break;
        case ADDRESS_TYPES.IPV6:
            addressLength = 16;
            const dv = new DataView(buffer.slice(addressValueIndex, addressValueIndex + addressLength).buffer);
            const ipv6 = [];
            for (let i = 0; i < 8; i++) ipv6.push(dv.getUint16(i * 2).toString(16));
            addressValue = ipv6.join(":");
            break;
        default:
            return { hasError: true, message: 'Invalid addressType: ' + addressType };
    }
    if (!addressValue) return { hasError: true, message: 'addressValue is empty' };
    return {
        hasError: false, addressRemote: addressValue, addressType, portRemote,
        rawDataIndex: addressValueIndex + addressLength, rawClientData: buffer.slice(addressValueIndex + addressLength),
        version: new Uint8Array([version, 0]), isUDP
    };
}

function parseP1Header(buffer) {
    const dataBuffer = buffer.slice(58);
    if (dataBuffer.byteLength < 6) return { hasError: true, message: "Invalid request data for P1" };
    let isUDP = false;
    const view = new DataView(dataBuffer.buffer, dataBuffer.byteOffset, dataBuffer.byteLength);
    const cmd = view.getUint8(0);
    if (cmd == COMMAND_TYPES.UDP_ALT) isUDP = true;
    else if (cmd != COMMAND_TYPES.TCP) throw new Error("Unsupported command type for P1!");
    let addressType = view.getUint8(1);
    let addressLength = 0, addressValueIndex = 2, addressValue = "";
    switch (addressType) {
        case ADDRESS_TYPES.IPV4:
            addressLength = 4;
            addressValue = new Uint8Array(dataBuffer.slice(addressValueIndex, addressValueIndex + addressLength)).join(".");
            break;
        case ADDRESS_TYPES.DOMAIN_ALT:
            addressLength = dataBuffer[addressValueIndex];
            addressValueIndex += 1;
            addressValue = arr2str(dataBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
            break;
        case ADDRESS_TYPES.IPV6:
            addressLength = 16;
            const dv = new DataView(dataBuffer.slice(addressValueIndex, addressValueIndex + addressLength).buffer);
            const ipv6 = [];
            for (let i = 0; i < 8; i++) ipv6.push(dv.getUint16(i * 2).toString(16));
            addressValue = ipv6.join(":");
            break;
        default:
            return { hasError: true, message: 'Invalid addressType: ' + addressType };
    }
    if (!addressValue) return { hasError: true, message: 'Address is empty' };
    const portIndex = addressValueIndex + addressLength;
    const portBuffer = dataBuffer.slice(portIndex, portIndex + 2);
    const portRemote = new DataView(portBuffer.buffer, portBuffer.byteOffset, 2).getUint16(0);
    return {
        hasError: false, addressRemote: addressValue, addressType, portRemote,
        rawDataIndex: portIndex + 4, rawClientData: dataBuffer.slice(portIndex + 4), version: null, isUDP
    };
}

async function remoteSocketToWS(remoteSocket, webSocket, responseHeader, retry, log) {
    let header = responseHeader, hasIncomingData = false;
    await remoteSocket.readable.pipeTo(new WritableStream({
        async write(chunk, controller) {
            hasIncomingData = true;
            if (webSocket.readyState !== WS_READY_STATE_OPEN) controller.error("webSocket closed");
            if (header) {
                webSocket.send(await new Blob([header, chunk]).arrayBuffer());
                header = null;
            } else webSocket.send(chunk);
        },
        close() { log('remoteConnection readable closed, hasData: ' + hasIncomingData); },
        abort(reason) { console.error('remoteConnection abort', reason); },
    })).catch((error) => {
        console.error('remoteSocketToWS error', error.stack || error);
        safeCloseWebSocket(webSocket);
    });
    if (!hasIncomingData && retry) {
        log('retrying');
        retry();
    }
}

async function handleTCPOutbound(remoteSocket, addressRemote, portRemote, rawClientData, webSocket, responseHeader, log) {
    async function connectAndWrite(address, port) {
        const tcpSocket = connect({ hostname: address, port });
        remoteSocket.value = tcpSocket;
        log('connected to ' + address + ':' + port);
        const writer = tcpSocket.writable.getWriter();
        await writer.write(rawClientData);
        writer.releaseLock();
        return tcpSocket;
    }
    async function retry() {
        const targetHost = (prxIP ? prxIP.split(/[:=-]/)[0] : addressRemote);
        const targetPort = (prxIP ? parseInt(prxIP.split(/[:=-]/)[1]) : portRemote);
        const tcpSocket = await connectAndWrite(
            globalThis.pxip?.split(/[:=-]/)[0] || targetHost,
            globalThis.pxip?.split(/[:=-]/)[1] || targetPort
        );
        tcpSocket.closed.catch(e => console.log("retry closed error", e)).finally(() => safeCloseWebSocket(webSocket));
        remoteSocketToWS(tcpSocket, webSocket, responseHeader, null, log);
    }
    const tcpSocket = await connectAndWrite(addressRemote, portRemote);
    remoteSocketToWS(tcpSocket, webSocket, responseHeader, retry, log);
}

function createReadableWebSocketStream(webSocketServer, earlyDataHeader, log) {
    let readableStreamCancel = false;
    return new ReadableStream({
        start(controller) {
            webSocketServer.addEventListener("message", (e) => {
                if (!readableStreamCancel) controller.enqueue(e.data);
            });
            webSocketServer.addEventListener("close", () => {
                safeCloseWebSocket(webSocketServer);
                if (!readableStreamCancel) controller.close();
            });
            webSocketServer.addEventListener("error", (err) => {
                log("ws error");
                controller.error(err);
            });
            const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);
            if (error) controller.error(error);
            else if (earlyData) controller.enqueue(earlyData);
        },
        cancel(reason) {
            if (!readableStreamCancel) {
                log('Stream canceled: ' + reason);
                readableStreamCancel = true;
                safeCloseWebSocket(webSocketServer);
            }
        },
    });
}

function parseUnknownHeader(buffer) {}

function base64ToArrayBuffer(base64Str) {
    if (!base64Str) return { error: null };
    try {
        const decode = atob(base64Str.replace(/-/g, "+").replace(/_/g, "/"));
        return { earlyData: Uint8Array.from(decode, c => c.charCodeAt(0)).buffer, error: null };
    } catch (error) {
        return { error };
    }
}

function arrayBufferToHex(buffer) {
    return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function handleUDPOutbound(webSocket, responseHeader, log) {
    let isHeaderSent = false;
    const transformStream = new TransformStream({
        transform(chunk, controller) {
            for (let index = 0; index < chunk.byteLength;) {
                const lengthBuffer = chunk.slice(index, index + 2);
                const udpPacketLength = new DataView(lengthBuffer.buffer, lengthBuffer.byteOffset, 2).getUint16(0);
                controller.enqueue(new Uint8Array(chunk.slice(index + 2, index + 2 + udpPacketLength)));
                index += 2 + udpPacketLength;
            }
        },
    });
    transformStream.readable.pipeTo(new WritableStream({
        async write(chunk) {
            const resp = await fetch("https://1.1.1.1/dns-query", {
                method: "POST",
                headers: { "content-type": "application/dns-message" },
                body: chunk
            });
            const dnsQueryResult = await resp.arrayBuffer();
            const udpSize = dnsQueryResult.byteLength;
            const udpSizeBuffer = new Uint8Array([(udpSize >> 8) & 0xff, udpSize & 0xff]);
            if (webSocket.readyState === WS_READY_STATE_OPEN) {
                log('DoH success, DNS length: ' + udpSize);
                if (isHeaderSent) webSocket.send(await new Blob([udpSizeBuffer, dnsQueryResult]).arrayBuffer());
                else {
                    webSocket.send(await new Blob([responseHeader, udpSizeBuffer, dnsQueryResult]).arrayBuffer());
                    isHeaderSent = true;
                }
            }
        },
    })).catch(e => log("DNS UDP error: " + e));
    const writer = transformStream.writable.getWriter();
    return { write(chunk) { writer.write(chunk); } };
}

function safeCloseWebSocket(socket) {
    try {
        if (socket.readyState === WS_READY_STATE_OPEN || socket.readyState === WS_READY_STATE_CLOSING) socket.close();
    } catch (e) {
        console.error("safeCloseWebSocket error", e);
    }
}

async function websocketHandler(request) {
    const webSocketPair = new WebSocketPair();
    const [client, webSocket] = Object.values(webSocketPair);
    webSocket.accept();

    let addressLog = "", portLog = "";
    const log = (info, event) => console.log('[' + addressLog + ':' + portLog + '] ' + info, event || "");

    const earlyDataHeader = request.headers.get("sec-websocket-protocol") || "";
    const readableWebSocketStream = createReadableWebSocketStream(webSocket, earlyDataHeader, log);

    let remoteSocketWrapper = { value: null };
    let udpStreamWrite = null, isDNS = false;

    readableWebSocketStream.pipeTo(new WritableStream({
        async write(chunk, controller) {
            if (isDNS && udpStreamWrite) return udpStreamWrite(chunk);
            if (remoteSocketWrapper.value) {
                const writer = remoteSocketWrapper.value.writable.getWriter();
                await writer.write(chunk);
                writer.releaseLock();
                return;
            }

            const bufferChunk = new Uint8Array(chunk);
            const protocol = await detectProtocol(bufferChunk);
            let protocolHeader;

            if (protocol === PROTOCOLS.P1) protocolHeader = parseP1Header(bufferChunk);
            else if (protocol === PROTOCOLS.P2) protocolHeader = parseP2Header(bufferChunk);
            else if (protocol === PROTOCOLS.P3) protocolHeader = parseP3Header(bufferChunk);
            else {
                parseUnknownHeader(bufferChunk);
                throw new Error("Unknown Protocol!");
            }

            addressLog = protocolHeader.addressRemote;
            portLog = protocolHeader.portRemote + ' -> ' + (protocolHeader.isUDP ? "UDP" : "TCP");
            if (protocolHeader.hasError) throw new Error(protocolHeader.message);

            if (protocolHeader.isUDP) {
                if (protocolHeader.portRemote === DNS_PORT) isDNS = true;
                else throw new Error("UDP only support for DNS port 53");
            }

            if (isDNS) {
                const { write } = await handleUDPOutbound(webSocket, protocolHeader.version, log);
                udpStreamWrite = write;
                udpStreamWrite(protocolHeader.rawClientData);
                return;
            }

            handleTCPOutbound(remoteSocketWrapper, protocolHeader.addressRemote, protocolHeader.portRemote,
                protocolHeader.rawClientData, webSocket, protocolHeader.version, log);
        },
        close() { log('readableWebSocketStream closed'); },
        abort(reason) { log('readableWebSocketStream aborted', JSON.stringify(reason)); },
    })).catch((err) => log("pipeTo error", err));

    return new Response(null, { status: 101, webSocket: client });
}

export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);
            const upgradeHeader = request.headers.get("Upgrade");

            if (url.pathname === "/" || url.pathname === "/index.html") {
                return new Response(UI_HTML, {
                    headers: {
                        "Content-Type": "text/html; charset=utf-8",
                        "Cache-Control": "public, max-age=3600"
                    }
                });
            }

            if (upgradeHeader === "websocket") {
                const proxyFromPath = await getProxyFromPath(url.pathname);
                if (proxyFromPath) prxIP = proxyFromPath;
                const pxip = url.pathname.match(/^\/(.+[:=-]\d+)$/);
                if (pxip) globalThis.pxip = pxip[1];
                return await websocketHandler(request);
            }

            return new Response("Not Found", { status: 404 });
        } catch (err) {
            return new Response('Error: ' + err.toString(), { status: 500 });
        }
    },
};
