import DB from '../src/db';

import { $, Y, Awareness } from './imports';
import { SchemaRegistry } from '../schema/schema-registry';
import userSchemaJson from '../schema/user.schema.json';
import { UserSchema } from './schema';
import { validateSocialLink } from './util/validation';
import { UserInfo } from './types';
import { renderSchemaForm } from './util/schema-form'; // Import renderSchemaForm

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
    const file = (e.target as HTMLInputElement)?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event: any) => { // Type event as any to access target.result
        const user = this.getUser();
        this.awareness().setLocalStateField('user', {
          ...user,
          avatar: event?.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  }

  private validateSocialLink(link: string): boolean {
    return validateSocialLink(link);
  }

  private updateUserField(fieldPath: string, value: any) { // Updated updateUserField to be used with schemaForm
    const user = this.getUser();
    const pathParts = fieldPath.split('.');
    let current: any = user; // Type cast to any for flexible property access

    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    const field = pathParts[pathParts.length - 1];

    if (userSchema && typeof userSchema === 'object') {
      const socialSchemaProperties = (userSchema as { properties: { social: { properties: any } } }).properties.social?.properties;
      const schemaProps = (userSchema as { properties: any }).properties[field] || (field === 'social' && socialSchemaProperties ? socialSchemaProperties[pathParts[pathParts.length - 2]] : undefined);
      if (schemaProps) {
        (current as any)[field] = value; // Type cast to any for flexible property access
        this.awareness().setLocalStateField('user', user);
      }
    }
  }
  
  render() {
    const user = this.getUser();

    // Clear and get container
    this.$('.main-view')?.empty().append(
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

        // Placeholder for user name and ID
        $('<div/>', { class: 'profile-field' }).append(
          $('<label/>', { text: 'Name: ' }),
          $('<span/>', { text: user.name || 'Anonymous' })
        ),
        $('<div/>', { class: 'profile-field' }).append(
          $('<label/>', { text: 'ID: ' }),
          $('<span/>', { text: user.userId || '' })
        ),
        // Render schema form for user profile fields
        (userSchema && typeof userSchema === 'object' && userSchema.properties
          ? renderSchemaForm(userSchema, user, this.updateUserField.bind(this))
          : $('<div/>').text('Failed to load user schema form.')
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
            const user = this.getUser();
            this.db.config?.setUserProfile(user); // Fixed error 7, using setUserProfile
            alert('Profile changes saved!');
          }),
          $('<button/>', { class: 'cancel-btn', text: '❌ Cancel' }).on('click', () => {
            // Reset form logic
            this.render(); // Re-render to reset form
          })
        )
      )
    )
  }
}
