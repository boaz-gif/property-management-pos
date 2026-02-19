const axios = require('axios');

const API_URL = 'http://localhost:5002/api/auth';

const testAuth = async () => {
    const email = `test_${Date.now()}@example.com`;
    const password = 'password123';

    console.log(`Testing with email: ${email}`);

    try {
        // 1. Register
        console.log('1. Registering...');
        const registerRes = await axios.post(`${API_URL}/register`, {
            name: 'Test User',
            email,
            password,
            role: 'tenant'
        });
        console.log('Registration successful:', registerRes.data.success);

        // 2. Login
        console.log('2. Logging in...');
        const loginRes = await axios.post(`${API_URL}/login`, {
            email,
            password
        });
        console.log('Login successful:', loginRes.data.success);
        console.log('Token received:', !!loginRes.data.data.token);

    } catch (error) {
        console.error('Test failed:', error.response ? error.response.data : error.message);
    }
};

testAuth();
