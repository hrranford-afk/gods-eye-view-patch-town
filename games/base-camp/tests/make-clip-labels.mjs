// Build step for the "smarter recognition" feature (not run by the game): turns the label list below into clip-labels.json, the TEXT embeddings of
// CLIP (Xenova/clip-vit-base-patch32). The game ships only these numbers plus the small vision model (q4f16, about 53 MB, downloaded on demand), so no text model is needed on the device.
// Run:  npm i @huggingface/transformers@3.7.5   (in any empty folder, copy this file there)   node make-clip-labels.mjs ../path/to/clip-labels.json
import { AutoTokenizer, CLIPTextModelWithProjection } from '@huggingface/transformers';
import fs from 'node:fs';
// [what CLIP is asked about, the tag it means in the game, the name the colonists use]
const LABELS = [
  ['a speaker', 'speaker', 'speaker'], ['a hi-fi loudspeaker', 'speaker', 'speaker'], ['a bookshelf speaker', 'speaker', 'speaker'],
  ['a cup', 'cup', 'cup'], ['a mug', 'cup', 'mug'], ['an egg cup', 'cup', 'egg cup'], ['a kettle', 'cup', 'kettle'],
  ['a tin can', 'can', 'can'], ['a drinks can', 'can', 'can'], ['a paint tin', 'can', 'tin'], ['a jar', 'can', 'jar'], ['a bottle', 'can', 'bottle'],
  ['a computer', 'computer', 'computer'], ['a desktop computer tower', 'computer', 'computer'], ['a Mac mini', 'computer', 'Mac mini'], ['a laptop', 'computer', 'laptop'], ['a keyboard', 'computer', 'keyboard'],
  ['an external graphics card box', 'warm', 'warm box'], ['a metal electronics box with vents', 'warm', 'warm box'], ['a power supply', 'warm', 'warm box'],
  ['a computer monitor', 'monitor', 'monitor'], ['a television screen', 'monitor', 'screen'],
  ['a shelf', 'shelf', 'shelf'], ['a bookshelf', 'shelf', 'shelf'], ['a lamp', 'ledge', 'lamp'],
  ['a filing cabinet with drawers', 'drawers', 'drawers'], ['a chest of drawers', 'drawers', 'drawers'], ['a toolbox', 'drawers', 'toolbox'],
  ['a radiator', 'radiator', 'radiator'], ['a window', 'door', 'window'], ['a door', 'door', 'door'],
  ['a sofa', 'sofa', 'sofa'], ['an armchair', 'sofa', 'armchair'], ['a rug', 'rug', 'rug'], ['a carpet', 'rug', 'carpet'],
  ['a potted plant', 'plant', 'plant'], ['a flower pot', 'plant', 'plant'],
  ['a cardboard box', 'other', 'cardboard box'], ['a book', 'other', 'book'], ['a reel of cable', 'other', 'cable reel'], ['a workbench', 'desk', 'workbench'], ['a table', 'desk', 'table'], ['a desk', 'desk', 'desk'],
];
// extra entries only used by the tests (a real photo of a dog must come out as "a dog", which proves the text and vision sides belong together)
const CHECKS = ['a dog', 'a cat', 'a person', 'a car'];
const tok = await AutoTokenizer.from_pretrained('Xenova/clip-vit-base-patch32');
const model = await CLIPTextModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch32', { dtype: 'q8' });
const inputs = tok(LABELS.map((l) => 'a photo of ' + l[0]).concat(CHECKS.map((c) => 'a photo of ' + c)), { padding: true, truncation: true });
const { text_embeds } = await model(inputs);
const d = text_embeds.dims[1], out = { model: 'Xenova/clip-vit-base-patch32', dim: d, scale: 100, prompt: 'a photo of {label}', labels: [] };
for (let i = 0; i < LABELS.length; i++) {
  const v = Array.from(text_embeds.data.slice(i * d, (i + 1) * d)), n = Math.hypot(...v);
  out.labels.push({ label: LABELS[i][0], tag: LABELS[i][1], name: LABELS[i][2], emb: v.map((x) => +(x / n).toFixed(4)) });
}
out.checks = CHECKS.map((c, i) => { const j = LABELS.length + i, v = Array.from(text_embeds.data.slice(j * d, (j + 1) * d)), n = Math.hypot(...v); return { label: c, emb: v.map((x) => +(x / n).toFixed(4)) }; });
fs.writeFileSync(process.argv[2] || 'clip-labels.json', JSON.stringify(out));
console.log('wrote', LABELS.length, 'labels,', d, 'dims');
