// Test script to fix the inconsistent payment
// This will call the deployed Firebase Function to fix order 4bMTQQzVWsHyKhkbkRRu

const fixPayment = async () => {
  try {
    const response = await fetch('https://fixinconsistentpayment-d4kdcd73ia-ew.a.run.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          orderId: '4bMTQQzVWsHyKhkbkRRu',
          entryId: '17536740766723z750hunp',
          paymentIntentId: 'pi_3RpkMnD5Lvjon30a1QG9VffP',
        },
      }),
    });

    const result = await response.json();
    console.log('Fix Result:', result);

    if (result.result.success) {
      console.log('✅ Payment inconsistency fixed successfully!');
      console.log('Message:', result.result.message);
    } else {
      console.log('❌ Fix failed:', result);
    }
  } catch (error) {
    console.error('Error calling fix function:', error);
  }
};

// Call the function
fixPayment();
