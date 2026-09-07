/** Report model-plus-harness outcomes; inference is not causal attribution. */
export function summarize(pairs, kind) {
  if (!['teacher','learned'].includes(kind)) throw new TypeError('Unknown evaluation role.');
  const episodes=pairs.map(pair=>pair[kind]), statuses={},
    totals={pathMetres:0,peakSpeed:0,goalDistance:0,chassisContactStarts:0,modelSteps:0,policySteps:0,modelCalls:0,policyCalls:0,domainFallbackSteps:0},
    guardCounts={airborne:0,goal:0,'out-of-domain':0};
  let warmupTerminals=0,warmupOnlySuccesses=0,modelInvokedSuccesses=0,zeroModelCallSuccesses=0,totalSeconds=0,controlSeconds=0;
  for(const episode of episodes){
    if(!episode||!['succeeded','timed-out','out-of-bounds'].includes(episode.final.status)) throw new Error('Evaluation contains an invalid engine terminal status.');
    for(const key of Object.keys(totals)) {
      const v=episode.metrics[key];if(!Number.isFinite(v)||v<0)throw new Error('Nonfinite or negative measurement.');totals[key]+=v;
    }
    for(const key of Object.keys(guardCounts)){
      const v=episode.metrics.guardCounts[key];if(!Number.isSafeInteger(v)||v<0)throw new Error('Invalid guard count.');guardCounts[key]+=v;
    }
    const seconds=episode.final.timeSeconds, start=episode.switchState.timeSeconds;
    if(!Number.isFinite(seconds)||!Number.isFinite(start)||start<0||seconds<start)throw new Error('Invalid episode time.');
    totalSeconds+=seconds;controlSeconds+=seconds-start;
    statuses[episode.final.status]=(statuses[episode.final.status]??0)+1;
    if(episode.switchState.status!=='running')warmupTerminals++;
    if(episode.final.status==='succeeded'){
      if(episode.switchState.status==='succeeded')warmupOnlySuccesses++;
      if(episode.metrics.modelCalls>0)modelInvokedSuccesses++;else zeroModelCallSuccesses++;
    }
  }
  const n=episodes.length;
  return {system:kind==='learned'?'learned-plus-deterministic-harness':'rule-reference',episodes:n,statuses,
    successes:statuses.succeeded??0,successRate:n?(statuses.succeeded??0)/n:null,
    warmupTerminals,warmupOnlySuccesses,modelInvokedSuccesses,zeroModelCallSuccesses,
    meanTotalSeconds:n?totalSeconds/n:null,meanControlSeconds:n?controlSeconds/n:null,
    means:Object.fromEntries(['pathMetres','peakSpeed','goalDistance','chassisContactStarts'].map(k=>[k,n?totals[k]/n:null])),
    modelSteps:totals.modelSteps,policySteps:totals.policySteps,modelCalls:totals.modelCalls,policyCalls:totals.policyCalls,
    guardCounts,domainFallbackSteps:totals.domainFallbackSteps,
    domainFallbackFrequency:totals.policySteps?totals.domainFallbackSteps/totals.policySteps:0};
}
