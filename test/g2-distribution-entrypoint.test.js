'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const g2=require('../src/g2');
test('unified G2 entrypoint exposes product runtime and required infrastructure layers',()=>{for(const key of ['architecture','core','scheduler','runtime','foreman','adapters','product'])assert.ok(g2[key],key);assert.equal(typeof g2.product.projectRuntime.startProject,'function');assert.equal(typeof g2.adapters.personalWorkspace.createPersonalWorkspaceAdapter,'function');});
