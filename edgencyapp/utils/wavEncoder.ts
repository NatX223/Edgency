import * as FileSystem from 'expo-file-system/legacy';

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Encodes float32 PCM samples [-1, 1] into a 16-bit mono WAV file on disk.
 * Returns the file:// URI and audio duration in milliseconds.
 */
export async function pcmToWav(
  samples: number[],
  sampleRate: number,
): Promise<{ uri: string; durationMs: number }> {
  const numChannels = 1;
  const bitsPerSample = 16;
  const dataSize = samples.length * 2; // 2 bytes per sample (Int16)
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true);  // PCM audio format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, (sampleRate * numChannels * bitsPerSample) / 8, true); // byte rate
  view.setUint16(32, (numChannels * bitsPerSample) / 8, true); // block align
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM samples as Int16
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  // Convert ArrayBuffer to base64 in chunks to avoid call-stack overflow
  const uint8 = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < uint8.length; i += chunkSize) {
    binary += String.fromCharCode(...Array.from(uint8.subarray(i, i + chunkSize)));
  }
  const base64 = btoa(binary);

  const uri = `${FileSystem.cacheDirectory}tts_${Date.now()}.wav`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    uri,
    durationMs: Math.round((samples.length / sampleRate) * 1000),
  };
}
