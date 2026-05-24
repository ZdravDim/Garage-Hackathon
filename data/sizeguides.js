// Mock per-merchant size guides: the body measurements (cm) each merchant
// recommends for every size, per garment type. These ranges are what the fit
// engine compares your body against to produce the fit percentage, so two
// merchants can recommend different sizes for the same body.
//
// Shape: GUIDES[merchant][type] = { XS:{dim:[min,max],...}, S:{...}, ... }
// Dimensions per type: top → chest/waist/shoulder, bottom → waist/hips/inseam,
// dress → chest/waist/hips.

const GUIDES = {
  // Zara tends to run slim / on the small side. Charts are calibrated so a
  // broad, larger build (≈105 cm chest) lands on M for most garments and tips
  // to L on the fuller-cut categories.
  zara: {
    top: {
      XS: { chest: [88, 94], waist: [79, 85], shoulder: [43, 49] },
      S: { chest: [94, 100], waist: [85, 91], shoulder: [45, 51] },
      M: { chest: [100, 106], waist: [91, 97], shoulder: [47, 53] },
      L: { chest: [106, 112], waist: [97, 103], shoulder: [49, 55] },
      XL: { chest: [112, 118], waist: [103, 109], shoulder: [51, 57] },
    },
    bottom: {
      XS: { waist: [79, 85], hips: [90, 96], inseam: [70, 76] },
      S: { waist: [85, 91], hips: [96, 102], inseam: [72, 78] },
      M: { waist: [91, 97], hips: [102, 108], inseam: [74, 80] },
      L: { waist: [97, 103], hips: [108, 114], inseam: [76, 82] },
      XL: { waist: [103, 109], hips: [114, 120], inseam: [78, 84] },
    },
    dress: {
      XS: { chest: [85, 91], waist: [76, 82], hips: [87, 93] },
      S: { chest: [91, 97], waist: [82, 88], hips: [93, 99] },
      M: { chest: [97, 103], waist: [88, 94], hips: [99, 105] },
      L: { chest: [103, 109], waist: [94, 100], hips: [105, 111] },
      XL: { chest: [109, 115], waist: [100, 106], hips: [111, 117] },
    },
  },

  // Massimo Dutti runs more generous / relaxed (roughly +3 cm vs Zara), so the
  // same larger build sits squarely in M here.
  massimo: {
    top: {
      XS: { chest: [90, 96], waist: [81, 87], shoulder: [44, 50] },
      S: { chest: [96, 102], waist: [87, 93], shoulder: [46, 52] },
      M: { chest: [102, 108], waist: [93, 99], shoulder: [48, 54] },
      L: { chest: [108, 114], waist: [99, 105], shoulder: [50, 56] },
      XL: { chest: [114, 120], waist: [105, 111], shoulder: [52, 58] },
    },
    bottom: {
      XS: { waist: [81, 87], hips: [92, 98], inseam: [71, 77] },
      S: { waist: [87, 93], hips: [98, 104], inseam: [73, 79] },
      M: { waist: [93, 99], hips: [104, 110], inseam: [75, 81] },
      L: { waist: [99, 105], hips: [110, 116], inseam: [77, 83] },
      XL: { waist: [105, 111], hips: [116, 122], inseam: [79, 85] },
    },
    dress: {
      XS: { chest: [90, 96], waist: [81, 87], hips: [92, 98] },
      S: { chest: [96, 102], waist: [87, 93], hips: [98, 104] },
      M: { chest: [102, 108], waist: [93, 99], hips: [104, 110] },
      L: { chest: [108, 114], waist: [99, 105], hips: [110, 116] },
      XL: { chest: [114, 120], waist: [105, 111], hips: [116, 122] },
    },
  },
};

// Returns the explicit size guide chart for a merchant + garment type, or null
// if that merchant publishes no guide (callers then fall back to a generated chart).
function getSizeGuide(merchant, type) {
  const byType = GUIDES[merchant];
  return (byType && byType[type]) || null;
}

module.exports = { GUIDES, getSizeGuide };
