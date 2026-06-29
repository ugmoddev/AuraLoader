// Script Management Functions

class ScriptManager {
    constructor() {
        this.currentPage = 1;
        this.limit = 20;
        this.search = '';
        this.sort = 'createdAt';
        this.order = 'DESC';
        this.filters = {};
        this.init();
    }

    init() {
        this.loadScripts();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('searchScripts')?.addEventListener('input', (e) => {
            this.search = e.target.value;
            this.loadScripts();
        });

        document.getElementById('sortScripts')?.addEventListener('change', (e) => {
            this.sort = e.target.value;
            this.loadScripts();
        });

        document.getElementById('filterEnabled')?.addEventListener('change', (e) => {
            this.filters.enabled = e.target.value;
            this.loadScripts();
        });
    }

    async loadScripts() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.limit,
                search: this.search,
                sort: this.sort,
                ...this.filters
            });

            const response = await fetch(`/api/scripts?${params}`);
            const data = await response.json();

            if (data.success) {
                this.renderScripts(data.data);
                this.renderPagination(data.pagination);
            }
        } catch (error) {
            console.error('Failed to load scripts:', error);
        }
    }

    renderScripts(scripts) {
        const container = document.getElementById('scriptsContainer');
        if (!container) return;

        container.innerHTML = scripts.map(script => `
            <div class="glass-card" style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4>${script.name}</h4>
                        <div style="display: flex; gap: 12px; margin-top: 4px;">
                            <span class="text-secondary">Author: ${script.author || 'Unknown'}</span>
                            <span class="text-secondary">Version: v${script.version}</span>
                            <span class="text-secondary">Category: ${script.category || 'general'}</span>
                        </div>
                        <p style="margin-top: 8px; color: var(--text-secondary);">${script.description || 'No description'}</p>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                        <span class="badge-status ${script.enabled ? 'active' : 'inactive'}">
                            ${script.enabled ? 'Active' : 'Inactive'}
                        </span>
                        <div style="display: flex; gap: 4px;">
                            <button class="btn-glass" onclick="scriptManager.editScript('${script.uuid}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-glass" onclick="scriptManager.deleteScript('${script.uuid}')">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="btn-glass" onclick="scriptManager.generateLoader('${script.uuid}')">
                                <i class="fas fa-link"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderPagination(pagination) {
        const container = document.getElementById('pagination');
        if (!container) return;

        let html = '';
        for (let i = 1; i <= pagination.pages; i++) {
            html += `<button class="${i === pagination.page ? 'active' : ''}" 
                           onclick="scriptManager.goToPage(${i})">${i}</button>`;
        }
        container.innerHTML = html;
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadScripts();
    }

    async createScript(data) {
        try {
            const response = await fetch('/api/scripts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('aurahub_token')}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                this.loadScripts();
                return result.data;
            } else {
                throw new Error(result.error || 'Failed to create script');
            }
        } catch (error) {
            console.error('Error creating script:', error);
            throw error;
        }
    }

    async updateScript(id, data) {
        try {
            const response = await fetch(`/api/scripts/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('aurahub_token')}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                this.loadScripts();
                return result.data;
            } else {
                throw new Error(result.error || 'Failed to update script');
            }
        } catch (error) {
            console.error('Error updating script:', error);
            throw error;
        }
    }

    async deleteScript(id) {
        if (!confirm('Are you sure you want to delete this script?')) return;

        try {
            const response = await fetch(`/api/scripts/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('aurahub_token')}`
                }
            });

            const result = await response.json();
            if (result.success) {
                this.loadScripts();
                alert('Script deleted successfully');
            } else {
                alert(result.error || 'Failed to delete script');
            }
        } catch (error) {
            console.error('Error deleting script:', error);
            alert('Failed to delete script');
        }
    }

    async generateLoader(scriptId) {
        try {
            const response = await fetch('/loader/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('aurahub_token')}`
                },
                body: JSON.stringify({ scriptId })
            });

            const result = await response.json();
            if (result.success) {
                alert(`Loader generated successfully!\nLoaderID: ${result.data.loaderId}\nSecret: ${result.data.secret}`);
                // Optionally redirect to loader page
            } else {
                alert(result.error || 'Failed to generate loader');
            }
        } catch (error) {
            console.error('Error generating loader:', error);
            alert('Failed to generate loader');
        }
    }
}

// Initialize script manager
let scriptManager;
document.addEventListener('DOMContentLoaded', () => {
    scriptManager = new ScriptManager();
});