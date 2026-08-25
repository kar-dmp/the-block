// @vitest-environment node
// Pure functions, no DOM — skip jsdom's per-file setup cost.
import { describe, it, expect } from 'vitest';
import {
  money, km, cap, bidsWord, increment, toggleIn, gradeBand, gradeTag, gradeColor,
  damageKind, DAMAGE_ORDER, damageTag, median, hash, buyFee, relTime, countdown,
} from './format';

describe('money', () => {
  it('formats a number as CAD currency, rounded', () => {
    expect(money(1000)).toBe('$1,000');
    expect(money(1234.6)).toBe('$1,235');
    expect(money(0)).toBe('$0');
  });
  it('renders an em dash for null/undefined', () => {
    expect(money(null)).toBe('—');
    expect(money(undefined)).toBe('—');
  });
});

describe('km', () => {
  it('formats with thousands separators and a unit suffix', () => {
    expect(km(120000)).toBe('120,000 km');
  });
  it('renders an em dash for null', () => {
    expect(km(null)).toBe('—');
  });
});

describe('cap', () => {
  it('capitalizes the first letter', () => {
    expect(cap('sedan')).toBe('Sedan');
  });
  it('returns an empty string for falsy input', () => {
    expect(cap('')).toBe('');
    expect(cap(undefined as unknown as string)).toBe('');
  });
});

describe('bidsWord', () => {
  it('pluralizes correctly', () => {
    expect(bidsWord(0)).toBe('No bids');
    expect(bidsWord(1)).toBe('1 bid');
    expect(bidsWord(2)).toBe('2 bids');
  });
});

describe('increment', () => {
  it('scales the minimum bid step with price', () => {
    expect(increment(500)).toBe(100);
    expect(increment(9999)).toBe(100);
    expect(increment(10000)).toBe(250);
    expect(increment(24999)).toBe(250);
    expect(increment(25000)).toBe(500);
    expect(increment(100000)).toBe(500);
  });
});

describe('toggleIn', () => {
  it('adds a value not already present', () => {
    expect(toggleIn([1, 2], 3)).toEqual([1, 2, 3]);
  });
  it('removes a value already present', () => {
    expect(toggleIn([1, 2, 3], 2)).toEqual([1, 3]);
  });
  it('does not mutate the input list', () => {
    const list = [1, 2];
    toggleIn(list, 3);
    expect(list).toEqual([1, 2]);
  });
});

describe('gradeBand', () => {
  it('buckets condition grades into labels', () => {
    expect(gradeBand(5)).toBe('Excellent');
    expect(gradeBand(4.5)).toBe('Excellent');
    expect(gradeBand(4.4)).toBe('Clean');
    expect(gradeBand(3.5)).toBe('Clean');
    expect(gradeBand(3.4)).toBe('Average');
    expect(gradeBand(2.5)).toBe('Average');
    expect(gradeBand(2.4)).toBe('Rough');
    expect(gradeBand(1.5)).toBe('Rough');
    expect(gradeBand(1)).toBe('Damaged');
  });
});

describe('gradeTag / gradeColor', () => {
  it('use the same 3.5/2.5 thresholds as gradeBand', () => {
    expect(gradeTag(3.5)).toBe('tag-neutral');
    expect(gradeTag(2.5)).toBe('tag-outline');
    expect(gradeTag(1)).toBe('tag-accent');
    expect(gradeColor(3.5)).toBe('var(--color-text)');
    expect(gradeColor(2.5)).toBe('var(--color-neutral-700)');
    expect(gradeColor(1)).toBe('var(--color-accent-700)');
  });
});

describe('damageKind', () => {
  it('classifies structural damage', () => {
    expect(damageKind('Frame damage on rear')).toBe('Structural');
    expect(damageKind('Flood history reported')).toBe('Structural');
  });
  it('classifies mechanical damage', () => {
    expect(damageKind('Transmission slips in 2nd gear')).toBe('Mechanical');
    expect(damageKind('Brake pads worn')).toBe('Mechanical');
  });
  it('falls back to cosmetic', () => {
    expect(damageKind('Scratch on rear bumper')).toBe('Cosmetic');
  });
  it('is case-insensitive', () => {
    expect(damageKind('FRAME BENT')).toBe('Structural');
  });
});

describe('DAMAGE_ORDER / damageTag', () => {
  it('ranks Structural before Mechanical before Cosmetic', () => {
    expect(DAMAGE_ORDER.Structural).toBeLessThan(DAMAGE_ORDER.Mechanical);
    expect(DAMAGE_ORDER.Mechanical).toBeLessThan(DAMAGE_ORDER.Cosmetic);
  });
  it('maps kind to a tag class', () => {
    expect(damageTag('Structural')).toBe('tag-accent');
    expect(damageTag('Mechanical')).toBe('tag-outline');
    expect(damageTag('Cosmetic')).toBe('tag-neutral');
  });
});

describe('median', () => {
  it('returns null for an empty array', () => {
    expect(median([])).toBeNull();
  });
  it('returns the middle value for an odd-length array', () => {
    expect(median([3, 1, 2])).toBe(2);
  });
  it('averages the two middle values for an even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it('does not mutate the input array', () => {
    const arr = [3, 1, 2];
    median(arr);
    expect(arr).toEqual([3, 1, 2]);
  });
});

describe('hash', () => {
  it('is deterministic for the same input', () => {
    expect(hash('lot-123')).toBe(hash('lot-123'));
  });
  it('differs for different input', () => {
    expect(hash('lot-123')).not.toBe(hash('lot-124'));
  });
  it('is always non-negative', () => {
    expect(hash('anything')).toBeGreaterThanOrEqual(0);
  });
});

describe('buyFee', () => {
  it('scales with price bands', () => {
    expect(buyFee(1000)).toBe(195);
    expect(buyFee(4999)).toBe(195);
    expect(buyFee(5000)).toBe(295);
    expect(buyFee(9999)).toBe(295);
    expect(buyFee(10000)).toBe(425);
    expect(buyFee(19999)).toBe(425);
    expect(buyFee(20000)).toBe(595);
    expect(buyFee(34999)).toBe(595);
    expect(buyFee(35000)).toBe(750);
    expect(buyFee(100000)).toBe(750);
  });
});

describe('relTime', () => {
  it('renders "just now" for under a minute', () => {
    expect(relTime(10000)).toBe('just now');
  });
  it('renders minutes', () => {
    expect(relTime(5 * 60000)).toBe('5 min ago');
  });
  it('renders hours', () => {
    expect(relTime(3 * 3600000)).toBe('3 hr ago');
  });
  it('renders days', () => {
    expect(relTime(2 * 86400000)).toBe('2 d ago');
  });
  it('uses the absolute value', () => {
    expect(relTime(-5 * 60000)).toBe('5 min ago');
  });
});

describe('countdown', () => {
  it('renders "closed" for non-positive durations', () => {
    expect(countdown(0)).toBe('closed');
    expect(countdown(-1000)).toBe('closed');
  });
  it('renders days and hours above a day', () => {
    expect(countdown(2 * 86400000 + 3 * 3600000)).toBe('2d 3h');
  });
  it('renders hours and padded minutes above an hour', () => {
    expect(countdown(2 * 3600000 + 5 * 60000)).toBe('2h 05m');
  });
  it('renders "under a minute" below a minute', () => {
    expect(countdown(30000)).toBe('under a minute');
  });
  it('renders minutes and padded seconds otherwise', () => {
    expect(countdown(5 * 60000 + 9000)).toBe('5m 09s');
  });
});
