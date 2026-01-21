exports.handler = async (event) => {
  console.log('Processing order:', event.orderId);

  // Simulate order processing
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    ...event,
    status: 'processed',
    processedAt: new Date().toISOString()
  };
};
