// Fictitious Web integration, intentionally not added to the real signup build.
// renderPlainText must use textContent, never innerHTML. No personal-data form.
export function createQaReviewFlow({post,renderPlainText,sha256}){
 let deliveryId=null;
 return Object.freeze({async open(){
  deliveryId=null;
  const r=await post('/qa/legal/delivery',{});
  if(r.status!==200||r.body.code!=='QA_DOCUMENTS_DELIVERED'||!Array.isArray(r.body.documents)||r.body.documents.length!==2)throw Error('QA_LEGAL_DELIVERY_UNAVAILABLE');
  const kinds=new Set();
  for(const d of r.body.documents){
   if(!['notice','terms'].includes(d.kind)||kinds.has(d.kind)||!/^fictional-v[0-9]+$/.test(d.version)||!/^https:\/\/legal\.invalid\/[a-z0-9/-]+$/.test(d.url)||typeof d.body!=='string'||typeof d.sha256!=='string'||d.sha256!==await sha256(d.body))throw Error('QA_LEGAL_DELIVERY_MISMATCH');kinds.add(d.kind);
  }
  await renderPlainText(r.body.documents); // Completion is not proof of human reading.
  deliveryId=r.body.deliveryId;
  return Object.freeze({reviewReady:true,personalDataCollectionAllowed:false});
 },async confirm(){
  if(!deliveryId)throw Error('QA_LEGAL_DELIVERY_REQUIRED');
  const r=await post('/qa/legal/confirm',{deliveryId});
  if(r.status!==200||r.body.code!=='QA_CANDIDATE_PENDING_ONLY'||r.body.managerActivated!==false||r.body.guestAccess!==false||r.body.trialStarted!==false||r.body.operationalApproval!==false){deliveryId=null;throw Error('QA_LEGAL_CONFIRMATION_DENIED');}
  return r;
 }});
}
