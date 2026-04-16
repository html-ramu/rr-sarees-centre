import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, query, where, limit, startAfter } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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
const storage = getStorage(app);
const auth = getAuth(app);

let allProducts = [];
let activeTab = 'all';
let lastVisibleDoc = null; 

// ============================================================================
// 🔥 IMAGE COMPRESSION ENGINE
// ============================================================================
async function compressImageToJPG(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          const oldName = file.name.replace(/\.[^/.]+$/, "");
          const newFileName = oldName + ".jpg";
          const newFile = new File([blob], newFileName, { type: 'image/jpeg', lastModified: Date.now() });
          resolve(newFile);
        }, 'image/jpeg', quality);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-admin-container').style.display = 'block';
    loadProducts(false); 
  } else {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('main-admin-container').style.display = 'none';
  }
});

document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value.trim();
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    document.getElementById('login-error').textContent = "❌ Wrong Email or Password!";
    document.getElementById('login-error').style.display = "block";
  }
});
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

function showStatus(msg, type) {
  const el = document.getElementById('status-msg');
  el.textContent = msg; el.className = 'status-msg status-' + type; el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3500);
}

function createVariantRow(containerId) {
  const row = document.createElement('div');
  row.className = 'variant-row new-variant';
  const nameInput = document.createElement('input');
  nameInput.type = 'text'; nameInput.placeholder = 'Color Name'; nameInput.className = 'var-name';
  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.className = 'var-file';
  const previewImg = document.createElement('img');
  previewImg.className = 'thumb-preview';
  
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(file) {
      previewImg.src = URL.createObjectURL(file);
      previewImg.style.display = 'block';
    }
  });

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button'; removeBtn.className = 'btn-remove-row'; removeBtn.textContent = 'X';
  removeBtn.onclick = () => row.remove();

  row.appendChild(nameInput);
  row.appendChild(fileInput);
  row.appendChild(previewImg);
  row.appendChild(removeBtn);
  document.getElementById(containerId).appendChild(row);
}

createVariantRow('add-variant-container');
document.getElementById('btn-add-row').addEventListener('click', () => createVariantRow('add-variant-container'));
document.getElementById('btn-edit-add-row').addEventListener('click', () => createVariantRow('edit-new-variants'));

// --- SAVE NEW PRODUCT ---
document.getElementById('save-btn').addEventListener('click', async () => {
  const section = document.getElementById('product-section').value;
  const name = document.getElementById('product-name').value.trim();
  const price = document.getElementById('product-price').value.trim();
  
  if (!section || !name || !price) {
    showStatus('⚠️ Please fill basic details!', 'error'); return;
  }

  const rows = document.querySelectorAll('#add-variant-container .new-variant');
  const colorsToUpload = [];

  for (let row of rows) {
    const cName = row.querySelector('.var-name').value.trim();
    const cFile = row.querySelector('.var-file').files[0];
    if (cName && cFile) colorsToUpload.push({ cName, cFile });
  }

  if(colorsToUpload.length === 0) {
    showStatus('⚠️ You must add at least 1 color and image!', 'error'); return;
  }

  const btn = document.getElementById('save-btn');
  btn.textContent = '⏳ Compressing & Uploading...'; btn.disabled = true;

  try {
    let finalColorsArray = [];
    for (let item of colorsToUpload) {
      const compressedFile = await compressImageToJPG(item.cFile);
      const path = 'products/' + Date.now() + '_' + compressedFile.name;
      await uploadBytes(ref(storage, path), compressedFile);
      const url = await getDownloadURL(ref(storage, path));
      finalColorsArray.push({ colorName: item.cName, imageURL: url, imagePath: path });
    }

    await addDoc(collection(db, 'products'), {
      section, name, price: parseFloat(price), colors: finalColorsArray, createdAt: serverTimestamp()
    });

    showStatus('✅ Product & Colors saved!', 'success');
    document.getElementById('product-section').value = '';
    document.getElementById('product-name').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('add-variant-container').innerHTML = '';
    createVariantRow('add-variant-container'); 
    loadProducts(false); 
  } catch (err) {
    showStatus('❌ Error: ' + err.message, 'error');
  }
  btn.textContent = '💾 Save Product & Upload All'; btn.disabled = false;
});

// --- LOAD PRODUCTS (WITH PAGINATION) ---
async function loadProducts(isLoadMore = false) {
  const container = document.getElementById('products-container');
  const loadMoreBtn = document.getElementById('load-more-btn');
  
  if (!isLoadMore) {
    container.innerHTML = '<p class="empty-msg">Loading...</p>';
    allProducts = [];
    lastVisibleDoc = null;
  }

  try {
    let q;
    if (activeTab === 'all') {
      q = query(collection(db, 'products'), limit(12));
      if (isLoadMore && lastVisibleDoc) q = query(collection(db, 'products'), startAfter(lastVisibleDoc), limit(12));
    } else {
      q = query(collection(db, 'products'), where("section", "==", activeTab), limit(12));
      if (isLoadMore && lastVisibleDoc) q = query(collection(db, 'products'), where("section", "==", activeTab), startAfter(lastVisibleDoc), limit(12));
    }

    const snapshot = await getDocs(q);
    if (!isLoadMore) container.innerHTML = '';
    if (snapshot.empty && !isLoadMore) { 
      container.innerHTML = '<p class="empty-msg">No products found.</p>'; 
      loadMoreBtn.style.display = 'none';
      return; 
    }

    lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1]; 
    snapshot.forEach(d => {
      const p = { id: d.id, ...d.data() };
      allProducts.push(p);
      renderSingleProduct(p, container);
    });

    loadMoreBtn.style.display = snapshot.docs.length < 12 ? 'none' : 'inline-block';
  } catch (err) { 
      if(!isLoadMore) container.innerHTML = '<p style="color:red;">Error loading data.</p>'; 
      console.error(err);
  }
}

function renderSingleProduct(p, container) {
  let colors = p.colors || [];
  if(colors.length === 0) return; 

  const badge = p.section === 'ladies' ? '👗 Ladies' : '👶 Kids';
  const mainImg = colors[0].imageURL;

  const card = document.createElement('div');
  card.className = 'product-card';
  card.innerHTML = `
    <img src="${mainImg}" alt="${p.name}">
    <div class="product-info">
      <span class="product-section-badge">${badge}</span>
      <div class="product-name">${p.name}</div>
      <div class="product-price">₹${p.price}</div>
      <div class="color-count">🎨 ${colors.length} Color(s)</div>
      <div class="product-actions">
        <button class="btn btn-warning edit-btn" data-id="${p.id}">✏️ Edit</button>
        <button class="btn btn-danger delete-btn" data-id="${p.id}">🗑️ Delete</button>
      </div>
    </div>`;
  
  card.querySelector('.edit-btn').addEventListener('click', () => openEditModal(p.id));
  card.querySelector('.delete-btn').addEventListener('click', async () => {
    if (!confirm('Delete this product and ALL its colors?')) return;
    for(let c of colors) {
        if(c.imagePath) await deleteObject(ref(storage, c.imagePath)).catch(()=>{});
    }
    await deleteDoc(doc(db, 'products', p.id));
    loadProducts(false); 
  });

  container.appendChild(card);
}

document.getElementById('load-more-btn').addEventListener('click', () => loadProducts(true));

// --- EDIT MODAL LOGIC ---
function openEditModal(id) {
  const p = allProducts.find(x => x.id === id);
  document.getElementById('edit-id').value = id;
  document.getElementById('edit-section').value = p.section;
  document.getElementById('edit-name').value = p.name;
  document.getElementById('edit-price').value = p.price;

  const existingContainer = document.getElementById('edit-existing-colors');
  existingContainer.innerHTML = '';
  
  let colors = p.colors || [];
  colors.forEach(c => {
    const row = document.createElement('div');
    row.className = 'variant-row';
    row.innerHTML = `
      <img src="${c.imageURL}" class="thumb-preview" style="display:block;">
      <input type="text" value="${c.colorName}" readonly style="background:#eee;">
      <button type=\"button\" class=\"btn btn-danger remove-existing-btn\" data-path=\"${c.imagePath}\">🗑️ Delete</button>
    `;
    existingContainer.appendChild(row);

    row.querySelector('.remove-existing-btn').addEventListener('click', async function() {
      if(!confirm('Delete this color permanently?')) return;
      const newColors = colors.filter(x => x.imagePath !== c.imagePath);
      await updateDoc(doc(db, 'products', id), { colors: newColors });
      if(c.imagePath) await deleteObject(ref(storage, c.imagePath)).catch(()=>{});
      row.remove(); 
      p.colors = newColors; 
    });
  });

  document.getElementById('edit-new-variants').innerHTML = ''; 
  document.getElementById('edit-modal').style.display = 'block';
}

document.getElementById('save-edit-btn').addEventListener('click', async () => {
  const id = document.getElementById('edit-id').value;
  const section = document.getElementById('edit-section').value;
  const name = document.getElementById('edit-name').value.trim();
  const price = document.getElementById('edit-price').value.trim();
  
  const btn = document.getElementById('save-edit-btn');
  btn.textContent = '⏳ Compressing & Saving...'; btn.disabled = true;

  try {
    const pData = allProducts.find(x => x.id === id);
    let existingColors = pData.colors || [];
    const rows = document.querySelectorAll('#edit-new-variants .new-variant');
    for (let row of rows) {
      const cName = row.querySelector('.var-name').value.trim();
      const rawFile = row.querySelector('.var-file').files[0];
      if (cName && rawFile) {
          const compressedFile = await compressImageToJPG(rawFile);
          const path = 'products/' + Date.now() + '_' + compressedFile.name;
          await uploadBytes(ref(storage, path), compressedFile);
          const url = await getDownloadURL(ref(storage, path));
          existingColors.push({ colorName: cName, imageURL: url, imagePath: path });
      }
    }
    await updateDoc(doc(db, 'products', id), { section, name, price: parseFloat(price), colors: existingColors });
    document.getElementById('edit-modal').style.display = 'none';
    loadProducts(false); 
  } catch (err) { alert('Error: ' + err.message); }
  btn.textContent = '💾 Save Changes'; btn.disabled = false;
});

// --- LEGACY MIGRATION SCRIPT ---
document.getElementById('migration-btn').addEventListener('click', async () => {
    if(!confirm("This will upgrade all old products to the new format. Continue?")) return;
    document.getElementById('migration-btn').textContent = "Running...";
    try {
        const snap = await getDocs(collection(db, 'products'));
        let migratedCount = 0;
        for (let docSnap of snap.docs) {
            const p = docSnap.data();
            if ((!p.colors || p.colors.length === 0) && p.imageURL) {
                const newFormat = [{ colorName: "Standard", imageURL: p.imageURL, imagePath: p.imagePath || "" }];
                await updateDoc(docSnap.ref, { colors: newFormat });
                migratedCount++;
            }
        }
        alert(`Migration Complete! ${migratedCount} old products were upgraded.`);
        loadProducts(false);
    } catch(err) { alert("Migration Error: " + err.message); }
    document.getElementById('migration-btn').textContent = "⚙️ Fix Legacy Data";
});

// ============================================================================
// 🔥 NEW: MASS IMAGE OPTIMIZER (Converts old heavy PNGs to tiny JPGs)
// ============================================================================
document.getElementById('compress-old-btn').addEventListener('click', async () => {
  if(!confirm("This will download, compress, and replace all old heavy images with tiny JPGs. It might take a few minutes. Continue?")) return;
  
  const btn = document.getElementById('compress-old-btn');
  btn.textContent = "⏳ Processing... Please wait!";
  btn.disabled = true;

  try {
    const snap = await getDocs(collection(db, 'products'));
    let updatedCount = 0;

    for (let docSnap of snap.docs) {
      const p = docSnap.data();
      let changed = false;
      let newColors = [];

      if (!p.colors) continue;

      for (let c of p.colors) {
        // If the file path already ends in .jpg, it's likely already compressed by our new system.
        if (c.imagePath && c.imagePath.toLowerCase().endsWith('.jpg')) {
          newColors.push(c);
        } else {
          // Found a heavy file! Time to compress it.
          btn.textContent = `⏳ Compressing ${p.name}...`;
          
          // 1. Download the old heavy image safely
          const response = await fetch(c.imageURL);
          const blob = await response.blob();
          const file = new File([blob], "old_image.png", {type: blob.type});
          
          // 2. Compress it using our canvas engine
          const compressedFile = await compressImageToJPG(file);
          
          // 3. Upload the new tiny JPG
          const newPath = 'products/' + Date.now() + '_compressed.jpg';
          await uploadBytes(ref(storage, newPath), compressedFile);
          const newUrl = await getDownloadURL(ref(storage, newPath));
          
          newColors.push({ colorName: c.colorName, imageURL: newUrl, imagePath: newPath });
          changed = true;
          
          // 4. Delete the massive old file from Firebase Storage
          if(c.imagePath) {
            await deleteObject(ref(storage, c.imagePath)).catch(()=>console.log("Old file already gone"));
          }
        }
      }

      if (changed) {
        await updateDoc(docSnap.ref, { colors: newColors });
        updatedCount++;
      }
    }
    
    alert(`✅ Success! ${updatedCount} products had their heavy images compressed and converted to JPG. Your 5GB quota is restored!`);
    loadProducts(false);
  } catch(err) {
    alert("Error during compression. Please try again: " + err.message);
    console.error(err);
  }
  
  btn.textContent = "🗜️ Compress Old Images";
  btn.disabled = false;
});

// TABS & MODAL CLOSE
document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); activeTab = b.dataset.tab; loadProducts(false);
}));
document.getElementById('modal-close-btn').addEventListener('click', () => document.getElementById('edit-modal').style.display = 'none');