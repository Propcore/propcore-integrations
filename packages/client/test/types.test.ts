import { describe, expect, it } from 'vitest';
import {
  PropcoreAuthError,
  PropcoreError,
  PropcoreNotFoundError,
  PropcoreRateLimitError,
} from '../src/errors.js';
import type { PublicStackingBuilding, PublicUnitCard } from '../src/types.js';

describe('types', () => {
  it('names the wire fields in snake_case', () => {
    const card: PublicUnitCard = {
      id: 'u1',
      unit_number: '12A',
      type: 'apartment',
      project_id: 'p1',
      building_id: 'b1',
      floor_number: 3,
      rooms: 2,
      area: '84.50',
      price: { mode: 'visible', currency: 'EUR', current: '250000.00', effective: '240000.00' },
      status: {
        state: 'available',
        core_status: 'available',
        label: 'Available',
        color: '#2e7d32',
      },
      promotion_badges: [],
    };
    const stacking: PublicStackingBuilding = { building_id: 'b1', building_name: 'A', floors: [] };
    expect(card.unit_number).toBe('12A');
    expect(stacking.floors).toEqual([]);
  });
});

describe('errors', () => {
  it('carries status, code and retryAfter', () => {
    expect(new PropcoreAuthError('x')).toBeInstanceOf(PropcoreError);
    expect(new PropcoreAuthError('x').status).toBe(401);
    expect(new PropcoreNotFoundError('x', 'ai_source_not_found').code).toBe('ai_source_not_found');
    expect(new PropcoreRateLimitError('x', 30).retryAfter).toBe(30);
    expect(new PropcoreRateLimitError('x').status).toBe(429);
  });
});
