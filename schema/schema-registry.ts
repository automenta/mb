export class SchemaRegistry {
  private schemas: { [name: string]: object } = {};
  private validationConfig: { [name: string]: { enabled: boolean; strict: boolean; allowUnknown: boolean } } = {};

  registerSchema(name: string, schema: any): void {
    this.schemas[name] = schema;
    this.validationConfig[name] = {
      enabled: true,
      strict: schema.validation?.rules?.strict ?? false,
      allowUnknown: schema.validation?.rules?.allowUnknown ?? true
    };
  }

  getSchema(name: string): object | undefined {
    return this.schemas[name];
  }

  validate(name: string, data: any): { isValid: boolean; errors?: any[]; warnings?: any[] } {
    const schema = this.getSchema(name);
    if (!schema) {
      return { isValid: false, errors: [{ message: `Schema ${name} not found.` }] };
    }

    const { errors, warnings } = this.validateObject(data, schema, name);
    const isValid = errors.length === 0;
    return { isValid, errors, warnings };
  }

  private validateObject(data: any, schema: any, name: string, path: string = ''): { errors: any[]; warnings: any[] } {
    let errors: any[] = [];
    let warnings: any[] = [];

    if (schema.type === 'object') {
      // Handle polymorphic types using discriminator configuration
      if (schema.discriminator?.propertyName && data[schema.discriminator.propertyName]) {
        const discriminatorValue = data[schema.discriminator.propertyName];
        const derivedSchema = this.getSchema(schema.discriminator.mapping[discriminatorValue] || discriminatorValue);
        if (derivedSchema) {
          return this.validateObject(data, derivedSchema, data.userType, path);
        }
        errors.push({
          path: `${path}.userType`,
          error: 'invalid_type',
          message: `No schema registered for type '${data.userType}'`,
          suggestion: `Register a schema for '${data.userType}' type`
        });
        return { errors, warnings };
      }

      if (typeof data !== 'object' || data === null) {
        errors.push({ path, error: 'invalid_type', message: 'Expected an object', suggestion: 'Provide a valid object' });
        return { errors, warnings };
      }

      if (schema.required) {
        for (const requiredProp of schema.required) {
          if (!(requiredProp in data)) {
            errors.push({ path: `${path}.${requiredProp}`, error: 'required', message: `Missing required property`, suggestion: `Add ${requiredProp} to the object` });
          }
        }
      }

      if (schema.properties) {
        for (const prop in schema.properties) {
          if (data.hasOwnProperty(prop)) {
            const result = this.validateValue(data[prop], schema.properties[prop], `${path}.${prop}`, name);
            errors = errors.concat(result.errors);
            warnings = warnings.concat(result.warnings);
          } else if (this.validationConfig[name]?.enabled && schema.properties?.[prop]?.required) {
            errors.push({ path: `${path}.${prop}`, error: 'required', message: `Missing required property`, suggestion: `Add ${prop} to the object` });
          } else if (!this.validationConfig[name]?.strict && schema.properties?.[prop]?.required) {
            warnings.push({ path: `${path}.${prop}`, error: 'missing_recommended', message: `Missing recommended property`, suggestion: `Consider adding ${prop} to the object` });
          }
        }
      }
    } else {
      const result = this.validateValue(data, schema, path, name);
      errors = errors.concat(result.errors);
      warnings = warnings.concat(result.warnings);
    }

    return { errors, warnings };
  }

  private validateValue(data: any, schema: any, path: string, name: string): { errors: any[]; warnings: any[] } {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (this.validationConfig[name]?.enabled && schema.type && typeof data !== schema.type) {
      errors.push({ path, error: 'invalid_type', message: `Expected type ${schema.type}`, suggestion: `Provide a value of type ${schema.type}` });
    }

    if (schema.format) {
      if (schema.format === 'url' && !this.isValidUrl(data)) {
        errors.push({ path, error: 'invalid_format', message: 'Invalid URL format', suggestion: 'Provide a valid URL' });
      }
      if (schema.format === 'color' && !this.isValidColor(data)) {
        errors.push({ path, error: 'invalid_format', message: 'Invalid color format', suggestion: 'Provide a valid color' });
      }
    }

    if (this.validationConfig[name]?.enabled && schema.enum && !schema.enum.includes(data)) {
      errors.push({ path, error: 'invalid_enum', message: `Value not in allowed list: ${schema.enum.join(', ')}`, suggestion: `Choose one of: ${schema.enum.join(', ')}` });
    }

    return { errors, warnings };
  }
  

  private isValidUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  private isValidColor(value: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(value);
  }
}
