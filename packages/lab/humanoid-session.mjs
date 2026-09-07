import {createHumanoid,humanoidDecision,HUMANOID} from './humanoid.mjs';
import {createControlSession,replayControlSession} from './control-session.mjs';
import {boundedArray} from './common.mjs';
const spec={host:'humanoid',format:'stone.humanoid.session/0.2',...HUMANOID,tasks:['reach','high-reach'],create:createHumanoid,decide:humanoidDecision,validAction:a=>boundedArray(a,2,-2.7,.4)&&a[1]<=0};
export const createHumanoidSession=(R,task='reach',id='humanoid.fluid')=>createControlSession(R,spec,task,id);
export const replayHumanoidSession=(R,text)=>replayControlSession(R,spec,text);
