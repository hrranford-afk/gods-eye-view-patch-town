function hash(k, salt, seed) { let h = Math.imul(k | 0, 374761393) + Math.imul(salt | 0, 668265263) + Math.imul(seed | 0, 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; }
  function launcher() { var cat = new THREE.Group(), arm;
    var wood = M(0x8a5428, 0.8), dark = M(0x5a3418, 0.8), tin = M(0xb8b8b8, 0.4);
    function bx(w, h, d, m, x, y, z) { var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; cat.add(o); return o; }
    bx(0.5, 0.08, 0.8, wood, 0, 0.04, 0); bx(0.06, 0.4, 0.06, dark, -0.2, 0.26, 0.05); bx(0.06, 0.4, 0.06, dark, 0.2, 0.26, 0.05); bx(0.5, 0.05, 0.05, dark, 0, 0.46, 0.05);
    bx(0.14, 0.06, 0.14, wood, -0.28, 0.02, 0.3).rotation.y = 0.2;
    arm = new THREE.Group(); arm.position.set(0, 0.46, 0.05); cat.add(arm);
    var ab = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.8), dark); ab.position.set(0, 0, -0.3); ab.castShadow = true; arm.add(ab);
    var cup = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.07, 0.06, 14), tin); cup.position.set(0, 0.02, -0.7); cup.castShadow = true; arm.add(cup);
    cat.userData.arm = arm; scene.add(cat); return cat;
  }
