const CONFIG = {
    googleClientId: '899292602874-gq7hododt0o3e02tv0lr9s6op3cdojh4.apps.googleusercontent.com',
    adminEmail: 'victorbanco132@gmail.com',
    adminEmails: [
        'victorbanco132@gmail.com',
        'marysolruizmendez83@gmail.com',
        'mary_solruiz@hotmail.com',
        'serch.reyes24@gmail.com'
    ],
    whatsappNumber: '2371056258'
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

const TOP_LEVEL_CATEGORIES = ['agroquimicos', 'veterinaria', 'alimentos', 'accesorios'];
const MAX_PRODUCT_IMAGE_SIZE = 1.5 * 1024 * 1024;

const state = {
    products: [],
    cart: [],
    currentUser: null,
    activeCategory: ''
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
    state.currentUser = readJSON(STORAGE_KEYS.user, null);
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
    if (TOP_LEVEL_CATEGORIES.includes(categoryKey)) {
        return state.products.filter(product => product.category === categoryKey || CATEGORY_PARENT[product.category] === categoryKey);
    }
    return state.products.filter(product => product.category === categoryKey);
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

function getProductImage(product) {
    return typeof product?.image === 'string' ? product.image.trim() : '';
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

function initializeCategoryVideo() {
    const videoCards = document.querySelectorAll('.category-card-video');
    if (!videoCards.length) return;

    videoCards.forEach(videoCard => {
        const video = videoCard.querySelector('.category-bg-video');
        if (!video) return;

        videoCard.addEventListener('mouseenter', () => {
            video.play().catch(() => {});
        });

        videoCard.addEventListener('mouseleave', () => {
            video.pause();
        });
    });
}

function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', event => {
            const href = link.getAttribute('href');
            if (!href || href === '#') return;
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
            return [product.name, product.description, product.specs, getCategoryLabel(product.category)]
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
                <small>${sanitizeText(getCategoryLabel(product.category))}</small>
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

    const categoryToReturn = state.activeCategory || product.category;

    const html = `
        <div class="product-detail-wrap">
            <div class="product-detail-content">
                ${renderProductImageHTML(product, 'product-detail-media', 'product-detail-image', 'product-detail-placeholder')}
                <h2>${sanitizeText(product.name)}</h2>
                <p class="product-detail-description">${sanitizeText(product.description)}</p>
                <div class="product-specs product-detail-spec">📂 ${sanitizeText(getCategoryLabel(product.category))}</div>
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
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function openProductDetailFromSearch(productId) {
    const product = findProductById(productId);
    if (!product) return;
    state.activeCategory = product.category;
    openProductDetail(productId);
    const results = document.getElementById('searchResults');
    results?.classList.add('hidden');
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    modal?.classList.add('hidden');
    document.body.style.overflow = 'auto';
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

function handleGoogleCredentialResponse(response) {
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

function isGoogleClientIdValid(clientId) {
    return /^[0-9]+-[a-zA-Z0-9_.-]+\.apps\.googleusercontent\.com$/.test(String(clientId || '').trim());
}

function initializeGoogleLogin(retryCount = 0) {
    const container = document.getElementById('googleSignInBtn');
    if (!container) return;

    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        if (retryCount === 0) {
            container.innerHTML = '<small>Cargando acceso con Google...</small>';
        }

        if (retryCount < 40) {
            window.setTimeout(() => initializeGoogleLogin(retryCount + 1), 150);
        } else {
            container.innerHTML = '<small>No se pudo cargar Google Login. Revisa conexión, bloqueadores o privacidad del navegador.</small>';
        }
        return;
    }

    if (!isGoogleClientIdValid(CONFIG.googleClientId)) {
        container.innerHTML = '<small>Configura tu Google Client ID en script.js para habilitar el login.</small>';
        return;
    }

    try {
        container.innerHTML = '';

        window.google.accounts.id.initialize({
            client_id: CONFIG.googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: true,
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
    } catch {
        container.innerHTML = '<small>No fue posible inicializar Google Login. Verifica tu Client ID y Orígenes autorizados.</small>';
    }
}

function logout() {
    state.currentUser = null;
    saveUser();
    renderAuthState();
    fillContactFieldsFromAccount();
    updateAdminVisibility();
}

function renderAuthState() {
    const authState = document.getElementById('authState');
    const loginContainer = document.getElementById('googleSignInBtn');
    if (!authState || !loginContainer) return;

    if (!state.currentUser) {
        authState.innerHTML = '<strong>Sesión:</strong> Invitado';
        loginContainer.classList.remove('hidden');
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
    const select = document.getElementById('adminCategory');
    if (!select) return;

    const options = TOP_LEVEL_CATEGORIES
        .map(key => `<option value="${key}">${getCategoryLabel(key)}</option>`)
        .join('');

    select.innerHTML = `<option value="" disabled selected>Selecciona una categoría</option>${options}`;
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
                            <p>${sanitizeText(getCategoryLabel(product.category))}</p>
                        </div>
                    </div>
                    <p>$${product.price.toFixed(2)} · Stock: ${product.stock}</p>
                    <div class="admin-actions">
                        <input type="number" min="0" value="${product.stock}" onchange="adminUpdateStock('${product.id}', this.value)">
                        <button class="btn-secondary" onclick="adminDeleteProduct('${product.id}')">Eliminar</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function adminUpdateStock(productId, stockValue) {
    if (!isAdmin()) return;
    const product = findProductById(productId);
    if (!product) return;

    product.stock = Math.max(0, parseInt(stockValue, 10) || 0);
    saveProducts();

    state.cart = state.cart.filter(item => {
        const p = findProductById(item.id);
        return p && item.quantity <= p.stock;
    });
    saveCart();
    updateCartDisplay();
    showNotification('Cantidad actualizada', 'success');
}

function adminDeleteProduct(productId) {
    if (!isAdmin()) return;

    state.products = state.products.filter(product => product.id !== productId);
    state.cart = state.cart.filter(item => item.id !== productId);

    saveProducts();
    saveCart();
    renderAdminProducts();
    updateCartDisplay();
    showNotification('Producto eliminado', 'success');
}

function initializeAdminPanel() {
    const form = document.getElementById('adminProductForm');
    populateAdminCategories();

    form?.addEventListener('submit', async event => {
        event.preventDefault();
        if (!isAdmin()) return;

        const name = document.getElementById('adminName')?.value.trim() || '';
        const category = document.getElementById('adminCategory')?.value || '';
        const price = parseFloat(document.getElementById('adminPrice')?.value || '0');
        const stock = Math.max(0, parseInt(document.getElementById('adminStock')?.value || '0', 10));
        const specs = document.getElementById('adminSpecs')?.value.trim() || '';
        const description = document.getElementById('adminDescription')?.value.trim() || '';
        const imageInput = document.getElementById('adminImage');
        const imageFile = imageInput instanceof HTMLInputElement ? imageInput.files?.[0] : null;

        if (!name || !category || !specs || !description || Number.isNaN(price)) {
            showNotification('Completa todos los campos del producto', 'error');
            return;
        }

        if (imageFile && imageFile.size > MAX_PRODUCT_IMAGE_SIZE) {
            showNotification('La imagen excede 1.5MB. Usa una foto más ligera.', 'error');
            return;
        }

        let image = '';
        if (imageFile) {
            try {
                image = await fileToDataURL(imageFile);
            } catch {
                showNotification('No se pudo leer la imagen seleccionada', 'error');
                return;
            }
        }

        const newProduct = {
            id: `prod-${Date.now()}`,
            name,
            category,
            price,
            stock,
            specs,
            description,
            image
        };

        state.products.unshift(newProduct);

        try {
            saveProducts();
        } catch {
            state.products = state.products.filter(product => product.id !== newProduct.id);
            showNotification('No se pudo guardar. Intenta con una imagen más pequeña.', 'error');
            return;
        }

        renderAdminProducts();
        form.reset();
        showNotification('Producto guardado correctamente', 'success');
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
window.closeProductModal = closeProductModal;
window.openProductDetail = openProductDetail;
window.openProductDetailFromSearch = openProductDetailFromSearch;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.adminDeleteProduct = adminDeleteProduct;
window.adminUpdateStock = adminUpdateStock;

window.addEventListener('click', event => {
    const modal = document.getElementById('productModal');
    if (event.target === modal) closeProductModal();
});

document.addEventListener('DOMContentLoaded', () => {
    initializeState();
    initializeCategoryVideo();
    initializeSmoothScroll();
    initializeSearch();
    initializeCart();
    initializeForm();
    initializeAdminPanel();
    initializeGoogleLogin();
    renderAuthState();
    updateAdminVisibility();
    updateCartDisplay();
});
