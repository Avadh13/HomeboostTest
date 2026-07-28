const test = require("node:test");
const assert = require("node:assert/strict");

const { detectImageType } = require("../src/routes/uploadRoutes");

test("detectImageType recognizes supported image signatures", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const webp = Buffer.concat([Buffer.from("RIFF", "ascii"), Buffer.alloc(4), Buffer.from("WEBP", "ascii")]);

  assert.deepEqual(detectImageType(jpeg), { mime: "image/jpeg", extension: ".jpg" });
  assert.deepEqual(detectImageType(png), { mime: "image/png", extension: ".png" });
  assert.deepEqual(detectImageType(webp), { mime: "image/webp", extension: ".webp" });
});

test("detectImageType rejects renamed text and executable content", () => {
  assert.equal(detectImageType(Buffer.from("not really an image.jpg")), null);
  assert.equal(detectImageType(Buffer.from("MZ executable bytes here")), null);
  assert.equal(detectImageType(Buffer.alloc(3)), null);
});
