import { useRef, useEffect, useState } from 'react';
import jsQR from 'jsqr';

interface QRScannerProps {
  onScan: (data: string) => void;
  isActive: boolean;
}

export const QRScanner = ({ onScan, isActive }: QRScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Инициализация...');
  const [manualInput, setManualInput] = useState('');
  const lastDetectTimeRef = useRef(0);

  useEffect(() => {
    if (!isActive) return;

    const startScanner = async () => {
      try {
        setStatus('📹 Запрос доступа к камере...');
        setError(null);
        
        // Проверить доступность API
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('❌ Ваш браузер не поддерживает доступ к камере');
          setStatus('❌ Не поддерживается');
          return;
        }

        // Запросить доступ к камере с улучшенными параметрами
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };

        console.log('📱 Запрашиваем доступ к камере');
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✓ Доступ к камере получен');
        streamRef.current = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          
          // Для iOS - принудительно добавляем атрибуты
          videoRef.current.setAttribute('playsinline', '');
          videoRef.current.setAttribute('webkit-playsinline', '');
          videoRef.current.setAttribute('autoplay', '');
          videoRef.current.setAttribute('muted', '');
          
          // Ждем, пока видео будет готово к воспроизведению
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setStatus('✓ Камера активна - наведите на штрихкод/QR');
                setError(null);
                console.log('✓ Видео воспроизводится');
              })
              .catch((err) => {
                console.error('❌ Ошибка воспроизведения:', err);
                setError('Не удалось запустить видео. Попробуйте коснуться экрана.');
                setStatus('⚠️ Требуется взаимодействие');
              });
          }
        }
      } catch (err: unknown) {
        console.error('❌ Ошибка при доступе к камере:', err);
        
        let errorMessage = 'Не удалось получить доступ к камере';
        
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError') {
            errorMessage = '❌ Доступ запрещен.\n\niPhone: Параметры > Конфиденциальность > Камера\nДелегируйте разрешение для Safari';
          } else if (err.name === 'NotFoundError') {
            errorMessage = '❌ Камера не найдена на устройстве';
          } else if (err.name === 'NotReadableError') {
            errorMessage = '❌ Камера занята другим приложением';
          } else if (err.name === 'SecurityError') {
            errorMessage = '❌ Требуется HTTPS для доступа к камере';
          } else {
            errorMessage = `❌ Ошибка: ${err.message}`;
          }
        }
        
        setError(errorMessage);
        setStatus('❌ Ошибка');
      }
    };

    startScanner();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animationId: number;
    let frameCount = 0;

    const scan = () => {
      if (
        videoRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
      ) {
        try {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;

          // Рисуем видео на canvas
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          // Каждый второй кадр пытаемся декодировать
          frameCount++;
          if (frameCount % 2 === 0) {
            // Получаем данные пикселей
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // Декодируем QR код
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data) {
              const now = Date.now();
              // Предотвращаем множественные срабатывания (минимум 1.5 секунды)
              if (now - lastDetectTimeRef.current > 1500) {
                console.log('✓ QR/Штрихкод найден:', code.data);
                console.log('📍 Длина:', code.data.length);
                onScan(code.data);
                lastDetectTimeRef.current = now;
                setStatus(`✓ Найдено: ${code.data.substring(0, 50)}${code.data.length > 50 ? '...' : ''}`);
              }
            }
          }
        } catch (e) {
          console.error('Ошибка обработки изображения:', e);
        }
      }

      animationId = requestAnimationFrame(scan);
    };

    animationId = requestAnimationFrame(scan);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive, onScan]);

  const handleManualScan = () => {
    if (manualInput.trim()) {
      console.log('📝 Ручной ввод:', manualInput);
      onScan(manualInput.trim());
      setManualInput('');
      if (manualInputRef.current) {
        manualInputRef.current.focus();
      }
    }
  };

  return (
    <div className="qr-scanner">
      {isActive ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="scanner-video"
            style={{
              width: '100%',
              height: '100%',
              maxHeight: '400px',
              objectFit: 'cover',
              backgroundColor: '#000',
              display: 'block',
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className="scanner-status">
            {error && (
              <div className="scanner-error" style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>
                {error}
              </div>
            )}
            {!error && <div className="scanner-hint">{status}</div>}
          </div>

          {/* Fallback ввод вручную */}
          <div className="scanner-manual" style={{ marginTop: '12px', padding: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={manualInputRef}
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualScan()}
                placeholder="Или введите код вручную..."
                autoFocus
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              />
              <button
                onClick={handleManualScan}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ✓
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="scanner-placeholder">
          🎥 Нажмите "Сканировать" (📱) для включения камеры
        </div>
      )}
    </div>
  );
};
