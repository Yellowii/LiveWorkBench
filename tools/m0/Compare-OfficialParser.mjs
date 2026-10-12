// Synthetic cross-parser diagnostics, not a real RAW acceptance test.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const [parserRoot, baselineRoot] = process.argv.slice(2);
if (!parserRoot || !baselineRoot) throw new Error('Usage: node Compare-OfficialParser.mjs <isolated protobuf-live root> <baseline root>');
const { loadParser } = await import(pathToFileURL(path.join(parserRoot, 'src/parser.js')));
const { decodePacket } = await import(pathToFileURL(path.join(parserRoot, 'src/decode.js')));
const parser = await loadParser();
const observations = [];
for (const name of ['synthetic-response.bin', 'synthetic-gzip-pushframe.bin', 'synthetic-no-seqid-pushframe.bin']) {
  const bytes = await fs.readFile(path.join(baselineRoot, 'offline-probe', name));
  const decoded = decodePacket(parser, bytes);
  const message = decoded.messages[0];
  const observed = { file: name, inputKind: 'synthetic', sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length,
    messages: decoded.messages.length, method: message.method, outerMsgId: message.msg_id,
    common: message.data.common, content: message.data.content };
  if (observed.messages !== 1 || observed.outerMsgId !== '9007199254740993' || observed.common.room_id !== '101' || observed.common.msg_id !== observed.outerMsgId)
    throw new Error(`Cross-parser mismatch for ${name}`);
  observations.push(observed);
}
const provenance = JSON.parse(await fs.readFile(path.join(parserRoot, 'src/vendor/provenance.json')));
for (const item of provenance) {
  const digest = createHash('sha256').update(await fs.readFile(path.join(parserRoot, 'src/vendor', item.file))).digest('hex');
  if (digest !== item.sha256) throw new Error(`Vendor hash mismatch: ${item.file}`);
}
await fs.writeFile(path.join(baselineRoot, 'official-cross-parser-observations.json'), JSON.stringify({ inputKind: 'synthetic', parserTypes: parser.types.size, provenance, observations }, null, 2));
console.log(`Official Parser: ${parser.types.size} types; ${observations.length} identical-input observations; 2 vendor hashes verified.`);
