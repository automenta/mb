import { SchemaRegistry } from '../schema/schema-registry';
import { describe, it, expect } from 'vitest';

describe('SchemaRegistry', () => {
  it('should register and retrieve schemas', () => {
    const registry = new SchemaRegistry();
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    registry.registerSchema('test', schema);
    expect(registry.getSchema('test')).toEqual(schema);
  });

  it('should validate valid data', () => {
    const registry = new SchemaRegistry();
    const schema = { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] };
    registry.registerSchema('test', schema);
    const data = { name: 'John Doe' };
    const result = registry.validate('test', data);
    expect(result.isValid).toBe(true);
  });

  it('should invalidate missing required fields', () => {
    const registry = new SchemaRegistry();
    const schema = { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] };
    registry.registerSchema('test', schema);
    const data = {};
    const result = registry.validate('test', data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([{ path: '.name', error: 'required', message: 'Missing required property', suggestion: 'Add name to the object' }]);
  });

  it('should invalidate incorrect data types', () => {
    const registry = new SchemaRegistry();
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    registry.registerSchema('test', schema);
    const data = { name: 123 };
    const result = registry.validate('test', data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([{ path: '.name', error: 'invalid_type', message: 'Expected type string', suggestion: 'Provide a value of type string' }]);
  });

  it('should invalidate invalid URL formats', () => {
    const registry = new SchemaRegistry();
    const schema = { type: 'object', properties: { website: { type: 'string', format: 'url' } } };
    registry.registerSchema('test', schema);
    const data = { website: 'not a url' };
    const result = registry.validate('test', data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([{ path: '.website', error: 'invalid_format', message: 'Invalid URL format', suggestion: 'Provide a valid URL' }]);
  });
});