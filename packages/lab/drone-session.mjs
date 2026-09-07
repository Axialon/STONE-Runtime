import {createDrone,droneDecision,DRONE} from './drone.mjs';
import {createControlSession,replayControlSession} from './control-session.mjs';
import {boundedArray} from './common.mjs';
const spec={host:'drone',format:'stone.drone.session/0.2',...DRONE,tasks:['hover','inspection'],create:createDrone,decide:droneDecision,validAction:a=>boundedArray(a,4,0,1)};
export const createDroneSession=(R,task='hover',id='drone.cinema',route=null)=>createControlSession(R,spec,task,id,route);
export const replayDroneSession=(R,text)=>replayControlSession(R,spec,text);
