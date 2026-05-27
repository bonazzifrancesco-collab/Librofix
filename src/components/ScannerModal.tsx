import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Loader, Upload, AlertCircle } from 'lucide-react';

interface ScannerModalProps {
  onClose: () => void;
  onScanSuccess: (bookData: any) => void;
}

export default function ScannerModal({ onClose, onScanSuccess }: ScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeRequestId = useRef<number>(0);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const thoughts = [
    'Analisi della copertina in corso...',
    'Riconoscimento testo e codice a barre...',
    'Ricerca nel database libri...',
    'Ottimizzazione dati in italiano...',
    'Quasi fatto...',
  ];

  useEffect(() => {
    let intervalId: any;
    if (isLoading) {
      setLoadingMessage(thoughts[0]);
      let idx = 1;
      intervalId = setInterval(() => {
        setLoadingMessage(thoughts[idx % thoughts.length]);
        idx++;
      }, 3000);
    }
    return () => clearInterval(intervalId);
  }, [isLoading]);

  const startCamera = async () => {
    setError(null);
    setIsCameraLoading(true);
    setCameraActive(false);

    const reqId = ++activeRequestId.current;

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false,
          });
        } catch {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      if (reqId !== activeRequestId.current) {
        mediaStream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = mediaStream;
      setCameraActive(true);

      await new Promise(resolve => setTimeout(resolve, 150));

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
        try { await videoRef.current.play(); } catch (_) {}
      }

    } catch (err: any) {
      if (reqId !== activeRequestId.current) return;
      setError('Impossibile avviare la fotocamera. Verifica i permessi nel browser.');
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
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas non disponibile.');

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Image = canvas.toDataURL('image/jpeg', 0.85);

      stopCamera();

      const res = await fetch('/api/book/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Scansione fallita.');
      }

      onScanSuccess(data.book);

    } catch (err: any) {
      setError(err.message || 'Errore durante la scansione.');
      setIsLoading(false);
      startCamera();
      return;
    }

    setIsLoading(false);
  };

  const processImageFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    stopCamera();

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result as string;
      try {
        const res = await fetch('/api/book/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Lettura file fallita.');
        onScanSuccess(data.book);
      } catch (err: any) {
        setError(err.message || "Errore analisi file.");
        startCamera();
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processImageFile(e.target.files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragActive(true); };
  const handleDragLeave = () => setIsDragActive(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files?.[0]) processImageFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-md">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">

        <div className="p-5 flex justify-between items-center bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Camera className="text-red-500 w-5 h-5 animate-pulse" />
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">AI Scanner di Libri</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition p-1.5 rounded-full hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="relative">

            {isLoading ? (
              <div className="w-full aspect-video rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col items-center justify-center p-6 space-y-4 text-center">
                <div className="relative">
                  <Loader className="w-12 h-12 text-red-600 animate-spin" />
                  <Camera className="w-5 h-5 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Analisi AI in corso...</h4>
                  <p className="text-[11px] text-zinc-400 font-mono animate-pulse">{loadingMessage}</p>
                </div>
              </div>

            ) : cameraActive ? (
              <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-zinc-800 bg-black shadow-lg">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 h-0.5 bg-red-500 opacity-70 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-bounce top-[10%]" />
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="w-[80%] h-[70%] border-2 border-dashed border-white/50 rounded-lg relative pointer-events-none">
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-red-500" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-red-500" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-red-500" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-red-500" />
                    <div className="absolute inset-x-0 bottom-4 text-center text-[10px] text-white/80 bg-black/60 py-1 px-3 mx-10 rounded-full font-mono">
                      Inquadra Codice EAN o Copertina
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <button
                    onClick={handleCapture}
                    className="bg-red-600 hover:bg-red-700 active:scale-95 text-white py-2 px-6 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 transition"
                  >
                    <Camera className="w-4 h-4" /> Scansiona Ora
                  </button>
                </div>
              </div>

            ) : isCameraLoading ? (
              <div className="w-full aspect-video rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col items-center justify-center p-6 text-center">
                <Loader className="w-8 h-8 text-red-500 animate-spin mb-3" />
                <p className="text-sm font-semibold text-zinc-300">Avvio fotocamera...</p>
                <p className="text-[11px] text-zinc-500 max-w-sm mt-1.5">Consenti l'accesso alla fotocamera se richiesto dal browser.</p>
              </div>

            ) : error ? (
              <div className="w-full aspect-video rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-1.5">Problema fotocamera</h4>
                <p className="text-[11px] text-zinc-400 max-w-sm leading-relaxed mb-4">{error}</p>
                <button onClick={startCamera} className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-5 rounded-full transition uppercase tracking-wider">
                  Riprova
                </button>
              </div>

            ) : (
              <div className="w-full aspect-video rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col items-center justify-center p-6 text-center">
                <Camera className="w-10 h-10 text-zinc-500 mb-3" />
                <p className="text-sm font-semibold text-zinc-300">Scansiona con la Fotocamera</p>
                <button onClick={startCamera} className="mt-4 text-xs bg-red-600 hover:bg-red-700 text-white py-2 px-5 rounded-full font-bold uppercase tracking-wider transition">
                  Attiva Fotocamera
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center text-xs text-zinc-500 uppercase tracking-widest font-mono select-none">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="px-3">Oppure Carica Foto</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-5 text-center transition relative ${isDragActive ? 'border-red-500 bg-red-950/10' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/20'}`}
          >
            <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isLoading} />
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-6 h-6 text-zinc-500" />
              <span className="text-xs font-bold text-zinc-300">Trascina un'immagine</span>
              <span className="text-xs text-zinc-500">del retro col codice a barre o della copertina</span>
              <p className="text-[10px] text-red-500 font-bold uppercase">Sfoglia File</p>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 text-right">
          <button onClick={onClose} className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition py-2 px-5 rounded bg-zinc-800 hover:bg-zinc-700">
            Annulla
          </button>
        </div>

      </div>
    </div>
  );
}
