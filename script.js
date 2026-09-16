let cafe = {};
let menu = [];

async function loadMenuData() {
  const response = await fetch("menu.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("menu.json load failed");
  }

  const data = await response.json();

  cafe = data.cafe || {};
  menu = data.menu || [];

  if (!menu.length) {
    throw new Error("Menu data empty");
  }

  render();
}

let cart=[],activeCategory="All",selectedItem=null;
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

function render(){
  init();
}

function init(){
  $("#chips").innerHTML=["All",...menu.map(x=>x.category)].map(x=>`<button class="${x==="All"?"active":""}" data-cat="${esc(x)}">${esc(x)}</button>`).join("");
  $("#chips").onclick=e=>{if(e.target.tagName==="BUTTON"){activeCategory=e.target.dataset.cat;document.querySelectorAll(".chips button").forEach(b=>b.classList.toggle("active",b.dataset.cat===activeCategory));renderMenu()}};
  $("#search").addEventListener("input",renderMenu);
  renderMenu();renderCart();
  $("#cartButton").onclick=openCart;$("#closeCart").onclick=closeCart;$("#overlay").onclick=closeCart;
  $("#closeModal").onclick=closeModal;$("#checkout").onclick=checkout;
}
function renderMenu(){
  const query=$("#search").value.toLowerCase().trim();
  let groups=menu.filter(g=>activeCategory==="All"||g.category===activeCategory).map(g=>({...g,items:g.items.filter(i=>!query||(`${i.name} ${g.category} ${(i.ingredients||[]).join(" ")}`).toLowerCase().includes(query))})).filter(g=>g.items.length);
  $("#menuContent").innerHTML=groups.length?groups.map(group=>`<section class="category-block reveal"><div class="category-title"><h3>${esc(group.category)}</h3><span>${String(group.items.length).padStart(2,"0")} ITEMS</span></div><div class="items">${group.items.map(itemCard).join("")}</div></section>`).join(""):`<div class="no-results">No delicious match found. Try another search.</div>`;
  document.querySelectorAll(".add-btn").forEach(b=>b.onclick=()=>openModal(JSON.parse(b.dataset.item)));

  document.querySelectorAll(".item-photo-tap").forEach(card=>{
    const open=()=>{
      card.classList.remove("photo-pop");
      void card.offsetWidth;
      card.classList.add("photo-pop");
      openModal(JSON.parse(card.dataset.item));
    };
    card.onclick=open;
    card.onkeydown=e=>{
      if(e.key==="Enter"||e.key===" "){
        e.preventDefault();
        open();
      }
    };
  });
}
function itemCard(item){
  const pizza=item.small!==undefined;
  const info=item.ingredients?item.ingredients.join(" · "):(item.quantity||"Freshly prepared");

  const image=item.image
    ? `<img src="${esc(item.image)}" alt="${esc(item.name)}" onerror="this.style.display='none';this.parentElement.classList.add('image-fallback')">`
    : "";

  return `<article class="item-card ${pizza?"pizza-card":""}">
    <div class="item-visual item-photo-tap" tabindex="0" role="button" aria-label="Customize ${esc(item.name)}" data-item='${esc(JSON.stringify(item))}'>
      ${image}
      ${item.badge?`<span class="badge">${esc(item.badge)}</span>`:""}
    </div>
    <div class="item-info">
      <h4>${esc(item.name)}</h4>
      <div class="ingredients">${esc(info)}</div>
      ${pizza
        ? `<div class="pizza-prices">
            <div>Small <b>₹${item.small}</b></div>
            <div>Medium <b>₹${item.medium}</b></div>
            <button class="add-btn" data-item='${JSON.stringify(item).replace(/'/g,"&#39;")}'>Add</button>
          </div>`
        : `<div class="price-line">
            <span class="price">₹${item.price}</span>
            <button class="add-btn" data-item='${JSON.stringify(item).replace(/'/g,"&#39;")}'>Add</button>
          </div>`
      }
    </div>
  </article>`;
}

function openModal(item){
  selectedItem=item;
  let html=`<p class="eyebrow">MAKE IT YOURS</p><h3>${esc(item.name)}</h3><p class="modal-sub">Choose your preferred option.</p>`;
  if(item.small!==undefined)html+=`<div class="option-group"><label>SIZE</label><div class="option-buttons"><button data-type="size" data-value="Small" data-price="${item.small}" class="selected">Small · ₹${item.small}</button><button data-type="size" data-value="Medium" data-price="${item.medium}">Medium · ₹${item.medium}</button></div></div>`;
  if(item.baked_addon)html+=`<div class="option-group"><label>BAKED OPTION</label><div class="option-buttons"><button data-type="baked" data-value="Regular" data-price="0" class="selected">Regular</button><button data-type="baked" data-value="Baked" data-price="${item.baked_addon}">Baked +₹${item.baked_addon}</button></div></div>`;
  if(item.cheese_addon)html+=`<div class="option-group"><label>CHEESE</label><div class="option-buttons"><button data-type="cheese" data-value="No Cheese" data-price="0" class="selected">No Cheese</button><button data-type="cheese" data-value="Extra Cheese" data-price="${item.cheese_addon}">Add Cheese +₹${item.cheese_addon}</button></div></div>`;
  if(item.ice_cream_addon)html+=`<div class="option-group"><label>ICE CREAM</label><div class="option-buttons"><button data-type="ice" data-value="No Ice Cream" data-price="0" class="selected">No Ice Cream</button><button data-type="ice" data-value="With Ice Cream" data-price="${item.ice_cream_addon}">With Ice Cream +₹${item.ice_cream_addon}</button></div></div>`;
  html+=`<button class="primary-btn modal-add" id="modalAdd">Add to order <span>→</span></button>`;
  $("#modalContent").innerHTML=html;$("#modalWrap").classList.add("show");$("#overlay").classList.add("show");
  document.querySelectorAll(".option-buttons").forEach(group=>group.onclick=e=>{if(e.target.tagName==="BUTTON"){group.querySelectorAll("button").forEach(b=>b.classList.remove("selected"));e.target.classList.add("selected")}});
  $("#modalAdd").onclick=addSelected;
}
function closeModal(){$("#modalWrap").classList.remove("show");if(!$("#cartDrawer").classList.contains("open"))$("#overlay").classList.remove("show")}
function addSelected(){
  let options=[],price=selectedItem.price??0;
  document.querySelectorAll(".option-buttons button.selected").forEach(b=>{options.push(b.dataset.value);price+=Number(b.dataset.price||0)});
  const key=selectedItem.name+"|"+options.join("|"),found=cart.find(x=>x.key===key);
  if(found)found.qty++;else cart.push({key,name:selectedItem.name,options,price,qty:1});
  closeModal();renderCart();showToast("Added to your order");
}
function renderCart(){
  const count=cart.reduce((s,x)=>s+x.qty,0),total=cart.reduce((s,x)=>s+x.price*x.qty,0);
  $("#cartCount").textContent=count;$("#cartTotal").textContent=`₹${total}`;
  $("#cartItems").innerHTML=cart.length?cart.map((x,i)=>`<div class="cart-row"><div><h4>${esc(x.name)}</h4><small>${esc(x.options.join(" · ")||"Regular")}</small></div><div class="cart-row-right"><strong>₹${x.price*x.qty}</strong><div class="quantity"><button data-action="minus" data-i="${i}">−</button><span>${x.qty}</span><button data-action="plus" data-i="${i}">+</button></div><button class="remove" data-action="remove" data-i="${i}">REMOVE</button></div></div>`).join(""):`<div class="empty">Your cart is waiting for something delicious.<br><br>✦</div>`;
  $("#cartItems").onclick=e=>{const b=e.target.closest("button");if(!b)return;let i=+b.dataset.i;if(b.dataset.action==="plus")cart[i].qty++;if(b.dataset.action==="minus")cart[i].qty--;if(b.dataset.action==="remove"||cart[i].qty<1)cart.splice(i,1);renderCart()};
}
function openCart(){$("#cartDrawer").classList.add("open");$("#overlay").classList.add("show")}
function closeCart(){$("#cartDrawer").classList.remove("open");if(!$("#modalWrap").classList.contains("show"))$("#overlay").classList.remove("show")}
function checkout(){
  if(!cart.length){showToast("Add something to your order first");return}
  let total=cart.reduce((s,x)=>s+x.price*x.qty,0);
  let text=`Hello BrewTon Cafe!%0A%0AI'd like to order:%0A${cart.map(x=>`• ${x.name} (${x.options.join(", ")||"Regular"}) × ${x.qty} — ₹${x.price*x.qty}`).join("%0A")}%0A%0ATotal: ₹${total}%0A%0AThank you!`;
  window.open(`https://wa.me/91${cafe.whatsapp}?text=${text}`,"_blank");
}
function showToast(msg){const t=document.createElement("div");t.textContent=msg;t.style="position:fixed;bottom:25px;left:50%;transform:translateX(-50%);background:#271712;color:white;padding:13px 20px;border-radius:4px;z-index:60;font-size:13px";document.body.appendChild(t);setTimeout(()=>t.remove(),1800)}
loadMenuData().catch(error => {
  console.error(error);
  const box = document.querySelector("#menuContent");
  if (box) {
    box.innerHTML = `
      <div class="no-results">
        Menu load nahi ho paya.<br>
        Please refresh the page.
      </div>
    `;
  }
});

/* ===== BREWTON FLOATING PARTICLES ===== */
function createBrewTonParticles(){
  document.querySelectorAll(".brewton-particle").forEach(p=>p.remove());
  for(let i=0;i<18;i++){
    const p=document.createElement("span");
    p.className="brewton-particle";
    p.style.left=(Math.random()*100)+"vw";
    p.style.top=(55+Math.random()*45)+"vh";
    p.style.setProperty("--dur",(7+Math.random()*8)+"s");
    p.style.setProperty("--delay",(Math.random()*-10)+"s");
    document.body.appendChild(p);
  }
}

createBrewTonParticles();
