/* ============================================================
   FITLY JOINED — GAME CORE (rules, board generator, solver)
   This exact code runs in BOTH the offline level verifier and
   the shipped game, so every baked level is guaranteed solvable.
   Rules: capacity 4 per bolt; pick up the whole same-color run
   on top; place onto an empty bolt or a matching top color;
   if the run is bigger than the space, as many as fit will move.
   ============================================================ */
var CORE = (function(){
  var CAP = 4;

  function mulberry32(a){
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function buildBoard(seed, colors, empties){
    var rng = mulberry32(seed);
    var nuts = [];
    for(var c=0;c<colors;c++) for(var k=0;k<CAP;k++) nuts.push(c);
    for(var i=nuts.length-1;i>0;i--){
      var j = Math.floor(rng()*(i+1));
      var t = nuts[i]; nuts[i]=nuts[j]; nuts[j]=t;
    }
    var bolts = [];
    for(var b=0;b<colors;b++) bolts.push(nuts.slice(b*CAP, b*CAP+CAP));
    for(var e=0;e<empties;e++) bolts.push([]);
    return bolts;
  }

  function runLen(bolt){
    if(!bolt.length) return 0;
    var c = bolt[bolt.length-1], n = 1;
    for(var i=bolt.length-2;i>=0 && bolt[i]===c;i--) n++;
    return n;
  }

  function uniformFull(b){
    if(b.length!==CAP) return false;
    for(var i=1;i<CAP;i++) if(b[i]!==b[0]) return false;
    return true;
  }

  function isSolved(bolts){
    for(var i=0;i<bolts.length;i++){
      var b = bolts[i];
      if(b.length===0) continue;
      if(!uniformFull(b)) return false;
    }
    return true;
  }

  function canPlace(bolts, f, t){
    if(f===t) return 0;
    var from = bolts[f], to = bolts[t];
    if(!from.length || to.length>=CAP) return 0;
    var r = runLen(from);
    if(to.length===0) return Math.min(r, CAP);
    if(to[to.length-1] !== from[from.length-1]) return 0;
    return Math.min(r, CAP - to.length);
  }

  function legalMoves(bolts){
    var res = [];
    for(var f=0;f<bolts.length;f++){
      var from = bolts[f];
      if(!from.length || uniformFull(from)) continue;
      var r = runLen(from);
      var wholeBoltOneColor = (from.length === r);
      for(var t=0;t<bolts.length;t++){
        if(t===f) continue;
        var to = bolts[t];
        if(to.length>=CAP) continue;
        if(to.length===0){
          if(wholeBoltOneColor) continue; // relocating a pure stack to empty = no progress
          res.push([f, t, Math.min(r, CAP)]);
        } else if(to[to.length-1] === from[from.length-1]){
          res.push([f, t, Math.min(r, CAP - to.length)]);
        }
      }
    }
    return res;
  }

  function applyMove(bolts, m){
    var ns = bolts.map(function(x){ return x.slice(); });
    var moved = ns[m[0]].splice(ns[m[0]].length - m[2], m[2]);
    ns[m[1]] = ns[m[1]].concat(moved);
    return ns;
  }

  function stateKey(bolts){
    return bolts.map(function(b){ return b.join(','); }).slice().sort().join('|');
  }

  // Heuristic DFS solver: returns a solution path (array of moves) or null.
  function solve(bolts, maxNodes){
    maxNodes = maxNodes || 400000;
    var seen = Object.create(null), best = null, nodes = 0;
    function dfs(state, path){
      if(nodes++ > maxNodes) return false;
      if(isSolved(state)){ best = path.slice(); return true; }
      var k = stateKey(state);
      if(seen[k]) return false;
      seen[k] = 1;
      var moves = legalMoves(state);
      moves.sort(function(a,b){
        var ea = state[a[1]].length===0 ? 1 : 0;   // prefer non-empty targets
        var eb = state[b[1]].length===0 ? 1 : 0;
        if(ea!==eb) return ea-eb;
        var ca = state[a[1]].length + a[2] === CAP ? -1 : 0; // prefer completions
        var cb = state[b[1]].length + b[2] === CAP ? -1 : 0;
        if(ca!==cb) return ca-cb;
        return b[2]-a[2];                           // prefer bigger transfers
      });
      for(var i=0;i<moves.length;i++){
        path.push(moves[i]);
        if(dfs(applyMove(state, moves[i]), path)) return true;
        path.pop();
      }
      return false;
    }
    dfs(bolts.map(function(b){ return b.slice(); }), []);
    return best;
  }

  return {
    CAP: CAP,
    mulberry32: mulberry32,
    buildBoard: buildBoard,
    runLen: runLen,
    uniformFull: uniformFull,
    isSolved: isSolved,
    canPlace: canPlace,
    legalMoves: legalMoves,
    applyMove: applyMove,
    solve: solve
  };
})();
if(typeof module !== 'undefined' && module.exports) module.exports = CORE;
