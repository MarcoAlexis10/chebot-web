// Read-only, aggregates only, no connection/approval capability.
export async function auditRetentionBeforeRelease(client){
 const denied=()=>({status:'blocked',code:'RETENTION_AUDIT_UNAVAILABLE',operationalApproval:false});
 try{
  const {rows}=await client.query(`select
   case when not exists(select from qa_ret.gate where id=1 and clock_floor<=clock_timestamp()) then 1 else 0 end as clock_regressed,
   (select count(*)::int from qa_ret.material m join qa_ret.subjects s on(s.scope=m.scope and s.subject=m.subject) where m.payload is not null and m.category in('CHAT','SUMMARY') and(clock_timestamp()>=s.checkout_at or s.revoked_at is not null or s.erase_requested)) as expired_general_content,
   (select count(*)::int from qa_ret.material m join qa_ret.tombstones t on t.record_id=m.id where m.payload is not null) as resurrected_material,
   (select count(*)::int from qa_ret.material where policy is null or expires_at is null or state='REVIEW') as review_required,
   (select count(*)::int from qa_ret.case_evidence where state='REVIEW' or(excerpt is not null and expires_at<=clock_timestamp())) as case_review_required,
   (select count(*)::int from qa_ret.tombstones where review_at<=clock_timestamp())+(select count(*)::int from qa_ret.suppression where review_at<=clock_timestamp()) as overdue_marker_review,
   (select count(*)::int from qa_ret.provider_tasks) as external_outcomes_pending`);
  const r=rows[0],fields=['clock_regressed','expired_general_content','resurrected_material','review_required','case_review_required','overdue_marker_review','external_outcomes_pending'];
  if(!r||fields.some(k=>!Number.isSafeInteger(r[k])||r[k]<0))return denied();
  return {status:fields.every(k=>r[k]===0)?'fictional_retention_scope_clear':'blocked',counts:r,independentJournalCompletenessVerified:false,providersErasureVerified:false,fullErasureVerified:false,operationalApproval:false};
 }catch{return denied();}
}
