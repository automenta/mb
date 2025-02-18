export class Tags {
    private readonly tags: Record<string, any>;

    constructor() {
        this.tags = {};
    }

    register(name: string, tag: any) {
        this.tags[name] = tag;
    }

    get(name: string): any | undefined {
        return this.tags[name];
    }
}

const tagManager = new Tags();

export default tagManager;
