/**
 * Quantitative Risk Management Platform - Main JavaScript
 * 
 * Contains utility functions, API calls, chart rendering and user interaction logic
 * 
 * Author: Bowen Yao
 * Date: 2025
 */

// Global configuration
const CONFIG = {
    API_BASE_URL: '',
    DEFAULT_PRECISION: 6,
    CHART_COLORS: {
        primary: '#667eea',
        secondary: '#f093fb',
        tertiary: '#4facfe',
        success: '#4ade80',
        warning: '#fbbf24',
        danger: '#f87171',
        info: '#60a5fa'
    },
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 500
};

// Utility functions library
const Utils = {
    /**
     * Format number for display
     * @param {number} num - Number to format
     * @param {number} precision - Decimal places
     * @returns {string} Formatted string
     */
    formatNumber: function(num, precision = CONFIG.DEFAULT_PRECISION) {
        if (typeof num !== 'number' || isNaN(num)) {
            return 'N/A';
        }
        return num.toFixed(precision);
    },

    /**
     * Format currency display
     * @param {number} num - Amount
     * @param {number} precision - Decimal places
     * @returns {string} Formatted currency string
     */
    formatCurrency: function(num, precision = 2) {
        if (typeof num !== 'number' || isNaN(num)) {
            return '$N/A';
        }
        return '$' + num.toLocaleString('en-US', {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision
        });
    },

    /**
     * Format percentage display
     * @param {number} num - Value (0.05 = 5%)
     * @param {number} precision - Decimal places
     * @returns {string} Formatted percentage string
     */
    formatPercentage: function(num, precision = 2) {
        if (typeof num !== 'number' || isNaN(num)) {
            return 'N/A%';
        }
        return (num * 100).toFixed(precision) + '%';
    },

    /**
     * Validate input parameters
     * @param {Object} params - Parameter object
     * @returns {Array} Array of error messages
     */
    validateParameters: function(params) {
        const errors = [];
        
        if (!params.spot_price || params.spot_price <= 0) {
            errors.push('Underlying price must be positive');
        }
        
        if (!params.strike_price || params.strike_price <= 0) {
            errors.push('Strike price must be positive');
        }
        
        if (!params.time_to_expiry || params.time_to_expiry <= 0) {
            errors.push('Time to expiry must be positive');
        }
        
        if (params.risk_free_rate < 0 || params.risk_free_rate > 100) {
            errors.push('Risk-free rate must be between 0-100%');
        }
        
        if (!params.volatility || params.volatility <= 0) {
            errors.push('Volatility must be positive');
        }
        
        return errors;
    },

    /**
     * Show loading state
     * @param {string} elementId - Element ID
     * @param {string} message - Loading message
     */
    showLoading: function(elementId, message = 'Calculating...') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                </div>
                    <p class="text-muted">${message}</p>
                </div>
            `;
            element.classList.add('loading');
        }
    },

    /**
     * Show error message
     * @param {string} elementId - Element ID
     * @param {string} message - Error message
     */
    showError: function(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="results-error text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                    <h6>Calculation Error</h6>
                    <p class="text-muted">${message}</p>
                </div>
            `;
            element.classList.remove('loading');
        }
    },

    /**
     * Show success message
     * @param {string} elementId - Element ID
     * @param {string} message - Success message
     */
    showSuccess: function(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="alert alert-success d-flex align-items-center" role="alert">
                    <i class="fas fa-check-circle me-2"></i>
                    ${message}
        </div>
    `;
            element.classList.remove('loading');
        }
    },

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time (milliseconds)
     * @returns {Function} Debounced function
     */
    debounce: function(func, wait = CONFIG.DEBOUNCE_DELAY) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit (milliseconds)
     * @returns {Function} Throttled function
     */
    throttle: function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Get moneyness description
     * @param {number} moneyness - Moneyness ratio (S/K)
     * @returns {Object} Object containing description and CSS class
     */
    getMoneynessDescription: function(moneyness) {
        if (moneyness < 0.95) {
            return { text: 'Out-of-the-Money (OTM)', class: 'text-danger' };
        } else if (moneyness > 1.05) {
            return { text: 'In-the-Money (ITM)', class: 'text-success' };
        } else {
            return { text: 'At-the-Money (ATM)', class: 'text-warning' };
        }
    },

    /**
     * Calculate time to expiry in different units
     * @param {number} years - Years
     * @returns {Object} Object containing different time units
     */
    getTimeToExpiryBreakdown: function(years) {
        const days = Math.round(years * 365);
        const months = Math.round(years * 12);
        const weeks = Math.round(years * 52);
        
        return {
            years: years,
            months: months,
            weeks: weeks,
            days: days
        };
    },

    /**
     * Generate random color
     * @returns {string} Hexadecimal color code
     */
    generateRandomColor: function() {
        return '#' + Math.floor(Math.random()*16777215).toString(16);
    },

    /**
     * Deep clone object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    deepClone: function(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }
};

// API call functions library
const API = {
    /**
     * Generic API request function
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @param {string} method - HTTP method
     * @returns {Promise} API response
     */
    request: async function(endpoint, data = null, method = 'GET') {
        const url = CONFIG.API_BASE_URL + endpoint;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw new Error(`Network request failed: ${error.message}`);
        }
    },

    /**
     * Calculate option prices
     * @param {Object} params - Calculation parameters
     * @returns {Promise} Calculation results
     */
    calculateOption: function(params) {
        return this.request('/api/calculate-option', params, 'POST');
    },

    /**
     * Calculate implied volatility
     * @param {Object} params - Calculation parameters
     * @returns {Promise} Calculation results
     */
    calculateImpliedVolatility: function(params) {
        return this.request('/api/implied-volatility', params, 'POST');
    },

    /**
     * Generate Greeks chart
     * @param {Object} params - Chart parameters
     * @returns {Promise} Chart data
     */
    generateGreeksChart: function(params) {
        return this.request('/api/greeks-chart', params, 'POST');
    },

    /**
     * Generate price surface
     * @param {Object} params - Chart parameters
     * @returns {Promise} Chart data
     */
    generatePriceSurface: function(params) {
        return this.request('/api/price-surface', params, 'POST');
    },

    /**
     * Generate P&L analysis
     * @param {Object} params - Analysis parameters
     * @returns {Promise} Analysis results
     */
    generatePnLAnalysis: function(params) {
        return this.request('/api/pnl-analysis', params, 'POST');
    },

    /**
     * Perform sensitivity analysis
     * @param {Object} params - Analysis parameters
     * @returns {Promise} Analysis results
     */
    sensitivityAnalysis: function(params) {
        return this.request('/api/sensitivity-analysis', params, 'POST');
    }
};

// Chart utility functions library
const ChartUtils = {
    /**
     * Default Plotly configuration
     * @returns {Object} Configuration object
     */
    getDefaultConfig: function() {
        return {
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d', 'autoScale2d'],
            responsive: true,
            toImageButtonOptions: {
                format: 'png',
                filename: 'option_chart',
                height: 600,
                width: 800,
                scale: 2
            }
        };
    },

    /**
     * Default layout settings
     * @returns {Object} Layout object
     */
    getDefaultLayout: function() {
        return {
            font: {
                family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                size: 12,
                color: 'rgba(255, 255, 255, 0.8)'
            },
            margin: {
                l: 60,
                r: 30,
                t: 80,
                b: 60
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
            showlegend: true,
            legend: {
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                bordercolor: 'rgba(255, 255, 255, 0.2)',
                borderwidth: 1
            },
            xaxis: {
                gridcolor: 'rgba(255, 255, 255, 0.1)',
                zerolinecolor: 'rgba(255, 255, 255, 0.2)'
            },
            yaxis: {
                gridcolor: 'rgba(255, 255, 255, 0.1)',
                zerolinecolor: 'rgba(255, 255, 255, 0.2)'
            }
        };
    },

    /**
     * Render Plotly chart
     * @param {string} elementId - Chart container ID
     * @param {Object} chartData - Chart data
     * @param {Object} config - Chart configuration
     */
    renderChart: function(elementId, chartData, config = null) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error('Chart element not found:', elementId);
            return;
        }

        const plotConfig = config || this.getDefaultConfig();
        
        try {
            if (typeof chartData === 'string') {
                chartData = JSON.parse(chartData);
            }
            
            // Merge default layout
            const layout = Object.assign({}, this.getDefaultLayout(), chartData.layout || {});
            
            Plotly.newPlot(elementId, chartData.data, layout, plotConfig)
                .then(() => {
                    element.classList.remove('loading');
                })
                .catch(error => {
                    console.error('Error rendering chart:', error);
                    Utils.showError(elementId, 'Chart rendering failed: ' + error.message);
                });
        } catch (error) {
            console.error('Error parsing chart data:', error);
            Utils.showError(elementId, 'Chart data parsing failed: ' + error.message);
        }
    },

    /**
     * Create simple line chart
     * @param {Array} xData - X-axis data
     * @param {Array} yData - Y-axis data
     * @param {string} title - Chart title
     * @param {string} xTitle - X-axis title
     * @param {string} yTitle - Y-axis title
     * @returns {Object} Chart data object
     */
    createLineChart: function(xData, yData, title, xTitle, yTitle) {
        return {
            data: [{
                x: xData,
                y: yData,
                type: 'scatter',
                mode: 'lines',
                line: {
                    color: CONFIG.CHART_COLORS.primary,
                    width: 3
                },
                name: title
            }],
            layout: {
                title: {
                    text: title,
                    font: { size: 16, color: 'rgba(255, 255, 255, 0.9)' }
                },
                xaxis: { title: xTitle },
                yaxis: { title: yTitle }
            }
        };
    },

    /**
     * Create scatter chart
     * @param {Array} xData - X-axis data
     * @param {Array} yData - Y-axis data
     * @param {string} title - Chart title
     * @returns {Object} Chart data object
     */
    createScatterChart: function(xData, yData, title) {
        return {
            data: [{
                x: xData,
                y: yData,
                type: 'scatter',
                mode: 'markers',
                marker: {
                    color: CONFIG.CHART_COLORS.secondary,
                    size: 8,
                    opacity: 0.7
                },
                name: title
            }],
            layout: {
                title: {
                    text: title,
                    font: { size: 16, color: 'rgba(255, 255, 255, 0.9)' }
                }
            }
        };
    }
};

// Form utility functions library
const FormUtils = {
    /**
     * Get form data
     * @param {string} formId - Form ID
     * @returns {Object} Form data object
     */
    getFormData: function(formId) {
        const form = document.getElementById(formId);
        if (!form) {
            console.error('Form not found:', formId);
            return null;
        }
        
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            // Try to convert to number
            const numValue = parseFloat(value);
            data[key] = isNaN(numValue) ? value : numValue;
        }
        
        return data;
    },

    /**
     * Set form values
     * @param {string} formId - Form ID
     * @param {Object} values - Values object
     */
    setFormValues: function(formId, values) {
        const form = document.getElementById(formId);
        if (!form) {
            console.error('Form not found:', formId);
            return;
        }
        
        for (let [key, value] of Object.entries(values)) {
            const element = form.querySelector(`[name="${key}"], #${key}`);
            if (element) {
                element.value = value;
            }
        }
    },

    /**
     * Reset form to default values
     * @param {string} formId - Form ID
     * @param {Object} defaults - Default values object
     */
    resetForm: function(formId, defaults = {}) {
        const form = document.getElementById(formId);
        if (!form) {
            console.error('Form not found:', formId);
            return;
        }
        
        form.reset();
        
        if (Object.keys(defaults).length > 0) {
            this.setFormValues(formId, defaults);
        }
    },

    /**
     * Validate form
     * @param {string} formId - Form ID
     * @returns {Object} Validation results
     */
    validateForm: function(formId) {
        const form = document.getElementById(formId);
        if (!form) {
            return { valid: false, errors: ['Form does not exist'] };
        }
        
        const data = this.getFormData(formId);
        const errors = Utils.validateParameters(data);
        
        return {
            valid: errors.length === 0,
            errors: errors,
            data: data
        };
    }
};

// Notification system
const NotificationSystem = {
    /**
     * Show notification
     * @param {string} message - Message content
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {number} duration - Display duration (milliseconds)
     */
    show: function(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show notification-toast`;
        notification.innerHTML = `
            <i class="fas fa-${this.getIcon(type)} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Add to page
        const container = this.getContainer();
        container.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    },

    /**
     * Get icon class name
     * @param {string} type - Notification type
     * @returns {string} Icon class name
     */
    getIcon: function(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    },

    /**
     * Get or create notification container
     * @returns {Element} Notification container element
     */
    getContainer: function() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        return container;
    }
};

// Data storage utility
const DataStorage = {
    /**
     * Save data to local storage
     * @param {string} key - Key name
     * @param {*} data - Data
     */
    save: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save data:', error);
        }
    },

    /**
     * Load data from local storage
     * @param {string} key - Key name
     * @param {*} defaultValue - Default value
     * @returns {*} Loaded data
     */
    load: function(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Failed to load data:', error);
            return defaultValue;
        }
    },

    /**
     * Remove local storage data
     * @param {string} key - Key name
     */
    remove: function(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Failed to remove data:', error);
        }
    },

    /**
     * Clear all local storage data
     */
    clear: function() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Failed to clear data:', error);
        }
    }
};

// Performance monitoring
const PerformanceMonitor = {
    timers: {},
    
    /**
     * Start timer
     * @param {string} name - Timer name
     */
    start: function(name) {
        this.timers[name] = performance.now();
    },
    
    /**
     * End timer and return duration
     * @param {string} name - Timer name
     * @returns {number} Duration (milliseconds)
     */
    end: function(name) {
        if (this.timers[name]) {
            const duration = performance.now() - this.timers[name];
            delete this.timers[name];
            return duration;
        }
        return 0;
    },
    
    /**
     * Measure function execution time
     * @param {Function} func - Function to measure
     * @param {string} name - Measurement name
     * @returns {*} Function return value
     */
    measure: function(func, name = 'anonymous') {
        this.start(name);
        const result = func();
        const duration = this.end(name);
        console.log(`${name} executed in ${duration.toFixed(2)}ms`);
        return result;
    }
};

// Page initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('Quantitative Risk Management Platform loaded');
    
    // Initialize Bootstrap components
    initializeBootstrapComponents();
    
    // Initialize smooth scrolling
    initializeSmoothScrolling();
    
    // Initialize navbar scroll effect
    initializeNavbarScrollEffect();
    
    // Initialize form validation
    initializeFormValidation();
    
    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();
    
    // Initialize performance monitoring
    initializePerformanceMonitoring();
    
    // Load user preferences
    loadUserPreferences();
});

/**
 * Initialize Bootstrap components
 */
function initializeBootstrapComponents() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}

/**
 * Initialize smooth scrolling
 */
function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Update navbar active state
                updateNavbarActiveState(this.getAttribute('href'));
            }
        });
    });
}

/**
 * Initialize navbar scroll effect
 */
function initializeNavbarScrollEffect() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    const scrollHandler = Utils.throttle(function() {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(10, 10, 10, 0.95)';
            navbar.style.backdropFilter = 'blur(20px)';
        } else {
            navbar.style.background = 'rgba(10, 10, 10, 0.9)';
        }
    }, 16); // ~60fps
    
    window.addEventListener('scroll', scrollHandler);
}

/**
 * Update navbar active state
 * @param {string} targetHref - Target link
 */
function updateNavbarActiveState(targetHref) {
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === targetHref) {
            link.classList.add('active');
        }
    });
}

/**
 * Initialize form validation
 */
function initializeFormValidation() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!form.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
}

/**
 * Initialize keyboard shortcuts
 */
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter: Execute calculation
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const calculateBtn = document.querySelector('.btn-calculate');
            if (calculateBtn && !calculateBtn.disabled) {
                calculateBtn.click();
            }
        }
        
        // Escape: Reset form
        if (e.key === 'Escape') {
            const activeForm = document.querySelector('form:focus-within');
            if (activeForm) {
                const resetBtn = activeForm.querySelector('[type="reset"], .btn-secondary-modern');
                if (resetBtn) {
                    resetBtn.click();
                }
            }
        }
    });
}

/**
 * Initialize performance monitoring
 */
function initializePerformanceMonitoring() {
    // Monitor page load performance
    window.addEventListener('load', function() {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(`Page load completed, time: ${loadTime}ms`);
        
        // Can send to analytics service
        if (loadTime > 3000) {
            console.warn('Page load time too long, optimization needed');
        }
    });
}

/**
 * Load user preferences
 */
function loadUserPreferences() {
    const preferences = DataStorage.load('userPreferences', {
        theme: 'dark',
        precision: 6,
        currency: 'USD',
        language: 'en-US'
    });
    
    // Apply preferences
    applyUserPreferences(preferences);
}

/**
 * Apply user preferences
 * @param {Object} preferences - Preferences object
 */
function applyUserPreferences(preferences) {
    // Set number precision
    CONFIG.DEFAULT_PRECISION = preferences.precision || 6;
    
    // Other preference application logic
    console.log('User preferences applied:', preferences);
}

/**
 * Scroll to top
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

/**
 * Toggle fullscreen mode
 */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

/**
 * Export data as CSV
 * @param {Array} data - Data array
 * @param {string} filename - File name
 */
function exportToCSV(data, filename = 'option_data.csv') {
    if (!data || data.length === 0) {
        NotificationSystem.show('No data to export', 'warning');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    NotificationSystem.show('Data export successful', 'success');
}

/**
 * Print page
 */
function printPage() {
    window.print();
}

// Error handling
window.addEventListener('error', function(event) {
    console.error('JavaScript Error:', event.error);
    // Removed intrusive error notification for better user experience
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
    // Removed intrusive error notification for better user experience
});

// Export to global scope
window.Utils = Utils;
window.API = API;
window.ChartUtils = ChartUtils;
window.FormUtils = FormUtils;
window.NotificationSystem = NotificationSystem;
window.DataStorage = DataStorage;
window.PerformanceMonitor = PerformanceMonitor;
window.scrollToTop = scrollToTop;
window.toggleFullscreen = toggleFullscreen;
window.exportToCSV = exportToCSV;
window.printPage = printPage;