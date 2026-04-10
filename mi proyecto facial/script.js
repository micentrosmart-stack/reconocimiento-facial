// NUEVA URL DE TU APPSCRIPT
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbytrImpOns8-gKUbctOLHSKtD_l5WTdozHQoIxgNHQl1i1UdtfzyCDByqgTnRn8LhkaZg/exec";

async function enviarANube() {
    const statusLabel = document.getElementById('status');
    statusLabel.innerHTML = "Analizando rostro...";
    
    // Detectamos el rostro actual
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (detection && tempPerson) {
        statusLabel.innerHTML = "Conectando con Google Sheets...";
        
        const payload = {
            id: tempPerson.id,
            name: tempPerson.name,
            role: tempPerson.role,
            faceDescriptor: JSON.stringify(Array.from(detection.descriptor))
        };

        try {
            // USAMOS FETCH CON MODO NO-CORS PARA EVITAR BLOQUEOS
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', 
                cache: 'no-cache',
                body: JSON.stringify(payload)
            });

            // Al usar 'no-cors', no podemos leer la respuesta de Google, 
            // pero si no hay error, asumimos éxito tras un pequeño delay.
            statusLabel.innerHTML = "✅ ¡Enviado! Revisa tu Google Sheets.";
            console.log("Datos enviados a la URL:", SCRIPT_URL);
            
            // Limpiar campos
            document.getElementById('personName').value = "";
            document.getElementById('personRole').value = "";
            
            // Recargamos la base de datos para que el reconocimiento empiece a funcionar
            setTimeout(descargarRostrosDesdeNube, 3000);
            
        } catch (error) {
            statusLabel.innerHTML = "❌ Error de conexión";
            console.error("Error detallado:", error);
        }
    } else {
        statusLabel.innerHTML = "❌ No hay rostro o faltan datos";
    }
}
