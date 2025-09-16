/**
 * Shared Theme Manager Utility
 * Consolidates theme management logic used across the application
 */

// Theme constants
const THEME_KEY = 'theme';
const THEME_COLORS = {
    light: '#edcfcf',
    dark: '#141416'
};

/**
 * Safely get/set localStorage with fallback
 */
const safeStorage = {
    getItem: (key) => {
        try {
            return localStorage.getItem(key);
        } catch (_) {
            return null;
        }
    },
    setItem: (key, value) => {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (_) {
            return false;
        }
    }
};

/**
 * Update meta theme-color for mobile status bar
 * Uses multiple fallback strategies for reliability
 */
const updateMetaThemeColor = (theme) => {
    const metaTheme = document.getElementById('theme-color-meta') ||
                     document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.light);
        return true;
    }
    return false;
};

/**
 * Apply theme to document with optional persistence
 */
const applyTheme = (theme, persist = true) => {
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) {
        safeStorage.setItem(THEME_KEY, theme);
    }
    updateMetaThemeColor(theme);
};

/**
 * Get current theme from document or determine from system preference
 */
const getCurrentTheme = () => {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') return attr;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
};

/**
 * Initialize theme on app startup
 * Determines theme from localStorage or system preference and applies it
 */
export const initializeTheme = () => {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    let theme = 'light';

    const saved = safeStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') {
        theme = saved;
    } else {
        theme = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', theme);

    // CRITICAL: Update meta theme-color immediately for mobile status bar
    // Try immediate update, then fallback strategies
    if (!updateMetaThemeColor(theme)) {
        // Fallback 1: DOMContentLoaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => updateMetaThemeColor(theme));
        } else {
            // Fallback 2: nextTick via setTimeout
            setTimeout(() => updateMetaThemeColor(theme), 0);
        }
    }

    return theme;
};

/**
 * Setup theme toggle functionality for chat interface
 * Returns object with methods for managing theme toggle button
 */
export const setupThemeToggle = (themeButton) => {
    const setIcon = (theme) => {
        themeButton.innerHTML = theme === 'dark'
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5f5f8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1a1d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
        themeButton.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    };

    const toggle = () => {
        const current = getCurrentTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        setIcon(next);
        return next;
    };

    // Initialize icon based on current theme
    const currentTheme = getCurrentTheme();
    setIcon(currentTheme);

    return {
        setIcon,
        toggle,
        getCurrentTheme: getCurrentTheme
    };
};

// Export individual functions for flexibility
export {
    applyTheme,
    getCurrentTheme,
    THEME_COLORS,
    THEME_KEY
};