import { ServiceUnavailableException } from '@nestjs/common';

import { HealthController } from '@/modules/health/health.controller';

const makeController = () => {
  const healthService = {
    getLiveness: jest.fn(),
    getInfo: jest.fn(),
    getReadiness: jest.fn(),
  };

  const controller = new HealthController(healthService as any);
  return { controller, healthService };
};

describe('HealthController', () => {
  it('returns liveness', () => {
    const { controller, healthService } = makeController();
    healthService.getLiveness.mockReturnValue({ status: 'ok', timestamp: 't' });

    expect(controller.getHealth()).toEqual({ status: 'ok', timestamp: 't' });
  });

  it('returns info', () => {
    const { controller, healthService } = makeController();
    healthService.getInfo.mockReturnValue({ status: 'ok', timestamp: 't' });

    expect(controller.getInfo()).toEqual({ status: 'ok', timestamp: 't' });
  });

  it('returns readiness when ok', async () => {
    const { controller, healthService } = makeController();
    healthService.getReadiness.mockResolvedValue({
      status: 'ok',
      timestamp: 't',
      checks: [],
    });

    await expect(controller.getReady()).resolves.toEqual({
      status: 'ok',
      timestamp: 't',
      checks: [],
    });
  });

  it('throws when readiness not ok', async () => {
    const { controller, healthService } = makeController();
    healthService.getReadiness.mockResolvedValue({
      status: 'fail',
      timestamp: 't',
      checks: [],
    });

    await expect(controller.getReady()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
