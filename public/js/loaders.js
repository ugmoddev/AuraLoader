// Loader Management Functions

class LoaderManager {
    constructor() {
        this.init();
    }

    init() {
        this.loadLoaders();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('searchLoaders')?.addEventListener('input', (e) => {
            this.search = e.target.value;
            this.loadLoaders();
        });
    }

    async loadLoaders() {
        try {
            const response = await fetch('/api/loaders');
            const data = await response.json();

            if (data.success) {
                this.renderLoaders(data.data);
            }
        } catch (error) {
            console.error('Failed to load loaders:', error);
        }
    }

    renderLoaders(loaders) {
        const container = document.getElementById('loadersContainer');
        if (!container) return;

        container.innerHTML = loaders.map(loader => `
            <div class="glass-card" style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4>Loader: ${loader.loaderId}</h4>
                        <div style="display: flex; gap: 12px; margin-top: 4px;">
                            <span class="text-secondary">Script: ${loader.scriptName || 'Unknown'}</span>
                            <span class="text-secondary">Version: v${loader.version}</span>
                            <span class="text-secondary">Executions: ${loader.executions || 0}</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                        <span class="badge-status ${loader.status === 'active' ? 'active' : 'inactive'}">
                            ${loader.status}
                        </span>
                        <div style="display: flex; gap: 4px;">
                            <button class="btn-glass" onclick="loaderManager.viewLoader('${loader.loaderId}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-glass" onclick="loaderManager.copyLoader('${loader.loaderId}')">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="btn-glass" onclick="loaderManager.deleteLoader('${loader.loaderId}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async createLoader(scriptId, version = '1.0.0') {
        try {
            const response = await fetch('/loader/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('aurahub_token')}`
                },
                body: JSON.stringify({ scriptId, version })
            });

            const result = await response.json();
            if (result.success) {
                this.loadLoaders();
                return result.data;
            } else {
                throw new Error(result.error || 'Failed to create loader');
            }
        } catch (error) {
            console.error('Error creating loader:', error);
            throw error;
        }
    }

    async deleteLoader(loaderId) {
        if (!confirm('Are you sure you want to delete this loader?')) return;

        try {
            const response = await fetch(`/api/loaders/${loaderId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('aurahub_token')}`
                }
            });

            const result = await response.json();
            if (result.success) {
                this.loadLoaders();
                alert('Loader deleted successfully');
            } else {
                alert(result.error || 'Failed to delete loader');
            }
        } catch (error) {
            console.error('Error deleting loader:', error);
            alert('Failed to delete loader');
        }
    }

    async copyLoader(loaderId) {
        try {
            const response = await fetch(`/api/loaders/${loaderId}`);
            const data = await response.json();

            if (data.success && data.data) {
                const loaderCode = `
                    -- AuraHub Loader
                    local LoaderID = "${data.data.loaderId}"
                    local Version = "${data.data.version}"
                    local Secret = "${data.data.secret}"
                    
                    local function loadScript()
                        local url = "https://your-cdn.com/init/" .. LoaderID .. ".lua?hwid=" .. tostring(game.Players.LocalPlayer) .. "&secret=" .. Secret
                        local success, result = pcall(function()
                            return game:HttpGet(url)
                        end)
                        if success and result then
                            loadstring(result)()
                        else
                            warn("Failed to load script")
                        end
                    end
                    
                    loadScript()
                `;

                await navigator.clipboard.writeText(loaderCode);
                alert('Loader code copied to clipboard!');
            }
        } catch (error) {
            console.error('Error copying loader:', error);
            alert('Failed to copy loader code');
        }
    }

    async viewLoader(loaderId) {
        try {
            const response = await fetch(`/api/loaders/${loaderId}`);
            const data = await response.json();

            if (data.success) {
                const loader = data.data;
                alert(`
                    Loader Information:
                    ID: ${loader.loaderId}
                    Script: ${loader.scriptName || 'Unknown'}
                    Version: ${loader.version}
                    Status: ${loader.status}
                    Executions: ${loader.executions || 0}
                    Created: ${new Date(loader.createdAt).toLocaleString()}
                    Last Execution: ${loader.lastExecution ? new Date(loader.lastExecution).toLocaleString() : 'Never'}
                `);
            }
        } catch (error) {
            console.error('Error viewing loader:', error);
            alert('Failed to load loader information');
        }
    }
}

// Initialize loader manager
let loaderManager;
document.addEventListener('DOMContentLoaded', () => {
    loaderManager = new LoaderManager();
});