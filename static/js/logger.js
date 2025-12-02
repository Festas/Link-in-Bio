/**
 * Debug-aware logging utility for Link-in-Bio application.
 * Wraps console methods to only output in development environments.
 * 
 * Usage:
 *   import { logger } from './logger.js';
 *   logger.log('Debug message');
 *   logger.error('Error message');
 *   logger.warn('Warning message');
 *   logger.info('Info message');
 */

// Determine if we're in debug mode
const DEBUG = window.location.hostname === 'localhost' || 
              window.location.hostname === '127.0.0.1' ||
              window.location.hostname.includes('.local') ||
              window.location.search.includes('debug=true');

/**
 * Logger utility that wraps console methods.
 * Only outputs in debug mode (localhost, 127.0.0.1, or with ?debug=true).
 */
const logger = {
    /**
     * Log a debug message (only in debug mode)
     * @param {...any} args - Arguments to log
     */
    log(...args) {
        if (DEBUG) {
            console.log(...args);
        }
    },

    /**
     * Log an error message (always outputs, errors are important)
     * @param {...any} args - Arguments to log
     */
    error(...args) {
        // Errors are always logged for debugging production issues
        console.error(...args);
    },

    /**
     * Log a warning message (only in debug mode)
     * @param {...any} args - Arguments to log
     */
    warn(...args) {
        if (DEBUG) {
            console.warn(...args);
        }
    },

    /**
     * Log an info message (only in debug mode)
     * @param {...any} args - Arguments to log
     */
    info(...args) {
        if (DEBUG) {
            console.info(...args);
        }
    },

    /**
     * Log with a group (only in debug mode)
     * @param {string} label - Group label
     * @param {Function} fn - Function to execute within the group
     */
    group(label, fn) {
        if (DEBUG) {
            console.group(label);
            fn();
            console.groupEnd();
        }
    },

    /**
     * Log a table (only in debug mode)
     * @param {any} data - Data to display as table
     */
    table(data) {
        if (DEBUG) {
            console.table(data);
        }
    },

    /**
     * Start a timer (only in debug mode)
     * @param {string} label - Timer label
     */
    time(label) {
        if (DEBUG) {
            console.time(label);
        }
    },

    /**
     * End a timer (only in debug mode)
     * @param {string} label - Timer label
     */
    timeEnd(label) {
        if (DEBUG) {
            console.timeEnd(label);
        }
    },

    /**
     * Check if debug mode is enabled
     * @returns {boolean} True if in debug mode
     */
    isDebugMode() {
        return DEBUG;
    }
};

// Export for ES modules
export { logger, DEBUG };

// Also make available globally for non-module scripts
window.logger = logger;
window.DEBUG = DEBUG;
