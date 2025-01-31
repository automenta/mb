import { Tags } from '../../core/tags';
import { describe, it, expect } from 'vitest';

describe('TagManager', () => {
  it('should register and retrieve tags', () => {
    const registry = new Tags();
    const tag = { type: 'object', properties: { name: { type: 'string' } } };
    registry.register('test', tag);
    expect(registry.get('test')).toEqual(tag);
  });


});