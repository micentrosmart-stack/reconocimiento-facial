const video = document.getElementById('video');

// 1. Cargamos SOLO el modelo que ya subiste para evitar errores 404
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('models')
]).then(startVideo);

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => {
      video.srcObject = stream;
    })
    .catch(err => {
      console.error("Error al acceder a la cámara. Asegúrate de usar HTTPS:", err);
      alert("Error: No se pudo acceder a la cámara.");
    });
}

video.addEventListener('play', () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  
  // Ajustamos el canvas al tamaño real del video en pantalla
  const displaySize = { width: video.clientWidth, height: video.clientHeight };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    // Detectamos rostros usando el modelo Tiny (el que tienes en tu carpeta models)
    const detections = await faceapi.detectAllFaces(
      video, 
      new faceapi.TinyFaceDetectorOptions()
    );
    
    // Dibujamos el cuadro azul sobre el rostro detectado
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
  }, 100);
});
