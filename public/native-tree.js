const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const escape=x=>String(x).replaceAll('~','~0').replaceAll('/','~1');
// Build only expanded pages. All source values remain accessible, including long strings.
export function nativeTree(container,value,onField){
 function branch(key,value,path){
  const object=value!==null&&typeof value==='object',long=typeof value==='string'&&value.length>16000;
  const row=el('details'),summary=el('summary'),button=el('button',key);button.type='button';button.onclick=e=>{e.preventDefault();e.stopPropagation();onField(path);};summary.append(button,document.createTextNode(object?` ${Array.isArray(value)?'Array':'Object'} (${Object.keys(value).length})`:long?` String (${value.length})`:' '+JSON.stringify(value)));row.append(summary);
  if(!object&&!long)return row;
  let loaded=false,offset=0;const body=el('div'),more=el('button','读取更多');more.type='button';row.append(body,more);
  const keys=object?Object.keys(value):null;
  function page(){if(long){body.append(el('pre',value.slice(offset,offset+16000)));offset+=16000;more.hidden=offset>=value.length;}else{for(const k of keys.slice(offset,offset+100))body.append(branch(k,value[k],path+'/'+escape(k)));offset+=100;more.hidden=offset>=keys.length;}}
  more.onclick=page;row.ontoggle=()=>{if(row.open&&!loaded){loaded=true;page();}};return row;
 }
 const root=branch('$',value,'');container.replaceChildren(root);root.open=true;
}
