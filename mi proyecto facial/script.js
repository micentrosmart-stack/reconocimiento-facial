const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxVolkV_64kTIVVEYVSyk9UDTpxyFEk08pqkxCxSyVVO5zRJdJ_xHXrgIIPLH9e5uuhlA/exec";
const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
let faceMatcher = null;

// Forzamos la carga de modelos con una ruta más segura
async function iniciarApp() {
    const status = document.getElementById('status');
    status.innerHTML = "Cargando modelos desde GitHub...";

    try {
        // Intentamos cargar los modelos. Si falla aquí, el cuadro azul nunca saldrá.
        // He simplificado la ruta. Si tu carpeta en GitHub se llama "mi proyecto facial", 
        // intenta cambiarle el nombre a "proyecto" para evitar errores de espacios.
        const path = 'mi%20proyecto%20facial/models'; 
        
        await faceapi.nets.tinyFaceDetector.loadFromUri(path);
        await faceapi.nets.faceLandmark68Net.loadFromUri(path);
        await faceapi.nets.faceRecognitionNet.loadFromUri(path);
        
        status.innerHTML = "Modelos listos. Iniciando cámara...";
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        video.srcObject = stream;
        
        // Iniciamos la detección de inmediato para que aparezca el cuadro azul
        procesarDeteccion();
        // Cargamos la base de datos en segundo plano
        cargarBaseDeDatos();

    } catch (err) {
        status.innerHTML = "❌ ERROR: No se pudieron cargar los modelos de GitHub.";
        console.error(err);
    }
}

async function procesarDeteccion() {
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvas, displaySize);

    // Este bucle dibuja el cuadro azul
    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();

        const resized = faceapi.resizeResults(detections, displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (resized.length > 0) {
            resized.forEach(detection => {
                let label = "Buscando...";
                if (faceMatcher) {
                    const result = faceMatcher.findBestMatch(detection.descriptor);
                    label = result.toString();
                }
                // DIBUJO DEL CUADRO
                new faceapi.draw.DrawBox(detection.detection.box, { label }).draw(canvas);
            });
        }
    }, 150);
}

// Función para enviar datos (CORREGIDA PARA GOOGLE)
async function enviarANube() {
    const name = document.getElementById('personName').value;
    const role = document.getElementById('personRole').value;
    
    if (!name) return alert("Ingresa un nombre");

    document.getElementById('status').innerHTML = "Capturando rostro...";
    
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (detection) {
        // El secreto para que Google Sheets escriba es enviar un JSON limpio
        const datos = {
            id: Date.now().toString(),
            name: name,
            role: role,
            faceDescriptor: JSON.stringify(Array.from(detection.descriptor))
        };

        // Enviamos usando el método más compatible
        fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Evita bloqueos de seguridad
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        document.getElementById('status').innerHTML = "✅ ¡Enviado! Revisa tu Excel.";
        setTimeout(cargarBaseDeDatos, 3000);
    } else {
        alert("No se ve ningún rostro frente a la cámara");
    }
}

async function cargarBaseDeDatos() {
    try {
        const res = await fetch(SCRIPT_URL);
        const data = await res.json();
        if (data.length > 0) {
            const labeled = data.map(p => {
                const desc = new Float32Array(JSON.parse(p.faceDescriptor));
                return new faceapi.LabeledFaceDescriptors(p.name, [desc]);
            });
            faceMatcher = new faceapi.FaceMatcher(labeled, 0.6);
        }
    } catch (e) { console.log("Servidor vacío"); }
}

iniciarApp();
