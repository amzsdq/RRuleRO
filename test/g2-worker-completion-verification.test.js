'use strict';
const test=require('node:test'); const assert=require('node:assert/strict'); const worker=require('../src/g2/runtime/worker-runtime');
function running(){ let w=worker.newWorker({worker_id:'w',objective_id:'o'}); w=worker.evolve(w,{next_state:'CLAIMING'}); return worker.evolve(w,{next_state:'RUNNING'}); }
test('worker cannot self-declare COMPLETE without verifier PASS',()=>{ const w=running(); assert.throws(()=>worker.evolve(w,{next_state:'COMPLETE'}),/verification PASS/); assert.throws(()=>worker.evolve(w,{next_state:'COMPLETE',verification_state:'PENDING'}),/verification PASS/); });
test('verified worker may become COMPLETE',()=>{ const done=worker.evolve(running(),{next_state:'COMPLETE',verification_state:'PASS'}); assert.equal(done.state,'COMPLETE'); });
