// Offline QA observability primitive. No I/O, credentials or capture authorization.
const normal=['CLAIM_PERSIST','SOURCE_CONSTRUCTION','CUSTODY_CHECK','LOCK_CREATE','TARGET_VACANCY','TEMP_PREPARE','ENCRYPT_STREAM','HELP_RESULT','PROBE_RESULT','PROBE_VALIDATE','DUMP_STREAM','ENVELOPE_VERIFY','PAIR_PUBLISH','PAIR_HASH','FINAL_RECEIPT'];
const cleanup=['CLIENT_CLEANUP','TEMP_CLEANUP','LOCK_CLEANUP'];
const allowed=new Set([...normal,...cleanup]);
export function createStageObserver(){
 let firstFailure=null,lastStage=null,truncated=false;const events=[],cleanupFailures=[];
 function record(stage,status){lastStage=stage;if(events.length<128)events.push(Object.freeze({stage,status}));else truncated=true;}
 return Object.freeze({
  async run(stage,operation){
   if(!allowed.has(stage)||typeof operation!=='function')throw Error('DIAGNOSTIC_INPUT_REJECTED');
   record(stage,'BEGIN');
   try{const result=await operation();record(stage,'OK');return result;}
   catch(error){record(stage,'FAIL');if(cleanup.includes(stage)){if(!cleanupFailures.includes(stage))cleanupFailures.push(stage);}else if(firstFailure===null)firstFailure=stage;
    // Never inspect message/code/stack/cause, interpolate or retain the error.
    throw error;
   }
  },
  snapshot(){return Object.freeze({kind:'CHEVENI_STAGE_ONLY_QA_V1',firstFailure,lastStage,cleanupFailures:Object.freeze([...cleanupFailures]),events:Object.freeze([...events]),truncated,sourceContact:'UNKNOWN',authorizesCapture:false});}
 });
}
export function interpretIncidentMetadata(v){
 const names=['claimExists','publishedData','publishedKey','publishedReceipt','clientRemains'];
 if(!v||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).sort().join('|')!==names.sort().join('|')||names.some(k=>typeof v[k]!=='boolean'))throw Error('DIAGNOSTIC_INPUT_REJECTED');
 return Object.freeze({attempt:v.claimExists?'CONSUMED_NO_RETRY':'CLAIM_NOT_OBSERVED__STOP',failureStage:'UNKNOWN_NO_HISTORICAL_TRACE',sourceContact:'UNKNOWN',publishedPair:v.publishedData&&v.publishedKey?'PRESENT_NOT_VERIFIED':(!v.publishedData&&!v.publishedKey?'NOT_OBSERVED':'PARTIAL__PRESERVE'),finalReceipt:v.publishedReceipt?'PRESENT_NOT_VERIFIED':'NOT_OBSERVED',clientsNow:v.clientRemains?'PRESENT__DO_NOT_DELETE':'NOT_OBSERVED__NO_PAST_INFERENCE',authorizesCapture:false,integralRecoveryVerified:false});
}
