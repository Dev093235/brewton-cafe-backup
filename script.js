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
  document.querySelectorAll(".order-type-options button").forEach(b=>{
    b.onclick=()=>sendOrder(b.dataset.orderType);
  });

  $("#closeCustomerDetails").onclick=()=>{
    $("#customerDetailsModal").classList.remove("show");
  };

  $("#continueCustomerDetails").onclick=submitCustomerDetails;
  $("#useLocationBtn").onclick=getCurrentLocation;
}
function renderMenu(){
  const query=$("#search").value.toLowerCase().trim();
  let groups=menu.filter(g=>activeCategory==="All"||g.category===activeCategory).map(g=>({...g,items:g.items.filter(i=>!query||(`${i.name} ${g.category} ${(i.ingredients||[]).join(" ")}`).toLowerCase().includes(query))})).filter(g=>g.items.length);
  $("#menuContent").innerHTML=groups.length?groups.map(group=>`<section class="category-block reveal"><div class="category-title"><h3>${esc(group.category)}</h3><span>${String(group.items.length).padStart(2,"0")} ITEMS</span></div><div class="items">${group.items.map(itemCard).join("")}</div></section>`).join(""):`<div class="no-results">No delicious match found. Try another search.</div>`;
  document.querySelectorAll(".add-btn").forEach(b=>b.onclick=()=>openModal(JSON.parse(b.dataset.item)));

  document.querySelectorAll(".item-photo").forEach(img=>{
    img.style.cursor="pointer";
    img.onclick=()=>{
      const item=JSON.parse(img.dataset.item);
      openModal(item);
    };
  });
}
function itemCard(item){
  const pizza=item.small!==undefined;
  const info=item.ingredients?item.ingredients.join(" · "):(item.quantity||"Freshly prepared");

  const image=item.image
    ? `<img class="item-photo" src="${esc(item.image)}" alt="${esc(item.name)}" data-item='${JSON.stringify(item).replace(/'/g,"&#39;")}' onerror="this.style.display='none';this.parentElement.classList.add('image-fallback')">`
    : "";

  return `<article class="item-card ${pizza?"pizza-card":""}">
    <div class="item-visual">
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
  let options=[],price=selectedItem.price??selectedItem.small;
  document.querySelectorAll(".option-buttons button.selected").forEach(b=>{
    options.push(b.dataset.value);
    if(b.dataset.type==="size") price=Number(b.dataset.price||0);
    else price+=Number(b.dataset.price||0);
  });
  const key=selectedItem.name+"|"+options.join("|"),found=cart.find(x=>x.key===key);
  if(found)found.qty++;else cart.push({key,name:selectedItem.name,options,price,qty:1});
  closeModal();renderCart();showToast("Added to your order");
}
function renderCart(){
  const count=cart.reduce((s,x)=>s+x.qty,0);
  const total=cart.reduce((s,x)=>s+x.price*x.qty,0);

  $("#cartCount").textContent=count;
  $("#cartTotal").textContent=`₹${total}`;

  $("#cartItems").innerHTML=cart.length
    ? cart.map((x,i)=>`
      <div class="cart-row">
        <div>
          <h4>${esc(x.name)}</h4>
          <small>${esc(x.options.join(" · ")||"Regular")}</small>
        </div>
        <div class="cart-row-right">
          <strong>₹${x.price*x.qty}</strong>
          <div class="quantity">
            <button type="button" class="cart-minus" data-i="${i}">−</button>
            <span>${x.qty}</span>
            <button type="button" class="cart-plus" data-i="${i}">+</button>
          </div>
          <button type="button" class="remove cart-remove" data-i="${i}">REMOVE</button>
        </div>
      </div>
    `).join("")
    : `<div class="empty">Your cart is waiting for something delicious.<br><br>✦</div>`;

  document.querySelectorAll(".cart-plus").forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      const i=Number(btn.dataset.i);
      if(cart[i]) cart[i].qty++;
      renderCart();
    };
  });

  document.querySelectorAll(".cart-minus").forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      const i=Number(btn.dataset.i);
      if(!cart[i]) return;
      cart[i].qty--;
      if(cart[i].qty<=0) cart.splice(i,1);
      renderCart();
    };
  });

  document.querySelectorAll(".cart-remove").forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      const i=Number(btn.dataset.i);
      if(cart[i]) cart.splice(i,1);
      renderCart();
    };
  });
}
function openCart(){$("#cartDrawer").classList.add("open");$("#overlay").classList.add("show")}
function closeCart(){$("#cartDrawer").classList.remove("open");if(!$("#modalWrap").classList.contains("show"))$("#overlay").classList.remove("show")}
function checkout(){
  if(!cart.length){showToast("Add something to your order first");return}
  $("#orderTypeModal").classList.add("show");
}

function sendOrder(orderType){
  $("#orderTypeModal").classList.remove("show");

  if(orderType==="Dine-in"){
    sendWhatsAppOrder(orderType);
    return;
  }

  $("#customerDetailsModal").classList.add("show");
  $("#detailsTitle").textContent=orderType==="Take Away"?"Delivery details":"Pickup details";
  $("#addressField").style.display=orderType==="Take Away"?"grid":"none";
}

let customerLocation="";

function getCurrentLocation(){
  const status=$("#locationStatus");

  if(!navigator.geolocation){
    status.textContent="Location is not supported on this device.";
    return;
  }

  status.textContent="📍 Getting your location...";
  
  navigator.geolocation.getCurrentPosition(
    position=>{
      const lat=position.coords.latitude;
      const lng=position.coords.longitude;
      customerLocation=`https://www.google.com/maps?q=${lat},${lng}`;
      status.textContent="✓ Location added successfully";
      $("#useLocationBtn").textContent="✓ Location Added";
      $("#useLocationBtn").classList.add("location-added");
    },
    error=>{
      console.log("Location error:",error);
      status.textContent="Unable to get location. Please allow location permission.";
    },
    {enableHighAccuracy:true,timeout:15000,maximumAge:0}
  );
}

function sendWhatsAppOrder(orderType,details={}){
  let total=cart.reduce((s,x)=>s+x.price*x.qty,0);
  let customer="";

  if(details.name) customer+=`\n👤 Customer: ${details.name}`;
  if(details.phone) customer+=`\n📞 Phone: ${details.phone}`;
  if(details.address) customer+=`\n🏠 Address: ${details.address}`;
  if(details.location) customer+=`\n📍 Location: ${details.location}`;

  let items=cart.map(x=>
    `• ${x.name}${x.options.length?" ("+x.options.join(", ")+")":""} × ${x.qty} — ₹${x.price*x.qty}`
  ).join("\n");

  let message=`☕ BREWTON CAFE
━━━━━━━━━━━━━━━━
🧾 NEW ORDER

📦 Order Type: ${orderType}
${customer}

🍽️ ITEMS
━━━━━━━━━━━━━━━━
${items}

━━━━━━━━━━━━━━━━
💰 TOTAL: ₹${total}
━━━━━━━━━━━━━━━━

Thank you for ordering from BrewTon Cafe! ❤️`;

  window.location.href=`https://wa.me/91${cafe.whatsapp}?text=${encodeURIComponent(message)}`;
}
function submitCustomerDetails(){
  const name=$("#customerName").value.trim();
  const phone=$("#customerPhone").value.trim();
  const address=$("#customerAddress").value.trim();
  const orderType=$("#detailsTitle").textContent==="Delivery details"?"Take Away":"Pickup";

  if(!name){showToast("Please enter your name");return}
  if(!/^[0-9]{10}$/.test(phone)){showToast("Enter a valid 10 digit phone number");return}
  if(orderType==="Take Away"&&!address&&!customerLocation){
    showToast("Enter address or use your current location");
    return;
  }

  $("#customerDetailsModal").classList.remove("show");
  sendWhatsAppOrder(orderType,{name,phone,address,location:customerLocation});
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

/* BREWTON FOOD IMAGE MOTION — JS FALLBACK */
(function(){
  function startFoodMotion(){
    document.querySelectorAll('.menu-card img').forEach(function(img){
      img.style.setProperty('animation','brewtonFoodScale 4.5s ease-in-out infinite alternate','important');
      img.style.setProperty('will-change','transform,scale','important');
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',startFoodMotion);
  }else{
    startFoodMotion();
  }
})();

/* BREWTON FOOD MOTION — DYNAMIC MENU FIX */
(function(){
  function applyFoodMotion(){
    document.querySelectorAll('.menu-card img').forEach(function(img){
      img.style.setProperty('animation','brewtonFoodScale 4.5s ease-in-out infinite alternate','important');
      img.style.setProperty('will-change','transform,scale','important');
    });
  }

  applyFoodMotion();

  new MutationObserver(function(){
    applyFoodMotion();
  }).observe(document.body,{childList:true,subtree:true});
})();

/* BREWTON FOOD — DIRECT JS MOTION */
(function(){
  function animate(){
    document.querySelectorAll('.menu-card img').forEach(function(img,i){
      var t=Date.now()/1000;
      var speed=0.55+(i%4)*0.08;
      var s=1.02+((Math.sin(t*speed)+1)/2)*0.09;
      img.style.transform='scale('+s.toFixed(4)+')';
      img.style.willChange='transform';
    });
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();

/* BREWTON CARD — CINEMATIC SIDE FLOAT */
(function(){
  function animateCards(){
    const cards = document.querySelectorAll('.item-card');

    cards.forEach(function(card,i){
      const t = Date.now()/1000;
      const speed = 0.65 + (i % 5) * 0.07;
      const x = Math.sin(t * speed + i * 0.8) * 3.5;
      const y = Math.cos(t * speed * 0.7 + i) * 1.2;
      const r = Math.sin(t * speed * 0.8 + i) * 0.18;

      card.style.transform =
        'translate3d(' + x.toFixed(2) + 'px,' +
        y.toFixed(2) + 'px,0) rotate(' +
        r.toFixed(2) + 'deg)';
    });

    requestAnimationFrame(animateCards);
  }

  requestAnimationFrame(animateCards);
})();

