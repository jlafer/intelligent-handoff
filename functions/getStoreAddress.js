const addresses = [
  { street: '54 Madison Avenue', city: 'New York', state: 'NY' },
  { street: '123 Rodeo Drive', city: 'Los Angeles', state: 'CA' },
  { street: '456 Elm Street', city: 'Chicago', state: 'IL' },
  { street: '489 Market', city: 'San Francisco', state: 'CA' }
];


async function getStoreAddress(functionArgs) {
  const { city } = functionArgs;

  const item = addresses.find(store => {
    return (store.city.toLowerCase() === city.toLowerCase())
  });
  const street = (item) ? item.street : 'Main';
  return JSON.stringify({ street });
}

module.exports = getStoreAddress;