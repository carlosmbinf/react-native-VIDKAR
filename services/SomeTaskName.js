module.exports = async (taskData) => {
    // Aquí va la lógica de tu tarea en segundo plano
    console.log('Tarea en segundo plano ejecutándose...');
    console.log('Datos recibidos:', taskData);

    // Ejemplo: Simular una tarea que tarda 5 segundos
    while(true) {
        // console.log("reintentando");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
    }

    console.log('Tarea en segundo plano completada.');
  };