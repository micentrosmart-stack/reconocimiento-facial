const video = document.getElementById('video');
const canvas = document.getElementById('overlay');

async function iniciarPaso1() {
    try {
        // Usamos la ruta exacta con los espacios que tienes en GitHub
        const path = 'mi%20proyecto%20facial/models'; 
        
        console.log("Cargando modelos...");
        await faceapi.nets.tinyFaceDetector.loadFromUri(path);
        await faceapi.nets.faceLandmark68Net.loadFromUri(path);
        
        console.log("Modelos cargados. Abriendo cámara...");
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        video.srcObject = stream;
        
        // Iniciamos el bucle de dibujo
        detectarRostro();
    } catch (err) {
        console.error("Fallo en Paso 1:", err);
        alert("Error al cargar modelos: " + err);
    }
}

function detectarRostro() {
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        // Usamos el detector más rápido (TinyFace)
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
        
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        resizedDetections.forEach(detection => {
            // Dibujamos el cuadro azul con el texto "DETECTADO"
            new faceapi.draw.DrawBox(detection.box, { label: 'DETECTADO' }).draw(canvas);
        });
    }, 100); // 100 milisegundos para que sea fluido
}

// Ejecutar
iniciarPaso1();
