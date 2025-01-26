import * as Y from 'yjs';
import NObject from './obj';

class ConfigManager {
    private configObj: NObject;

    constructor(doc: Y.Doc) {
        this.configObj = new NObject(doc, 'config'); // Use 'config' as ID for config object
    }

    getSignalingServers(): string[] {
        return this.configObj.getMetadata('signalingServers') as string[] || [];
    }

    setSignalingServers(servers: string[]): void {
        this.configObj.setMetadata('signalingServers', servers);
    }

    getUserProfile(): any { // Add getUserProfile method
        return this.configObj.getMetadata('userProfile');
    }

    setUserProfile(profile: any): void { // Add setUserProfile method
        this.configObj.setMetadata('userProfile', profile);
    }
}

export default ConfigManager;