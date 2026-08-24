#!/usr/bin/env node
// make-sample-id.js — dependency-free synthetic ID card generator.
//
// Encodes a name as crisp black-on-white pixel text inside a valid PNG
// (hand-rolled encoder: zlib deflate + CRC32, no external packages).
//
// Usage:
//   node make-sample-id.js              writes sample-id.png ("ADA LOVELACE")
//   node make-sample-id.js out.png "IDA CARD"
//
// As a module: const { createIdPng } = require('./make-sample-id')

'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// 5x7 pixel font. Each glyph is 7 rows; each row is a 5-bit number
// (bit 4 = leftmost column). Only the characters this sample needs.
const FONT = {
  A: [14, 17, 17, 31, 17, 17, 17],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  I: [14, 4, 4, 4, 4, 4, 14],
  L: [16, 16, 16, 16, 16, 16, 31],
  N: [17, 25, 25, 21, 19, 19, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  R: [30, 17, 17, 30, 20, 18, 17],
  V: [17, 17, 17, 17, 17, 10, 4],
  ' ': [0, 0, 0, 0, 0, 0, 0],
};

const WIDTH = 480;
const HEIGHT = 160;
const SCALE = 6;          // each font pixel becomes SCALE x SCALE real pixels
const MARGIN_X = 24;
const LINE_HEIGHT = 60;

function drawText(pixels, text, x0, y0) {
  let x = x0;
  for (const ch of text.toUpperCase()) {
    const glyph = FONT[ch];
    if (!glyph) { x += 6 * SCALE; continue; }
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if ((glyph[row] >> (4 - col)) & 1) {
          for (let dy = 0; dy < SCALE; dy++) {
            for (let dx = 0; dx < SCALE; dx++) {
              const px = x + col * SCALE + dx;
              const py = y0 + row * SCALE + dy;
              if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) {
                const i = (py * WIDTH + px) * 3;
                pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
              }
            }
          }
        }
      }
    }
    x += 6 * SCALE; // 5 columns + 1 column gap
  }
}

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function createIdPng(lines) {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 3, 255); // white background
  lines.forEach((line, index) => {
    drawText(pixels, line, MARGIN_X, 24 + index * LINE_HEIGHT);
  });

  // PNG scanlines: one filter byte (0 = None) per row.
  const raw = Buffer.alloc(HEIGHT * (WIDTH * 3 + 1));
  for (let y = 0; y < HEIGHT; y++) {
    raw[y * (WIDTH * 3 + 1)] = 0;
    pixels.copy(raw, y * (WIDTH * 3 + 1) + 1, y * WIDTH * 3, (y + 1) * WIDTH * 3);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: truecolor RGB

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

module.exports = { createIdPng, FONT, WIDTH, HEIGHT, SCALE, MARGIN_X, LINE_HEIGHT };

if (require.main === module) {
  const out = process.argv[2] || path.join(__dirname, 'sample-id.png');
  const lines = process.argv.length > 3 ? process.argv.slice(3) : ['ADA LOVELACE', 'ID CARD'];
  fs.writeFileSync(out, createIdPng(lines));
  console.log(`wrote ${out} (${lines.join(' / ')})`);
}
