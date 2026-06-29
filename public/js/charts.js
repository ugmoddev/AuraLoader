// Chart Configuration and Utilities

class ChartManager {
    constructor() {
        this.charts = {};
    }

    createLineChart(id, data, options = {}) {
        const ctx = document.getElementById(id)?.getContext('2d');
        if (!ctx) return null;

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#a0a0b8',
                        font: { size: 12 }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#a0a0b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#a0a0b8' }
                }
            }
        };

        const mergedOptions = this.deepMerge(defaultOptions, options);
        
        this.charts[id] = new Chart(ctx, {
            type: 'line',
            data: data,
            options: mergedOptions
        });

        return this.charts[id];
    }

    createBarChart(id, data, options = {}) {
        const ctx = document.getElementById(id)?.getContext('2d');
        if (!ctx) return null;

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#a0a0b8',
                        font: { size: 12 }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#a0a0b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#a0a0b8' }
                }
            }
        };

        const mergedOptions = this.deepMerge(defaultOptions, options);
        
        this.charts[id] = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: mergedOptions
        });

        return this.charts[id];
    }

    createDoughnutChart(id, data, options = {}) {
        const ctx = document.getElementById(id)?.getContext('2d');
        if (!ctx) return null;

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#a0a0b8',
                        padding: 20,
                        font: { size: 12 }
                    }
                }
            }
        };

        const mergedOptions = this.deepMerge(defaultOptions, options);
        
        this.charts[id] = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: mergedOptions
        });

        return this.charts[id];
    }

    updateChart(id, data) {
        if (this.charts[id]) {
            this.charts[id].data = data;
            this.charts[id].update();
            return true;
        }
        return false;
    }

    destroyChart(id) {
        if (this.charts[id]) {
            this.charts[id].destroy();
            delete this.charts[id];
            return true;
        }
        return false;
    }

    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    // Predefined color palettes
    getColors(palette = 'default', count = 5) {
        const palettes = {
            default: ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#74b9ff'],
            pastel: ['#a29bfe', '#81ecec', '#ffeaa7', '#fab1a0', '#81ecec'],
            dark: ['#2d3436', '#636e72', '#b2bec3', '#dfe6e9', '#0984e3']
        };

        const colors = palettes[palette] || palettes.default;
        while (colors.length < count) {
            colors.push(colors[Math.floor(Math.random() * colors.length)]);
        }
        return colors.slice(0, count);
    }

    // Generate chart data for analytics
    generateAnalyticsData(stats) {
        return {
            labels: stats.labels || [],
            datasets: [{
                label: stats.label || 'Data',
                data: stats.values || [],
                backgroundColor: this.getColors('default', stats.values?.length || 5),
                borderColor: '#6c5ce7',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                fillColor: 'rgba(108,92,231,0.1)'
            }]
        };
    }

    // Auto-resize charts on window resize
    resizeAll() {
        Object.values(this.charts).forEach(chart => {
            chart.resize();
        });
    }
}

// Initialize chart manager
let chartManager;
document.addEventListener('DOMContentLoaded', () => {
    chartManager = new ChartManager();

    // Resize charts on window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            chartManager.resizeAll();
        }, 250);
    });
});