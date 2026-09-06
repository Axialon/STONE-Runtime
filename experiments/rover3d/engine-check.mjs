import {ENGINE} from './contract.mjs';
import {loadRapier} from './engine.mjs';
try {
  const R = await loadRapier();
  const world = new R.World({x:0,y:-9.81,z:0});
  try { world.step(); } finally { world.free(); }
  console.log(JSON.stringify({status:'engine-initialised', engine:ENGINE,
    note:'Initialisation only. Run the real-engine tests before claiming rover functionality.'}, null, 2));
} catch (error) {
  console.error(JSON.stringify({status:'blocked', code:error.code ?? 'ENGINE_INITIALISATION_FAILED', engine:ENGINE,
    note:'No substitute engine, download or mock was used. Physics is not verified.'}, null, 2));
  process.exitCode = 2;
}
