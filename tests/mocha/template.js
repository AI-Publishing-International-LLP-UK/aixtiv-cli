const { expect } = require('chai');

describe('API Tests', () => {
  it('should return 200', async () => {
    const response = await request(endpoint);
    expect(response.status).to.equal(200);
  });

  it('should validate response schema', () => {
    expect(response.body).to.have.property('data');
  });
});