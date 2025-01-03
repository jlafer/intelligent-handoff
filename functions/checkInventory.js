const inventory = [
  { style: 'loafer', color: 'brown', size: 8, inStock: 10 },
  { style: 'loafer', color: 'brown', size: 9, inStock: 10 },
  { style: 'loafer', color: 'brown', size: 10, inStock: 10 },
  { style: 'loafer', color: 'black', size: 8, inStock: 10 },
  { style: 'loafer', color: 'black', size: 9, inStock: 10 },
  { style: 'loafer', color: 'black', size: 10, inStock: 0 },
  { style: 'trainer', color: 'brown', size: 8, inStock: 0 },
  { style: 'trainer', color: 'brown', size: 9, inStock: 0 },
  { style: 'trainer', color: 'brown', size: 10, inStock: 0 },
  { style: 'trainer', color: 'black', size: 8, inStock: 10 },
  { style: 'trainer', color: 'black', size: 9, inStock: 0 },
  { style: 'trainer', color: 'black', size: 10, inStock: 0 },
  { style: 'sandal', color: 'brown', size: 8, inStock: 20 },
  { style: 'sandal', color: 'brown', size: 9, inStock: 0 },
  { style: 'sandal', color: 'brown', size: 10, inStock: 20 },
  { style: 'sandal', color: 'black', size: 8, inStock: 20 },
  { style: 'sandal', color: 'black', size: 9, inStock: 20 },
  { style: 'sandal', color: 'black', size: 10, inStock: 0 },
];

async function checkInventory(functionArgs) {
  const { style, color, size } = functionArgs;
  const styleLower = style.toLowerCase();
  const colorLower = color.toLowerCase();
  const item = inventory.find(sku => {
    return (sku.style === styleLower && sku.color === colorLower && sku.size === size)
  });
  const inStock = (item) ? item.inStock : 0;
  return JSON.stringify({ stock: inStock });
}

module.exports = checkInventory;