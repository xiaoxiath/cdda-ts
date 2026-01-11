import { describe, it, expect } from 'vitest';
import { Point, Tripoint, mapToSubmap, submapToMap, inSubmapLocal } from '../index';

describe('Point', () => {
  describe('creation', () => {
    it('should create origin point', () => {
      const point = Point.origin();
      expect(point.x).toBe(0);
      expect(point.y).toBe(0);
    });

    it('should create point from coordinates', () => {
      const point = Point.from(10, 20);
      expect(point.x).toBe(10);
      expect(point.y).toBe(20);
    });
  });

  describe('operations', () => {
    it('should add points', () => {
      const p1 = Point.from(10, 20);
      const p2 = Point.from(5, 5);
      const result = p1.add(p2);
      expect(result.x).toBe(15);
      expect(result.y).toBe(25);
    });

    it('should subtract points', () => {
      const p1 = Point.from(10, 20);
      const p2 = Point.from(5, 5);
      const result = p1.subtract(p2);
      expect(result.x).toBe(5);
      expect(result.y).toBe(15);
    });

    it('should multiply by scalar', () => {
      const point = Point.from(10, 20);
      const result = point.multiply(2);
      expect(result.x).toBe(20);
      expect(result.y).toBe(40);
    });

    it('should divide by scalar', () => {
      const point = Point.from(10, 20);
      const result = point.divide(3);
      expect(result.x).toBe(3);
      expect(result.y).toBe(6);
    });
  });

  describe('distances', () => {
    it('should calculate Manhattan distance', () => {
      const p1 = Point.from(0, 0);
      const p2 = Point.from(3, 4);
      expect(p1.manhattanDistanceTo(p2)).toBe(7);
    });

    it('should calculate Euclidean distance', () => {
      const p1 = Point.from(0, 0);
      const p2 = Point.from(3, 4);
      expect(p1.euclideanDistanceTo(p2)).toBe(5);
    });

    it('should calculate Chebyshev distance', () => {
      const p1 = Point.from(0, 0);
      const p2 = Point.from(3, 4);
      expect(p1.chebyshevDistanceTo(p2)).toBe(4);
    });
  });
});

describe('Tripoint', () => {
  describe('creation', () => {
    it('should create origin tripoint', () => {
      const point = Tripoint.origin();
      expect(point.x).toBe(0);
      expect(point.y).toBe(0);
      expect(point.z).toBe(0);
    });

    it('should create tripoint from coordinates', () => {
      const point = Tripoint.from(10, 20, 5);
      expect(point.x).toBe(10);
      expect(point.y).toBe(20);
      expect(point.z).toBe(5);
    });

    it('should create from Point', () => {
      const p = Point.from(10, 20);
      const tp = Tripoint.fromPoint(p, 5);
      expect(tp.x).toBe(10);
      expect(tp.y).toBe(20);
      expect(tp.z).toBe(5);
    });
  });

  describe('operations', () => {
    it('should add tripoints', () => {
      const p1 = Tripoint.from(10, 20, 5);
      const p2 = Tripoint.from(5, 5, 2);
      const result = p1.add(p2);
      expect(result.x).toBe(15);
      expect(result.y).toBe(25);
      expect(result.z).toBe(7);
    });

    it('should subtract tripoints', () => {
      const p1 = Tripoint.from(10, 20, 5);
      const p2 = Tripoint.from(5, 5, 2);
      const result = p1.subtract(p2);
      expect(result.x).toBe(5);
      expect(result.y).toBe(15);
      expect(result.z).toBe(3);
    });

    it('should calculate modulo', () => {
      const point = Tripoint.from(25, -13, 7);
      const result = point.mod(12);
      expect(result.x).toBe(1);
      expect(result.y).toBe(11);
      expect(result.z).toBe(7);
    });
  });
});

describe('Coordinate Conversions', () => {
  describe('mapToSubmap', () => {
    it('should convert map coordinates to submap coordinates', () => {
      const pos = Tripoint.from(24, 36, 0);
      const submap = mapToSubmap(pos);
      expect(submap.x).toBe(2); // 24 / 12 = 2
      expect(submap.y).toBe(3); // 36 / 12 = 3
      expect(submap.z).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const pos = Tripoint.from(-13, -1, 0);
      const submap = mapToSubmap(pos);
      expect(submap.x).toBe(-2); // Math.floor(-13 / 12) = -2
      expect(submap.y).toBe(-1); // Math.floor(-1 / 12) = -1
    });
  });

  describe('submapToMap', () => {
    it('should convert submap coordinates to map coordinates', () => {
      const sm = Tripoint.from(2, 3, 0);
      const mapPos = submapToMap(sm);
      expect(mapPos.x).toBe(24); // 2 * 12
      expect(mapPos.y).toBe(36); // 3 * 12
    });
  });

  describe('inSubmapLocal', () => {
    it('should calculate local position within submap', () => {
      const pos = Tripoint.from(26, 37, 0);
      const local = inSubmapLocal(pos);
      expect(local.x).toBe(2); // 26 % 12 = 2
      expect(local.y).toBe(1); // 37 % 12 = 1
    });

    it('should handle negative coordinates', () => {
      const pos = Tripoint.from(-1, -1, 0);
      const local = inSubmapLocal(pos);
      expect(local.x).toBe(11); // (-1 % 12 + 12) % 12 = 11
      expect(local.y).toBe(11);
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve coordinates through conversion cycle', () => {
      const original = Tripoint.from(123, 456, -5);

      const sm = mapToSubmap(original);
      const local = inSubmapLocal(original);

      // Verify: sm * SUBMAP_SIZE + local = original (for x and y)
      // Note: This won't work exactly due to floor division in mapToSubmap
      // Instead, verify that the conversion is internally consistent
      expect(sm.x).toBe(Math.floor(123 / 12));
      expect(sm.y).toBe(Math.floor(456 / 12));

      // The local coordinate should be the remainder
      expect(local.x).toBe(((123 % 12) + 12) % 12);
      expect(local.y).toBe(((456 % 12) + 12) % 12);
    });

    it('should convert back to map coordinates correctly', () => {
      const original = Tripoint.from(123, 456, -5);

      const sm = mapToSubmap(original);
      const local = inSubmapLocal(original);

      // Reconstruct: sm * SUBMAP_SIZE + local should give us original
      const reconstructed = new Tripoint({
        x: sm.x * 12 + local.x,
        y: sm.y * 12 + local.y,
        z: original.z,
      });

      expect(reconstructed.x).toBe(original.x);
      expect(reconstructed.y).toBe(original.y);
      expect(reconstructed.z).toBe(original.z);
    });
  });
});
