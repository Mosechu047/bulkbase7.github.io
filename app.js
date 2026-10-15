import {db, auth} from './firebase.js';
import {ref, get, push, serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';

const $ = s => document.querySelector(s),
      ksh = n => 'Ksh ' + n.toLocaleString(),
      esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let products = [], cat = '', cart = JSON.parse(localStorage.getItem('bb-cart') || '{}');
let currentUser = null;

const save = () => { localStorage.setItem('bb-cart', JSON.stringify(cart)); render(); };
const toast = m => {
  const t = Object.assign(document.createElement('div'), { className: 'toast', textContent: m });
  document.body.append(t);
  setTimeout(() => t.remove(), 3000);
};

/* ─────────────────────────────────────────────
   LOAD PRODUCTS
   ───────────────────────────────────────────── */
async function load() {
  try {
    const s = await get(ref(db, 'products'));
    products = Object.entries(s.val() || {}).map(([id, v]) => ({ id, ...v }))
      .filter(p => p.active !== false)
      .sort((a, b) => (b.created || 0) - (a.created || 0));
  } catch (e) {
    console.error(e);
    toast('Could not load products');
  }
  render();
}

/* ─────────────────────────────────────────────
   RENDER PRODUCTS + CART
   ───────────────────────────────────────────── */
function render() {
  const cats = [...new Set(products.map(p => p.category))],
        q = $('#q').value.toLowerCase();
  $('#tabs').innerHTML = ['All', ...cats].map(c =>
    `<button class="${(c === 'All' ? '' : c) === cat ? 'on' : ''}" data-c="${esc(c === 'All' ? '' : c)}">${esc(c)}</button>`
  ).join('');

  const list = products.filter(p => (!cat || p.category === cat) && p.name.toLowerCase().includes(q));
  $('#grid').innerHTML = list.length ? list.map(p =>
    `<article class="card">
      <div>${p.sale_price ? '<span class="tag">Sale</span>' : ''}${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : '<div class="ph"></div>'}</div>
      <div class="in">
        <span class="cat">${esc(p.category)}</span>
        <h3>${esc(p.name)}</h3>
        <div class="price">${ksh(p.sale_price || p.price)}${p.sale_price ? `<s>${ksh(p.price)}</s>` : ''}</div>
        ${p.stock > 0 ? `<button class="btn" data-add="${p.id}">Add to cart</button>` : '<button class="btn alt" disabled>Out of stock</button>'}
      </div>
    </article>`
  ).join('') : '<p>No products found. Try another search or category.</p>';

  const ids = Object.keys(cart).filter(id => products.find(p => p.id == id));
  let total = 0;
  $('#lines').innerHTML = ids.length ? ids.map(id => {
    const p = products.find(p => p.id == id),
          pr = p.sale_price || p.price;
    total += pr * cart[id];
    return `<div class="row">
      <span>${esc(p.name)}<br><small>${ksh(pr)}</small></span>
      <span>
        <button class="btn sm alt" data-d="${id}">−</button> ${cart[id]}
        <button class="btn sm alt" data-i="${id}">+</button>
      </span>
    </div>`;
  }).join('') : '<p>Your cart is empty.</p>';

  $('#total').textContent = ksh(total);
  $('#cnt').textContent = ids.reduce((a, id) => a + cart[id], 0);
}

/* ─────────────────────────────────────────────
   CART INTERACTIONS
   ───────────────────────────────────────────── */
document.addEventListener('click', e => {
  const d = e.target.dataset;

  if (d.c !== undefined) { cat = d.c; render(); }

  if (d.add || d.i) {
    // Require login before adding to cart
    if (!currentUser) {
      toast('Please log in to shop.');
      openAuth('login');
      return;
    }
    const id = d.add || d.i;
    cart[id] = (cart[id] || 0) + 1;
    save();
    if (d.add) toast('Added to cart');
  }

  if (d.d) {
    if (--cart[d.d] <= 0) delete cart[d.d];
    save();
  }
});

$('#cartBtn').onclick = () => $('#cart').classList.add('open');
$('#close').onclick   = () => $('#cart').classList.remove('open');
$('#q').oninput       = render;

/* ─────────────────────────────────────────────
   PAYMENT METHOD TOGGLE
   ───────────────────────────────────────────── */
document.querySelectorAll('input[name="payment_method"]').forEach(radio => {
  radio.addEventListener('change', e => {
    const isMpesa = e.target.value === 'mpesa';
    document.getElementById('mpesaInfo').classList.toggle('hide', !isMpesa);
    document.getElementById('mpesaCodeWrap').classList.toggle('hide', !isMpesa);
    const codeInput = document.querySelector('input[name="mpesa_code"]');
    if (codeInput) {
      codeInput.required = isMpesa;
      if (!isMpesa) codeInput.value = '';
    }
  });
});

/* ─────────────────────────────────────────────
   AUTH MODAL
   ───────────────────────────────────────────── */
const authModal  = document.getElementById('authModal');
const authTitle  = document.getElementById('authTitle');
const loginForm  = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const forgotForm = document.getElementById('forgotForm');
const authBtn    = document.getElementById('authBtn');
const userBanner = document.getElementById('userBanner');
const userName   = document.getElementById('userName');
const userEmail  = document.getElementById('userEmail');
const loginPrompt = document.getElementById('loginPrompt');
const coForm     = document.getElementById('co');

function showForm(which) {
  loginForm.classList.add('hide');
  signupForm.classList.add('hide');
  forgotForm.classList.add('hide');
  if (which === 'login')  { loginForm.classList.remove('hide');  authTitle.textContent = 'Log in'; }
  if (which === 'signup') { signupForm.classList.remove('hide'); authTitle.textContent = 'Sign up'; }
  if (which === 'forgot') { forgotForm.classList.remove('hide'); authTitle.textContent = 'Reset password'; }
}

function openAuth(which = 'login') {
  authModal.classList.remove('hide');
  showForm(which);
}
function closeAuth() { authModal.classList.add('hide'); }

authBtn.onclick = () => {
  if (currentUser) {
    if (confirm('Log out of your Bulkbase account?')) {
      signOut(auth).then(() => toast('Logged out'));
    }
  } else {
    openAuth('login');
  }
};

document.getElementById('authClose').onclick = closeAuth;
document.getElementById('toSignup').onclick  = e => { e.preventDefault(); showForm('signup'); };
document.getElementById('toLogin').onclick   = e => { e.preventDefault(); showForm('login'); };
document.getElementById('toLogin2').onclick  = e => { e.preventDefault(); showForm('login'); };
document.getElementById('toForgot').onclick  = e => { e.preventDefault(); showForm('forgot'); };
document.getElementById('promptLogin').onclick = () => openAuth('login');

authModal.addEventListener('click', e => {
  if (e.target === authModal) closeAuth();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !authModal.classList.contains('hide')) closeAuth();
});

/* ─────────────────────────────────────────────
   SIGN UP
   ───────────────────────────────────────────── */
signupForm.onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  const name  = f.name.value.trim();
  const email = f.email.value.trim();
  const phone = f.phone.value.trim();
  const pass  = f.password.value;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });

    await push(ref(db, 'customers'), {
      uid: cred.user.uid,
      name, email, phone,
      created: serverTimestamp()
    });

    toast('Account created. Welcome to Bulkbase!');
    closeAuth();
    f.reset();
  } catch (err) {
    console.error(err);
    if (err.code === 'auth/email-already-in-use') toast('That email is already registered. Try logging in.');
    else if (err.code === 'auth/weak-password')   toast('Password must be at least 6 characters.');
    else if (err.code === 'auth/invalid-email')   toast('Please enter a valid email address.');
    else                                          toast('Could not create account. Please try again.');
  }
};

/* ─────────────────────────────────────────────
   LOG IN
   ───────────────────────────────────────────── */
loginForm.onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  try {
    await signInWithEmailAndPassword(auth, f.email.value.trim(), f.password.value);
    toast('Logged in');
    closeAuth();
    f.reset();
  } catch (err) {
    console.error(err);
    if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
      toast('Wrong email or password');
    } else if (err.code === 'auth/too-many-requests') {
      toast('Too many attempts. Please try again in a few minutes.');
    } else {
      toast('Could not log in. Please try again.');
    }
  }
};

/* ─────────────────────────────────────────────
   FORGOT PASSWORD
   ───────────────────────────────────────────── */
forgotForm.onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  try {
    await sendPasswordResetEmail(auth, f.email.value.trim());
    toast('Password reset link sent. Check your email inbox.');
    closeAuth();
    f.reset();
  } catch (err) {
    console.error(err);
    if (err.code === 'auth/user-not-found')  toast('No account found with that email.');
    else if (err.code === 'auth/invalid-email') toast('Please enter a valid email address.');
    else                                     toast('Could not send reset email. Please try again.');
  }
};

/* ─────────────────────────────────────────────
   AUTH STATE — lock/unlock checkout
   ───────────────────────────────────────────── */
onAuthStateChanged(auth, user => {
  currentUser = user;

  if (user) {
    authBtn.textContent = 'Log out';
    userName.textContent = user.displayName || 'Customer';
    userEmail.textContent = user.email;
    userBanner.classList.remove('hide');
    loginPrompt.classList.add('hide');
    coForm.classList.remove('locked');

    // Auto-fill checkout fields
    if (user.displayName && !coForm.name.value) coForm.name.value = user.displayName;
    if (user.email && !coForm.email.value)       coForm.email.value = user.email;
  } else {
    authBtn.textContent = 'Log in';
    userBanner.classList.add('hide');
    userName.textContent = '';
    userEmail.textContent = '';
    loginPrompt.classList.remove('hide');
    coForm.classList.add('locked');
  }
});

/* ─────────────────────────────────────────────
   CHECKOUT — blocked unless logged in
   ───────────────────────────────────────────── */
$('#co').onsubmit = async e => {
  e.preventDefault();

  if (!currentUser) {
    toast('Please log in to place your order.');
    openAuth('login');
    return;
  }

  const form = e.target;
  const b = Object.fromEntries(new FormData(form));
  const items = Object.entries(cart).map(([id, qty]) => {
    const p = products.find(p => p.id == id);
    return p && { id, name: p.name, price: p.sale_price || p.price, qty };
  }).filter(Boolean);

  if (!items.length) return toast('Your cart is empty');

  const total = items.reduce((a, i) => a + i.price * i.qty, 0);
  const paymentMethod = b.payment_method || 'cod';

  let mpesaCode = null;
  if (paymentMethod === 'mpesa') {
    mpesaCode = (b.mpesa_code || '').trim().toUpperCase();
    if (!mpesaCode || mpesaCode.length < 8) {
      return toast('Please enter a valid M-Pesa confirmation code.');
    }
  }

  const status = paymentMethod === 'mpesa' ? 'awaiting_payment' : 'new';

  try {
    const orderData = {
      uid: currentUser.uid,
      name: b.name.trim(),
      phone: b.phone.trim(),
      email: b.email.trim(),
      address: b.address.trim(),
      items,
      total,
      status,
      payment_method: paymentMethod,
      created: serverTimestamp()
    };
    if (mpesaCode) orderData.mpesa_code = mpesaCode;

    const r = await push(ref(db, 'orders'), orderData);
    const orderId = r.key.slice(0, 6).toUpperCase();

    cart = {};
    save();
    form.reset();
    document.getElementById('mpesaInfo').classList.add('hide');
    document.getElementById('mpesaCodeWrap').classList.add('hide');
    const codeInput = document.querySelector('input[name="mpesa_code"]');
    if (codeInput) { codeInput.required = false; codeInput.value = ''; }
    $('#cart').classList.remove('open');

    if (currentUser.displayName) form.name.value = currentUser.displayName;
    if (currentUser.email)       form.email.value = currentUser.email;

    toast(`Order #${orderId} placed. We will contact you shortly.`);
  } catch (err) {
    console.error(err);
    toast('Could not place order. Please try again.');
  }
};

/* ─────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────── */
load();