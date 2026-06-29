// AuraHub Dashboard - Main JavaScript

class AuraHub {
  constructor() {
    this.apiBase = '/api';
    this.token = localStorage.getItem('aurahub_token');
    this.init();
  }

  init() {
    this.loadStatistics();
    this.loadRecentLogs();
    this.loadRecentScripts();
    this.setupEventListeners();
    this.setupCharts();
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.apiBase}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async loadStatistics() {
    try {
      const data = await this.request('/statistics');
      
      if (data.success) {
        document.getElementById('totalScripts').textContent = data.data.scripts;
        document.getElementById('totalLoaders').textContent = data.data.loaders;
        document.getElementById('totalUsers').textContent = data.data.users;
        document.getElementById('executionsToday').textContent = data.data.executionsToday;
        document.getElementById('executionsMonth').textContent = data.data.executionsMonth;
        document.getElementById('apiCalls').textContent = data.data.apiCalls;
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  }

  async loadRecentLogs() {
    try {
      const data = await this.request('/logs?limit=10');
      
      if (data.success) {
        const tbody = document.getElementById('recentLogs');
        tbody.innerHTML = '';
        
        data.data.forEach(log => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${log.loaderId}</td>
            <td>${log.ip}</td>
            <td><span class="badge-status ${log.status.toLowerCase()}">${log.status}</span></td>
            <td>${new Date(log.createdAt).toLocaleString()}</td>
            <td>${log.latency || 0}ms</td>
          `;
          tbody.appendChild(tr);
        });
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  }

  async loadRecentScripts() {
    try {
      const data = await this.request('/scripts?limit=5');
      
      if (data.success) {
        const tbody = document.getElementById('recentScripts');
        tbody.innerHTML = '';
        
        data.data.forEach(script => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${script.name}</td>
            <td>${script.author || 'Unknown'}</td>
            <td>v${script.version}</td>
            <td><span class="badge-status ${script.enabled ? 'active' : 'inactive'}">${script.enabled ? 'Active' : 'Inactive'}</span></td>
            <td>${new Date(script.createdAt).toLocaleDateString()}</td>
          `;
          tbody.appendChild(tr);
        });
      }
    } catch (error) {
      console.error('Failed to load scripts:', error);
    }
  }

  setupCharts() {
    // Executions Chart
    const ctx = document.getElementById('executionsChart')?.getContext('2d');
    if (ctx) {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Daily Executions',
            data: [120, 190, 150, 210, 180, 240, 200],
            borderColor: '#6c5ce7',
            backgroundColor: 'rgba(108, 92, 231, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: '#a0a0b8'
              }
            }
          },
          scales: {
            y: {
              grid: {
                color: 'rgba(255, 255, 255, 0.05)'
              },
              ticks: {
                color: '#a0a0b8'
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: '#a0a0b8'
              }
            }
          }
        }
      });
    }

    // Scripts Distribution
    const ctx2 = document.getElementById('scriptsChart')?.getContext('2d');
    if (ctx2) {
      new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: ['Utility', 'Game', 'AI', 'Security', 'Other'],
          datasets: [{
            data: [30, 25, 20, 15, 10],
            backgroundColor: [
              '#6c5ce7',
              '#00b894',
              '#fdcb6e',
              '#e17055',
              '#74b9ff'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#a0a0b8',
                padding: 20
              }
            }
          }
        }
      });
    }
  }

  setupEventListeners() {
    // Search
    document.querySelector('.topbar-search input')?.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });

    // Sidebar toggle for mobile
    document.querySelector('.sidebar-toggle')?.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('open');
    });

    // Notifications
    document.querySelector('.btn-icon[data-action="notifications"]')?.addEventListener('click', () => {
      this.showNotification('No new notifications', 'info');
    });
  }

  handleSearch(query) {
    if (query.length < 2) return;
    
    console.log('Searching for:', query);
    // Implement real-time search
  }

  showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer') || this.createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <strong>${type.toUpperCase()}</strong>
      <p>${message}</p>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notificationContainer';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.aurahub = new AuraHub();
});