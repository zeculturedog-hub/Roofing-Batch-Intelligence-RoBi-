/**
 * Preliminary, configurable compatibility model. Values are assumptions until
 * validated against production and laboratory colour measurements.
 */
export const scoringConfig={
  weights:{productMaterial:25,color:20,coating:15,thickness:10,finish:10,length:5,plant:5,age:10},
  thresholds:{high:90,good:75,moderate:60}
};

const MS_PER_DAY=86_400_000;
const daysBetween=(left,right)=>Math.abs(Math.round((new Date(left)-new Date(right))/MS_PER_DAY));
const categorical=[
  {factor:'product / material',fields:['product','material'],weight:'productMaterial'},
  {factor:'color',fields:['color'],weight:'color'}, {factor:'coating',fields:['coating'],weight:'coating'},
  {factor:'thickness',fields:['thickness'],weight:'thickness'}, {factor:'finish',fields:['finish'],weight:'finish'},
  {factor:'length / profile',fields:['length'],weight:'length'}, {factor:'production plant / origin',fields:['plant'],weight:'plant'}
];

function ageScore(days,max){
  // Preliminary 30-day business rule, deliberately graded within each band.
  if(days<=30)return Math.max(8,Math.round(max-(days/30)*2));
  if(days<=60)return Math.max(5,Math.round(7-((days-31)/29)*2));
  if(days<=90)return Math.max(2,Math.round(4-((days-61)/29)*2));
  return Math.max(0,Math.round(1-Math.min(days-91,30)/30));
}
function classFor(score,thresholds){return score>=thresholds.high?'HIGH':score>=thresholds.good?'GOOD':score>=thresholds.moderate?'MODERATE':'LOW'}

export function evaluate(target,batch,config=scoringConfig){
  const breakdown=categorical.map(({factor,fields,weight})=>{
    const hasValues=fields.every(field=>Boolean(target[field])&&Boolean(batch[field]));
    const match=hasValues&&fields.every(field=>target[field]===batch[field]);
    return {factor,max:config.weights[weight],value:match?config.weights[weight]:0,match,missing:!hasValues};
  });
  const referenceDate=target.referenceDate||new Date().toISOString().slice(0,10);
  const ageDifference=batch.productionDate?daysBetween(referenceDate,batch.productionDate):null;
  const ageValue=ageDifference===null?0:ageScore(ageDifference,config.weights.age);
  breakdown.push({factor:'stock-age proximity',max:config.weights.age,value:ageValue,match:ageValue>=8,missing:ageDifference===null,ageDifference});
  const score=breakdown.reduce((sum,factor)=>sum+factor.value,0);
  const classification=classFor(score,config.thresholds);
  const matchingFactors=breakdown.filter(f=>f.match).map(f=>f.factor);
  const nonMatchingFactors=breakdown.filter(f=>!f.match).map(f=>f.missing?`${f.factor} (missing data)`:f.factor);
  const warnings=[];
  if(ageDifference===null)warnings.push('Production date is missing, so no stock-age points were awarded.');
  else if(ageDifference>30)warnings.push(`Stock-age difference: ${ageDifference} days — preliminary 30-day assumption requires review.`);
  if(classification==='LOW')warnings.push('Low preliminary compatibility: review operationally before allocation.');
  const explanation=classification==='HIGH'
    ?`Strong preliminary compatibility. The batch shares the primary product and production characteristics; stock-age difference is ${ageDifference??'not available'}${ageDifference===null?'':' days'}.`
    :`${classification[0]+classification.slice(1).toLowerCase()} preliminary compatibility. ${nonMatchingFactors.length?`Differences in ${nonMatchingFactors.join(', ')} reduce the score.`:'Stock-age proximity is the main differentiator.'}`;
  return {batch,score,classification,breakdown,matchingFactors,nonMatchingFactors,ageDifference,warnings,explanation};
}

export function recommend(target,batches,required){
  const results=batches.map(batch=>evaluate(target,batch)).sort((a,b)=>b.score-a.score||b.batch.quantity-a.batch.quantity);
  let total=0; const selected=[];
  for(const result of results){
    selected.push(result); total+=result.batch.quantity;
    if(total>=required)break;
  }
  const lowCompatibilityIncluded=selected.some(result=>result.classification==='LOW');
  return {selected,total,results,canFulfil:total>=required,lowCompatibilityIncluded};
}
