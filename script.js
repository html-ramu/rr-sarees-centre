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

      // Data normalization: Handle Old products vs New products with colors
      let colors = p.colors || [];
      if (colors.length === 0 && p.imageURL) {
        colors.push({ colorName: "Standard", imageURL: p.imageURL, imagePath: p.imagePath });
      }

      // If no images at all, skip rendering
      if(colors.length === 0) return;

      const mainImage = colors[0].imageURL;

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

      // Pass the whole colors array to the modal
      card.addEventListener("click", () => openModal(colors, p.name, p.price));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(colors, p.name, p.price);
        }
      });

      grid.appendChild(card);
    });

  } catch (err) {
    grid.innerHTML = "<p class='empty-msg'>&#x26A0;&#xFE0F; Error loading. Please refresh.</p>";
    console.error("Firebase Error: ", err);
  }
}

// Modal Functions handling Multiple Colors
function openModal(colors, name, price) {
  const modalImg = document.getElementById("modal-img");
  const modalPrice = document.getElementById("modal-price");
  const modalColorName = document.getElementById("modal-color-name");
  const modalThumbnails = document.getElementById("modal-thumbnails");
  const modalWaBtn = document.getElementById("modal-wa-btn");

  modalPrice.textContent = `Price: ₹${price}`;
  modalThumbnails.innerHTML = ''; // Clear old thumbs

  // Function to change the active picture
  function setActiveColor(colorObj) {
    modalImg.style.opacity = 0.5; // Slight fade effect
    setTimeout(() => {
        modalImg.src = colorObj.imageURL;
        modalImg.alt = `${name} - ${colorObj.colorName}`;
        modalImg.style.opacity = 1;
    }, 150);

    modalColorName.textContent = colors.length > 1 ? `Selected Color: ${colorObj.colorName}` : "";

    const message = encodeURIComponent(`I want to buy ${name} (${colorObj.colorName} color) - ₹${price} from RR Sarees Center`);
    modalWaBtn.href = `https://wa.me/${WA_NUMBER}?text=${message}`;

    // Update the active border on thumbnails
    document.querySelectorAll('.color-thumb').forEach(t => t.classList.remove('active'));
    const activeThumb = document.getElementById(`thumb-${colorObj.imagePath.replace(/[^a-zA-Z0-9]/g, '')}`);
    if(activeThumb) activeThumb.classList.add('active');
  }

  // Generate Thumbnails if there is more than 1 color
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

  // Load the first color immediately
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

// Custom Visitor Counter
async function updateVisitorCount() {
  const counterRef = doc(db, "metrics", "visitors");
  try {
    const snap = await getDoc(counterRef);
    if (!snap.exists()) {
      await setDoc(counterRef, { count: 140 });
      document.getElementById("visitor-count").textContent = 140;
    } else {
      await setDoc(counterRef, { count: increment(1) }, { merge: true });
      const updatedSnap = await getDoc(counterRef);
      document.getElementById("visitor-count").textContent = updatedSnap.data().count;
    }
  } catch (err) {
    document.getElementById("visitor-count").textContent = "140+"; 
  }
}

loadSection("ladies", "ladies-grid");
loadSection("kids", "kids-grid");
updateVisitorCount();