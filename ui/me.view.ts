import DB from '../src/db';

import { $, Y, Awareness } from './imports';
import { SchemaRegistry } from '../schema/schema-registry';
import userSchemaJson from '../schema/user.schema.json';
import { UserSchema } from './schema';
import { validateSocialLink } from './util/validation';
import { UserInfo } from './types';

const schemaRegistry = new SchemaRegistry();
schemaRegistry.registerSchema('user', userSchemaJson);
const userSchema: UserSchema = schemaRegistry.getSchema('user') as UserSchema;

class PresenceManager {
  private awareness: Awareness;
  private presenceTimeout: number = 30000; // 30 seconds

  constructor(doc: Y.Doc) {
    this.awareness = new Awareness(doc);
    this.startPresenceTracking();
  }

  private startPresenceTracking() {
    setInterval(() => {
      const states = this.awareness.getStates();
      states.forEach((state, clientId) => {
        if (Date.now() - state.lastActive > this.presenceTimeout) {
          this.awareness.setLocalState({ status: 'away' });
        }
      });
    }, 5000);
  }
}

export default class MeView {
  readonly getUser: () => UserInfo;
  private awareness: () => Awareness;
  private $: (selector: string, context?: any) => JQuery;
  private db: DB;

  constructor(ele: JQuery, getUser: () => UserInfo, awareness: () => Awareness, db: DB) {
    this.getUser = getUser;
    this.awareness = awareness;
    this.db = db;
    this.$ = (selector, context?) => $(selector, context || ele);
  }

  private handleAvatarUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const user = this.getUser();
        this.awareness().setLocalStateField('user', {
          ...user,
          avatar: event.target.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  }

  private validateSocialLink(link: string): boolean {
    return validateSocialLink(link);
  }

  private renderField(field: string, user: UserInfo) {
    if (!userSchema || typeof userSchema !== 'object') {
      console.error('Invalid user schema:', userSchema);
      return null;
    }

    const path = field.split('.');
    let currentSchema: any = userSchema.properties;
    
    for (const part of path) {
      if (!currentSchema[part]) {
        console.error(`Field ${field} not found in schema`);
        return null;
      }
      currentSchema = currentSchema[part].properties || currentSchema[part];
    }

    const schemaProps = currentSchema;
  
    const fieldId = `user-${field}`;
    const label = $('<label/>', { for: fieldId, text: `${schemaProps.description}: ` });
    let input: JQuery;
  
    switch (schemaProps.type) {
      case 'string':
        if (schemaProps.format === 'color') {
          input = $('<input/>', {
            type: 'color',
            id: fieldId,
            value: user[field] || schemaProps.default || '#000000',
          }).on('input', e => {
            if (e.target instanceof HTMLInputElement) {
              this.updateUserField(field, e.target.value);
            }
          });
        } else if (schemaProps.format === 'url') {
          const socialField = field.split('.').pop();
          input = $('<input/>', {
            type: 'url',
            id: fieldId,
            placeholder: `${socialField} URL`,
            value: user.social?.[socialField] || '',
          }).on('input', e => {
            if (e.target instanceof HTMLInputElement) {
              this.updateUserField(field, e.target.value);
            }
          });
        } else {
          input = $('<input/>', {
            type: 'text',
            id: fieldId,
            placeholder: field.charAt(0).toUpperCase() + field.slice(1),
            value: user[field] || '',
          }).on('input', e => {
            if (e.target instanceof HTMLInputElement) {
              this.updateUserField(field, e.target.value);
            }
          });
        }
        break;
      case 'object':
        if (field === 'social' && schemaProps.properties) {
          const socialLinks = $('<div/>', { class: 'social-links' });
          for (const social in schemaProps.properties) {
            const socialField = this.renderField(`social.${social}`, user);
            if (socialField) {
              socialLinks.append(socialField);
            }
          }
          return $('<div/>', { class: 'profile-field' }).append(label, socialLinks);
        }
        break;
      case 'array':
        // Handle array types if needed
        break;
      default:
        input = $('<input/>', {
          type: 'text',
          id: fieldId,
          placeholder: field.charAt(0).toUpperCase() + field.slice(1),
          value: user[field] || '',
        }).on('input', e => {
          if (e.target instanceof HTMLInputElement) {
            this.updateUserField(field, e.target.value);
          }
        });
    }
  
    return $('<div/>', { class: 'profile-field' }).append(label, input);
  }

  private updateUserField(fieldPath: string, value: any) {
    const user = this.getUser();
    const pathParts = fieldPath.split('.');
    let current = user;

    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    const field = pathParts[pathParts.length - 1];

    if (userSchema && typeof userSchema === 'object') {
      const schemaProps = (userSchema as { properties: any }).properties[field] || (field === 'social' && (userSchema as { properties: { social: { properties: any } } }).properties.social?.properties ? (userSchema as { properties: { social: { properties: any } } }).properties.social.properties[pathParts[pathParts.length - 2]] : undefined);
      if (schemaProps) {
        current[field] = value;
        this.awareness().setLocalStateField('user', user);
      }
    }
  }

  render() {
    const user = this.getUser();

    // Clear and get container
    this.$('.main-view').empty().append(
      $('<div/>', { class: 'profile-page' }).append(
        // Profile Picture Section
        $('<div/>', { class: 'profile-field profile-avatar' }).append(
          $('<label/>', { for: 'user-avatar', text: 'Profile Picture: ' }),
          $('<div/>', { class: 'avatar-container' }).append(
            $('<img/>', {
              class: 'avatar-preview',
              src: user.avatar || 'https://placeholderrrr',
            }),
            $('<input/>', {
              type: 'file',
              id: 'user-avatar',
              accept: 'image/*',
            }).on('change', this.handleAvatarUpload.bind(this))
          )
        ),

        // Other fields based on schema
        ...(userSchema && typeof userSchema === 'object' && userSchema.properties
          ? Object.keys(userSchema.properties).map(field => this.renderField(field, user))
          : []
        ),

        // Status Indicator
        $('<div/>', { class: 'profile-field' }).append(
          $('<label/>', { text: 'Status:' }),
          $('<select/>', { id: 'user-status', value: user.status || 'online' }).append(
            $('<option/>', { value: 'online', text: '🟢 Online' }),
            $('<option/>', { value: 'away', text: '🌙 Away' }),
            $('<option/>', { value: 'busy', text: '🔴 Busy' })
          ).on('change', (e) => {
            if (e.target instanceof HTMLSelectElement) {
              this.updateUserField('status', e.target.value);
            }
          })
        ),

        // Action Buttons
        $('<div/>', { class: 'profile-actions' }).append(
          $('<button/>', { class: 'save-btn', text: '💾 Save Changes' }).on('click', () => {
            // Save logic - changes are already saved to awareness
            alert('Profile changes saved!');
          }),
          $('<button/>', { class: 'cancel-btn', text: '❌ Cancel' }).on('click', () => {
            // Reset form logic
            this.render(); // Re-render to reset form
          }),
        )
      )
    );
  };
}