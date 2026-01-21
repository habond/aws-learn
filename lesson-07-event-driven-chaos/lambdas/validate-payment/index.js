exports.handler = async (event) => {
  console.log('Validating payment for order:', event.orderId);

  // Simulate payment validation
  const isValid = Math.random() > 0.2; // 80% success rate

  if (!isValid) {
    throw new Error('Payment validation failed');
  }

  return {
    ...event,
    paymentValidated: true,
    paymentId: `PAY-${Date.now()}`
  };
};
