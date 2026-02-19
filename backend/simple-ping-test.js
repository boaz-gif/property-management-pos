/**
 * Simple health check test
 */

async function testHealthCheck() {
  console.log('Testing health endpoint...');
  
  try {
    const response = await fetch('http://localhost:5002/health', {
      method: 'GET'
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      console.log('✅ Health check passed!');
    } else {
      console.log('❌ Health check failed!');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testHealthCheck();
