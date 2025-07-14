console.log('Debug order data:');
const { db } = require('./src/firebase/server.ts');
db.collection('auftraege')
  .limit(1)
  .get()
  .then(snapshot => {
    if (snapshot.docs.length > 0) {
      console.log('Order fields:', Object.keys(snapshot.docs[0].data()));
      console.log('Sample order:', JSON.stringify(snapshot.docs[0].data(), null, 2));
    } else {
      console.log('No orders found');
    }
  })
  .catch(err => console.error('Error:', err));
