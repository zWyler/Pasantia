import './PendingModule.css';

function PendingModule({ icon, title, description }) {
    return (
        <section className="pending-module" aria-labelledby="pending-title">
            <div className="pending-illustration" aria-hidden="true">{icon}</div>
            <span className="pending-label">Módulo pendiente</span>
            <h1 id="pending-title">{title}</h1>
            <p>{description}</p>
            <span className="pending-note">Esta sección estará disponible en una próxima etapa.</span>
        </section>
    );
}

export default PendingModule;
