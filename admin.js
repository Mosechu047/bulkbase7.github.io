import {db,auth} from './firebase.js';
import {ref,get,push,update,remove,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
import {signInWithEmailAndPassword,signOut,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let items=[];
const toast=m=>{const t=Object.assign(document.createElement('div'),{className:'toast',textContent:m});document.body.append(t);setTimeout(()=>t.remove(),3000)};
const fail=e=>{console.error(e);toast(/permission/i.test(e.code+e.message)?'Permission denied. Check the admin email in your database rules.':'Something went wrong. Please try again.')};
async function shrink(file){const bmp=await createImageBitmap(file),k=Math.min(1,800/Math.max(bmp.width,bmp.height)),c=document.createElement('canvas');c.width=bmp.width*k;c.height=bmp.height*k;c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.8)}
async function refresh(){try{const s=await get(ref(db,'products'));items=Object.entries(s.val()||{}).map(([id,v])=>({id,...v})).sort((a,b)=>(b.created||0)-(a.created||0));
 $('#cl').innerHTML=[...new Set(items.map(p=>p.category))].map(c=>`<option value="${esc(c)}">`).join('');
 $('#pt').innerHTML=items.map(p=>`<tr><td>${p.image?`<img src="${esc(p.image)}" alt="">`:''}</td><td>${esc(p.name)}<br><small>${esc(p.category)}${p.active===false?' (hidden)':''}</small></td><td>Ksh ${p.price.toLocaleString()}${p.sale_price?`<br><small>Sale: ${p.sale_price.toLocaleString()}</small>`:''}</td><td>${p.stock}</td><td><button class="btn sm" data-e="${p.id}">Edit</button> <button class="btn sm alt" data-x="${p.id}">Delete</button></td></tr>`).join('')||'<tr><td>No products yet. Add your first appliance above.</td></tr>';
 const o=Object.entries((await get(ref(db,'orders'))).val()||{}).map(([id,v])=>({id,...v})).sort((a,b)=>(b.created||0)-(a.created||0));
 $('#ot').innerHTML=o.map(x=>`<tr><td>#${x.id.slice(0,6).toUpperCase()}<br><small>${esc(x.created?new Date(x.created).toLocaleString():'')}</small></td><td>${esc(x.name)}<br>${esc(x.phone)}<br><small>${esc(x.address)}</small></td><td>${x.items.map(i=>`${i.qty}× ${esc(i.name)}`).join('<br>')}</td><td>Ksh ${x.total.toLocaleString()}</td><td><select data-o="${x.id}">${['new','delivered','cancelled'].map(s=>`<option ${s===x.status?'selected':''}>${s}</option>`).join('')}</select></td></tr>`).join('')||'<tr><td>No orders yet.</td></tr>'}catch(e){fail(e)}}
onAuthStateChanged(auth,u=>{$('#login').classList.toggle('hide',!!u);$('#dash').classList.toggle('hide',!u);$('#out').classList.toggle('hide',!u);if(u)refresh()});
$('#lf').onsubmit=async e=>{e.preventDefault();const f=e.target;try{await signInWithEmailAndPassword(auth,f.email.value.trim(),f.password.value)}catch{toast('Wrong email or password')}};
$('#out').onclick=()=>signOut(auth);
const F=$('#pf');
function reset(){F.reset();F.elements.id.value='';$('#ft').textContent='Add appliance';$('#cancel').classList.add('hide')}
$('#cancel').onclick=reset;
F.onsubmit=async e=>{e.preventDefault();const f=F.elements,id=f.id.value,file=f.image.files[0];
 const data={name:f.name.value.trim(),category:f.category.value.trim()||'General',description:f.description.value,price:parseInt(f.price.value),sale_price:f.sale_price.value?parseInt(f.sale_price.value):null,stock:parseInt(f.stock.value)||0,active:f.active.value==='1'};
 try{if(file)data.image=await shrink(file);
  if(id)await update(ref(db,'products/'+id),data);else await push(ref(db,'products'),{...data,created:serverTimestamp()});
  toast(id?'Appliance updated':'Appliance added');reset();refresh()}catch(err){fail(err)}};
document.addEventListener('click',async e=>{const d=e.target.dataset;
 if(d.e){const p=items.find(p=>p.id===d.e),f=F.elements;f.id.value=p.id;for(const k of['name','category','price','stock','description'])f[k].value=p[k]??'';f.sale_price.value=p.sale_price??'';f.active.value=p.active===false?'0':'1';$('#ft').textContent='Edit appliance';$('#cancel').classList.remove('hide');scrollTo(0,0)}
 if(d.x&&confirm('Delete this appliance?')){try{await remove(ref(db,'products/'+d.x));toast('Appliance deleted');refresh()}catch(err){fail(err)}}});
document.addEventListener('change',async e=>{if(e.target.dataset.o){try{await update(ref(db,'orders/'+e.target.dataset.o),{status:e.target.value});toast('Order updated')}catch(err){fail(err)}}});
