const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw-7eZ3IvjY_I6X_3cPpaD1j05muWh74uFNjHO2tM6HDObtw5gVX-FIzB9SWnjkH--F/exec";
const video = document.getElementById('video');
let faceMatcher = null;
let tempPerson = null;

// 1. Cargar modelos y arrancar
Promise.all([
    // Usamos la ruta exacta que veo en tus capturas de GitHub
    faceapi.nets.tinyFaceDetector.loadFromUri('mi%20proyecto%20facial/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('mi%20proyecto%20facial/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('mi%20proyecto%20facial/models')
]).then(() => {
    console.log("Modelos cargados con éxito");
    startVideo();
    descargarRostrosDesdeNube(); // Carga la base de datos al iniciar
}).catch(err => {
    document.getElementById('status').innerHTML = "Error cargando modelos: Verifica las rutas en GitHub";
    console.error(err);
});

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => {
            video.srcObject = stream;
            document.getElementById('status').innerHTML = "Cámara activa. Buscando rostros...";
        })
        .catch(err => {
            console.error("Error al acceder a la cámara:", err);
            document.getElementById('status').innerHTML = "Error: No se pudo acceder a la cámara";
        });
}

// 2. Función para descargar rostros del Servidor (Google Sheets)
async function descargarRostrosDesdeNube() {
    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const labeledDescriptors = data.map(p => {
                // Convertimos el texto del descriptor de vuelta a números (Float32Array)
                const desc = new Float32Array(JSON.parse(p.faceDescriptor));
                return new faceapi.LabeledFaceDescriptors(p.name, [desc]);
            });
            // 0.6 es el umbral de confianza (ajustable)
            faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
            console.log("Servidor sincronizado: " + data.length + " rostros cargados.");
        }
    } catch (e) {
        console.warn("Aún no hay rostros en el servidor o error de conexión.");
    }
}

// 3. Lógica de Reconocimiento en tiempo real
video.addEventListener('play', () => {
    const canvas = document.getElementById('overlay'); // Asegúrate de tener un <canvas id="overlay"> en tu HTML
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();
        
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        if (faceMatcher && resizedDetections.length > 0) {
            resizedDetections.forEach(detection => {
                const result = faceMatcher.findBestMatch(detection.descriptor);
                const label = result.toString();
                const drawBox = new faceapi.draw.DrawBox(detection.detection.box, { label: label });
                drawBox.draw(canvas);
            });
        }
    }, 200);
});

// 4. Funciones para los botones de la interfaz
window.prepararRegistro = function() {
    const name = document.getElementById('personName').value;
    const role = document.getElementById('personRole').value;
    
    if(!name || !role) return alert("Por favor, ingresa nombre y cargo.");
    
    tempPerson = { name, role, id: Date.now() };
    document.getElementById('captureFaceBtn').disabled = false;
    alert("Datos listos. Ahora presiona 'Capturar y Enviar'");
};

window.enviarANube = async function() {
    const statusLabel = document.getElementById('status');
    statusLabel.innerHTML = "Analizando rostro y enviando a Google...";
    
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (detection && tempPerson) {
        const payload = {
            id: tempPerson.id,
            name: tempPerson.name,
            role: tempPerson.role,
            faceDescriptor: JSON.stringify(Array.from(detection.descriptor))
        };

        try {
            // Enviamos los datos a tu AppScript
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // Necesario para Google Apps Script
                body: JSON.stringify(payload)
            });

            statusLabel.innerHTML = "✅ Registro exitoso en el Servidor";
            document.getElementById('personName').value = "";
            document.getElementById('personRole').value = "";
            
            // Recargamos la base de datos local para que te reconozca de inmediato
            setTimeout(descargarRostrosDesdeNube, 2000);
            
        } catch (error) {
            statusLabel.innerHTML = "❌ Error al subir datos";
            console.error(error);
        }
    } else {
        statusLabel.innerHTML = "❌ No se detectó rostro claramente";
    }
};
