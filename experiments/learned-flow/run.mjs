import {summarize} from './measurements.mjs';
import {proveLoadedModules,environmentIdentity} from './dependency-proof.mjs';
import {readFileSync, writeFileSync, mkdirSync, readdirSync, lstatSync, existsSync} from 'node:fs';
import {resolve, dirname, join, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {loadRapier} from '../rover3d/engine.mjs';
import {ENGINE, MACHINE} from '../rover3d/contract.mjs';
import {createRoverWorld} from '../rover3d/world.mjs';
import {decide} from '../rover3d/stones.mjs';
import {PROTOCOL as P, protocolSha256, sha256, LIBRARY_ROOT, LIBRARY_ENTRY,
  buildWarmup, fitRegressor, saveArtifact, loadArtifact, predictAction, harnessAction, runEpisode} from './experiment.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repository = resolve(here, '../..');
const partitions = ['train', 'validation', 'test'];
const json = value => JSON.stringify(value, null, 2) + '\n';
const digestValue = value => sha256(JSON.stringify(value));
const teacher = o => decide(P.teacher, o);
function outputDirectory(args) {
  if (args.length === 0) return join(here, 'artifacts/flow-v0.1');
  if (args.length !== 2 || args[0] !== '--out' || !args[1] || args[1].startsWith('--'))
    throw new Error('Usage: node run.mjs [--out <new-directory>]');
  return resolve(args[1]);
}
function reserveDirectory(directory) {
  if (existsSync(directory)) {
    if (!lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink() ||
        readdirSync(directory).length) throw new Error('Output directory must be an empty real directory.');
  } else mkdirSync(directory, {recursive: true});
}
function findPackage(entry, name, version) {
  let directory = dirname(entry);
  for (let depth = 0; depth < 4; depth++) {
    const file = join(directory, 'package.json');
    if (existsSync(file)) {
      const metadata = JSON.parse(readFileSync(file, 'utf8'));
      assert.equal(metadata.name, name, 'Dependency package name mismatch.');
      assert.equal(metadata.version, version, 'Dependency package version mismatch.');
      return directory;
    }
    directory = dirname(directory);
  }
  throw new Error(`Cannot verify package boundary for ${name}.`);
}
function directoryHashes(directory) {
  const hashes = {};
  function visit(current) {
    if (lstatSync(current).isSymbolicLink()) throw new Error('Dependency symlinks are unsupported.');
    for (const entry of readdirSync(current, {withFileTypes: true}).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const path = join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Dependency symlinks are unsupported.');
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) hashes[relative(directory, path).split('\\').join('/')] = sha256(readFileSync(path));
      else throw new Error('Unsupported dependency filesystem entry.');
    }
  }
  visit(directory);
  return {sha256: digestValue(hashes), files: hashes};
}
function baselineSnapshot() {
  const protocol = readFileSync(join(here, 'protocol.json'));
  assert.equal(sha256(protocol), protocolSha256, 'Frozen protocol changed.');
  assert.equal(`${ENGINE.package.replace('@dimforge/', '')}/${ENGINE.version}`, P.engine);
  assert.equal(MACHINE.maxSteps, 3600);
  assert.equal(MACHINE.dt, 1 / 60);
  assert.equal(P.library, 'ml-cart/2.1.1');
  const packageMetadata = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'));
  assert.equal(packageMetadata.dependencies['ml-cart'], '2.1.1');
  const lock = JSON.parse(readFileSync(join(here, 'package-lock.json'), 'utf8'));
  assert.ok(lock.packages && lock.packages[''], 'A local npm package lock is required.');
  assert.equal(lock.packages[''].dependencies['ml-cart'], '2.1.1');
  const dependencies = {};
  for (const [path, locked] of Object.entries(lock.packages).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    if (path === '') continue;
    if (!path.startsWith('node_modules/') || path.split('/').some(part => !part || part === '.' || part === '..') ||
        path.includes('\\') || locked.link || typeof locked.integrity !== 'string')
      throw new Error('Unsupported unlocked or linked dependency.');
    const directory = resolve(here, path), rel = relative(here, directory);
    if (isAbsolute(rel) || rel.startsWith('..')) throw new Error('Dependency escapes the experiment.');
    const installed = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
    assert.equal(installed.version, locked.version, `Installed version differs from lock: ${path}`);
    dependencies[path] = {name: installed.name, version: installed.version,
      integrity: locked.integrity, ...directoryHashes(directory)};
  }
  assert.ok(dependencies['node_modules/ml-cart'], 'CART must be locally locked.');
  assert.equal(dependencies['node_modules/ml-cart'].name, 'ml-cart');
  assert.equal(dependencies['node_modules/ml-cart'].version, '2.1.1');
  assert.equal(resolve(LIBRARY_ROOT), resolve(here, 'node_modules/ml-cart'));
  findPackage(LIBRARY_ENTRY, 'ml-cart', '2.1.1');
  const engineRequire = createRequire(new URL('../rover3d/engine.mjs', import.meta.url));
  const engineRoot = findPackage(engineRequire.resolve(ENGINE.package), ENGINE.package, ENGINE.version);
  const sourcePaths = ['experiments/rover3d/contract.mjs', 'experiments/rover3d/world.mjs',
    'experiments/rover3d/stones.mjs', 'experiments/rover3d/engine.mjs',
    'experiments/learned-flow/experiment.mjs', 'experiments/learned-flow/run.mjs', 'experiments/learned-flow/measurements.mjs', 'experiments/learned-flow/dependency-proof.mjs',
    'experiments/learned-flow/package.json', 'experiments/learned-flow/package-lock.json',
    'experiments/learned-flow/protocol.json'];
  for (const path of ['experiments/rover3d/package.json', 'experiments/rover3d/package-lock.json']) {
    if (existsSync(join(repository, path))) sourcePaths.push(path);
  }
  const modules = Object.fromEntries(sourcePaths.sort().map(path => [path, sha256(readFileSync(join(repository, path)))]));
  return {declaredBaseRevision: P.baseRevision,
    revisionAuthentication: 'Not independently verified; source and installed dependency bytes are recorded and checked for changes during this run.',
    environment: environmentIdentity(),
    loadedCommonJS: proveLoadedModules(here,dependencies,Object.keys(createRequire(import.meta.url).cache)),
    lockedPackageEntries: Object.keys(lock.packages).length,
    installedLockedPackages: Object.keys(dependencies).length, modules, dependencies,
    engine: {package: ENGINE.package, version: ENGINE.version, ...directoryHashes(engineRoot)}};
}
function assertPartitions() {
  const seeds = partitions.flatMap(partition => P.seeds[partition]);
  assert.equal(new Set(seeds).size, seeds.length, 'Protocol seed partitions overlap.');
  assert.ok(seeds.every(seed => Number.isInteger(seed) && seed > 0 && seed <= 0xffffffff));
  assert.deepEqual(partitions.map(partition => P.seeds[partition].length), [24, 8, 12]);
  assert.deepEqual(P.courses, ['flat-lane', 'ramp-lane']);
}
function overlaps(data, keyFor) {
  const counts = Object.fromEntries(partitions.map(partition => {
    const map = new Map();
    for (const row of data[partition]) {
      const key = keyFor(row);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [partition, map];
  }));
  const result = [];
  for (let i = 0; i < partitions.length; i++) for (let j = i + 1; j < partitions.length; j++) {
    const left = partitions[i], right = partitions[j];
    let distinctShared = 0, leftOccurrences = 0, rightOccurrences = 0, matchingRowPairs = 0;
    for (const [key, count] of counts[left]) {
      const other = counts[right].get(key);
      if (!other) continue;
      distinctShared++;
      leftOccurrences += count;
      rightOccurrences += other;
      matchingRowPairs += count * other;
    }
    result.push({left, right, distinctShared, leftOccurrences, rightOccurrences, matchingRowPairs});
  }
  return result;
}
function duplicateWarmups(episodes) {
  const groups = new Map();
  for (const {partition, course, seed} of episodes) {
    const tape = buildWarmup(seed), key = JSON.stringify(tape);
    if (!groups.has(key)) groups.set(key, {tapeSha256: sha256(key), steps: tape.length, identities: []});
    groups.get(key).identities.push({partition, course, seed});
  }
  return [...groups.values()].filter(group => group.identities.length > 1);
}
function openLoop(model, rows) {
  const errors = Object.fromEntries(['demand', 'throttle', 'brake'].map(key =>
    [key, {sumAbsolute: 0, sumSquared: 0, maxAbsolute: 0}]));
  for (const row of rows) {
    const prediction = model.predict([row.features])[0];
    assert.ok(Number.isFinite(prediction), 'Nonfinite open-loop prediction.');
    const action = harnessAction(prediction, row.observation);
    for (const [key, error] of Object.entries({demand: prediction - row.demand,
      throttle: action.throttle - row.teacherAction.throttle, brake: action.brake - row.teacherAction.brake})) {
      errors[key].sumAbsolute += Math.abs(error);
      errors[key].sumSquared += error * error;
      errors[key].maxAbsolute = Math.max(errors[key].maxAbsolute, Math.abs(error));
    }
  }
  return {rows: rows.length, ...Object.fromEntries(Object.entries(errors).map(([key, value]) => [key, {
    mae: rows.length ? value.sumAbsolute / rows.length : null,
    rmse: rows.length ? Math.sqrt(value.sumSquared / rows.length) : null,
    maxAbsolute: rows.length ? value.maxAbsolute : null}]))};
}
function replayEpisode(R, course, episode) {
  const world = createRoverWorld(R, course);
  try {
    let state = world.snapshot();
    if (episode.warmupSteps === 0) assert.deepEqual(state, episode.switchState);
    for (let i = 0; i < episode.actions.length; i++) {
      assert.equal(state.status, 'running', 'Replay contains actions after termination.');
      state = world.step(episode.actions[i]);
      if (i + 1 === episode.warmupSteps) assert.deepEqual(state, episode.switchState);
    }
    assert.deepEqual(state, episode.final, 'Reexecuted action tape differs from recorded final snapshot.');
    return {passed: true, actionCount: episode.actions.length, finalSha256: digestValue(state)};
  } finally { world.dispose(); }
}

async function main() {
  const out = outputDirectory(process.argv.slice(2));
  assertPartitions();
  const frozenBaseline = baselineSnapshot();
  const R = await loadRapier();
  assert.equal(typeof R.version, 'function', 'Engine runtime version API is required.');
  assert.equal(R.version(), ENGINE.version, 'Runtime engine version mismatch.');
  reserveDirectory(out);
  const written = {};
  function write(name, text) {
    writeFileSync(join(out, name), text, {encoding: 'utf8', flag: 'wx'});
    written[name] = sha256(text);
    return written[name];
  }
  const protocolText = readFileSync(join(here, 'protocol.json'), 'utf8');
  assert.equal(sha256(protocolText), protocolSha256);
  write('protocol.json', protocolText);
  const data = Object.fromEntries(partitions.map(partition => [partition, []]));
  const generation = [];
  // Every declared teacher episode is retained, including warmup terminal failures.
  for (const partition of partitions) for (const course of P.courses) for (const seed of P.seeds[partition]) {
    const episode = runEpisode(R, course, seed, teacher, {partition, collectRows: true, policyKind: 'teacher'});
    data[partition].push(...episode.rows);
    generation.push({partition, course, seed, plannedWarmupSteps: buildWarmup(seed).length,
      warmupTerminal: episode.switchState.status !== 'running', ...episode});
  }
  const rowFiles = {};
  for (const partition of partitions) {
    const name = `${partition}-rows.json`;
    rowFiles[partition] = {file: name, rows: data[partition].length,
      episodes: generation.filter(episode => episode.partition === partition).length,
      sha256: write(name, json(data[partition]))};
  }
  const generationSha256 = write('data-episodes.json', json(generation));
  // There is one fit, with every admitted train row, using the frozen options.
  const fitted = fitRegressor(data.train);
  const artifact = saveArtifact(fitted, {trainingDataSha256: rowFiles.train.sha256, trainingRows: data.train.length});
  write('model.json', artifact.text);
  write('model.json.sha256', `${artifact.sha256}  model.json\n`);
  const loaded = loadArtifact(readFileSync(join(out, 'model.json'), 'utf8'), artifact.sha256);
  let parityRows = 0;
  for (const partition of partitions) for (const row of data[partition]) {
    assert.deepEqual(loaded.predict([row.features]), fitted.predict([row.features]), 'Serialized prediction parity failed.');
    assert.deepEqual(predictAction(loaded, row.observation), predictAction(fitted, row.observation), 'Action parity failed.');
    parityRows++;
  }
  const parity = {passed: true, rows: parityRows, modelSha256: artifact.sha256};
  const openLoopResults = Object.fromEntries(['validation', 'test'].map(partition => [partition, openLoop(loaded, data[partition])]));
  let actualModelCalls=0;
  const countedModel={predict(rows){actualModelCalls++;return loaded.predict(rows);}};
  const learned = o => predictAction(countedModel, o);
  const paired = [], references = [];
  function pair(partition, course, seed) {
    const flow = runEpisode(R, course, seed, teacher, {partition, policyKind: 'teacher'});
    const callsBefore=actualModelCalls;
    const imitation = runEpisode(R, course, seed, learned, {partition, policyKind: 'learned'});
    assert.equal(imitation.metrics.modelCalls,actualModelCalls-callsBefore,'Declared inference count differs from actual model calls.');
    assert.equal(flow.warmupSteps, imitation.warmupSteps);
    assert.deepEqual(flow.switchState, imitation.switchState, 'Paired switch states differ.');
    assert.deepEqual(flow.actions.slice(0, flow.warmupSteps), imitation.actions.slice(0, imitation.warmupSteps));
    assert.deepEqual(flow.actions.slice(0, flow.warmupSteps), buildWarmup(seed).slice(0, flow.warmupSteps));
    const replay = replayEpisode(R, course, imitation);
    return {partition, course, seed, switchStateEqual: true, teacher: flow, learned: imitation, replay};
  }
  for (const partition of ['validation', 'test']) for (const course of P.courses) for (const seed of P.seeds[partition]) {
    paired.push(pair(partition, course, seed));
  }
  for (const course of P.courses) references.push(pair('reference', course, 0));
  const summaries = Object.fromEntries(['validation', 'test'].map(partition => {
    const group = paired.filter(result => result.partition === partition);
    return [partition, {teacher: summarize(group, 'teacher'), learned: summarize(group, 'learned')}];
  }));
  const evaluation = {schema: 'stone.flow-imitation.evaluation/0.1', experimental: true, liveRegistered: false,
    protocolSha256, modelSha256: artifact.sha256, environment: frozenBaseline.environment, parity, openLoop: openLoopResults,
    summaries, heldOut: paired, zeroWarmupReferences: references,
    referenceSummary: {teacher: summarize(references, 'teacher'), learned: summarize(references, 'learned')},
    replay: {heldOutPassed: paired.length, referencePassed: references.length,
      heldOutActions: paired.reduce((sum, result) => sum + result.replay.actionCount, 0)},
    interpretation: P.claims,
    measurementNotes: ['All terminal outcomes are retained, including failures during warmup.',
      'Guard counts describe observed post-warmup states for both policies; domainFallbackSteps counts actual learned stop-guard actions.',
      'Path length and peak speed include warmup. Goal distance is three-dimensional.',
      'Validation is diagnostic only. No selection, tuning, deduplication or reseeding was performed.',
      'Zero-warmup references are separate from held-out results. Success rate is model-plus-harness, not causal proof of model benefit. No model calls and warmup completion are counted separately.',
      'policyCalls/modelCalls count successful callback paths; policySteps/modelSteps count actions whose exact one-tick physics advancement was checked. Engine faults abort acceptance rather than become normal task failures.']};
  write('evaluation.json', json(evaluation));
  // Freeze actual source/dependency byte inventories before work and recheck them.
  // npm integrity values identify locked tarballs; installed-file hashes are separate.
  assert.deepEqual(baselineSnapshot(), frozenBaseline, 'Baseline or dependencies changed during the run.');
  const provenance = {schema: 'stone.flow-imitation.provenance/0.1', protocolSha256,
    modelSha256: artifact.sha256, rowFiles, generation: {file: 'data-episodes.json', sha256: generationSha256,
      episodes: generation.length, warmupTerminals: generation.filter(episode => episode.warmupTerminal).length,
      terminalStatuses: generation.map(episode => ({partition: episode.partition, course: episode.course,
        seed: episode.seed, status: episode.final.status, rows: episode.rows.length}))},
    fit: {partition: 'train', calls: 1, options: P.modelOptions, rows: data.train.length, rowLimit: 20000},
    sampling: {tickModulo: P.sampleEvery, phase: 'pre-step, after warmup', guardsExcluded: true},
    warmupDrawOrder: 'block count; then brake event, throttle magnitude, steering per block; three draws even when braking',
    duplicateWarmupTapes: duplicateWarmups(generation),
    exactStateLabelOverlap: overlaps(data, row => JSON.stringify([row.observation, row.teacherAction])),
    exactFeatureDemandOverlap: overlaps(data, row => JSON.stringify([row.features, row.demand])),
    overlapDefinition: 'Exact JSON equality, before hashing; matchingRowPairs is the product of occurrence counts for each shared key.',
    frozenBaseline, files: {...written}};
  write('data-provenance.json', json(provenance));
  const teacherSummary = summarize(paired, 'teacher'), learnedSummary = summarize(paired, 'learned');
  process.stdout.write(json({out, partitions: rowFiles, modelSha256: artifact.sha256,
    heldOut: {teacherSuccessRate: teacherSummary.successRate, learnedSuccessRate: learnedSummary.successRate,
      learnedDomainFallbackFrequency: learnedSummary.domainFallbackFrequency},
    replayCounts: {heldOut: paired.length, reference: references.length}, experimental: true}));
}

main().catch(error => {
  process.stderr.write(`learned-flow: ${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
