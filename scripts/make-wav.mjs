import fs from "fs";

const sampleRate = 22050;
const seconds = 18;
const n = sampleRate * seconds;
const data = Buffer.alloc(n * 2);
for (let i = 0; i < n; i++) {
  const t = i / sampleRate;
  const env = Math.min(t * 2, 1) * Math.min((seconds - t) * 0.6, 1);
  const s =
    0.16 * env * Math.sin(2 * Math.PI * 196 * t) +
    0.1 * env * Math.sin(2 * Math.PI * 247 * t) +
    0.08 * env * Math.sin(2 * Math.PI * 294 * t);
  data.writeInt16LE(Math.max(-1, Math.min(1, s)) * 32767, i * 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);
fs.mkdirSync("/workspace/public/audio", { recursive: true });
fs.writeFileSync("/workspace/public/audio/reflection.wav", Buffer.concat([header, data]));
