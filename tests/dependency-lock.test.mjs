import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyLock} from '../scripts/verify-lock.mjs';
const name='@dimforge/rapier3d-compat';
const make=()=>({lockfileVersion:3,packages:{'':{dependencies:{[name]:'0.20.0'}},['node_modules/'+name]:{
  version:'0.20.0',resolved:'https://registry.npmjs.org/@dimforge/rapier3d-compat/-/rapier3d-compat-0.20.0.tgz',
  integrity:'sha512-'+Buffer.alloc(64,1).toString('base64'),license:'Apache-2.0'}}});
test('accepts one exact registry package with recorded sha512 integrity',()=>{
  const lock=make();assert.equal(verifyLock(lock).version,'0.20.0');
});
for(const [label,mutate] of [
  ['wrong engine',l=>l.packages['node_modules/'+name].version='0.19.0'],
  ['floating request',l=>l.packages[''].dependencies[name]='^0.20.0'],
  ['unexpected dependency',l=>l.packages['node_modules/other']={version:'1.0.0'}],
  ['nonregistry archive',l=>l.packages['node_modules/'+name].resolved='https://other.invalid/engine.tgz'],
  ['missing integrity',l=>delete l.packages['node_modules/'+name].integrity],
  ['invalid digest',l=>l.packages['node_modules/'+name].integrity='sha512-not-a-digest'],
  ['install script',l=>l.packages['node_modules/'+name].hasInstallScript=true],
  ['changed format',l=>l.lockfileVersion=1],
  ['extra root dependency',l=>l.packages[''].dependencies.other='1.0.0']
])test('rejects '+label,()=>{const l=make();mutate(l);assert.throws(()=>verifyLock(l));});
test('rejects absent or malformed lock data',()=>{for(const l of [null,{},[],{lockfileVersion:3,packages:{}}])assert.throws(()=>verifyLock(l));});
