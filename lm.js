class LanguageModel {
    static defaults = {
        endpoint: 'http://localhost:11434/api/generate',
        model: 'llamablit',
        retries: 3
    }

    constructor(options = {}) {
        this.config = { ...LanguageModel.defaults, ...options };
    }

    async process(prompt, systemPrompt) {
        return this.processWithRetries(prompt, systemPrompt, 0);
    }

    async processWithRetries(prompt, systemPrompt, retryCount = 0) {
        try {
            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.config.model,
                    stream: false,
                    system: systemPrompt,
                    prompt: prompt
                })
            })

            if (!response.ok)
                throw new Error(`Server responded with status ${response.status}`)

            const data = await response.json();

            if (!data.response)
                throw new Error('Invalid response structure from API')


            const jsonStr = data.response
            const cleanedJson = this.cleanJson(jsonStr)

            try {
                return JSON.parse(cleanedJson)
            } catch (e) {
                if (retryCount < this.config.retries)
                    return this.processWithRetries(prompt, systemPrompt, retryCount + 1)

                throw new Error('Failed to parse JSON after retries')
            }
        } catch (error) {
            throw new Error(`API error: ${error.message}`)
        }
    }

    cleanJson(str) {
        const matches = str.match(/\{[\s\S]*\}/g)
        if (!matches) return str

        // Attempt to parse each match until one succeeds
        for (const match of matches) {
            try {
                return match
            } catch (e) {
                // Continue to next match if parsing fails
            }
        }
        return str
    }
}
