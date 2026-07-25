// Generates the PWA / home-screen icons as real PNGs.
//
// iOS ignores SVG and data: URIs for apple-touch-icon, so the launcher needs
// actual PNG files or the home screen falls back to a page screenshot.
// No image libraries are available in this WSL, so this writes PNG chunks
// directly using the built-in zlib. No dependencies.
//
// Run from a directory Windows node can resolve (see README), then copy the
// PNGs next to index.html:
//   "/mnt/c/Program Files/nodejs/node.exe" make-icons.mjs
//
// Design mirrors the original inline SVG: a 4x2 grid of colored squares on a
// near-black field.

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const BG = [0x1a, 0x1a, 0x1a];
const COLORS = [
    ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24'],
    ['#6c5ce7', '#a29bfe', '#00b894', '#fd79a8'],
];

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

// --- PNG encoding ---------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});

function crc32(buf) {
    let c = 0xffffffff;
    for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
}

// pixels: Buffer of size*size*3 (RGB, 8-bit)
function encodePng(size, pixels) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 2; // color type: truecolor
    // 10-12: compression, filter, interlace all 0

    // Each scanline is prefixed with filter type 0 (none).
    const stride = size * 3;
    const raw = Buffer.alloc(size * (stride + 1));
    for (let y = 0; y < size; y++) {
        raw[y * (stride + 1)] = 0;
        pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

// --- The icon -------------------------------------------------------------

// scale shrinks the artwork toward the center; maskable icons need their
// content inside the central ~80% so launchers can crop to any shape.
function render(size, scale = 1) {
    const px = Buffer.alloc(size * size * 3);
    for (let i = 0; i < size * size; i++) {
        px[i * 3] = BG[0];
        px[i * 3 + 1] = BG[1];
        px[i * 3 + 2] = BG[2];
    }

    const cell = 0.17 * scale;
    const gap = 0.04 * scale;
    const cols = COLORS[0].length;
    const rows = COLORS.length;
    const left = (1 - (cols * cell + (cols - 1) * gap)) / 2;
    const top = (1 - (rows * cell + (rows - 1) * gap)) / 2;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const [cr, cg, cb] = hex(COLORS[r][c]);
            const x0 = Math.round((left + c * (cell + gap)) * size);
            const y0 = Math.round((top + r * (cell + gap)) * size);
            const side = Math.round(cell * size);
            for (let y = y0; y < y0 + side; y++) {
                for (let x = x0; x < x0 + side; x++) {
                    const i = (y * size + x) * 3;
                    px[i] = cr;
                    px[i + 1] = cg;
                    px[i + 2] = cb;
                }
            }
        }
    }
    return px;
}

const outputs = [
    ['apple-touch-icon.png', 180, 1],
    ['icon-192.png', 192, 1],
    ['icon-512.png', 512, 1],
    ['icon-512-maskable.png', 512, 0.7],
];

for (const [name, size, scale] of outputs) {
    writeFileSync(name, encodePng(size, render(size, scale)));
    console.log(`wrote ${name} (${size}x${size})`);
}
