// cart.js
// Manage shopping cart logic using localStorage

function getCartItems() {
  return JSON.parse(localStorage.getItem('helia_cart') || '[]');
}

function saveCartItems(items) {
  localStorage.setItem('helia_cart', JSON.stringify(items));
  updateCartBadge();
}

function addToCart(id, name, price, img, mood, size = 'M', color = 'Default') {
  const items = getCartItems();
  const existingItemIndex = items.findIndex(item => item.id === id && item.size === size && item.color === color);

  if (existingItemIndex > -1) {
    items[existingItemIndex].qty += 1;
  } else {
    items.push({ id, name, price, img, mood, size, color, qty: 1 });
  }

  saveCartItems(items);
  alert(`"${name}" berhasil ditambahkan ke keranjang!`);
}

function updateCartBadge() {
  const items = getCartItems();
  const counts = document.querySelectorAll('.cart-count');
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
  
  counts.forEach(badge => {
    badge.textContent = totalQty;
    // Sembunyikan badge jika 0
    if (totalQty === 0) {
      badge.style.display = 'none';
    } else {
      badge.style.display = 'flex';
    }
  });
}

// Update badge when script loads
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
});
