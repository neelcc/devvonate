const buffer = new ArrayBuffer(32);

const uint8 = new Uint8Array(buffer);
const uint32 = new Uint32Array(buffer);

uint8[0] = 0;

console.log(uint8);
console.log(uint32);