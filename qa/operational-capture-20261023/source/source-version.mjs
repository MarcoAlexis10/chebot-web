// Conservative compatibility: same PostgreSQL major, not newer than the pinned
// 17.11 local restore client/server. No inference about actual DEV version.
export function supportsServer17(version){
 if(typeof version!=='string')return false;
 const m=/^17\.(0|[1-9][0-9]*)(?:$|\s)/.exec(version);
 return Boolean(m&&Number(m[1])<=11);
}
