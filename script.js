import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const WA_NUMBER = "916301691060";

const firebaseConfig = {
  apiKey: "AIzaSyALd7bAQeKAp_iwE3KW3TlolWK2qrKlc7Y",
  authDomain: "rr-sarees-center-allagadda.firebaseapp.com",
  projectId: "rr-sarees-center-allagadda",
  storageBucket: "rr-sarees-center-allagadda.firebasestorage.app",
  messagingSenderId: "441305261082",
  appId: "1:441305261082:web:511f752bfd983ec90d5da3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function loadSection(sectionName, gridId) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = "<p class='loading-msg'>&#x23F3; Loading...</p>";

  try {
    const q = query(collection(db, "products"), where("section", "==", sectionName));
    const snapshot = await getDocs(q);

    grid.innerHTML = "";
    
    if (snapshot.empty) {
      grid.innerHTML = "<p class='empty-msg'>&#x1F6CD;&#xFE0F; No products added yet. Check back soon!</p>";
      return;
    }

    snapshot.forEach((docSnap) => {
      const p = docSnap.data(); 

      // Assuming Database is clean and migrated. No band-aid code here.
      if(!p.colors || p.colors.length === 0) return;

      const mainImage = p.colors[0].imageURL;

      const card = document.createElement("div");
      card.className = "card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");

      const img = document.createElement("img");
      img.src = mainImage;
      img.alt = p.name;
      img.loading = "lazy";
      img.onerror = function() {
        this.onerror = null; 
        this.src = "https://placehold.co/300x400/fce4ec/880e4f?text=Photo+Coming+Soon";
      };

      const label = document.createElement("div");
      label.className = "card-label";
      label.textContent = p.name;

      const price = document.createElement("div");
      price.className = "card-price";
      price.textContent = `₹${p.price}`;

      card.appendChild(img);
      card.appendChild(label);
      card.appendChild(price);

      card.addEventListener("click", () => openModal(p.colors, p.name, p.price));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(p.colors, p.name, p.price);
        }
      });

      grid.appendChild(card);
    });

  } catch (err) {
    grid.innerHTML = "<p class='empty-msg'>&#x26A0;&#xFE0F; Error loading. Please refresh.</p>";
    console.error("Firebase Error: ", err);
  }
}

function openModal(colors, name, price) {
  const modalImg = document.getElementById("modal-img");
  const modalPrice = document.getElementById("modal-price");
  const modalColorName = document.getElementById("modal-color-name");
  const modalThumbnails = document.getElementById("modal-thumbnails");
  const modalWaBtn = document.getElementById("modal-wa-btn");

  modalPrice.textContent = `Price: ₹${price}`;
  modalThumbnails.innerHTML = ''; 

  function setActiveColor(colorObj) {
    modalImg.style.opacity = 0.5; 
    setTimeout(() => {
        modalImg.src = colorObj.imageURL;
        modalImg.alt = `${name} - ${colorObj.colorName}`;
        modalImg.style.opacity = 1;
    }, 150);

    modalColorName.textContent = colors.length > 1 ? `Selected Color: ${colorObj.colorName}` : "";

    const message = encodeURIComponent(`I want to buy ${name} (${colorObj.colorName} color) - ₹${price} from RR Sarees Center`);
    modalWaBtn.href = `https://wa.me/${WA_NUMBER}?text=${message}`;

    document.querySelectorAll('.color-thumb').forEach(t => t.classList.remove('active'));
    // Generate safe ID for selector
    const safeId = `thumb-${colorObj.imagePath.replace(/[^a-zA-Z0-9]/g, '')}`;
    const activeThumb = document.getElementById(safeId);
    if(activeThumb) activeThumb.classList.add('active');
  }

  if (colors.length > 1) {
    colors.forEach((c) => {
      const thumb = document.createElement("img");
      thumb.src = c.imageURL;
      thumb.className = "color-thumb";
      thumb.id = `thumb-${c.imagePath.replace(/[^a-zA-Z0-9]/g, '')}`;
      thumb.onclick = () => setActiveColor(c);
      modalThumbnails.appendChild(thumb);
    });
  }

  setActiveColor(colors[0]);
  document.getElementById("modal-backdrop").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modal-backdrop").classList.remove("open");
  document.body.style.overflow = "";
}

document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("modal-backdrop").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// Upgraded Custom Visitor Counter (Rate-Limited to prevent contention)
async function updateVisitorCount() {
  const counterRef = doc(db, "metrics", "visitors");
  try {
    const snap = await getDoc(counterRef);
    let count = snap.exists() ? snap.data().count : 140;

    // Only increment the database if this browser hasn't visited yet
    if (!localStorage.getItem("hasVisited")) {
      if (!snap.exists()) {
        await setDoc(counterRef, { count: 140 });
        count = 140;
      } else {
        await setDoc(counterRef, { count: increment(1) }, { merge: true });
        count += 1;
      }
      localStorage.setItem("hasVisited", "true");
    }
    
    document.getElementById("visitor-count").textContent = count;
  } catch (err) {
    document.getElementById("visitor-count").textContent = "140+"; 
  }
}

loadSection("ladies", "ladies-grid");
loadSection("kids", "kids-grid");
updateVisitorCount();