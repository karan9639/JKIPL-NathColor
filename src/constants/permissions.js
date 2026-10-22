export function canAccess(item,account){
 if(!item)return false;
 const role=String(typeof account==='object'&&account?account.role||'':'').trim().toLowerCase();
 if(role==='admin')return true;
 if(Array.isArray(item.allowedRoles))return item.allowedRoles.includes(role);
 if(Array.isArray(item.allowedUsers))return false;
 return true;
}
