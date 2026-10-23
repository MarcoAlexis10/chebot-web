import path from 'node:path';import {realpath,lstat} from 'node:fs/promises';
export async function requireDistinctDownloadedPair(c){
 const originals=[path.join(c.custodyRoot,'data',c.captureName+'.cva'),path.join(c.custodyRoot,'keys',c.captureName+'.cclave')];
 for(const [download,original] of [[c.downloadedDataFile,originals[0]],[c.downloadedKeyFile,originals[1]]]){
  if(typeof download!=='string'||!path.isAbsolute(download))throw Error('PRIVATE_DOWNLOADED_COPY_REQUIRED');
  const [a,b,sa,sb]=await Promise.all([realpath(download),realpath(original),lstat(download,{bigint:true}),lstat(original,{bigint:true})]);
  if(a.toLowerCase()===b.toLowerCase()||(sa.dev===sb.dev&&sa.ino===sb.ino))throw Error('PRIVATE_DOWNLOADED_COPY_REQUIRED');
 }
}
