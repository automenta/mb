/** TODO use the JSON user tag files instead of this.  then remove this */
export interface UserTags {
    title: string;
    description: string;
    validation: {
        enabled: boolean;
        rules: {
            strict: boolean;
            allowUnknown: boolean;
        };
    };
    type: string;
    properties: {
        [key: string]: {
            type: string;
            format?: string;
            description: string;
            default?: string;
            enum?: string[];
            properties?: {
                [key: string]: {
                    type: string;
                    format?: string;
                    description: string;
                };
            };
        };
        social: {
            type: string;
            format?: string;
            description: string;
            default?: string;
            enum?: string[];
            properties: {
                twitter?: { type: string, format?: string, description: string };
                github?: { type: string, format?: string, description: string };
                website?: { type: string, format?: string, description: string };
            };
        };
    };
}