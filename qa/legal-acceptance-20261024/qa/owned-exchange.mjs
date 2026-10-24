// The ONLY SQL transport shipped here: owned network=none fictional fixture.
import {openOwnedSession} from '../../independent-controls-20261024/qa/owned-session.mjs';
export async function openQaExchange(id){
 const session=await openOwnedSession(id);
 await session.exec('set role qa_legal_bridge;');
 return Object.freeze({session,async exchange(op,digest,delivery){
  if(!['deliver','confirm'].includes(op)||!/^[a-f0-9]{64}$/.test(digest)|| (op==='confirm'&&!/^[a-f0-9-]{36}$/.test(delivery)))throw Error('QA_EXCHANGE_INPUT_DENIED');
  // Strict generated alphabet only. Future actual transport MUST use bound parameters.
  const q=op==='deliver'?`select qa_legal.deliver('${digest}') as result`:`select qa_legal.confirm('${digest}','${delivery}') as result`;
  return (await session.query(q)).rows[0].result;
 },close:()=>session.close()});
}
