function ThemeToggle({ theme, onToggle, compact = false }) {
    const temaSiguiente = theme === 'dark' ? 'claro' : 'oscuro';

    return (
        <button
            type="button"
            className={`theme-toggle${compact ? ' compact' : ''}`}
            onClick={onToggle}
            aria-label={`Activar modo ${temaSiguiente}`}
            aria-pressed={theme === 'dark'}
            title={`Cambiar a modo ${temaSiguiente}`}
        >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
            <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
    );
}

export default ThemeToggle;
