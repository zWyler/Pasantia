import { useEffect, useState } from 'react';

function App() {
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/test')
      .then((respuesta) => respuesta.json())
      .then((datos) => setMensaje(datos.message))
      .catch((error) => console.error('Error:', error));
  }, []);

  return (
    <div>
      <h1>StudyHub</h1>
      <p>{mensaje}</p>
    </div>
  );
}

export default App;