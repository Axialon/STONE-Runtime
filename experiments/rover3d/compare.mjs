import {loadRapier} from './engine.mjs';
import {compareStones} from './session.mjs';
import {ENGINE,MACHINE} from './contract.mjs';
const R=await loadRapier();
const results=['flat-lane','ramp-lane'].flatMap(courseId=>compareStones(R,courseId).map(({path,...result})=>({courseId,...result})));
console.log(JSON.stringify({engine:ENGINE,machineVersion:MACHINE.version,note:'Rule-based prototypes; simulated metrics, not hardware energy or calibration.',results},null,2));
