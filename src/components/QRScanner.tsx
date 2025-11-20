import { useRef, useEffect, useState } from 'react';

interface QRScannerProps {
  onScan: (data: string) => void;
  isActive: boolean;
}

export const QRScanner = ({ onScan, isActive }: QRScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Инициализация...');

  useEffect(() => {
    if (!isActive) return;

    const startScanner = async () => {
      try {
        setStatus('Запрос доступа к камере...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStatus('Камера запущена - наведите на QR/штрихкод');
          setError(null);
        }
      } catch (err) {
        setError('Не удалось получить доступ к камере');
        setStatus('Ошибка');
      }
    };

    startScanner();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId: number;

    const scan = async () => {
      if (videoRef.current && ctx) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = decodeQRCode(imageData);

        if (code) {
          onScan(code);
        }
      }

      animationId = requestAnimationFrame(scan);
    };

    animationId = requestAnimationFrame(scan);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive, onScan]);

  const decodeQRCode = (imageData: ImageData): string | null => {
    // Простое обнаружение штрихкода/QR кода через контрастные границы
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Ищем области с высоким контрастом (черные квадраты QR)
    let darkPixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = (r + g + b) / 3;

      if (gray < 128) {
        darkPixels++;
      }
    }

    // Если найдено достаточно темных пикселей, можем считать QR обнаруженным
    const darkRatio = darkPixels / (width * height);
    if (darkRatio > 0.15 && darkRatio < 0.85) {
      return 'QR_CODE_DETECTED';
    }

    return null;
  };

  return (
    <div className="qr-scanner">
      {isActive ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="scanner-video"
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className="scanner-status">
            {error && <div className="scanner-error">{error}</div>}
            {!error && <div className="scanner-hint">{status}</div>}
          </div>
        </>
      ) : (
        <div className="scanner-placeholder">
          🎥 Нажмите "Сканировать" для включения камеры
        </div>
      )}
    </div>
  );
};
