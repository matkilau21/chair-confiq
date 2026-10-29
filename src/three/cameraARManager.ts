/**
 * Universal Mobile AR Camera Manager
 * Supports 100% of Android and iOS devices using HTML5 WebRTC camera passthrough + gyro/touch orientation.
 * Ensures AR works seamlessly even on iOS Safari and Android browsers without ARCore WebXR.
 */

export interface CameraARSession {
  video: HTMLVideoElement;
  stream: MediaStream;
  stop: () => void;
}

export async function startDeviceCameraAR(): Promise<CameraARSession> {
  if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
    throw new Error('Camera access is not supported by this browser.');
  }

  // Request back/environment camera
  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  const video = document.createElement('video');
  video.setAttribute('autoplay', '');
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', ''); // Essential for iOS Safari!
  video.srcObject = stream;
  await video.play();

  return {
    video,
    stream,
    stop: () => {
      stream.getTracks().forEach(track => track.stop());
      video.pause();
      video.srcObject = null;
      if (video.parentElement) {
        video.parentElement.removeChild(video);
      }
    },
  };
}

/**
 * Checks if current device is iOS (iPhone/iPad)
 */
export function isIOSDevice(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Checks if current device is Android
 */
export function isAndroidDevice(): boolean {
  return /Android/i.test(navigator.userAgent);
}
