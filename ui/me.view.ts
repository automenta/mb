import DB from '../core/db';

import {$, Y} from './imports';
import {Tags} from '../core/tags';
import userTagsJson from '../tag/user.json';
import {UserTags} from './tag';
import {validateSocialLink} from './util/validate';
import {UserInfo} from './types';
import {renderTagForm} from './util/form';
import App from './app'; // Import App

const tags = new Tags();
tags.register('user', userTagsJson);
const userTags: UserTags = tags.get('user') as UserTags;

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
                    this.awareness.setLocalState({status: 'away'});
                }
            });
        }, 5000);
    }
}

const tags = new Tags();
tags.register('user', userTagsJson);
const userTags: UserTags = tags.get('user') as UserTags;

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
                    this.awareness.setLocalState({status: 'away'});
                }
            });
        }, 5000);
    }
}

export default class MeView {
    readonly getUser: () => UserInfo;
    app: App; // Add App instance
    private $: (selector: string, context?: any) => JQuery;
    private db: DB;

    constructor(ele: JQuery, app: App) { // Modify constructor to accept App
        this.app = app; // Store App instance
        this.getUser = () => this.app.store.currentUser!; // Get user from app.store
        this.db = app.db; // Get db from app
        this.$ = (selector, context?) => $(selector, context || ele);
    }

    render() {
        const user = this.getUser();

        // Clear and get container
        this.$('.main-view')?.empty().append(
            $('<div/>', {class: 'profile-page'}).append(
                // Profile Picture Section
                $('<div/>', {class: 'profile-field profile-avatar'}).append(
                    $('<label/>', {for: 'user-avatar', text: 'Profile Picture: '}),
                    $('<div/>', {class: 'avatar-container'}).append(
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

                // Editable Name Field
                $('<div/>', {class: 'profile-field'}).append(
                    $('<label/>', {for: 'user-name', text: 'Name: '}),
                    $('<input/>', {
                        type: 'text',
                        id: 'user-name',
                        value: user.name || 'Anonymous',
                    }).on('input', (e) => {
                        if (e.target instanceof HTMLInputElement) {
                            this.updateUserField('name', e.target.value);
                        }
                    })
                ),
                // Static User ID Field
                $('<div/>', {class: 'profile-field'}).append(
                    $('<label/>', {text: 'ID: '}),
                    $('<span/>', {text: user.userId || ''}) // ID is not editable
                ),
                // Editable Bio Field (using tag form for consistency and future expansion)
                (userTags && typeof userTags === 'object' && userTags.properties
                        ? renderTagForm(userTags, user, this.updateUserField.bind(this), ['bio', 'social']) // Pass fields to render
                        : $('<div/>').text('Failed to load user tag form.')
                ),

                // Status Indicator

                $('<div/>', {class: 'profile-field'}).append(
                    $('<label/>', {text: 'Status:'}),
                    $('<select/>', {id: 'user-status', value: user.status || 'online'}).append(
                        $('<option/>', {value: 'online', text: '🟢 Online'}),
                        $('<option/>', {value: 'away', text: '🌙 Away'}),
                        $('<option/>', {value: 'busy', text: '🔴 Busy'})
                    ).on('change', (e) => {
                        if (e.target instanceof HTMLSelectElement) {
                            this.updateUserField('status', e.target.value);
                        }
                    })
                ),
                // Sharing Section
                $('<div/>', {class: 'sharing-section'}).append(
                    $('<h4/>', {text: 'Share Object'}),
                    $('<input/>', {
                        type: 'text',
                        id: 'share-with-input',
                        placeholder: 'Enter user ID',
                    }),
                    $('<button/>', {
                        text: 'Share',
                        click: () => {
                            const userId = this.$('#share-with-input').val() as string;
                            const selectedObject = this.db.getSelectedObject();
                            if (selectedObject && userId) {
                                selectedObject.shareWith(userId);
                                this.$('#share-with-input').val('');
                                alert(`Object shared with user: ${userId}`);
                            } else {
                                alert('Please select an object and enter a user ID.');
                            }
                        },
                    }),
                    $('<button/>', {
                        text: 'Unshare',
                        click: () => {
                            const userId = this.$('#share-with-input').val() as string;
                            const selectedObject = this.db.getSelectedObject();
                            if (selectedObject && userId) {
                                selectedObject.unshareWith(userId);
                                this.$('#share-with-input').val('');
                                alert(`Object unshared with user: ${userId}`);
                            } else {
                                alert('Please select an object and enter a user ID.');
                            }
                        },
                    })
                ),

                // Action Buttons
                $('<div/>', {class: 'profile-actions'}).append(
                    $('<button/>', {class: 'save-btn', text: '💾 Save Changes'}).on('click', () => {
                        const user = this.getUser();
                        this.app.db.config.setUserProfile(user); // Use app.db to save profile
                        alert('Profile changes saved!');
                    }),
                    $('<button/>', {class: 'cancel-btn', text: '❌ Cancel'}).on('click', () => {
                        this.render();
                    })
                )
            )
        );
    }

    private handleAvatarUpload(e: Event) {
        const file = (e.target as HTMLInputElement)?.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event: any) => { // Type event as any to access target.result
                const user = this.getUser();
                this.app.store.currentUser = { // Update currentUser in store
                    ...user,
                    avatar: event?.target?.result as string
                };
                this.app.store.notifyListeners(); // Notify store listeners
            };
            reader.readAsDataURL(file);
        }
    }

    private validateSocialLink(link: string): boolean {
        return validateSocialLink(link);
    }

    private updateUserField(fieldPath: string, value: any) {
        const user = this.getUser();
        const pathParts = fieldPath.split('.');
        let current: any = user;

        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part];
        }

        const field = pathParts[pathParts.length - 1];

        if (userTags && typeof userTags === 'object') {
            let tagsConfig = (userTags as { properties: any }).properties[field]; // Direct field config
            if (!tagsConfig && pathParts.length > 1 && field === 'social') { // Check for nested social properties
                const socialTags = (userTags as {
                    properties: { social: { properties: any } }
                }).properties.social?.properties;
                tagsConfig = socialTags ? socialTags[pathParts[pathParts.length - 2]] : undefined; // Nested social config
            }

            if (tagsConfig) {
                (current as any)[field] = value;
                this.app.store.currentUser = user; // Update currentUser in store
                this.app.store.notifyListeners(); // Notify store listeners
            }
        }
    }
}
