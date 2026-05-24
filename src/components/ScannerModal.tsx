import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Loader, Upload, AlertCircle, RefreshCw } from 'lucide-react';

interface ScannerModalProps {
  onClose: () => void;
  onScanSuccess: (bookData: any) => void;
}

export default function ScannerModal({ onClose, onScanSuccess }: ScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeRequestId = useRef<number>(0);
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [cameraActive, setCameraActive] = useState(false);

  // Drag and drop / file upload fallback
  const [isDragActive, setIsDragActive] = useState(false);

  // Pre-baked list of funny/reassuring processing thoughts during the Gemini API call
  const thoughts = [
    "Gemini sta ispezionando il codice a barre...",
    "Ricerca dei dettagli dell'opera in corso...",
    "OCR della copertina... Sto leggendo i caratteri!",
    "Consultando la biblioteca virtuale di Alessandria...",
    "Quasi fatto! Ottimizzo i dati in lingua italiana...",
    "Catalogazione dell'opera e calcolo del genere..."
  ];

  useEffect(() => {
    let intervalId: any;
    if (isLoading) {
      setLoadingMessage(thoughts[0]);
      let idx = 1;
      intervalId = setInterval(() => {
        setLoadingMessage(thoughts[idx % thoughts.length]);
        idx++;
      }, 3500);
    }
    return () => clearInterval(intervalId);
  }, [isLoading]);

  // Start the Webcam
  const startCamera = async () => {
    setError(null);
    setIsCameraLoading(true);
    setCameraActive(false);

    const reqId = ++activeRequestId.current;

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setStream(null);

      let mediaStream: MediaStream;
      try {
        // 1. Try optimal back camera constraints: environment, widescreen ideal
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (firstErr) {
        console.warn("[Camera] Optimal environment parameters failed, trying generic environment...", firstErr);
        try {
          // 2. Try standard back camera
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false,
          });
        } catch (secondErr) {
          console.warn("[Camera] Environment camera failed, trying any video camera...", secondErr);
          // 3. Try ultimate fallback of any camera stream (e.g. laptop webcam, front cam, default usb)
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      // Check if this is still the active/latest request to avoid racing
      if (reqId !== activeRequestId.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setCameraActive(true);
      }
    } catch (err: any) {
      if (reqId !== activeRequestId.current) return;
      console.error("[Camera] All camera access attempts failed:", err);
      setError(
        window.self !== window.top 
          ? "Impossibile avviare la fotocamera dentro l'iframe di anteprima. Clicca su 'Apri in una Nuova Scheda' per farle funzionare!"
          : "Impossibile avviare la fotocamera. Verifica che i permessi nel browser siano attivi e che non sia già in uso da un'altra app."
      );
    } finally {
      if (reqId === activeRequestId.current) {
        setIsCameraLoading(false);
      }
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      activeRequestId.current = 999999;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Stop current camera tracks
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setCameraActive(false);
  };

  // Capture current webcam frame and POST to Gemini Scan API
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setIsLoading(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Match canvas sizes to the stream snapshot size
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // Draw the video frame to the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Extract Base64 PNG image from the canvas
      const base64Image = canvas.toDataURL('image/jpeg', 0.85);

      // Stop the webcam feed to save bandwidth/camera resource
      stopCamera();

      // Submit base64 to server API
      const res = await fetch('/api/book/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Scansione fallita.");
      }

      // Hand back the parsed metadata object and close scanner
      onScanSuccess(data.book);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Errore sconosciuto durante la scansione.");
      // Restart the camera so they can retry
      startCamera();
    } finally {
      setIsLoading(false);
    }
  };

  // Direct mock OCR if upload file instead of capture webcam
  const processImageFile = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);

      // Turn file into base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        
        try {
          stopCamera();
          const res = await fetch('/api/book/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Lettura file fallita.");
          }
          onScanSuccess(data.book);
        } catch (err: any) {
          setError(err.message || "Errore d'analisi sul file caricato.");
          startCamera();
        } finally {
          setIsLoading(false);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError("Impossibile caricare il file immagine.");
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div id="scanner-modal" className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-md">
      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative">
        
        {/* Modal Header */}
        <div className="p-5 flex justify-between items-center bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Camera className="text-red-500 w-5 h-5 animate-pulse" />
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">AI Scanner di Libri</h3>
          </div>
          <button
            id="close-scanner"
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition p-1.5 rounded-full hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* AIScanner Screen Section */}
          <div className="relative">
            {isLoading ? (
              // Processing screen
              <div className="w-full aspect-video rounded-xl bg-zinc-900/60 border border-zinc-850 flex flex-col items-center justify-center p-6 space-y-4 text-center">
                <div className="relative">
                  <Loader className="w-12 h-12 text-red-600 animate-spin" />
                  <Camera className="w-5 h-5 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                </div>
                <div className="space-y-1 text-center max-w-xs">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Analisi con Gemini AI...</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-mono animate-pulse">{loadingMessage}</p>
                </div>
              </div>
            ) : cameraActive ? (
              // Webcam active feed screen
              <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-zinc-800 bg-black shadow-lg">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                
                {/* Visual red laser line animation mimicking physical scanner */}
                <div className="absolute inset-x-0 h-0.5 bg-red-500 bg-opacity-70 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-[bounce_2.5s_infinite] top-[10%]"></div>
                
                {/* Target Scan Box Overlay */}
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="w-[80%] h-[70%] border-2 border-dashed border-white/50 rounded-lg relative pointer-events-none">
                    {/* Corner decorators */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-red-500"></div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-red-500"></div>
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-red-500"></div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-red-500"></div>
 
                    {/* Laser guidance text */}
                    <div className="absolute inset-x-0 bottom-4 text-center text-[10px] text-white/80 bg-black/60 py-1 px-3 mx-10 rounded-full select-none backdrop-blur-xs font-mono">
                      Inquadra Codice EAN o Copertina
                    </div>
                  </div>
                </div>
 
                {/* Instant capture Button */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <button
                    id="capture-frame"
                    onClick={handleCapture}
                    className="bg-red-600 hover:bg-red-700 active:scale-95 text-white py-2 px-6 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-900/40 flex items-center gap-2 transition duration-150"
                  >
                    <Camera className="w-4 h-4" /> Scansiona Ora
                  </button>
                </div>
              </div>
            ) : isCameraLoading ? (
              // Webcam initializing / loading screen
              <div className="w-full aspect-video rounded-xl bg-zinc-900/40 border border-zinc-850 flex flex-col items-center justify-center p-6 text-center text-zinc-500">
                <Loader className="w-8 h-8 text-red-500 animate-spin mb-3" />
                <p className="text-sm font-semibold text-zinc-350">Richiesta Accesso Fotocamera...</p>
                <p className="text-[11px] text-zinc-500 max-w-sm mt-1.5 leading-relaxed">
                  Consenti l'uso della fotocamera se richiesto dal browser per scansionare libri con l'IA.
                </p>
              </div>
            ) : error ? (
              // Specific, clean contextual error state
              <div className="w-full aspect-video rounded-xl bg-zinc-900/60 border border-zinc-850 flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest leading-none mb-1.5">Fotocamera non Disponibile</h4>
                
                {window.self !== window.top ? (
                  <>
                    <p className="text-[11px] text-zinc-400 max-w-sm leading-relaxed mb-4">
                      Sei dentro l'iframe di anteprima di AI Studio. Di solito i browser bloccano l'hardware nei frame integrati.
                    </p>
                    <div className="bg-amber-950/20 border border-amber-800/30 p-2 text-[10px] text-amber-200 rounded-lg max-w-xs mb-4 mx-auto">
                      N.B. Clicca su <b>"Apri in una Nuova Scheda"</b> in alto a destra sopra la preview per usare la fotocamera senza blocchi!
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-zinc-400 max-w-sm leading-relaxed mb-4 mx-auto">
                    {error}
                  </p>
                )}
                
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={startCamera}
                    className="text-xs bg-red-650 hover:bg-red-700 text-white font-bold py-1.5 px-5 rounded-full transition uppercase tracking-wider"
                  >
                    Riprova
                  </button>
                </div>
              </div>
            ) : (
              // Ready state
              <div className="w-full aspect-video rounded-xl bg-zinc-900/40 border border-zinc-850 flex flex-col items-center justify-center p-6 text-center text-zinc-500">
                <Camera className="w-10 h-10 text-zinc-500 mb-3" />
                <p className="text-sm font-semibold text-zinc-300">Scansiona con la Fotocamera</p>
                <p className="text-[11px] text-zinc-500 max-w-xs mt-1 leading-relaxed">
                  Scatta una foto della copertina o del codice a barre per compilare istantaneamente tutti i dettagli del libro.
                </p>
                <button
                  onClick={startCamera}
                  className="mt-4 text-xs bg-red-600 hover:bg-red-700 text-white py-2 px-5 rounded-full font-bold uppercase tracking-wider transition"
                >
                  Attiva Fotocamera
                </button>
              </div>
            )}
          </div>

          {/* Split divider for image upload fallback */}
          <div className="flex items-center text-xs text-zinc-500 uppercase tracking-widest font-mono select-none">
            <div className="flex-1 h-px bg-zinc-850"></div>
            <span className="px-3">Oppure Carica Foto</span>
            <div className="flex-1 h-px bg-zinc-850"></div>
          </div>

          {/* Image Drag and Drop Area */}
          <div
            id="drop-area"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-5 text-center transition relative ${
              isDragActive
                ? 'border-red-500 bg-red-950/10'
                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/20'
            }`}
          >
            <input
              type="file"
              id="file-scanner"
              accept="image/*"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isLoading}
            />
            <div className="space-y-2 flex flex-col items-center justify-center">
              <Upload className="w-6 h-6 text-zinc-500 group-hover:text-red-500" />
              <div>
                <span className="text-xs font-bold text-zinc-300">Trascina un'immagine</span>
                <span className="text-xs text-zinc-500 block">del retro col codice a barre o della copertina</span>
              </div>
              <p className="text-[10px] text-red-500 font-bold uppercase pt-1">Sfoglia File</p>
            </div>
          </div>
        </div>

        {/* Hidden Canvas used purely to capture frame buffers statically */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-850 text-right">
          <button
            id="close-bottom-btn"
            onClick={onClose}
            className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition py-2 px-5 rounded bg-zinc-800 hover:bg-zinc-750"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}
