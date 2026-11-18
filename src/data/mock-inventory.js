export const inventory = [
  // Sibling Group 1: DA01 - Fresh Prepainted Coils (0–30 days) - IPP0184 series
  {id:'1',batchId:'IPP0184253',product:'PPAZ COIL (Brick Red)',material:'ZPAZ Coil 0.25mm',materialType:'ZPAZ',color:'Brick Red',thickness:'0.25 mm',finish:'GLS',coating:'PPAZ',length:'Coil',plant:'DA01 - Dar es Salaam',location:'Bay 1 / Coil Row A',quantity:2350,quantityUnit:'KG',ageBucket:'0–30 days',productionDate:'2026-08-18'},
  {id:'2',batchId:'IPP0184387',product:'PPAZ COIL (Brick Red)',material:'ZPAZ Coil 0.25mm',materialType:'ZPAZ',color:'Brick Red',thickness:'0.25 mm',finish:'GLS',coating:'PPAZ',length:'Coil',plant:'DA01 - Dar es Salaam',location:'Bay 1 / Coil Row A',quantity:1690,quantityUnit:'KG',ageBucket:'0–30 days',productionDate:'2026-08-19'},
  {id:'3',batchId:'IPP0184411',product:'PPAZ COIL (Brick Red)',material:'ZPAZ Coil 0.25mm',materialType:'ZPAZ',color:'Brick Red',thickness:'0.25 mm',finish:'GLS',coating:'PPAZ',length:'Coil',plant:'DA01 - Dar es Salaam',location:'Bay 1 / Coil Row A',quantity:1271,quantityUnit:'KG',ageBucket:'0–30 days',productionDate:'2026-08-20'},
  {id:'4',batchId:'IPP0184863',product:'PPAZ COIL (Brick Red)',material:'ZPAZ Coil 0.25mm',materialType:'ZPAZ',color:'Brick Red',thickness:'0.25 mm',finish:'GLS',coating:'PPAZ',length:'Coil',plant:'DA01 - Dar es Salaam',location:'Bay 1 / Coil Row B',quantity:1980,quantityUnit:'KG',ageBucket:'0–30 days',productionDate:'2026-08-22'},

  // Group 2: Large Single Coils (Tier 1 Zero-Mix candidates)
  {id:'5',batchId:'IPP0183265',product:'PPAZ COIL (Charcoal)',material:'ZPAZ Coil 0.30mm',materialType:'ZPAZ',color:'Charcoal',thickness:'0.30 mm',finish:'MAT',coating:'PPAZ',length:'Coil',plant:'DA01 - Dar es Salaam',location:'Bay 2 / Coil Row C',quantity:3530,quantityUnit:'KG',ageBucket:'0–30 days',productionDate:'2026-08-12'},
  {id:'6',batchId:'IPP0171811',product:'PPAZ COIL (Charcoal)',material:'ZPAZ Coil 0.30mm',materialType:'ZPAZ',color:'Charcoal',thickness:'0.30 mm',finish:'MAT',coating:'PPAZ',length:'Coil',plant:'DA01 - Dar es Salaam',location:'Bay 2 / Coil Row C',quantity:3770,quantityUnit:'KG',ageBucket:'61–90 days',productionDate:'2026-06-15'},

  // Group 3: Adjacent Age (31-60 days) - IPP0174 series
  {id:'7',batchId:'IPP0174479',product:'PPAZ COIL (Brick Red)',material:'ZPAZ Coil 0.25mm',materialType:'ZPAZ',color:'Brick Red',thickness:'0.25 mm',finish:'GLS',coating:'PPAZ',length:'Coil',plant:'DA01 - Dar es Salaam',location:'Bay 3 / Coil Row A',quantity:3130,quantityUnit:'KG',ageBucket:'31–60 days',productionDate:'2026-07-16'},
  {id:'8',batchId:'IPP0176758',product:'PPAZ COIL (Brick Red)',material:'ZPAZ Coil 0.25mm',materialType:'ZPAZ',color:'Brick Red',thickness:'0.25 mm',finish:'GLS',coating:'PPAZ',length:'Coil',plant:'DA01 - Dar es Salaam',location:'Bay 3 / Coil Row A',quantity:2934,quantityUnit:'KG',ageBucket:'31–60 days',productionDate:'2026-07-22'},

  // Group 4: Aged Coils (366-730 days) - IT00003 series
  {id:'9',batchId:'IT00003905',product:'PPAZ COIL (Brick Red)',material:'ZPAZ Coil 0.25mm',materialType:'ZPAZ',color:'Brick Red',thickness:'0.25 mm',finish:'GLS',coating:'PPAZ',length:'Coil',plant:'DA01 - Dar es Salaam',location:'Yard D (Aged)',quantity:1238,quantityUnit:'KG',ageBucket:'366–730 days',productionDate:'2025-06-10'},
  
  // Group 5: Other Plants (AR01 Arusha & MB02 Mbeya)
  {id:'10',batchId:'IPP0184910',product:'PPAZ COIL (Brick Red)',material:'ZPAZ Coil 0.25mm',materialType:'ZPAZ',color:'Brick Red',thickness:'0.25 mm',finish:'GLS',coating:'PPAZ',length:'Coil',plant:'AR01 - ALAF Arusha',location:'Arusha Yard 1',quantity:2400,quantityUnit:'KG',ageBucket:'0–30 days',productionDate:'2026-08-20'},
  {id:'11',batchId:'IPP0178120',product:'PPAZ COIL (Forest Green)',material:'ZPAZ Coil 0.30mm',materialType:'ZPAZ',color:'Forest Green',thickness:'0.30 mm',finish:'GLS',coating:'PPAZ',length:'Coil',plant:'DA02 - Dar es Salaam',location:'Bay 4 / Row B',quantity:4500,quantityUnit:'KG',ageBucket:'31–60 days',productionDate:'2026-07-10'},
  {id:'12',batchId:'XIM0135831',product:'HR COIL (Bare Steel)',material:'ZHRC Hot Rolled',materialType:'ZHRC',color:'Bare / Unpainted',thickness:'2.00 mm',finish:'Bare',coating:'None',length:'Coil',plant:'AL98 - ALAF Import',location:'Import Holding',quantity:8010,quantityUnit:'KG',ageBucket:'0–30 days',productionDate:'2026-08-15'}
];

export const complaints = [
  {id:'CMP-0261',date:'2026-08-21',customerReference:'SO-812941',product:'PPAZ COIL (Brick Red)',color:'Brick Red',batches:'IPP0184253 + IT00003905',plant:'DA01 - Dar es Salaam',issueType:'Visible shade variation',severity:'High',description:'Customer reported visible shade variation between roofing sheets roll-formed from fresh coil IPP0184253 and aged coil IT00003905 (>1 year apart).',status:'Under Investigation'},
  {id:'CMP-0258',date:'2026-08-11',customerReference:'SO-810300',product:'PPAZ COIL (Forest Green)',color:'Forest Green',batches:'IPP0178120 + IPP0184910',plant:'Cross-Plant (DA02 + AR01)',issueType:'Finish / gloss variation',severity:'Medium',description:'Mixed coils from Dar es Salaam and Arusha plants had slight gloss difference.',status:'Resolved'}
];

