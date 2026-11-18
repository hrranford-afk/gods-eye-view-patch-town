/* cardworker.js: runs the card recogniser off the main thread, so the page stays smooth.
   Messages in:  { type:'init', images:[{ id, gray, w, h }] }   { type:'frame', gray, w, h, K, t }
   Messages out: { type:'ready', stats }   { type:'result', t, dets, ms, features }   { type:'error', message } */
importScripts('cardvision.js');
onmessage = function (e) {
  var m = e.data;
  try {
    if (m.type === 'init') { var st = CV_CARDS.init(m.images); postMessage({ type: 'ready', stats: st }); }
    else if (m.type === 'frame') { var t0 = performance.now(), dets = CV_CARDS.detect(m.gray, m.w, m.h), out = dets.map(function (d) { return { id: d.id, name: d.name, kind: d.kind, inliers: d.inliers, score: d.score, margin: d.margin, corners: d.corners, H: d.H, pose: m.K ? CV_CARDS.pose(d, m.K, { w: 210, h: 148.5 }) : null }; });
      postMessage({ type: 'result', t: m.t, dets: out, ms: performance.now() - t0, features: CV_CARDS.stats.features, w: m.w, h: m.h }); }
  } catch (x) { postMessage({ type: 'error', message: String(x && x.message || x) }); }
};
