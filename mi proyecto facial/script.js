const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const status = document.getElementById('status') || document.body; // Usa el div status o el cuerpo

async function iniciarDiagnostico() {
    try {
        console.log("Iniciando prueba...");
        
        // 1. Intentar acceder a la cámara primero
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        video.srcObject = stream;
        video.play();
        console.log("Cámara activa");

        // 2. Ruta de modelos (Prueba con la ruta que tienes)
        // Si tu carpeta tiene espacios, el navegador a veces prefiere el espacio real " " 
        // o el código "%20". Probemos con el estándar.
        const path = 'mi%20proyecto%20facial/models'; 
        
        console.log("Cargando modelo de detección...");
        await faceapi.nets.tinyFaceDetector.loadFromUri(path);
        console.log("Modelo cargado con éxito");

        // 3. Iniciar bucle de dibujo
        dibujarCuadro();

    } catch (err) {
        // ESTO APARECERÁ EN TU PANTALLA SI FALLA
        const errorDiv = document.createElement('div');
        errorDiv.style.color = "red";
        errorDiv.style.background = "white";
        errorDiv.style.padding = "10px";
        errorDiv.style.position = "fixed";
        errorDiv.style.top = "0";
        errorDiv.innerHTML = "<b>ERROR:</b> " + err.message + "<br>Ruta: " + 'mi%20proyecto%20facial/models';
        document.body.appendChild(errorDiv);
        console.error(err);
    }
}

function dibujarCuadro() {
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
        const resized = faceapi.resizeResults(detections, displaySize);
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        resized.forEach(det => {
            // Dibujo manual del cuadro para asegurar que lo veamos
            ctx.strokeStyle = "#0000FF"; // Azul
            ctx.lineWidth = 4;
            ctx.strokeRect(det.box.x, det.box.y, det.box.width, det.box.height);
            console.log("Rostro detectado!");
        });
    }, 100);
}

iniciarDiagnostico();
