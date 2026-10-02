import {db} from './firebase.js';
import {ref,get,push,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
const $=s=>document.querySelector(s),ksh=n=>'Ksh '+n.toLocaleString(),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let products=[],cat='',cart=JSON.parse(localStorage.getItem('bb-cart')||'{}');
const save=()=>{localStorage.setItem('bb-cart',JSON.stringify(cart));render()};
const toast=m=>{const t=Object.assign(document.createElement('div'),{className:'toast',textContent:m});document.body.append(t);setTimeout(()=>t.remove(),3000)};
async function load(){try{const s=await get(ref(db,'products'));products=Object.entries(s.val()||{}).map(([id,v])=>({id,...v})).filter(p=>p.active!==false).sort((a,b)=>(b.created||0)-(a.created||0))}catch(e){console.error(e);toast('Could not load products')}render()}
function render(){const cats=[...new Set(products.map(p=>p.category))],q=$('#q').value.toLowerCase();
 $('#tabs').innerHTML=['All',...cats].map(c=>`<button class="${(c==='All'?'':c)===cat?'on':''}" data-c="${esc(c==='All'?'':c)}">${esc(c)}</button>`).join('');
 const list=products.filter(p=>(!cat||p.category===cat)&&p.name.toLowerCase().includes(q));
 $('#grid').innerHTML=list.length?list.map(p=>`<article class="card"><div>${p.sale_price?'<span class="tag">Sale</span>':''}${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`:'<div class="ph"></div>'}</div><div class="in"><span class="cat">${esc(p.category)}</span><h3>${esc(p.name)}</h3><div class="price">${ksh(p.sale_price||p.price)}${p.sale_price?`<s>${ksh(p.price)}</s>`:''}</div>${p.stock>0?`<button class="btn" data-add="${p.id}">Add to cart</button>`:'<button class="btn alt" disabled>Out of stock</button>'}</div></article>`).join(''):'<p>No equipment found. Try another search or category.</p>';
 const ids=Object.keys(cart).filter(id=>products.find(p=>p.id==id));let total=0;
 $('#lines').innerHTML=ids.length?ids.map(id=>{const p=products.find(p=>p.id==id),pr=p.sale_price||p.price;total+=pr*cart[id];return `<div class="row"><span>${esc(p.name)}<br><small>${ksh(pr)}</small></span><span><button class="btn sm alt" data-d="${id}">−</button> ${cart[id]} <button class="btn sm alt" data-i="${id}">+</button></span></div>`}).join(''):'<p>Your cart is empty.</p>';
 $('#total').textContent=ksh(total);$('#cnt').textContent=ids.reduce((a,id)=>a+cart[id],0)}
document.addEventListener('click',e=>{const d=e.target.dataset;if(d.c!==undefined){cat=d.c;render()}
 if(d.add||d.i){const id=d.add||d.i;cart[id]=(cart[id]||0)+1;save();if(d.add)toast('Added to cart')}
 if(d.d){if(--cart[d.d]<=0)delete cart[d.d];save()}});
$('#cartBtn').onclick=()=>$('#cart').classList.add('open');$('#close').onclick=()=>$('#cart').classList.remove('open');
$('#q').oninput=render;
$('#co').onsubmit=async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.target));
 const items=Object.entries(cart).map(([id,qty])=>{const p=products.find(p=>p.id==id);return p&&{id,name:p.name,price:p.sale_price||p.price,qty}}).filter(Boolean);
 if(!items.length)return toast('Your cart is empty');
 const total=items.reduce((a,i)=>a+i.price*i.qty,0);
 try{const r=await push(ref(db,'orders'),{name:b.name.trim(),phone:b.phone.trim(),address:b.address.trim(),items,total,status:'new',created:serverTimestamp()});
  cart={};save();e.target.reset();$('#cart').classList.remove('open');toast(`Order #${r.key.slice(0,6).toUpperCase()} placed. We will call you to confirm delivery.`)}catch(err){console.error(err);toast('Could not place order. Please try again.')}};
load();
