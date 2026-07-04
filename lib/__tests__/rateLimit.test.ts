import { describe, it, expect, beforeEach } from 'vitest';
import {
    checkRateLimit,
    resetRateLimiter,
    READ_LIMIT_PER_MINUTE,
    WRITE_LIMIT_PER_MINUTE,
} from '../rateLimit';

const T0 = 1_000_000_000_000; // instante base arbitrario

beforeEach(() => {
    resetRateLimiter();
});

describe('checkRateLimit', () => {
    it('permite peticiones dentro del límite de lectura', () => {
        for (let i = 0; i < READ_LIMIT_PER_MINUTE; i++) {
            expect(checkRateLimit('user1', false, T0 + i).ok).toBe(true);
        }
    });

    it('bloquea la petición que supera el límite de lectura', () => {
        for (let i = 0; i < READ_LIMIT_PER_MINUTE; i++) {
            checkRateLimit('user1', false, T0 + i);
        }
        const result = checkRateLimit('user1', false, T0 + READ_LIMIT_PER_MINUTE);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
            expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
        }
    });

    it('el límite de escritura es independiente y más estricto', () => {
        for (let i = 0; i < WRITE_LIMIT_PER_MINUTE; i++) {
            expect(checkRateLimit('user1', true, T0 + i).ok).toBe(true);
        }
        expect(checkRateLimit('user1', true, T0 + WRITE_LIMIT_PER_MINUTE).ok).toBe(false);
        // Las lecturas del mismo usuario siguen permitidas
        expect(checkRateLimit('user1', false, T0 + WRITE_LIMIT_PER_MINUTE).ok).toBe(true);
    });

    it('los límites son por clave (usuarios independientes)', () => {
        for (let i = 0; i < WRITE_LIMIT_PER_MINUTE; i++) {
            checkRateLimit('user1', true, T0 + i);
        }
        expect(checkRateLimit('user1', true, T0 + 100).ok).toBe(false);
        expect(checkRateLimit('user2', true, T0 + 100).ok).toBe(true);
    });

    it('la ventana desliza: tras 60s se vuelve a permitir', () => {
        for (let i = 0; i < WRITE_LIMIT_PER_MINUTE; i++) {
            checkRateLimit('user1', true, T0 + i);
        }
        expect(checkRateLimit('user1', true, T0 + 1000).ok).toBe(false);
        // 61 segundos después del primer hit, la ventana ya no lo incluye
        expect(checkRateLimit('user1', true, T0 + 61_000).ok).toBe(true);
    });

    it('retryAfterSeconds refleja cuándo caduca el hit más antiguo', () => {
        for (let i = 0; i < WRITE_LIMIT_PER_MINUTE; i++) {
            checkRateLimit('user1', true, T0);
        }
        const result = checkRateLimit('user1', true, T0 + 30_000);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            // El hit más antiguo (T0) caduca en T0+60s → faltan ~30s
            expect(result.retryAfterSeconds).toBe(30);
        }
    });
});
