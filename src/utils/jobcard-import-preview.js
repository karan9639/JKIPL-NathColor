/** Client-side preflight only; backend revalidates and enforces a unique ERP-line key. */
const clean = value => String(value ?? '').trim().replace(/\s+/g,' ');
const normKey = key => key.replace(/[^a-z0-9]/gi,'').toLowerCase();
const get = (row,...names) => {
 const fields = new Map(Object.entries(row).map(([key,val])=>[normKey(key),val]));
 for(const name of names){ const val=fields.get(normKey(name)); if(clean(val))return clean(val); }
 return '';
};
export function preflightJobCards(records) {
 const rows=[],errors=[],keys=new Map();let duplicateRows=0;
 records.forEach((row,i)=>{
  const jobCardNo=get(row,'JOB CARD NO.','jobCardNo');
  const orderId=get(row,'ORDER ID','orderId');
  const item=get(row,'ITEM NAME','itemName');
  const customer=get(row,'CUSTOMER NAME','customerName');
  const date=get(row,'JOB CARD DATE','jobCardDate');
  if(!jobCardNo||!orderId||!item||!customer||!date){errors.push(`Row ${i+1}: missing Job Card No., Order ID, Item Name, Customer Name or Job Card Date`);return;}
  const values=[jobCardNo,orderId,item,get(row,'COLOR','color'),get(row,'MANUAL LOT NO.','manualLotNo')];
  const identity=JSON.stringify(values.map(v=>v.toLowerCase()));
  const content=JSON.stringify([
    ...values,customer,date,get(row,'JOB CARD TIME','jobCardTime'),get(row,'CUSTOMER GROUP','customerGroup'),
    get(row,'SUB PRODUCT','subProduct'),get(row,'QUANTITY','quantity'),get(row,'KGS','kgs'),
    get(row,'STATUS','status'),get(row,'CREATED BY','createdBy'),
    get(row,'COLOUR & CHEMICAL REQ. SLIP DATE','colourAndChemicalRequiredSupplyDate')
  ].map(v=>v.toLowerCase()));
  if(keys.has(identity)) {
    const old=keys.get(identity);
    if(old.content!==content)errors.push(`Rows ${old.number} and ${i+1}: same Job Card ${jobCardNo} / Order ${orderId}, but conflicting details`);
    else duplicateRows++;
    return;
  }
  keys.set(identity,{content,number:i+1});rows.push(row);
 });
 return {rows,errors,duplicateRows};
}
