// Temporary script to fix the PostgreSQL function by making a direct API call
const fetch = require('node-fetch');

async function fixFunction() {
  try {
    console.log('Testing if we can manually trigger the function fix...');
    
    // Since we can't directly modify the function due to auth issues,
    // let's check if there's a way to bypass the function call for now
    
    const response = await fetch('http://localhost:5002/api/admin/dashboard/overview', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });
    
    const result = await response.text();
    console.log('Response:', result);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixFunction();
