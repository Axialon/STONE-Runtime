import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const name='@dimforge/rapier3d-compat';
const version='0.20.0';
/** Validate the first dependency acquisition before npm ci executes engine code.
 * npm ci checks the downloaded bytes against this lock. This is not a malware audit.
 */
export function verifyLock(lock) {
  assert.equal(lock?.lockfileVersion,3,'Expected npm lockfile version 3.');
  assert.deepEqual(Object.keys(lock.packages).sort(),['','node_modules/'+name],'Unexpected dependency graph.');
  assert.deepEqual(lock.packages[''].dependencies,{[name]:version},'Engine request must be exact.');
  const dep=lock.packages['node_modules/'+name];
  assert.equal(dep.version,version,'Unexpected engine version.');
  assert.equal(dep.resolved,'https://registry.npmjs.org/@dimforge/rapier3d-compat/-/rapier3d-compat-0.20.0.tgz','Unexpected registry URL.');
  assert.match(dep.integrity??'',/^sha512-[A-Za-z0-9+/]{86}==$/,'Expected SHA-512 archive integrity.');
  assert.notEqual(dep.hasInstallScript,true,'Install hooks are not permitted.');
  return Object.freeze({package:name,version,resolved:dep.resolved,integrity:dep.integrity});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const lock=JSON.parse(await readFile(new URL('../experiments/rover3d/package-lock.json',import.meta.url),'utf8'));
  console.log(JSON.stringify(verifyLock(lock),null,2));
}
