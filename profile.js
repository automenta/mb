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

    setPeerId(id) {
        this.data.peerId = id;
        this.emit('profile-updated', { field: 'peerId', value: id });
    }

    setDisplayName(name) {
        this.data.displayName = name;
        this.emit('profile-updated', { field: 'displayName', value: name });
    }

    setBio(bio) {
        this.data.bio = bio;
        this.emit('profile-updated', { field: 'bio', value: bio });
    }

    setPreference(key, value) {
        this.data.preferences[key] = value;
        this.emit('profile-updated', { field: 'preferences', value: this.data.preferences });
    }

    toJSON() {
        return { ...this.data };
    }

    emit(name, detail) {
        this.dispatchEvent(new CustomEvent(name, { detail }));
    }
}
