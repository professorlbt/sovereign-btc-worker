export const adminHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sovereign BTC Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
</head>
<body class="bg-gray-100 font-sans text-gray-900">

    <!-- Login Modal -->
    <div id="loginModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-8 rounded shadow-lg w-96">
            <h2 class="text-2xl font-bold mb-4">Admin Login</h2>
            <input type="email" id="email" placeholder="admin@sovereign.btc" class="w-full mb-3 p-2 border rounded">
            <input type="password" id="password" placeholder="Password" class="w-full mb-4 p-2 border rounded">
            <button onclick="login()" class="w-full bg-orange-500 text-white p-2 rounded hover:bg-orange-600">Login</button>
            <p id="loginError" class="text-red-500 mt-2 text-sm hidden"></p>
        </div>
    </div>

    <!-- Main Dashboard (Hidden by default) -->
    <div id="dashboard" class="hidden min-h-screen">
        <nav class="bg-gray-800 text-white p-4 flex justify-between items-center">
            <h1 class="text-xl font-bold text-orange-500">Sovereign BTC Admin</h1>
            <div>
                <button onclick="showSection('stats')" class="mr-4 hover:text-orange-400">Stats</button>
                <button onclick="showSection('applications')" class="mr-4 hover:text-orange-400">Applications</button>
                <button onclick="showSection('users')" class="mr-4 hover:text-orange-400">Users</button>
                <button onclick="logout()" class="text-red-400 hover:text-red-300">Logout</button>
            </div>
        </nav>

        <div class="p-8">
            <!-- Stats Section -->
            <div id="statsSection">
                <h2 class="text-2xl font-bold mb-6">Overview</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-white p-6 rounded shadow border-l-4 border-blue-500">
                        <h3 class="text-gray-500">Total Users</h3>
                        <p id="statTotalUsers" class="text-3xl font-bold">0</p>
                    </div>
                    <div class="bg-white p-6 rounded shadow border-l-4 border-yellow-500">
                        <h3 class="text-gray-500">Pending Applications</h3>
                        <p id="statPendingApps" class="text-3xl font-bold">0</p>
                    </div>
                    <div class="bg-white p-6 rounded shadow border-l-4 border-green-500">
                        <h3 class="text-gray-500">Premium Members</h3>
                        <p id="statPremiumUsers" class="text-3xl font-bold">0</p>
                    </div>
                </div>
            </div>

            <!-- Applications Section -->
            <div id="applicationsSection" class="hidden">
                <h2 class="text-2xl font-bold mb-6">Pending Applications</h2>
                <div class="bg-white rounded shadow overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-200">
                            <tr>
                                <th class="p-3">Email</th>
                                <th class="p-3">Requested Handle</th>
                                <th class="p-3">Motivation</th>
                                <th class="p-3">Experience</th>
                                <th class="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="applicationsTableBody"></tbody>
                    </table>
                </div>
            </div>

            <!-- Users Section -->
            <div id="usersSection" class="hidden">
                <div class="flex justify-between mb-6">
                    <h2 class="text-2xl font-bold">User Management</h2>
                    <button onclick="exportData()" class="bg-gray-600 text-white px-4 py-2 rounded">Export CSV</button>
                </div>
                <div class="bg-white rounded shadow overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-200">
                            <tr>
                                <th class="p-3">ID</th>
                                <th class="p-3">Email</th>
                                <th class="p-3">Handle</th>
                                <th class="p-3">Tier</th>
                                <th class="p-3">Status</th>
                                <th class="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Ensure we hit the root API paths
        const API_URL = window.location.origin;
        let token = localStorage.getItem('adminToken');

        if (token) {
            document.getElementById('loginModal').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
            loadStats();
        }

        async function login() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const res = await fetch(\`\${API_URL}/admin/login\`, {
                    method: 'POST',
                    body: JSON.stringify({ email, password }),
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                
                if (data.success) {
                    token = data.data.token;
                    localStorage.setItem('adminToken', token);
                    document.getElementById('loginModal').classList.add('hidden');
                    document.getElementById('dashboard').classList.remove('hidden');
                    loadStats();
                } else {
                    document.getElementById('loginError').innerText = data.error || data.message;
                    document.getElementById('loginError').classList.remove('hidden');
                }
            } catch (e) {
                alert('Login failed');
            }
        }

        function logout() {
            localStorage.removeItem('adminToken');
            location.reload();
        }

        function showSection(id) {
            ['stats', 'applications', 'users'].forEach(s => {
                document.getElementById(\`\${s}Section\`).classList.add('hidden');
            });
            document.getElementById(\`\${id}Section\`).classList.remove('hidden');
            if (id === 'applications') loadApplications();
            if (id === 'users') loadUsers();
            if (id === 'stats') loadStats();
        }

        async function fetchAuth(url, options = {}) {
            options.headers = { ...options.headers, 'Authorization': \`Bearer \${token}\` };
            const res = await fetch(url, options);
            if (res.status === 401) logout();
            return res.json();
        }

        async function loadStats() {
            const res = await fetchAuth(\`\${API_URL}/admin/stats\`);
            if (res.success) {
                document.getElementById('statTotalUsers').innerText = res.data.users.total;
                document.getElementById('statPendingApps').innerText = res.data.applications.pending;
                document.getElementById('statPremiumUsers').innerText = res.data.users.premium;
            }
        }

        async function loadApplications() {
            const res = await fetchAuth(\`\${API_URL}/admin/applications\`);
            const tbody = document.getElementById('applicationsTableBody');
            tbody.innerHTML = '';
            
            if(res.success && res.data.applications && res.data.applications.length > 0) {
                res.data.applications.forEach(app => {
                    const tr = document.createElement('tr');
                    tr.className = "border-b";
                    tr.innerHTML = \`
                        <td class="p-3">\${app.email}</td>
                        <td class="p-3 font-mono">\${app.handle}</td>
                        <td class="p-3 text-sm">\${app.motivation.substring(0, 50)}...</td>
                        <td class="p-3 text-sm">\${app.experience.substring(0, 50)}...</td>
                        <td class="p-3">
                            <button onclick="reviewApp('\${app.user_id}', '\${app.handle}')" class="text-green-600 font-bold mr-2">Approve</button>
                            <button onclick="rejectApp('\${app.user_id}')" class="text-red-600 font-bold">Reject</button>
                        </td>
                    \`;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">No pending applications</td></tr>';
            }
        }

        async function reviewApp(userId, handle) {
            if(!confirm(\`Are you sure you want to approve \${handle}?\`)) return;
            const res = await fetchAuth(\`\${API_URL}/admin/approve\`, {
                method: 'POST',
                body: JSON.stringify({ userId: userId, platformHandle: handle }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.success) {
                alert('Approved successfully');
                loadApplications();
            } else {
                alert('Error: ' + res.message);
            }
        }

        async function rejectApp(userId) {
            if(!confirm('Are you sure you want to reject this user?')) return;
            const res = await fetchAuth(\`\${API_URL}/admin/reject\`, {
                method: 'POST',
                body: JSON.stringify({ userId: userId }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.success) {
                loadApplications();
            }
        }

        async function loadUsers() {
            const res = await fetchAuth(\`\${API_URL}/admin/users\`);
            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = '';

            if (res.success && res.data.users) {
                res.data.users.forEach(user => {
                    const tr = document.createElement('tr');
                    tr.className = "border-b hover:bg-gray-50";
                    tr.innerHTML = \`
                        <td class="p-3 text-xs text-gray-500 font-mono">\${user.id.substring(0,8)}...</td>
                        <td class="p-3">\${user.email}</td>
                        <td class="p-3">\${user.platform_handle || '-'}</td>
                        <td class="p-3"><span class="px-2 py-1 rounded text-xs \${user.account_type === 'premium' ? 'bg-purple-100 text-purple-800' : 'bg-gray-200'}">\${user.account_type}</span></td>
                        <td class="p-3"><span class="px-2 py-1 rounded text-xs \${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100'}">\${user.status}</span></td>
                        <td class="p-3 text-sm">
                            <button onclick="userAction('\${user.id}', 'suspend')" class="text-red-500">Suspend</button>
                        </td>
                    \`;
                    tbody.appendChild(tr);
                });
            }
        }

        async function userAction(userId, action) {
            const res = await fetchAuth(\`\${API_URL}/admin/bulk-action\`, {
                method: 'POST',
                body: JSON.stringify({ userIds: [userId], action }),
                headers: { 'Content-Type': 'application/json' }
            });
            if(res.success) loadUsers();
        }

        async function exportData() {
            const res = await fetchAuth(\`\${API_URL}/admin/export-data\`, {
                method: 'POST',
                body: JSON.stringify({ type: 'users', format: 'csv' }),
                headers: { 'Content-Type': 'application/json' }
            });
            const text = await res.text();
            const blob = new Blob([text], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "users_export.csv";
            a.click();
        }
    </script>
</body>
</html>
`;