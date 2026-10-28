import { Component } from 'react';

class ApplicationErrorBoundary extends Component {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error) {
        console.error('StudyHub no pudo renderizar una pantalla.', error?.name || 'Error');
    }

    render() {
        if (this.state.hasError) {
            return (
                <main className="application-error" role="alert">
                    <h1>No pudimos mostrar esta pantalla</h1>
                    <p>Intenta cargar StudyHub de nuevo.</p>
                    <button type="button" onClick={() => window.location.reload()}>
                        Volver a cargar
                    </button>
                </main>
            );
        }

        return this.props.children;
    }
}

export default ApplicationErrorBoundary;
