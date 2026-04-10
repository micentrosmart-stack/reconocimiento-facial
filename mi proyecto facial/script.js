// URL ACTUALIZADA
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxVolkV_64kTIVVEYVSyk9UDTpxyFEk08pqkxCxSyVVO5zRJdJ_xHXrgIIPLH9e5uuhlA/exec";

const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
let faceMatcher = null;

// 1. INICIO: Cargar modelos y cámara
async function iniciarSistema() {
    try {
        // Usamos la ruta de tu carpeta en GitHub
        const MODEL_URL = 'mi%20proyecto%20facial/models';
        
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        video.srcObject = stream;
        
        // Cargar rostros existentes del servidor
        cargarRostrosServidor();
        
        // Lanzar detección continua
        procesarDeteccion();
    } catch (err) {
        console.error("Error al iniciar:", err);
    }
}

// 2. DETECCIÓN: Dibuja el cuadro azul siempre
async function procesarDeteccion() {
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        resizedDetections.forEach(detection => {
            let label = "Desconocido";
            
            // Si el servidor ya nos envió datos, intentamos reconocer
            if (faceMatcher) {
                const result = faceMatcher.findBestMatch(detection.descriptor);
                label = result.toString();
            }
            
            // Dibuja el cuadro azul con el nombre o "Desconocido"
            const drawBox = new faceapi.draw.DrawBox(detection.detection.box, { label: label });
            drawBox.draw(canvas);
        });
    }, 100); // 100ms para que sea muy fluido
}

// 3. REGISTRO: Enviar datos al Google Sheets
async function enviarANube() {
    const name = document.getElementById('personName').value;
    const role = document.getElementById('personRole').value;
    
    if (!name || !role) return alert("Ingresa nombre y cargo");

    document.getElementById('status').innerHTML = "Capturando rostro...";
    
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (detection) {
        document.getElementById('status').innerHTML = "Enviando a Google Sheets...";
        
        const payload = {
            id: Date.now().toString(),
            name: name,
            role: role,
            faceDescriptor: JSON.stringify(Array.from(detection.descriptor))
        };

        // Enviar datos (usamos mode: 'no-cors' para evitar bloqueos)
        fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });

        document.getElementById('status').innerHTML = "✅ Enviado. Revisa tu Excel.";
        
        // Recargar la memoria de la IA tras 3 segundos
        setTimeout(cargarRostrosServidor, 3000);
    } else {
        alert("No se detectó ningún rostro");
    }
}

// 4. SINCRONIZACIÓN: Traer datos de la nube
async function cargarRostrosServidor() {
    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const labeled = data.map(p => {
                const desc = new Float32Array(JSON.parse(p.faceDescriptor));
                return new faceapi.LabeledFaceDescriptors(p.name, [desc]);
            });
            faceMatcher = new faceapi.FaceMatcher(labeled, 0.6);
            console.log("Base de datos sincronizada");
        }
    } catch (e) {
        console.log("Servidor sin datos aún.");
    }
}

iniciarSistema();
