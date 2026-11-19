/* Each generated chapter/level has ten parameterized questions but three
 * mathematical problem families. Take only one item per family per attempt.
 * This prevents near-identical prompts that differ only by numerical values.
 */
(function(root){
  'use strict';
  function shuffled(input,random=Math.random){
    const items=input.slice();
    for(let i=items.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}
    return items;
  }
  function family(item){
    const match=String(item.id||'').match(/^C(\d+)([FMD])(\d+)$/);
    if(!match)return String(item.id);
    return match[1]+'|'+match[2]+'|'+((Number(match[3])-1)%3);
  }
  function select(pool,count,random=Math.random){
    const groups=new Map();
    for(const q of pool){const key=family(q);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(q);}
    if(groups.size<count)throw new Error('Il existe seulement '+groups.size+' types distincts de QCM pour ces paramètres.');
    const representatives=shuffled([...groups.values()],random).slice(0,count).map(g=>shuffled(g,random)[0]);
    return shuffled(representatives,random);
  }
  root.L1_DIVERSE=Object.freeze({select,family});
})(typeof window==='undefined'?globalThis:window);
