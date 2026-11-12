// Proposed privileges only, not a catalog observation or SQL installer.
import {isDeepStrictEqual} from 'node:util';import {record,out} from '../functional-night-20261112-v1/core.mjs';
import {proposedReaderProfile as profile} from './reconciliation.mjs';
const columns={
 'concierge_invite_private.manager_result_v1':['principal_id','intent_id','account_id','member_id','original_role','operation','command_digest','state','result_property_id'],
 'concierge_invite_private.beta_property_slot_v1':['account_id','property_id','city'],
 'public.concierge_properties':['id','account_id','city','status']
};
export function readerPlan(){return{mode:'REVIEW_ONLY',installed:false,login:{name:profile.sessionUser,inherit:false,superuser:false,bypassRls:false,createRole:false,createDb:false,memberships:[],tableGrants:[],execute:[profile.entry]},owner:{name:profile.currentUser,login:false,inherit:false,superuser:false,bypassRls:false,createRole:false,createDb:false,memberships:[],ownsTables:[],selectColumns:structuredClone(columns),writeGrants:[],executeDependencies:[]},entry:{name:profile.entry,schemaExposed:false,securityDefiner:true,searchPath:'',publicExecute:false,owner:profile.currentUser},rls:{enabledRequired:true,forcedRequired:true,contextProducerPresent:false,approvedPoliciesPresent:false},dependencies:{authorityProducerPresent:false,originalCustodyPresent:false,externalCommitVerifierPresent:false,journalVerifierPresent:false,catalogCaptured:false}};}
export function reviewReaderPlan(raw){try{
 const p=record(raw,['mode','installed','login','owner','entry','rls','dependencies']);const expected=readerPlan();
 // Exact proposal comparison rejects inherited writer grants and unexplained
 // helper EXECUTE privileges. A future dependency requires a reviewed version.
 if(!isDeepStrictEqual(p,expected))throw Error();return out('READER_PROFILE_REVIEWED_HELD',{proposalConsistent:true,effectivePrivilegesAccredited:false,nativeReadOnlyAccredited:false,ddlGenerated:false});
 }catch{return out('READER_PROFILE_INCOMPATIBLE_HELD',{proposalConsistent:false,effectivePrivilegesAccredited:false,nativeReadOnlyAccredited:false,ddlGenerated:false});}}
