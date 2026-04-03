// 1. Import the Modern Firebase v9+ Modular API (Updated with doc, getDoc, setDoc, increment)
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Modern async/await function to load data
async function loadSection(sectionName, gridId) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = "<p class='loading-msg'>&#x23F3; Loading...</p>";

  try {
    // Modular way to query Firestore
    const q = query(collection(db, "products"), where("section", "==", sectionName));
    const snapshot = await getDocs(q);

    grid.innerHTML = "";
    
    if (snapshot.empty) {
      grid.innerHTML = "<p class='empty-msg'>&#x1F6CD;&#xFE0F; No products added yet. Check back soon!</p>";
      return;
    }

    snapshot.forEach((doc) => {
      // Using 'const' instead of 'var' fixes the loop scope issue automatically!
      const p = doc.data(); 

      const card = document.createElement("div");
      card.className = "card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `View ${p.name}`); // Modern template literals

      const img = document.createElement("img");
      img.src = p.imageURL;
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

      // Event Listeners - No more IIFE hack required!
      card.addEventListener("click", () => openModal(p.imageURL, p.name, p.price));
      
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(p.imageURL, p.name, p.price);
        }
      });

      grid.appendChild(card);
    });

  } catch (err) {
    grid.innerHTML = "<p class='empty-msg'>&#x26A0;&#xFE0F; Error loading. Please refresh.</p>";
    console.error("Firebase Error: ", err);
  }
}

// Modal Functions
function openModal(imageUrl, name, price) {
  document.getElementById("modal-img").src = imageUrl;
  document.getElementById("modal-img").alt = name;
  document.getElementById("modal-price").textContent = `Price: ₹${price}`;

  const message = encodeURIComponent(`I want to buy ${name} - ₹${price} from RR Sarees Center Allagadda`);
  document.getElementById("modal-wa-btn").href = `https://wa.me/${WA_NUMBER}?text=${message}`;

  document.getElementById("modal-backdrop").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modal-backdrop").classList.remove("open");
  document.body.style.overflow = "";
}

// Global Event Listeners
document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("modal-backdrop").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// --- Custom Visitor Counter ---
async function updateVisitorCount() {
  // Target a specific document called "visitors" inside a "metrics" collection
  const counterRef = doc(db, "metrics", "visitors");
  
  try {
    const snap = await getDoc(counterRef);
    
    if (!snap.exists()) {
      // If the counter doesn't exist yet, create it and start at 140
      await setDoc(counterRef, { count: 140 });
      document.getElementById("visitor-count").textContent = 140;
    } else {
      // If it exists, add 1 to it securely
      await setDoc(counterRef, { count: increment(1) }, { merge: true });
      
      // Fetch the newly updated number and display it
      const updatedSnap = await getDoc(counterRef);
      document.getElementById("visitor-count").textContent = updatedSnap.data().count;
    }
  } catch (err) {
    console.error("Counter error:", err);
    // Fallback just in case there's an internet glitch
    document.getElementById("visitor-count").textContent = "140+"; 
  }
}

// Initialize the data load and the counter
loadSection("ladies", "ladies-grid");
loadSection("kids", "kids-grid");
updateVisitorCount();