// Main JavaScript - AuraHub Platform

// Utility Functions
function formatDate(date) {
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getStatusColor(status) {
    const colors = {
        'active': 'var(--secondary)',
        'inactive': 'var(--danger)',
        'pending': 'var(--warning)',
        'success': 'var(--secondary)',
        'error': 'var(--danger)'
    };
    return colors[status] || 'var(--text-secondary)';
}

// Toast Notification System
class Toast {
    static show(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer') || this.createContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${this.getIcon(type)}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    }

    static success(message, duration = 5000) {
        this.show(message, 'success', duration);
    }

    static error(message, duration = 5000) {
        this.show(message, 'error', duration);
    }

    static warning(message, duration = 5000) {
        this.show(message, 'warning', duration);
    }

    static info(message, duration = 5000) {
        this.show(message, 'info', duration);
    }

    static createContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
            width: 100%;
        `;
        document.body.appendChild(container);
        return container;
    }

    static getIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }
}

// Add toast styles
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    .toast {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-glass);
        border-radius: 12px;
        box-shadow: var(--shadow-glass);
        backdrop-filter: blur(20px);
        animation: slideIn 0.3s ease;
        transition: var(--transition);
    }

    .toast:hover {
        transform: translateX(-4px);
    }

    .toast-success {
        border-left: 4px solid var(--secondary);
    }
    .toast-error {
        border-left: 4px solid var(--danger);
    }
    .toast-warning {
        border-left: 4px solid var(--warning);
    }
    .toast-info {
        border-left: 4px solid var(--primary);
    }

    .toast-icon {
        font-size: 20px;
        color: var(--text-secondary);
    }

    .toast-success .toast-icon { color: var(--secondary); }
    .toast-error .toast-icon { color: var(--danger); }
    .toast-warning .toast-icon { color: var(--warning); }
    .toast-info .toast-icon { color: var(--primary); }

    .toast-content {
        flex: 1;
    }

    .toast-message {
        font-size: 14px;
        color: var(--text-primary);
    }

    .toast-close {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 4px;
        transition: var(--transition);
    }

    .toast-close:hover {
        color: var(--text-primary);
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(toastStyles);

// Loading spinner utility
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; padding: 40px;">
            <div class="loading-spinner"></div>
        </div>
    `;
}

function hideLoading(elementId, content) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.innerHTML = content || '';
}

// Confirm dialog
function confirmDialog(message, options = {}) {
    return new Promise((resolve) => {
        const defaultOptions = {
            title: 'Confirm',
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            type: 'warning'
        };
        const opts = { ...defaultOptions, ...options };

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease;
        `;

        modal.innerHTML = `
            <div class="modal-glass" style="max-width: 450px; width: 90%;">
                <div style="padding: 24px;">
                    <h3 style="margin-bottom: 8px;">${opts.title}</h3>
                    <p style="color: var(--text-secondary);">${message}</p>
                    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;">
                        <button class="btn-glass" id="confirmCancel">${opts.cancelText}</button>
                        <button class="btn-primary-glass" id="confirmOk">${opts.confirmText}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#confirmCancel').addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });

        modal.querySelector('#confirmOk').addEventListener('click', () => {
            modal.remove();
            resolve(true);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        });
    });
}

// Add fadeIn animation
const fadeInStyles = document.createElement('style');
fadeInStyles.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;
document.head.appendChild(fadeInStyles);

// Expose utilities globally
window.utils = {
    formatDate,
    formatBytes,
    generateUUID,
    getStatusColor,
    Toast,
    showLoading,
    hideLoading,
    confirmDialog
};

// Handle sidebar toggle
document.addEventListener('DOMContentLoaded', () => {
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('open');
        });
    }

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const toggle = document.querySelector('.sidebar-toggle');
        if (window.innerWidth <= 768 && 
            sidebar?.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            !toggle?.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape key to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-glass').forEach(modal => {
            const parent = modal.closest('[style*="position: fixed"]');
            if (parent) parent.remove();
        });
    }

    // Ctrl + S to save (in forms)
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        const form = document.querySelector('form[data-save-shortcut]');
        if (form) {
            e.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
    }
});

console.log('AuraHub Loader Platform initialized');