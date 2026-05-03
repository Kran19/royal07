import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns an ok status payload', () => {
    const controller = new HealthController();

    const result = controller.getHealth();

    expect(result.success).toBe(true);
    expect(result.data.status).toBe('ok');
    expect(new Date(result.data.timestamp).toString()).not.toBe('Invalid Date');
  });
});
