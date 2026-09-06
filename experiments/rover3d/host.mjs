/** Node entry: only the reviewed, pinned engine is loaded. */
import {freeze,parseReplay} from './contract.mjs';
import {loadRapier} from './engine.mjs';
import {createRoverWorld} from './world.mjs';
export async function createRover(courseId='flat-lane'){return createRoverWorld(await loadRapier(),courseId);}

/** Actual engine replay only. A missing engine is an error, not a skipped verification. */
export async function replayRover(text) {
  const replay=parseReplay(text), host=await createRover(replay.courseId);
  try {
    const frames=[host.snapshot()];
    for(const action of replay.actions){
      if(host.snapshot().status!=='running')break;
      frames.push(host.step(action));
    }
    return freeze({frames,final:frames.at(-1)});
  } finally {host.dispose();}
}
