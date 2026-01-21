exports.handler = async (event) => {
  console.log('Checking inventory for order:', event.orderId);

  // Simulate inventory check
  const inStock = Math.random() > 0.1; // 90% in stock

  if (!inStock) {
    throw new Error('Item out of stock');
  }

  return {
    ...event,
    inventoryReserved: true,
    estimatedShipping: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  };
};
