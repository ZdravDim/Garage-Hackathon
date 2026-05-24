// Mock catalogs for the two storefronts. `type` + `fit` drive the size chart
// used by the fit engine; `gender` ('women'|'men') drives the Woman/Man tabs;
// `image` is a real, free-licensed Unsplash photo (hotlinked from their CDN)
// chosen to match the garment; `swatch`/`bg` remain as a fallback tile for any
// product without an `image`. Prices are illustrative.

// Build an Unsplash delivery URL from a photo id.
const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=700&q=70`;

const ZARA = [
  { id: 'z1', name: 'Oversized Wool Blend Coat', category: 'Coats', gender: 'women', type: 'top', fit: 'relaxed', price: 149, swatch: '#2b2b2b', bg: '#d9d6d0', material: '60% wool, 40% polyester', image: img('1483985988355-763728e1935b') },
  { id: 'z2', name: 'Slim Fit Poplin Shirt', category: 'Shirts', gender: 'men', type: 'top', fit: 'slim', price: 39.9, swatch: '#ffffff', bg: '#ece9e3', material: '100% cotton', image: img('1521572163474-6864f9cf17ab') },
  { id: 'z3', name: 'High-Waist Straight Jeans', category: 'Jeans', gender: 'women', type: 'bottom', fit: 'regular', price: 49.9, swatch: '#3a4a63', bg: '#dcd7cf', material: '99% cotton, 1% elastane', image: img('1542272604-787c3835535d') },
  { id: 'z4', name: 'Ribbed Knit Midi Dress', category: 'Dresses', gender: 'women', type: 'dress', fit: 'slim', price: 45.9, swatch: '#7b5e57', bg: '#e7ded4', material: '80% viscose, 20% polyamide', image: img('1572804013309-59a88b7e92f1') },
  { id: 'z5', name: 'Tailored Blazer', category: 'Blazers', gender: 'men', type: 'top', fit: 'regular', price: 89.9, swatch: '#1c1c1c', bg: '#d7d2ca', material: '70% polyester, 28% viscose, 2% elastane', image: img('1617127365659-c47fa864d8bc') },
  { id: 'z7', name: 'Cropped Faux Leather Jacket', category: 'Jackets', gender: 'women', type: 'top', fit: 'slim', price: 69.9, swatch: '#3b2f2a', bg: '#ddd8cf', material: '100% polyurethane', image: img('1623854156816-4c4fc355ffc7') },
  { id: 'z8', name: 'Satin Slip Dress', category: 'Dresses', gender: 'women', type: 'dress', fit: 'regular', price: 35.9, swatch: '#54607a', bg: '#e6e1d8', material: '97% polyester, 3% elastane', image: img('1595777457583-95e059d581b8') },
  { id: 'z9', name: 'Relaxed Cargo Trousers', category: 'Trousers', gender: 'men', type: 'bottom', fit: 'relaxed', price: 45.9, swatch: '#6b6650', bg: '#e0dccf', material: '100% cotton', image: img('1686577670342-4b684e07f8fb') },
  { id: 'z11', name: 'Pleated Midi Skirt', category: 'Skirts', gender: 'women', type: 'bottom', fit: 'regular', price: 39.9, swatch: '#7a6f86', bg: '#e7e2d8', material: '100% recycled polyester', image: img('1593129747951-db31f82963da') },
  { id: 'z12', name: 'Slim Fit Chinos', category: 'Trousers', gender: 'men', type: 'bottom', fit: 'slim', price: 39.9, swatch: '#bba47e', bg: '#ded3bf', material: '98% cotton, 2% elastane', image: img('1594938252461-e42450664907') },
  { id: 'z13', name: 'Hooded Puffer Jacket', category: 'Jackets', gender: 'men', type: 'top', fit: 'regular', price: 79.9, swatch: '#23282d', bg: '#d7d2ca', material: '100% polyamide', image: img('1557418669-db3f781a58c0') },
  { id: 'z14', name: 'Merino V-Neck Sweater', category: 'Knitwear', gender: 'men', type: 'top', fit: 'regular', price: 35.9, swatch: '#3d5a4a', bg: '#e8e2d6', material: '100% merino wool', image: img('1599032909736-0155c1d43a6c') },
];

const MASSIMO = [
  { id: 'm1', name: 'Wool Suit Blazer', category: 'Tailoring', gender: 'men', type: 'top', fit: 'regular', price: 199, swatch: '#22262b', bg: '#cfc6b7', material: '100% virgin wool', image: img('1622497170185-5d668f816a56') },
  { id: 'm2', name: 'Cashmere Crew Sweater', category: 'Knitwear', gender: 'women', type: 'top', fit: 'regular', price: 129, swatch: '#8a6f4e', bg: '#e3d9c6', material: '100% cashmere', image: img('1588271968087-4c51abe05afc') },
  { id: 'm3', name: 'Slim Fit Cotton Chinos', category: 'Trousers', gender: 'men', type: 'bottom', fit: 'slim', price: 69.9, swatch: '#bba47e', bg: '#ded3bf', material: '98% cotton, 2% elastane', image: img('1545273072-c541efad6ba6') },
  { id: 'm4', name: 'Silk Blend Midi Dress', category: 'Dresses', gender: 'women', type: 'dress', fit: 'regular', price: 149, swatch: '#6a4e54', bg: '#e6dccb', material: '70% silk, 30% cotton', image: img('1612336307429-8a898d10e223') },
  { id: 'm5', name: 'Linen Tailored Shirt', category: 'Shirts', gender: 'men', type: 'top', fit: 'regular', price: 59.9, swatch: '#eef0ec', bg: '#ddd3c1', material: '100% linen', image: img('1627686011747-74adda3d2343') },
  { id: 'm6', name: 'Pleated Wool Trousers', category: 'Trousers', gender: 'men', type: 'bottom', fit: 'regular', price: 89.9, swatch: '#2c2f33', bg: '#d6ccba', material: '96% wool, 4% elastane', image: img('1591078771377-d06325f68465') },
  { id: 'm7', name: 'Leather Biker Jacket', category: 'Outerwear', gender: 'women', type: 'top', fit: 'slim', price: 299, swatch: '#241f1c', bg: '#d3c9b8', material: '100% lambskin leather', image: img('1521223890158-f9f7c3d5d504') },
  { id: 'm8', name: 'Ribbed Wrap Dress', category: 'Dresses', gender: 'women', type: 'dress', fit: 'slim', price: 99.9, swatch: '#3f4a3c', bg: '#e1d7c4', material: '78% viscose, 22% polyester', image: img('1572804013309-59a88b7e92f1') },
  { id: 'm9', name: 'Straight Fit Selvedge Jeans', category: 'Jeans', gender: 'men', type: 'bottom', fit: 'regular', price: 99.9, swatch: '#34465c', bg: '#d9cfbd', material: '100% cotton', image: img('1624378439575-d8705ad7ae80') },
  { id: 'm10', name: 'Merino Polo Shirt', category: 'Knitwear', gender: 'men', type: 'top', fit: 'slim', price: 79.9, swatch: '#54707a', bg: '#e2d8c6', material: '100% merino wool', image: img('1620799140408-edc6dcb6d633') },
  { id: 'm11', name: 'Wool Blend Midi Skirt', category: 'Skirts', gender: 'women', type: 'bottom', fit: 'regular', price: 79.9, swatch: '#6a5d4e', bg: '#e3d9c6', material: '70% wool, 30% polyester', image: img('1533659828870-95ee305cee3e') },
  { id: 'm12', name: 'Silk Blouse', category: 'Shirts', gender: 'women', type: 'top', fit: 'regular', price: 89.9, swatch: '#d8c2b0', bg: '#ece3d4', material: '100% silk', image: img('1600973964462-0cf10488d440') },
  { id: 'm14', name: 'Quilted Field Jacket', category: 'Outerwear', gender: 'men', type: 'top', fit: 'regular', price: 159, swatch: '#3b4035', bg: '#d6ccba', material: '100% cotton, down fill', image: img('1633293822049-dee1b40a99c5') },
];

const CATALOGS = { zara: ZARA, massimo: MASSIMO };

// All products for an app, optionally narrowed to one gender ('women'|'men').
// An unknown/empty gender returns the full catalog.
function listProducts(app, gender) {
  const all = CATALOGS[app] || [];
  return gender === 'women' || gender === 'men' ? all.filter((p) => p.gender === gender) : all;
}

function getProduct(app, id) {
  return listProducts(app).find((p) => p.id === id) || null;
}

module.exports = { listProducts, getProduct };
