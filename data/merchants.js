// Unified marketplace feed across merchants. Zara & Massimo Dutti reuse the
// storefront catalogs and link to our internal product pages; the rest are mock
// catalogs that link out to the merchant's official site (homepage placeholder).
const { listProducts } = require('./products');

const MERCHANTS = {
  zara: { name: 'Zara', internal: true },
  massimo: { name: 'Massimo Dutti', internal: true },
  arket: { name: 'Arket', site: 'https://www.arket.com' },
  cos: { name: 'COS', site: 'https://www.cos.com' },
  uniqlo: { name: 'Uniqlo', site: 'https://www.uniqlo.com' },
};

const ARKET = [
  { id: 'a1', name: 'Relaxed Wool Overshirt', category: 'Shirts', gender: 'men', type: 'top', fit: 'relaxed', price: 119, swatch: '#6f6a5d', bg: '#e4dfd3', material: '100% wool' },
  { id: 'a2', name: 'Heavyweight Cotton Tee', category: 'Knitwear', gender: 'men', type: 'top', fit: 'regular', price: 35, swatch: '#efece4', bg: '#e1ddd1', material: '100% organic cotton' },
  { id: 'a3', name: 'Tapered Wool Trousers', category: 'Trousers', gender: 'men', type: 'bottom', fit: 'regular', price: 99, swatch: '#3b3a36', bg: '#ded9cc', material: '96% wool, 4% elastane' },
  { id: 'a4', name: 'Organic Cotton Shirt Dress', category: 'Dresses', gender: 'women', type: 'dress', fit: 'relaxed', price: 89, swatch: '#8a9a8e', bg: '#e6e2d6', material: '100% organic cotton' },
  { id: 'a5', name: 'Merino Roll-Neck', category: 'Knitwear', gender: 'women', type: 'top', fit: 'slim', price: 79, swatch: '#5b3f3a', bg: '#e7e1d4', material: '100% merino wool' },
  { id: 'a6', name: 'Wide-Leg Denim', category: 'Jeans', gender: 'women', type: 'bottom', fit: 'relaxed', price: 89, swatch: '#41506a', bg: '#ddd6c8', material: '100% cotton' },
  { id: 'a7', name: 'Linen Blend Blazer', category: 'Tailoring', gender: 'men', type: 'top', fit: 'regular', price: 165, swatch: '#bdae93', bg: '#e6e1d3', material: '54% linen, 46% cotton' },
  { id: 'a8', name: 'Pleated Midi Skirt', category: 'Skirts', gender: 'women', type: 'bottom', fit: 'regular', price: 75, swatch: '#7a6f86', bg: '#e7e2d8', material: '100% recycled polyester' },
  { id: 'a9', name: 'Ribbed Knit Tank Dress', category: 'Dresses', gender: 'women', type: 'dress', fit: 'slim', price: 69, swatch: '#9a8c74', bg: '#e8e2d4', material: '95% cotton, 5% elastane' },
  { id: 'a11', name: 'Cotton Poplin Blouse', category: 'Shirts', gender: 'women', type: 'top', fit: 'regular', price: 65, swatch: '#eef0ec', bg: '#ece8de', material: '100% organic cotton' },
  { id: 'a12', name: 'Brushed Flannel Shirt', category: 'Shirts', gender: 'men', type: 'top', fit: 'regular', price: 69, swatch: '#5d4038', bg: '#e4dccd', material: '100% brushed cotton' },
  { id: 'a13', name: 'Straight Cotton Chinos', category: 'Trousers', gender: 'men', type: 'bottom', fit: 'regular', price: 79, swatch: '#a9966f', bg: '#e2dccb', material: '98% cotton, 2% elastane' },
  { id: 'a14', name: 'Lambswool Crew Sweater', category: 'Knitwear', gender: 'men', type: 'top', fit: 'regular', price: 89, swatch: '#3a4a55', bg: '#e6e1d3', material: '100% lambswool' },
];

const COS = [
  { id: 'c1', name: 'Clean-Cut Poplin Shirt', category: 'Shirts', gender: 'men', type: 'top', fit: 'regular', price: 89, swatch: '#f2f1ec', bg: '#e9e6df', material: '100% cotton' },
  { id: 'c2', name: 'Volume-Sleeve Knit', category: 'Knitwear', gender: 'women', type: 'top', fit: 'relaxed', price: 115, swatch: '#9c5f4c', bg: '#ece6dc', material: '70% wool, 30% alpaca' },
  { id: 'c3', name: 'Straight-Leg Twill Trousers', category: 'Trousers', gender: 'men', type: 'bottom', fit: 'regular', price: 99, swatch: '#2e3330', bg: '#e4e0d6', material: '98% cotton, 2% elastane' },
  { id: 'c4', name: 'Draped Jersey Dress', category: 'Dresses', gender: 'women', type: 'dress', fit: 'slim', price: 135, swatch: '#3c3c44', bg: '#e8e3da', material: '95% viscose, 5% elastane' },
  { id: 'c5', name: 'Oversized Wool Coat', category: 'Coats', gender: 'women', type: 'top', fit: 'relaxed', price: 250, swatch: '#262420', bg: '#ddd8cc', material: '90% wool, 10% cashmere' },
  { id: 'c6', name: 'Tailored Wool Trousers', category: 'Tailoring', gender: 'men', type: 'bottom', fit: 'slim', price: 115, swatch: '#4a4d52', bg: '#e6e1d6', material: '100% wool' },
  { id: 'c7', name: 'Cotton-Silk Tee', category: 'Knitwear', gender: 'men', type: 'top', fit: 'regular', price: 45, swatch: '#cdb8a0', bg: '#ebe6db', material: '70% cotton, 30% silk' },
  { id: 'c8', name: 'A-Line Denim Skirt', category: 'Skirts', gender: 'women', type: 'bottom', fit: 'regular', price: 69, swatch: '#5a6b86', bg: '#e3ddcf', material: '100% cotton' },
  { id: 'c9', name: 'Pleated Twill Dress', category: 'Dresses', gender: 'women', type: 'dress', fit: 'regular', price: 125, swatch: '#7d6a58', bg: '#e7e0d4', material: '100% cotton' },
  { id: 'c10', name: 'High-Rise Tapered Jeans', category: 'Jeans', gender: 'women', type: 'bottom', fit: 'slim', price: 95, swatch: '#39465e', bg: '#e1dacb', material: '92% cotton, 6% polyester, 2% elastane' },
  { id: 'c11', name: 'Merino Wrap Cardigan', category: 'Knitwear', gender: 'women', type: 'top', fit: 'relaxed', price: 110, swatch: '#8a7a6a', bg: '#ece6dc', material: '100% merino wool' },
  { id: 'c12', name: 'Garment-Dyed Overshirt', category: 'Shirts', gender: 'men', type: 'top', fit: 'relaxed', price: 99, swatch: '#56604f', bg: '#e4e0d3', material: '100% cotton' },
  { id: 'c13', name: 'Wool-Blend Blazer', category: 'Tailoring', gender: 'men', type: 'top', fit: 'regular', price: 190, swatch: '#2c2f35', bg: '#e1dcd0', material: '80% wool, 20% polyamide' },
  { id: 'c14', name: 'Relaxed Linen Trousers', category: 'Trousers', gender: 'men', type: 'bottom', fit: 'relaxed', price: 85, swatch: '#b7a888', bg: '#e6e1d4', material: '100% linen' },
];

const UNIQLO = [
  { id: 'u1', name: 'Supima Cotton Crew Tee', category: 'Knitwear', gender: 'men', type: 'top', fit: 'regular', price: 14.9, swatch: '#ffffff', bg: '#e8e6e0', material: '100% Supima cotton' },
  { id: 'u2', name: 'AIRism Oxford Shirt', category: 'Shirts', gender: 'men', type: 'top', fit: 'slim', price: 39.9, swatch: '#a9c2d6', bg: '#e3e5e1', material: '60% cotton, 40% polyester' },
  { id: 'u4', name: 'Ultra Stretch Jeans', category: 'Jeans', gender: 'women', type: 'bottom', fit: 'slim', price: 49.9, swatch: '#2f3d52', bg: '#ddd7c9', material: '79% cotton, 19% polyester, 2% spandex' },
  { id: 'u5', name: 'Merino Crew Sweater', category: 'Knitwear', gender: 'men', type: 'top', fit: 'regular', price: 49.9, swatch: '#7c2f33', bg: '#e8e1d5', material: '100% extra fine merino' },
  { id: 'u6', name: 'Rayon Long-Sleeve Dress', category: 'Dresses', gender: 'women', type: 'dress', fit: 'regular', price: 49.9, swatch: '#3a4a3f', bg: '#e6e1d6', material: '100% rayon' },
  { id: 'u7', name: 'Wide Pleated Trousers', category: 'Trousers', gender: 'men', type: 'bottom', fit: 'relaxed', price: 39.9, swatch: '#5f5b50', bg: '#e3ded2', material: '100% polyester' },
  { id: 'u8', name: 'Linen Blend Shirt', category: 'Shirts', gender: 'men', type: 'top', fit: 'regular', price: 29.9, swatch: '#dfe2da', bg: '#e7e4db', material: '55% linen, 45% viscose' },
  { id: 'u9', name: 'Rib Mock Neck Top', category: 'Knitwear', gender: 'women', type: 'top', fit: 'slim', price: 24.9, swatch: '#b08b76', bg: '#ece4da', material: '64% rayon, 33% nylon, 3% spandex' },
  { id: 'u10', name: 'Pleated Midi Skirt', category: 'Skirts', gender: 'women', type: 'bottom', fit: 'regular', price: 39.9, swatch: '#6b6552', bg: '#e3ded2', material: '100% polyester' },
  { id: 'u11', name: 'Linen Blend Dress', category: 'Dresses', gender: 'women', type: 'dress', fit: 'relaxed', price: 49.9, swatch: '#9aa28e', bg: '#e7e3d6', material: '55% linen, 45% viscose' },
  { id: 'u12', name: 'Smart Stretch Blazer', category: 'Tailoring', gender: 'women', type: 'top', fit: 'regular', price: 79.9, swatch: '#2f3338', bg: '#e1dcd0', material: '70% polyester, 26% rayon, 4% spandex' },
  { id: 'u13', name: 'Heattech Knit Polo', category: 'Knitwear', gender: 'men', type: 'top', fit: 'slim', price: 34.9, swatch: '#46545f', bg: '#e6e1d3', material: '50% acrylic, 30% rayon, 20% polyester' },
  { id: 'u14', name: 'Selvedge Slim Jeans', category: 'Jeans', gender: 'men', type: 'bottom', fit: 'slim', price: 49.9, swatch: '#33455c', bg: '#ddd7c9', material: '100% cotton' },
];

const EXTERNAL = { arket: ARKET, cos: COS, uniqlo: UNIQLO };

// Build the unified, marketplace-ready product list.
function marketplaceProducts() {
  const all = [];

  for (const merchant of ['zara', 'massimo']) {
    for (const p of listProducts(merchant)) {
      all.push({
        ...p,
        uid: `${merchant}:${p.id}`,
        merchant,
        merchantName: MERCHANTS[merchant].name,
        url: `/${merchant}/product.html?id=${p.id}`,
        external: false,
      });
    }
  }

  for (const [merchant, products] of Object.entries(EXTERNAL)) {
    for (const p of products) {
      all.push({
        ...p,
        uid: `${merchant}:${p.id}`,
        merchant,
        merchantName: MERCHANTS[merchant].name,
        url: MERCHANTS[merchant].site,
        external: true,
      });
    }
  }

  return all;
}

module.exports = { MERCHANTS, marketplaceProducts };
