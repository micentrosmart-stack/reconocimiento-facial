// Mantenemos tu URL de AppScript
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxVolkV_64kTIVVEYVSyk9UDTpxyFEk08pqkxCxSyVVO5zRJdJ_xHXrgIIPLH9e5uuhlA/exec";

const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
let faceMatcher = null;

// 1. ARRANCAR CÁMARA PRIMERO (Para que el cuadro azul vuelva)
async function iniciarSistema() {
    try {
        // Usamos la ruta que YA te funcionaba (con espacios)
        const path = 'mi%20proyecto%20facial/models'; 
        
        await faceapi.nets.tinyFaceDetector.loadFromUri(path);
        await faceapi.nets.faceLandmark68Net.loadFromUri(path);
        await faceapi.nets.faceRecognitionNet.loadFromUri(path);
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        video.srcObject = stream;
        
        // Lanzamos la detección inmediatamente
        procesarDeteccion();
        
        // LUEGO intentamos conectar al servidor (sin bloquear la cámara)
        cargarDatosServidor();

    } catch (err) {
        console.error("Error al cargar modelos:", err);
        document.getElementById('status').innerHTML = "Error cargando modelos.";
    }
}

// 2. DETECCIÓN (El cuadro azul que ya te funcionaba)
async function procesarDeteccion() {
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();

        const resized = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        resized.forEach(detection => {
            let label = "Desconocido";
            if (faceMatcher) {
                const result = faceMatcher.findBestMatch(detection.descriptor);
                label = result.toString();
            }
            // Esto dibuja el cuadro azul
            new faceapi.draw.DrawBox(detection.detection.box, { label }).draw(canvas);
        });
    }, 150);
}

// 3. ENVÍO A GOOGLE SHEETS (Modificado para que no falle)
async function enviarANube() {
    const name = document.getElementById('personName').value;
    const role = document.getElementById('personRole').value;
    
    if (!name) return alert("Ingresa un nombre");

    document.getElementById('status').innerHTML = "Capturando...";
    
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (detection) {
        document.getElementById('status').innerHTML = "Enviando a Google...";
        
        const payload = {
            id: Date.now().toString(),
            name: name,
            role: role,
            faceDescriptor: JSON.stringify(Array.from(detection.descriptor))
        };

        // Enviamos y NO esperamos respuesta para que la app no se congele
        fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });

        document.getElementById('status').innerHTML = "✅ Registro enviado al Excel";
        // Recargar la memoria de la IA tras 4 segundos
        setTimeout(cargarDatosServidor, 4000);
    } else {
        alert("No se detectó rostro.");
    }
}

async function cargarDatosServidor() {
    try {
        const res = await fetch(SCRIPT_URL);
        const data = await res.json();
        if (data && data.length > 0) {
            const labeled = data.map(p => {
                const desc = new Float32Array(JSON.parse(p.faceDescriptor));
                return new faceapi.LabeledFaceDescriptors(p.name, [desc]);
            });
            faceMatcher = new faceapi.FaceMatcher(labeled, 0.6);
        }
    } catch (e) { console.log("Servidor aún sin datos."); }
}

iniciarSistema();
