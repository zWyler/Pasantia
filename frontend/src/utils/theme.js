export function resolveTheme(savedTheme, prefersDark) {
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return prefersDark ? 'dark' : 'light';
}

export function initialTheme() {
    let savedTheme = null;
    try {
        savedTheme = window.localStorage.getItem('studyhub-theme');
    } catch {
        // A blocked storage API should not prevent the app from starting.
    }

    let prefersDark = false;
    try {
        prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
        // Fall back to the light theme when the preference API is unavailable.
    }
    return resolveTheme(savedTheme, prefersDark);
}

export function persistTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
        window.localStorage.setItem('studyhub-theme', theme);
    } catch {
        // Theme still changes for this session when storage is unavailable.
    }
}
