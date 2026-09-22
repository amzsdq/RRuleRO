'use strict';
const test=require('node:test'); const assert=require('node:assert/strict'); const { humanInterface }=require('../src/g2/product');
test('active work without remaining queue is still CONTINUE',()=>{ const p=humanInterface.progressSummary({completed:['a'],active:['last'],remaining:[]}); assert.equal(p.status,'CONTINUE'); });
test('COMPLETE is inferred only with no active or remaining work',()=>{ assert.equal(humanInterface.progressSummary({completed:['all']}).status,'COMPLETE'); });
test('explicit COMPLETE cannot contradict active work',()=>{ assert.throws(()=>humanInterface.progressSummary({status:'COMPLETE',active:['still-running']}),/cannot contain active/); });
