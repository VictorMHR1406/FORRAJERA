const CONFIG = {
    googleClientId: '899292602874-gq7hododt0o3e02tv0lr9s6op3cdojh4.apps.googleusercontent.com',
    adminEmail: 'victorbanco132@gmail.com',
    adminEmails: [
        'victorbanco132@gmail.com',
        'marysolruiz83@gmail.com',
        'marysolruizmendez83@gmail.com',
        'mary_solruiz@hotmail.com',
        'serch.reyes24@gmail.com'
    ],
    whatsappNumber: '2371056258',
    firebase: {
        apiKey: 'AIzaSyCUZo4oxRqX4i6bIebpY2JSjmHHf9-DHVo',
        authDomain: 'fir-config-3c9e4.firebaseapp.com',
        projectId: 'fir-config-3c9e4',
        appId: '1:172473731932:web:f3994ecec7664e80384f99'
    }
};

const STORAGE_KEYS = {
    products: 'forrajera_products_v3',
    cart: 'forrajera_cart_v3',
    user: 'forrajera_user_v3',
    version: 'forrajera_catalog_version'
};

const APP_VERSION = '2026-03-07-login-admin';

const CATEGORY_LABELS = {
    agroquimicos: 'Agroquímicos',
    fertilizantes: 'Fertilizantes',
    herbicidas: 'Herbicidas',
    plagas: 'Control de Plagas',
    veterinaria: 'Veterinaria',
    medicamentos: 'Medicamentos',
    vacunas: 'Vacunas',
    salud: 'Salud Animal',
    alimentos: 'Alimentos',
    forrajes: 'Forrajes',
    maiz: 'Maíz',
    sorgo: 'Sorgo y Trigo',
    balanceado: 'Alimentos Balanceados',
    accesorios: 'Accesorios para Mascotas',
    correas: 'Correas y Cadenas',
    collares: 'Collares y Pecheras',
    'accesorios-varios': 'Accesorios Variados'
};

const CATEGORY_PARENT = {
    fertilizantes: 'agroquimicos',
    herbicidas: 'agroquimicos',
    plagas: 'agroquimicos',
    medicamentos: 'veterinaria',
    vacunas: 'veterinaria',
    salud: 'veterinaria',
    maiz: 'alimentos',
    sorgo: 'alimentos',
    balanceado: 'alimentos',
    correas: 'accesorios',
    collares: 'accesorios',
    'accesorios-varios': 'accesorios'
};

const TOP_LEVEL_CATEGORIES = ['agroquimicos', 'veterinaria', 'alimentos', 'forrajes', 'accesorios'];
const IMAGE_OPTIMIZATION = {
    maxWidth: 1280,
    maxHeight: 1280,
    initialQuality: 0.82,
    minQuality: 0.5,
    qualityStep: 0.08,
    targetProductBytesCloud: 900 * 1024
};

const state = {
    products: [],
    cart: [],
    currentUser: null,
    activeCategory: '',
    adminEditingProductId: '',
    cloud: {
        enabled: false,
        initializing: false,
        initError: null,
        db: null,
        auth: null,
        firestore: null,
        authApi: null,
        unsubscribeProducts: null,
        unsubscribeAuth: null
    }
};

function readJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function migrateDataIfNeeded() {
    const current = localStorage.getItem(STORAGE_KEYS.version);
    if (current === APP_VERSION) return;

    const existingProducts = readJSON(STORAGE_KEYS.products, null);
    const existingCart = readJSON(STORAGE_KEYS.cart, null);

    if (!Array.isArray(existingProducts)) {
        saveJSON(STORAGE_KEYS.products, []);
    }

    if (!Array.isArray(existingCart)) {
        saveJSON(STORAGE_KEYS.cart, []);
    }

    localStorage.setItem(STORAGE_KEYS.version, APP_VERSION);
}

function initializeState() {
    migrateDataIfNeeded();
    state.products = readJSON(STORAGE_KEYS.products, []);
    state.cart = readJSON(STORAGE_KEYS.cart, []);
    state.currentUser = isFirebaseConfigured() ? null : readJSON(STORAGE_KEYS.user, null);
}

function saveProducts() {
    saveJSON(STORAGE_KEYS.products, state.products);
}

function saveCart() {
    saveJSON(STORAGE_KEYS.cart, state.cart);
}

function saveUser() {
    saveJSON(STORAGE_KEYS.user, state.currentUser);
}

function setCurrentUserFromFirebase(firebaseUser) {
    if (!firebaseUser) return;

    const providerUid = firebaseUser.providerData?.[0]?.uid || firebaseUser.uid || '';
    state.currentUser = {
        name: firebaseUser.displayName || 'Cliente',
        sub: providerUid,
        email: firebaseUser.email || '',
        picture: firebaseUser.photoURL || ''
    };

    saveUser();
    renderAuthState();
    fillContactFieldsFromAccount();
    updateAdminVisibility();
}

function clearCurrentUserSession() {
    state.currentUser = null;
    saveUser();
    renderAuthState();
    fillContactFieldsFromAccount();
    updateAdminVisibility();
}

function isFirebaseConfigured() {
    const firebase = CONFIG.firebase || {};
    return [firebase.apiKey, firebase.authDomain, firebase.projectId, firebase.appId]
        .every(value => String(value || '').trim().length > 0);
}

function normalizeProduct(rawProduct, fallbackId = '') {
    const price = Number(rawProduct?.price);
    const stock = Math.max(0, parseInt(rawProduct?.stock ?? 0, 10) || 0);
    const rawCategories = Array.isArray(rawProduct?.categories)
        ? rawProduct.categories
        : [rawProduct?.category].filter(Boolean);
    const categories = rawCategories
        .map(category => String(category || '').trim())
        .filter(Boolean)
        .filter((category, index, list) => list.indexOf(category) === index);
    const rawImages = Array.isArray(rawProduct?.images)
        ? rawProduct.images
        : (typeof rawProduct?.image === 'string' && rawProduct.image.trim() ? [rawProduct.image] : []);

    const images = rawImages
        .map(imageUrl => String(imageUrl || '').trim())
        .filter(Boolean);

    return {
        id: String(rawProduct?.id || fallbackId || `prod-${Date.now()}`),
        name: String(rawProduct?.name || '').trim(),
        category: categories[0] || String(rawProduct?.category || '').trim(),
        categories,
        price: Number.isFinite(price) ? price : 0,
        stock,
        specs: String(rawProduct?.specs || '').trim(),
        description: String(rawProduct?.description || '').trim(),
        image: images[0] || '',
        images,
        updatedAt: Number(rawProduct?.updatedAt) || Date.now()
    };
}

function getProductCategories(product) {
    const categories = Array.isArray(product?.categories)
        ? product.categories.map(category => String(category || '').trim()).filter(Boolean)
        : [];

    if (categories.length) return categories;

    const singleCategory = String(product?.category || '').trim();
    return singleCategory ? [singleCategory] : [];
}

function getProductCategoryLabels(product) {
    return getProductCategories(product).map(getCategoryLabel);
}

function refreshOpenProductModalIfNeeded() {
    const modal = document.getElementById('productModal');
    if (!modal || modal.classList.contains('hidden')) return;

    const detailInput = modal.querySelector('input[id^="detail-qty-"]');
    if (detailInput) {
        const productId = String(detailInput.id || '').replace('detail-qty-', '');
        if (productId) openProductDetail(productId);
        return;
    }

    if (state.activeCategory) {
        openProductModal(state.activeCategory);
    }
}

async function initializeCloudProductsSync() {
    if (!isFirebaseConfigured()) return false;

    state.cloud.initializing = true;
    state.cloud.initError = null;

    try {
        const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js');
        const { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js');
        const { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } = await import('https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js');

        const app = getApps().length ? getApp() : initializeApp(CONFIG.firebase);
        const db = getFirestore(app);
        const auth = getAuth(app);

        state.cloud.enabled = true;
        state.cloud.db = db;
        state.cloud.auth = auth;
        state.cloud.firestore = { collection, doc, setDoc, deleteDoc, onSnapshot };
        state.cloud.authApi = { GoogleAuthProvider, signInWithPopup, signOut };
        renderAuthState();

        state.cloud.unsubscribeAuth = onAuthStateChanged(auth, firebaseUser => {
            if (firebaseUser) {
                setCurrentUserFromFirebase(firebaseUser);
            } else {
                clearCurrentUserSession();
            }
        });

        const productsRef = collection(db, 'products');
        state.cloud.unsubscribeProducts = onSnapshot(productsRef, snapshot => {
            state.products = snapshot.docs
                .map(snapshotDoc => normalizeProduct(snapshotDoc.data(), snapshotDoc.id))
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

            saveProducts();
            updateAdminVisibility();
            updateCartDisplay();
            refreshOpenProductModalIfNeeded();
        });

        return true;
    } catch (error) {
        state.cloud.enabled = false;
        state.cloud.initError = error;
        state.cloud.db = null;
        state.cloud.auth = null;
        state.cloud.firestore = null;
        state.cloud.authApi = null;
        state.cloud.unsubscribeProducts = null;
        state.cloud.unsubscribeAuth = null;
        return false;
    } finally {
        state.cloud.initializing = false;
    }
}

async function upsertProductRecord(product) {
    const normalizedProduct = normalizeProduct(product, product?.id);

    if (state.cloud.enabled && state.cloud.db && state.cloud.firestore) {
        if (!state.cloud.auth?.currentUser) {
            throw new Error('Debes iniciar sesión para guardar cambios en la nube');
        }

        const { doc, setDoc } = state.cloud.firestore;
        await setDoc(doc(state.cloud.db, 'products', normalizedProduct.id), normalizedProduct);
        return normalizedProduct;
    }

    const existingIndex = state.products.findIndex(existingProduct => existingProduct.id === normalizedProduct.id);
    if (existingIndex >= 0) {
        state.products[existingIndex] = normalizedProduct;
    } else {
        state.products.unshift(normalizedProduct);
    }

    saveProducts();
    return normalizedProduct;
}

async function deleteProductRecord(productId) {
    if (state.cloud.enabled && state.cloud.db && state.cloud.firestore) {
        if (!state.cloud.auth?.currentUser) {
            throw new Error('Debes iniciar sesión para eliminar en la nube');
        }

        const { doc, deleteDoc } = state.cloud.firestore;
        await deleteDoc(doc(state.cloud.db, 'products', productId));
        return;
    }

    state.products = state.products.filter(product => product.id !== productId);
    saveProducts();
}

function isAdmin() {
    const sub = (state.currentUser?.sub || '').trim();
    const email = state.currentUser?.email?.toLowerCase().trim();

    const adminSubs = [
        ...(Array.isArray(CONFIG.adminGoogleSubs) ? CONFIG.adminGoogleSubs : []),
        CONFIG.adminGoogleSub
    ]
        .map(value => String(value || '').trim())
        .filter(Boolean);

    const adminEmails = [
        ...(Array.isArray(CONFIG.adminEmails) ? CONFIG.adminEmails : []),
        CONFIG.adminEmail
    ]
        .map(value => String(value || '').toLowerCase().trim())
        .filter(Boolean);

    const bySub = !!sub && adminSubs.includes(sub);
    const byEmail = !!email && adminEmails.includes(email);
    return bySub || byEmail;
}

function getCategoryLabel(categoryKey) {
    if (categoryKey === 'all') return 'Todos nuestros productos';
    return CATEGORY_LABELS[categoryKey] || categoryKey;
}

function getProductsForCategory(categoryKey) {
    if (categoryKey === 'all') {
        return state.products;
    }

    const matchesCategory = product => {
        const categories = getProductCategories(product);
        return categories.includes(categoryKey) || categories.some(category => CATEGORY_PARENT[category] === categoryKey);
    };

    if (TOP_LEVEL_CATEGORIES.includes(categoryKey)) {
        return state.products.filter(matchesCategory);
    }
    return state.products.filter(matchesCategory);
}

function findProductById(productId) {
    return state.products.find(product => product.id === productId);
}

function sanitizeText(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('No fue posible leer la imagen'));
        reader.readAsDataURL(file);
    });
}

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('No fue posible cargar la imagen'));
        };

        image.src = url;
    });
}

function drawImageToDataURL(image, mimeType, quality, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No fue posible procesar la imagen');

    // Fondo blanco para evitar que areas transparentes (PNG sin fondo de Canva)
    // se vuelvan negras al convertir a JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL(mimeType, quality);
}

async function fileToOptimizedDataURL(file, options = IMAGE_OPTIMIZATION) {
    const isImage = String(file?.type || '').startsWith('image/');
    if (!isImage) return fileToDataURL(file);

    const image = await loadImageFromFile(file);
    const originalWidth = image.naturalWidth || image.width || options.maxWidth;
    const originalHeight = image.naturalHeight || image.height || options.maxHeight;
    const scale = Math.min(1, options.maxWidth / originalWidth, options.maxHeight / originalHeight);
    const width = Math.max(1, Math.round(originalWidth * scale));
    const height = Math.max(1, Math.round(originalHeight * scale));

    let quality = options.initialQuality;
    let dataUrl = drawImageToDataURL(image, 'image/jpeg', quality, width, height);

    while (quality > options.minQuality && dataUrl.length > file.size * 1.35) {
        quality = Math.max(options.minQuality, quality - options.qualityStep);
        dataUrl = drawImageToDataURL(image, 'image/jpeg', quality, width, height);
    }

    return dataUrl;
}

function estimateObjectBytes(value) {
    return new TextEncoder().encode(JSON.stringify(value)).length;
}

function getProductSaveErrorMessage(error) {
    const code = String(error?.code || '');
    const message = String(error?.message || '');

    if (code.includes('permission-denied')) {
        return 'Firebase rechazo el guardado por permisos. Revisa Firestore Rules y cuenta admin.';
    }

    if (code.includes('resource-exhausted') || code.includes('invalid-argument') || /maximum document size|Document too large/i.test(message)) {
        return 'Firebase no pudo guardar porque el producto con fotos pesa demasiado. Prueba con menos fotos o resolucion menor.';
    }

    if (code.includes('unavailable') || code.includes('deadline-exceeded')) {
        return 'Firebase no responde en este momento. Intenta nuevamente en unos segundos.';
    }

    if (code.includes('unauthenticated')) {
        return 'Debes iniciar sesion otra vez para guardar en la nube.';
    }

    return 'No se pudo guardar en Firebase. Revisa conexion y configuracion de Firestore.';
}

function getProductImage(product) {
    const images = Array.isArray(product?.images)
        ? product.images.map(imageUrl => String(imageUrl || '').trim()).filter(Boolean)
        : [];

    if (images.length) return images[0];
    return typeof product?.image === 'string' ? product.image.trim() : '';
}

function getProductImages(product) {
    const images = Array.isArray(product?.images)
        ? product.images.map(imageUrl => String(imageUrl || '').trim()).filter(Boolean)
        : [];

    if (images.length) return images;

    const singleImage = typeof product?.image === 'string' ? product.image.trim() : '';
    return singleImage ? [singleImage] : [];
}

function renderProductImageHTML(product, wrapperClass, imageClass, placeholderClass = 'product-image-placeholder') {
    const imageUrl = getProductImage(product);
    if (imageUrl) {
        return `
            <div class="${wrapperClass}">
                <img src="${sanitizeText(imageUrl)}" alt="Foto de ${sanitizeText(product.name)}" class="${imageClass}">
            </div>
        `;
    }

    return `
        <div class="${wrapperClass}">
            <div class="${placeholderClass}">Sin foto</div>
        </div>
    `;
}

function renderProductDetailGalleryHTML(product) {
    const images = getProductImages(product);
    if (!images.length) {
        return renderProductImageHTML(product, 'product-detail-media', 'product-detail-image', 'product-detail-placeholder');
    }

    const thumbnails = images.length > 1
        ? `
            <div class="gallery-thumbs">
                ${images.map((imageUrl, index) => `
                    <button
                        type="button"
                        class="gallery-thumb ${index === 0 ? 'active' : ''}"
                        data-gallery-thumb="true"
                        data-image-url="${sanitizeText(imageUrl)}"
                        aria-label="Ver foto ${index + 1} de ${sanitizeText(product.name)}"
                    >
                        <img src="${sanitizeText(imageUrl)}" alt="Miniatura ${index + 1} de ${sanitizeText(product.name)}">
                    </button>
                `).join('')}
            </div>
        `
        : '';

    return `
        <div class="product-detail-gallery">
            <div class="product-detail-media">
                <img
                    src="${sanitizeText(images[0])}"
                    alt="Foto de ${sanitizeText(product.name)}"
                    class="product-detail-image"
                    data-detail-main-image="true"
                >
            </div>
            ${thumbnails}
        </div>
    `;
}

function initializeProductDetailGallery(scope) {
    const mainImage = scope.querySelector('[data-detail-main-image="true"]');
    const thumbs = Array.from(scope.querySelectorAll('[data-gallery-thumb="true"]'));
    if (!mainImage || !thumbs.length) return;

    thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
            const nextImage = thumb.getAttribute('data-image-url') || '';
            if (!nextImage) return;

            mainImage.src = nextImage;
            thumbs.forEach(currentThumb => currentThumb.classList.remove('active'));
            thumb.classList.add('active');
        });
    });
}

function handleCategoryCardClick(categoryKey, cardElement) {
    const card = cardElement instanceof HTMLElement ? cardElement : null;

    if (card) {
        card.classList.add('category-card-clicked');
        window.setTimeout(() => {
            card.classList.remove('category-card-clicked');
        }, 160);
    }

    window.setTimeout(() => {
        openProductModal(categoryKey);
    }, 90);
}

function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', event => {
            const href = link.getAttribute('href');
            if (!href || href === '#') return;

            const hash = href.replace('#', '').trim().toLowerCase();
            const isTopCategory = TOP_LEVEL_CATEGORIES.includes(hash);

            if (isTopCategory) {
                event.preventDefault();

                const catalogSection = document.querySelector('.categories');
                if (catalogSection) {
                    const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
                    const top = catalogSection.offsetTop - headerHeight;
                    window.scrollTo({ top, behavior: 'smooth' });
                }

                window.setTimeout(() => {
                    openProductModal(hash);
                }, 260);
                return;
            }

            if (hash === 'inicio') {
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            const target = document.querySelector(href);
            if (!target) return;

            event.preventDefault();
            const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
            const top = target.offsetTop - headerHeight;
            window.scrollTo({ top, behavior: 'smooth' });
        });
    });
}

function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', event => {
        const query = event.target.value.toLowerCase().trim();
        if (!query) {
            searchResults.classList.add('hidden');
            searchResults.innerHTML = '';
            return;
        }

        const filtered = state.products.filter(product => {
            return [product.name, product.description, product.specs, getProductCategoryLabels(product).join(' / ')]
                .join(' ')
                .toLowerCase()
                .includes(query);
        });

        if (!filtered.length) {
            searchResults.innerHTML = '<div class="search-result-item">No se encontraron productos</div>';
            searchResults.classList.remove('hidden');
            return;
        }

        searchResults.innerHTML = filtered.map(product => `
            <div class="search-result-item" onclick="openProductDetailFromSearch('${product.id}')">
                <strong>${sanitizeText(product.name)}</strong><br>
                <small>${sanitizeText(getProductCategoryLabels(product).join(' / '))}</small>
            </div>
        `).join('');

        searchResults.classList.remove('hidden');
    });

    document.addEventListener('click', event => {
        if (event.target !== searchInput) {
            searchResults.classList.add('hidden');
        }
    });
}

function initializeCart() {
    const cartBtn = document.getElementById('cartBtn');
    const cartDropdown = document.getElementById('cartDropdown');
    const checkoutBtn = document.getElementById('checkoutBtn');

    if (cartBtn && cartDropdown) {
        cartBtn.addEventListener('click', event => {
            event.stopPropagation();
            cartDropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', event => {
            if (!event.target.closest('.cart-container')) {
                cartDropdown.classList.add('hidden');
            }
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') cartDropdown.classList.add('hidden');
        });
    }

    checkoutBtn?.addEventListener('click', checkoutByWhatsApp);
}

function addToCart(productId, quantity = 1) {
    const product = findProductById(productId);
    if (!product) {
        showNotification('Producto no disponible', 'error');
        return;
    }

    const parsedQty = Math.max(1, parseInt(quantity, 10) || 1);
    const stock = Math.max(0, parseInt(product.stock ?? 0, 10) || 0);
    const existing = state.cart.find(item => item.id === productId);
    const requestedQty = (existing?.quantity || 0) + parsedQty;

    if (stock > 0 && requestedQty > stock) {
        showNotification(`Solo hay ${stock} disponibles para ${product.name}`, 'error');
        return;
    }

    if (existing) {
        existing.quantity = requestedQty;
    } else {
        state.cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: parsedQty,
            specs: product.specs
        });
    }

    saveCart();
    updateCartDisplay();
    showNotification(`${product.name} agregado al carrito`, 'success');
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.id !== productId);
    saveCart();
    updateCartDisplay();
}

function updateQuantity(productId, quantity) {
    const item = state.cart.find(cartItem => cartItem.id === productId);
    if (!item) return;

    const product = findProductById(productId);
    const stock = Math.max(0, parseInt(product?.stock ?? 0, 10) || 0);
    const parsedQty = Math.max(1, parseInt(quantity, 10) || 1);

    if (stock > 0 && parsedQty > stock) {
        showNotification(`Solo hay ${stock} disponibles para ${product?.name || 'este producto'}`, 'error');
        item.quantity = stock;
    } else {
        item.quantity = parsedQty;
    }

    saveCart();
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');

    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) cartCount.textContent = String(totalItems);

    if (!cartItems || !cartTotal) return;

    if (!state.cart.length) {
        cartItems.innerHTML = '<p class="empty-cart">Tu carrito está vacío</p>';
        cartTotal.textContent = '0.00';
        return;
    }

    cartItems.innerHTML = state.cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${sanitizeText(item.name)}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)} x ${item.quantity}</div>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" onclick="updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                <span class="cart-item-qty-value">${item.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
            </div>
            <button class="cart-remove" onclick="removeFromCart('${item.id}')">X</button>
        </div>
    `).join('');

    const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartTotal.textContent = total.toFixed(2);
}

function checkoutByWhatsApp() {
    if (!state.cart.length) {
        showNotification('Tu carrito está vacío', 'error');
        return;
    }

    const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);
    const clientName = state.currentUser?.name || 'Cliente';
    const clientEmail = state.currentUser?.email ? ` (${state.currentUser.email})` : '';
    const items = state.cart.map(item => `• ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`).join('\n');

    const message = [
        'Hola Forrajera Ruiz 👋',
        `Soy ${clientName}${clientEmail}.`,
        'Quisiera completar mi pedido con los siguientes productos:',
        items,
        `Total estimado: $${total}`,
        '¿Me ayudas por favor con la confirmación y entrega? ¡Gracias!'
    ].join('\n\n');

    const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function openProductModal(categoryKey) {
    state.activeCategory = categoryKey;
    const products = getProductsForCategory(categoryKey);
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;

    const title = getCategoryLabel(categoryKey);
    let html = `<h2>${sanitizeText(title)}</h2>`;

    if (!products.length) {
        html += `<p>No hay productos cargados en esta categoría por ahora.</p>`;
        if (isAdmin()) {
            html += '<p>Usa el Panel de Administración para agregar productos.</p>';
        }
    } else {
        html += '<div class="products-list">';
        html += products.map(product => `
            <div class="product-detail-card" onclick="openProductDetail('${product.id}')" role="button" tabindex="0">
                ${renderProductImageHTML(product, 'product-card-media', 'product-card-image')}
                <h3>${sanitizeText(product.name)}</h3>
                <p>${sanitizeText(product.description)}</p>
                <div class="product-specs">📦 ${sanitizeText(product.specs)}</div>
                <div class="product-specs">Disponibles: ${product.stock ?? 0}</div>
                <div class="product-price">$${product.price.toFixed(2)}</div>
                <div class="product-actions">
                    <button class="btn-add-cart" onclick="event.stopPropagation(); openProductDetail('${product.id}')">Ver detalle</button>
                </div>
            </div>
        `).join('');
        html += '</div>';
    }

    modalBody.innerHTML = html;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function openProductDetail(productId) {
    const product = findProductById(productId);
    if (!product) {
        showNotification('Producto no encontrado', 'error');
        return;
    }

    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;

    const categoryToReturn = state.activeCategory || getProductCategories(product)[0] || product.category;

    const html = `
        <div class="product-detail-wrap">
            <div class="product-detail-content">
                ${renderProductDetailGalleryHTML(product)}
                <h2>${sanitizeText(product.name)}</h2>
                <p class="product-detail-description">${sanitizeText(product.description)}</p>
                <div class="product-specs product-detail-spec">📂 ${sanitizeText(getProductCategoryLabels(product).join(' / '))}</div>
                <div class="product-specs product-detail-spec">📦 ${sanitizeText(product.specs)}</div>
                <div class="product-specs product-detail-spec">Disponibles: ${product.stock ?? 0}</div>
                <div class="product-price product-detail-price">$${product.price.toFixed(2)}</div>

                <div class="product-detail-actions-top">
                    <input id="detail-qty-${product.id}" type="number" min="1" max="${Math.max(1, product.stock || 1)}" value="1" class="product-qty-input product-detail-qty-input">
                    <button class="btn-add-cart" onclick="addToCart('${product.id}', document.getElementById('detail-qty-${product.id}').value)">Agregar al Carrito</button>
                </div>

                <div class="product-detail-actions-bottom">
                    <button class="btn-secondary" onclick="openProductModal('${categoryToReturn}')">Volver a la lista</button>
                    <a class="btn btn-primary" href="https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent('Hola, quiero información de: ' + product.name)}" target="_blank">Consultar por WhatsApp</a>
                </div>
            </div>
        </div>
    `;

    modalBody.innerHTML = html;
    initializeProductDetailGallery(modalBody);
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function openProductDetailFromSearch(productId) {
    const product = findProductById(productId);
    if (!product) return;
    state.activeCategory = getProductCategories(product)[0] || product.category;
    openProductDetail(productId);
    const results = document.getElementById('searchResults');
    results?.classList.add('hidden');
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    modal?.classList.add('hidden');
    document.body.style.overflow = 'auto';

    const activeCategory = String(state.activeCategory || '').trim().toLowerCase();
    if (!TOP_LEVEL_CATEGORIES.includes(activeCategory)) return;

    const card = document.querySelector(`.category-${activeCategory}`);
    if (!(card instanceof HTMLElement)) return;

    const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
    const top = card.getBoundingClientRect().top + window.scrollY - headerHeight - 18;
    window.scrollTo({ top, behavior: 'smooth' });

    card.classList.add('category-card-highlight');
    window.setTimeout(() => {
        card.classList.remove('category-card-highlight');
    }, 900);
}

function parseJwt(token) {
    try {
        const payload = token.split('.')[1]
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const json = decodeURIComponent(
            atob(payload)
                .split('')
                .map(char => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
                .join('')
        );
        return JSON.parse(json);
    } catch {
        return null;
    }
}

async function handleGoogleCredentialResponse(response) {
    if (isFirebaseConfigured()) {
        renderFirebaseGoogleButton();
        showNotification('Usa el botón "Iniciar con Google" para acceder con Firebase.', 'error');
        return;
    }

    const payload = parseJwt(response.credential || '');
    if (!payload) {
        showNotification('No se pudo validar la cuenta de Google', 'error');
        return;
    }

    state.currentUser = {
        name: payload.name || payload.given_name || 'Cliente',
        sub: payload.sub || '',
        email: payload.email || '',
        picture: payload.picture || ''
    };

    saveUser();
    renderAuthState();
    fillContactFieldsFromAccount();
    updateAdminVisibility();
    showNotification(`Bienvenido, ${state.currentUser.name}`, 'success');
}

function renderGoogleLoginFallback(message) {
    const container = document.getElementById('googleSignInBtn');
    if (!container) return;

    container.classList.remove('hidden');
    container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:8px;align-items:center;width:100%;">
            <small>${sanitizeText(message)}</small>
            <button type="button" class="btn-secondary" id="retryGoogleLoginBtn">Reintentar Google</button>
        </div>
    `;

    document.getElementById('retryGoogleLoginBtn')?.addEventListener('click', () => {
        initializeGoogleLogin();
    });
}

function getFirebaseAuthErrorMessage(error) {
    const code = String(error?.code || '');

    if (code.includes('auth/popup-closed-by-user')) return 'Cerraste la ventana de acceso antes de finalizar.';
    if (code.includes('auth/popup-blocked')) return 'El navegador bloqueó la ventana emergente de Google.';
    if (code.includes('auth/unauthorized-domain')) return 'Dominio no autorizado en Firebase Authentication.';
    if (code.includes('auth/operation-not-allowed')) return 'Google Sign-In no está habilitado en Firebase Authentication.';
    if (code.includes('auth/invalid-credential')) return 'Credencial de Google inválida para este proyecto Firebase.';

    return 'No se pudo iniciar sesión con Google/Firebase.';
}

function getFirebaseInitErrorMessage(error) {
    const code = String(error?.code || '');

    if (code.includes('auth/invalid-api-key')) return 'API Key inválida en la configuración de Firebase.';
    if (code.includes('auth/app-not-authorized')) return 'Tu dominio no está autorizado en Firebase Authentication.';
    if (code.includes('auth/operation-not-allowed')) return 'Google Sign-In no está habilitado en Firebase Authentication.';

    return 'No se pudo inicializar Firebase Authentication. Revisa credenciales y dominios autorizados.';
}

async function signInWithFirebasePopup() {
    if (!state.cloud.enabled || !state.cloud.auth || !state.cloud.authApi) {
        showNotification('Firebase Auth aún no está listo. Reintenta en unos segundos.', 'error');
        return;
    }

    try {
        const { GoogleAuthProvider, signInWithPopup } = state.cloud.authApi;
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(state.cloud.auth, provider);
        showNotification('Sesión iniciada correctamente', 'success');
    } catch (error) {
        showNotification(getFirebaseAuthErrorMessage(error), 'error');
    }
}

function renderFirebaseGoogleButton() {
    const container = document.getElementById('googleSignInBtn');
    if (!container) return;

    container.classList.remove('hidden');
    container.innerHTML = `
        <button type="button" class="google-login-btn" id="firebaseGoogleLoginBtn" aria-label="Iniciar sesión con Google">
            <span class="google-login-icon" aria-hidden="true">
                <svg viewBox="0 0 48 48" focusable="false">
                    <path fill="#EA4335" d="M24 9.5c3.1 0 5.9 1.1 8.1 3.2l6-6C34.4 3.2 29.6 1 24 1 14.6 1 6.5 6.5 2.6 14.5l7 5.5C11.4 13.9 17.1 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.7-.4-3.9H24v7.4h12.8c-.3 1.8-1.8 4.6-5.2 6.4l6.8 5.3c4-3.7 6.2-9.1 6.2-15.2z"></path>
                    <path fill="#FBBC05" d="M9.6 28c-.5-1.5-.8-3.1-.8-4.8s.3-3.3.8-4.8l-7-5.5C1 16.3 0 19.9 0 23.2s1 6.9 2.6 10.3l7-5.5z"></path>
                    <path fill="#34A853" d="M24 47c6.5 0 11.9-2.1 15.9-5.8l-6.8-5.3c-1.8 1.3-4.3 2.3-9.1 2.3-6.9 0-12.6-4.4-14.6-10.5l-7 5.5C6.5 41.5 14.6 47 24 47z"></path>
                </svg>
            </span>
            <span>Iniciar con Google</span>
        </button>
    `;
    document.getElementById('firebaseGoogleLoginBtn')?.addEventListener('click', signInWithFirebasePopup);
}

function isGoogleClientIdValid(clientId) {
    return /^[0-9]+-[a-zA-Z0-9_.-]+\.apps\.googleusercontent\.com$/.test(String(clientId || '').trim());
}

function initializeGoogleLogin(retryCount = 0) {
    const container = document.getElementById('googleSignInBtn');
    if (!container) return;

    if (isFirebaseConfigured()) {
        container.classList.remove('hidden');

        if (state.cloud.enabled && state.cloud.auth && state.cloud.authApi) {
            renderFirebaseGoogleButton();
            return;
        }

        if (state.cloud.initializing) {
            if (retryCount === 0) {
                container.innerHTML = '<small>Conectando acceso con Firebase...</small>';
            }

            if (retryCount < 40) {
                window.setTimeout(() => initializeGoogleLogin(retryCount + 1), 150);
            } else {
                renderGoogleLoginFallback('Firebase tardó en iniciar. Recarga la página e intenta otra vez.');
            }
            return;
        }

        if (state.cloud.initError) {
            renderGoogleLoginFallback(getFirebaseInitErrorMessage(state.cloud.initError));
            return;
        }

        renderGoogleLoginFallback('No se pudo iniciar Firebase Authentication. Verifica tu configuración.');
        return;
    }

    container.classList.remove('hidden');

    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        if (retryCount === 0) {
            container.innerHTML = '<small>Cargando acceso con Google...</small>';
        }

        if (retryCount < 40) {
            window.setTimeout(() => initializeGoogleLogin(retryCount + 1), 150);
        } else {
            renderGoogleLoginFallback('No se pudo cargar Google Login. Revisa conexión, bloqueadores o privacidad del navegador.');
        }
        return;
    }

    if (!isGoogleClientIdValid(CONFIG.googleClientId)) {
        renderGoogleLoginFallback('Configura tu Google Client ID para habilitar el login.');
        return;
    }

    try {
        container.innerHTML = '';

        window.google.accounts.id.initialize({
            client_id: CONFIG.googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
        });

        window.google.accounts.id.renderButton(container, {
            type: 'standard',
            shape: 'pill',
            theme: 'outline',
            text: 'signin_with',
            size: 'large'
        });

        window.google.accounts.id.prompt();

        window.setTimeout(() => {
            const hasGoogleButton = !!container.querySelector('iframe, div[role="button"], .nsm7Bb-HzV7m-LgbsSe');
            if (!hasGoogleButton && !state.currentUser) {
                renderGoogleLoginFallback('No fue posible mostrar el botón de Google en este navegador/cuenta.');
            }
        }, 1200);
    } catch {
        renderGoogleLoginFallback('No fue posible inicializar Google Login. Verifica Client ID y dominios autorizados.');
    }
}

async function logout() {
    try {
        window.google?.accounts?.id?.disableAutoSelect?.();
    } catch {
        // ignore
    }

    if (state.cloud.enabled && state.cloud.auth && state.cloud.authApi) {
        try {
            await state.cloud.authApi.signOut(state.cloud.auth);
            return;
        } catch {
            showNotification('No se pudo cerrar sesión en Firebase', 'error');
        }
    }

    clearCurrentUserSession();
}

function renderAuthState() {
    const authState = document.getElementById('authState');
    const loginContainer = document.getElementById('googleSignInBtn');
    if (!authState || !loginContainer) return;

    if (!state.currentUser) {
        authState.innerHTML = '<strong>Sesión:</strong> Invitado';
        loginContainer.classList.remove('hidden');
        initializeGoogleLogin();
        return;
    }

    const roleText = isAdmin() ? 'Admin Forrajera Ruiz' : 'Cliente';
    authState.innerHTML = `
        <div class="auth-user">
            ${state.currentUser.picture ? `<img src="${sanitizeText(state.currentUser.picture)}" alt="Perfil" class="auth-avatar">` : ''}
            <div>
                <strong>${sanitizeText(state.currentUser.name)}</strong>
                <small>${sanitizeText(state.currentUser.email)} · ${roleText}</small>
            </div>
        </div>
        <button id="logoutBtn" class="btn-secondary">Cerrar sesión</button>
    `;

    loginContainer.classList.add('hidden');
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
}

function fillContactFieldsFromAccount() {
    const nameInput = document.querySelector('input[name="nombre"]');
    const emailInput = document.querySelector('input[name="email"]');
    if (!nameInput || !emailInput) return;

    if (state.currentUser) {
        nameInput.value = state.currentUser.name || '';
        emailInput.value = state.currentUser.email || '';
    }
}

function initializeForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    fillContactFieldsFromAccount();

    form.addEventListener('submit', event => {
        event.preventDefault();

        const nombre = form.querySelector('input[name="nombre"]')?.value.trim() || '';
        const email = form.querySelector('input[name="email"]')?.value.trim() || '';
        const telefono = form.querySelector('input[name="telefono"]')?.value.trim() || '';
        const mensaje = form.querySelector('textarea[name="mensaje"]')?.value.trim() || '';

        if (!nombre || !email || !mensaje) {
            showNotification('Completa todos los campos requeridos', 'error');
            return;
        }

        const whatsappMessage = [
            'Hola Forrajera Ruiz 👋',
            `Mi nombre es ${nombre}.`,
            `Email: ${email}`,
            telefono ? `Teléfono: ${telefono}` : '',
            `Consulta: ${mensaje}`
        ].filter(Boolean).join('\n\n');

        window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
        showNotification('Tu mensaje se está abriendo en WhatsApp', 'success');
        form.reset();
        fillContactFieldsFromAccount();
    });
}

function populateAdminCategories() {
    const container = document.getElementById('adminCategory');
    if (!container) return;

    const options = TOP_LEVEL_CATEGORIES
        .map(key => `
            <label class="admin-category-option">
                <input type="checkbox" name="adminCategoryOption" value="${key}">
                <span>${getCategoryLabel(key)}</span>
            </label>
        `)
        .join('');

    container.innerHTML = options;
}

function getSelectedAdminCategories() {
    return Array.from(document.querySelectorAll('input[name="adminCategoryOption"]:checked'))
        .map(input => input.value)
        .filter(Boolean);
}

function setSelectedAdminCategories(categories) {
    const selectedCategories = new Set((Array.isArray(categories) ? categories : []).map(value => String(value || '').trim()));
    document.querySelectorAll('input[name="adminCategoryOption"]').forEach(input => {
        input.checked = selectedCategories.has(input.value);
    });
}

function renderAdminProducts() {
    const container = document.getElementById('adminProductsList');
    if (!container) return;

    if (!state.products.length) {
        container.innerHTML = '<p>No hay productos cargados. Agrega el primero desde el formulario.</p>';
        return;
    }

    container.innerHTML = `
        <div class="admin-products-grid">
            ${state.products.map(product => `
                <div class="admin-product-item">
                    <div class="admin-product-header">
                        ${renderProductImageHTML(product, 'admin-product-thumb-wrap', 'admin-product-thumb', 'admin-product-thumb-placeholder')}
                        <div>
                            <h4>${sanitizeText(product.name)}</h4>
                            <p>${sanitizeText(getProductCategoryLabels(product).join(' / '))}</p>
                        </div>
                    </div>
                    <p>$${product.price.toFixed(2)} · Stock: ${product.stock}</p>
                    <div class="admin-actions">
                        <div class="admin-quick-fields">
                            <input type="number" min="0" step="0.01" value="${product.price.toFixed(2)}" onchange="adminUpdatePrice('${product.id}', this.value)" aria-label="Precio" title="Precio">
                            <input type="number" min="0" value="${product.stock}" onchange="adminUpdateStock('${product.id}', this.value)" aria-label="Stock" title="Stock">
                        </div>
                        <div class="admin-quick-buttons">
                            <button class="btn-secondary" onclick="adminEditProduct('${product.id}')">Editar</button>
                            <button class="btn-secondary" onclick="adminDeleteProduct('${product.id}')">Eliminar</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function adminUpdatePrice(productId, priceValue) {
    if (!isAdmin()) return;
    const product = findProductById(productId);
    if (!product) return;

    const parsedPrice = Number.parseFloat(priceValue);
    const price = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0;

    try {
        await upsertProductRecord({
            ...product,
            price,
            updatedAt: Date.now()
        });
    } catch {
        showNotification('No se pudo actualizar precio', 'error');
        return;
    }

    state.cart = state.cart.map(item => item.id === productId ? { ...item, price } : item);
    saveCart();
    updateCartDisplay();

    if (!state.cloud.enabled) {
        renderAdminProducts();
    }

    showNotification('Precio actualizado', 'success');
}

function setAdminFormEditingState(editing, productName = '') {
    const submitBtn = document.getElementById('adminSubmitBtn');
    const cancelBtn = document.getElementById('adminCancelEditBtn');
    if (submitBtn) {
        submitBtn.textContent = editing ? 'Actualizar Producto' : 'Guardar Producto';
    }
    if (cancelBtn) {
        cancelBtn.classList.toggle('hidden', !editing);
    }

    const title = document.querySelector('#adminPanel .section-subtitle');
    if (title && editing) {
        title.textContent = `Editando: ${productName}. Guarda cambios o cancela edición.`;
    } else if (title) {
        title.textContent = 'Solo la cuenta autorizada puede crear, editar cantidad y eliminar productos.';
    }
}

function resetAdminForm() {
    const form = document.getElementById('adminProductForm');
    if (!form) return;

    state.adminEditingProductId = '';
    form.reset();
    populateAdminCategories();
    setAdminFormEditingState(false);
}

function adminEditProduct(productId) {
    if (!isAdmin()) return;
    const product = findProductById(productId);
    if (!product) return;

    state.adminEditingProductId = product.id;
    const nameInput = document.getElementById('adminName');
    const priceInput = document.getElementById('adminPrice');
    const stockInput = document.getElementById('adminStock');
    const specsInput = document.getElementById('adminSpecs');
    const descriptionInput = document.getElementById('adminDescription');

    if (nameInput) nameInput.value = product.name || '';
    setSelectedAdminCategories(getProductCategories(product));
    if (priceInput) priceInput.value = String(product.price ?? '');
    if (stockInput) stockInput.value = String(product.stock ?? 0);
    if (specsInput) specsInput.value = product.specs || '';
    if (descriptionInput) descriptionInput.value = product.description || '';

    const imageInput = document.getElementById('adminImage');
    if (imageInput instanceof HTMLInputElement) {
        imageInput.value = '';
    }

    setAdminFormEditingState(true, product.name || 'Producto');

    const form = document.getElementById('adminProductForm');
    form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function adminUpdateStock(productId, stockValue) {
    if (!isAdmin()) return;
    const product = findProductById(productId);
    if (!product) return;

    const stock = Math.max(0, parseInt(stockValue, 10) || 0);

    try {
        await upsertProductRecord({
            ...product,
            stock,
            updatedAt: Date.now()
        });
    } catch {
        showNotification('No se pudo actualizar cantidad', 'error');
        return;
    }

    state.cart = state.cart.filter(item => {
        if (item.id === productId) {
            return item.quantity <= stock;
        }

        const currentProduct = findProductById(item.id);
        return currentProduct && item.quantity <= currentProduct.stock;
    });

    saveCart();
    updateCartDisplay();

    if (!state.cloud.enabled) {
        renderAdminProducts();
    }

    showNotification('Cantidad actualizada', 'success');
}

async function adminDeleteProduct(productId) {
    if (!isAdmin()) return;

    try {
        await deleteProductRecord(productId);
    } catch {
        showNotification('No se pudo eliminar el producto', 'error');
        return;
    }

    state.cart = state.cart.filter(item => item.id !== productId);
    saveCart();

    if (!state.cloud.enabled) {
        renderAdminProducts();
    }

    updateCartDisplay();
    showNotification('Producto eliminado', 'success');
}

function initializeAdminPanel() {
    const form = document.getElementById('adminProductForm');
    const cancelEditBtn = document.getElementById('adminCancelEditBtn');
    populateAdminCategories();

    cancelEditBtn?.addEventListener('click', () => {
        resetAdminForm();
    });

    form?.addEventListener('submit', async event => {
        event.preventDefault();
        if (!isAdmin()) return;

        const name = document.getElementById('adminName')?.value.trim() || '';
        const categories = getSelectedAdminCategories();
        const price = parseFloat(document.getElementById('adminPrice')?.value || '0');
        const stock = Math.max(0, parseInt(document.getElementById('adminStock')?.value || '0', 10));
        const specs = document.getElementById('adminSpecs')?.value.trim() || '';
        const description = document.getElementById('adminDescription')?.value.trim() || '';
        const imageInput = document.getElementById('adminImage');
        const imageFiles = imageInput instanceof HTMLInputElement ? Array.from(imageInput.files || []) : [];

        if (!name || !categories.length || !specs || !description || Number.isNaN(price)) {
            showNotification('Completa todos los campos del producto', 'error');
            return;
        }

        let images = [];
        if (imageFiles.length) {
            try {
                images = await Promise.all(imageFiles.map(file => fileToOptimizedDataURL(file)));
            } catch {
                showNotification('No se pudo leer una de las imagenes seleccionadas', 'error');
                return;
            }
        }

        const currentEditingProduct = state.adminEditingProductId ? findProductById(state.adminEditingProductId) : null;
        const shouldUpdate = !!currentEditingProduct;

        if (!imageFiles.length && currentEditingProduct) {
            images = getProductImages(currentEditingProduct);
        }

        const newProduct = normalizeProduct({
            id: shouldUpdate ? currentEditingProduct.id : `prod-${Date.now()}`,
            name,
            category: categories[0],
            categories,
            price,
            stock,
            specs,
            description,
            image: images[0] || '',
            images,
            updatedAt: Date.now()
        });

        if (state.cloud.enabled) {
            const payloadBytes = estimateObjectBytes(newProduct);
            if (payloadBytes > IMAGE_OPTIMIZATION.targetProductBytesCloud) {
                showNotification('Demasiadas fotos para Firestore en un solo producto. Sube menos imagenes.', 'error');
                return;
            }
        }

        try {
            await upsertProductRecord(newProduct);
        } catch (error) {
            showNotification(getProductSaveErrorMessage(error), 'error');
            return;
        }

        if (!state.cloud.enabled) {
            renderAdminProducts();
        }

        resetAdminForm();
        showNotification(shouldUpdate ? 'Producto actualizado correctamente' : 'Producto guardado correctamente', 'success');
    });
}

function updateAdminVisibility() {
    const panel = document.getElementById('adminPanel');
    if (!panel) return;

    if (isAdmin()) {
        panel.classList.remove('hidden');
        renderAdminProducts();
    } else {
        panel.classList.add('hidden');
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 2000;
        background: ${type === 'success' ? '#4f8a63' : '#c62828'};
        box-shadow: 0 8px 20px rgba(18,33,23,0.16);
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

window.openProductModal = openProductModal;
window.handleCategoryCardClick = handleCategoryCardClick;
window.closeProductModal = closeProductModal;
window.openProductDetail = openProductDetail;
window.openProductDetailFromSearch = openProductDetailFromSearch;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.adminDeleteProduct = adminDeleteProduct;
window.adminUpdateStock = adminUpdateStock;
window.adminUpdatePrice = adminUpdatePrice;
window.adminEditProduct = adminEditProduct;

window.addEventListener('click', event => {
    const modal = document.getElementById('productModal');
    if (event.target === modal) closeProductModal();
});

document.addEventListener('DOMContentLoaded', async () => {
    initializeState();
    initializeSmoothScroll();
    initializeSearch();
    initializeCart();
    initializeForm();
    initializeAdminPanel();

    await initializeCloudProductsSync();

    renderAuthState();
    updateAdminVisibility();
    updateCartDisplay();
});
