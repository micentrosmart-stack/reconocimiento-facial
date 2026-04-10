const video = document.getElementById('video');

// 1. Cargamos todos los modelos necesarios
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('models')
]).then(startVideo);

async function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => video.srcObject = stream)
    .catch(err => console.error(err));
    
  // 2. Iniciamos el reconocimiento cuando cargue el video
  recognizeFaces();
}

async function recognizeFaces() {
  // AQUÍ REGISTRAS LOS ROSTROS AUTORIZADOS
  // Debes tener fotos de estas personas en una carpeta llamada 'img'
  const labeledDescriptors = await loadLabeledImages();
  const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6); // 0.6 es la precisión

  video.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

      const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor));

      results.forEach((result, i) => {
        const box = resizedDetections[i].detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
        drawBox.draw(canvas);
        
        // Lógica de Acceso
        if (result.label !== 'unknown') {
           console.log("ACCESO CONCEDIDO A: " + result.label);
           // Aquí podrías disparar un sonido o abrir una puerta
        }
      });
    }, 200);
  });
}

function loadLabeledImages() {
  // Nombres de las personas y sus fotos
  const labels = ['Marcos Parada', 'Guardia_Turno_1']; 
  return Promise.all(
    labels.map(async label => {
      const descriptions = [];
      for (let i = 1; i <= 2; i++) { // Necesitas 2 fotos por persona: 1.jpg y 2.jpg
        const img = await faceapi.fetchImage(`img/${label}/${i}.jpg`);
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        descriptions.push(detections.descriptor);
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}
