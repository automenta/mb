class UserProfile extends EventTarget {
    constructor(initialData = {}) {
        super();
        this.data = {
            peerId: null,
            displayName: initialData.displayName || 'Anonymous User',
            avatar: initialData.avatar || null,
            bio: initialData.bio || '',
            preferences: initialData.preferences || {}
        };
    }

    set(field, value) {
        this.data[field] = value;
        this.emit('profile-updated', { field, value });
    }

    setPeerId(id) {
        this.set('peerId', id);
    }

    setDisplayName(name) {
        this.set('displayName', name);
    }

    setBio(bio) {
        this.set('bio', bio);
    }

    setPreference(key, value) {
        this.set('preferences', { ...this.data.preferences, [key]: value });
    }

    toJSON() {
        return { ...this.data };
    }

    emit(name, detail) {
        this.dispatchEvent(new CustomEvent(name, { detail }));
    }
}
