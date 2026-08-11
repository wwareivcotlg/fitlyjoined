/* Level generator + verifier for Fitly Joined 3D.
   Usage: node gen.js  → writes levels.js with 50 verified levels.
   To expand later: add rows to CURVE and re-run. */
var CORE = require('./core.js');
var fs = require('fs');

function rep(n, cfg){ var a=[]; for(var i=0;i<n;i++) a.push(Object.assign({}, cfg)); return a; }

// 50-level difficulty curve: colors ramp 2→8, minimum par ramps within each band
var CURVE = [].concat(
  rep(1, {c:2, e:2, mp:4}),    // L1     — teach the mechanic
  rep(3, {c:3, e:2, mp:7}),    // L2-4
  rep(5, {c:4, e:2, mp:10}),   // L5-9
  rep(6, {c:5, e:2, mp:13}),   // L10-15
  rep(7, {c:6, e:2, mp:16}),   // L16-22
  rep(5, {c:6, e:2, mp:20}),   // L23-27 — same colors, denser puzzles
  rep(7, {c:7, e:2, mp:21}),   // L28-34
  rep(6, {c:7, e:2, mp:25}),   // L35-40
  rep(6, {c:8, e:2, mp:26}),   // L41-46
  rep(4, {c:8, e:2, mp:30})    // L47-50 — the gauntlet
);

var levels = [];
for(var li=0; li<CURVE.length; li++){
  var cfg = CURVE[li];
  var found = null;
  for(var attempt=0; attempt<800 && !found; attempt++){
    var seed = (li+1)*100000 + attempt*7 + 13;
    var board = CORE.buildBoard(seed, cfg.c, cfg.e);
    // reject boards with a pre-solved bolt (too easy) once past the tutorial
    var pre = false;
    if(cfg.c >= 3){
      for(var b=0;b<board.length;b++) if(CORE.uniformFull(board[b])) pre = true;
    }
    if(pre) continue;
    var sol = CORE.solve(board, 400000);
    if(sol && sol.length >= cfg.mp){
      found = { s: seed, c: cfg.c, e: cfg.e, p: sol.length };
    }
  }
  if(!found){
    console.error('FAILED to generate level', li+1, JSON.stringify(cfg));
    process.exit(1);
  }
  levels.push(found);
  console.log('L'+(li+1)+': colors='+found.c+' empty='+found.e+' seed='+found.s+' par='+found.p);
}

fs.writeFileSync('/home/claude/game/levels.js',
  'var LEVELS = ' + JSON.stringify(levels) + ';\n');
fs.writeFileSync('/home/claude/game/levels.json', JSON.stringify(levels));
console.log('\nWrote ' + levels.length + ' verified levels.');
