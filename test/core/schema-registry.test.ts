import { SchemaRegistry } from '../../core/schema-registry';
import { describe, it, expect } from 'vitest';

describe('SchemaRegistry', () => {
  it('should register and retrieve schemas', () => {
    const registry = new SchemaRegistry();
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    registry.registerSchema('test', schema);
    expect(registry.getSchema('test')).toEqual(schema);
  });


});