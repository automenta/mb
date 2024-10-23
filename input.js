class SemanticInput {

    static defaults = {
        endpoint: 'http://localhost:11434/api/generate',
        retries: 3
    }

    constructor(container, options = {}) {
        this.config = { ...SemanticInput.defaults, ...options }
        this.jsonData = null
        this.statusListeners = new Set()
        this.changeListeners = new Set()

        this.createDom(container)
        this.bindEvents()
    }

    createDom(container) {
        container.innerHTML = `
                <div class="semantic-input">
                    <textarea class="input" placeholder=""></textarea>
                    <button class="save">Save</button>
                    <div class="status"></div>
                    <div class="json-container hidden">
                        <h3>JSON</h3>
                        <pre class="json-output"></pre>
                        <button class="edit-json">Edit</button>
                        <textarea class="json-input hidden"></textarea>
                    </div>
                </div>
                <style>
                    .semantic-input { display: grid; gap: 1rem; }
                    .semantic-input .hidden { display: none; }
                    .semantic-input textarea { min-height: 200px; padding: 0.5rem; }
                    .semantic-input .status { color: #666; }
                    .semantic-input .status.error { color: #c00; }
                    .semantic-input pre { background: #f5f5f5; padding: 1rem; overflow-x: auto; }
                </style>`

        this.elements = {
            input: container.querySelector('.input'),
            save: container.querySelector('.save'),
            status: container.querySelector('.status'),
            jsonContainer: container.querySelector('.json-container'),
            jsonOutput: container.querySelector('.json-output'),
            jsonInput: container.querySelector('.json-input'),
            editJson: container.querySelector('.edit-json')
        }
    }

    bindEvents() {
        this.elements.save.onclick = () => this.save()
        this.elements.editJson.onclick = () => this.toggleJsonEdit()
        this.elements.jsonInput.onchange = () => this.updateJson()
    }

    async save() {
        const text = this.getText()
        if (!text) return

        this.elements.save.disabled = true
        this.updateStatus('Processing...')

        try {
            this.elements.jsonOutput.textContent = '';

            await this.processText(text)
            const metadata = {
                created: new Date().toISOString(),
                author: this.config.author,
                id: crypto.randomUUID()
            }
            this.jsonData = { ...metadata, ...this.jsonData }
            this.updateUi()
            this.notifyChange()
            this.updateStatus('Processed successfully')
        } catch (error) {
            this.updateStatus(`Error: ${error.message}`, true)
        } finally {
            this.elements.save.disabled = false
        }
    }

    async processText(text, retryCount = 0) {
        this.updateStatus('Processing...')

        try {
            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llamablit',
                    stream: false,
                    system: this.config.systemPrompt,
                    prompt: text
                })
            })

            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`)
            }

            const data = await response.json()

            if (!data.response) {
                throw new Error('Invalid response structure from API')
            }

            const jsonStr = data.response;

            try {
                this.jsonData = JSON.parse(this.cleanJson(jsonStr))
            } catch (e) {
                if (retryCount < this.config.retries) {
                    this.updateStatus(`Retrying (${retryCount + 1}/${this.config.retries})...`)
                    await this.processText(text, retryCount + 1)
                } else {
                    throw new Error('Failed to parse JSON after retries')
                }
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

            }
        }
        return str
    }

    updateUi() {
        this.elements.jsonContainer.classList.remove('hidden')
        this.elements.jsonOutput.textContent = JSON.stringify(this.jsonData, null, 2)
        this.elements.jsonInput.value = JSON.stringify(this.jsonData, null, 2)
    }

    toggleJsonEdit() {
        const input = this.elements.jsonInput
        const isHidden = input.classList.toggle('hidden')
        this.elements.editJson.textContent = isHidden ? 'Edit JSON' : 'Hide Editor'
    }

    updateJson() {
        try {
            this.jsonData = JSON.parse(this.elements.jsonInput.value)
            this.updateUi()
            this.updateStatus('JSON updated')
            this.notifyChange()
        } catch (e) {
            this.updateStatus('Invalid JSON', true)
        }
    }

    updateStatus(message, isError = false) {
        this.elements.status.textContent = message
        this.elements.status.className = `status${isError ? ' error' : ''}`
        this.statusListeners.forEach(fn => fn(message, isError))
    }

    // Public API methods
    getText() {
        return this.elements.input.value.trim()
    }

    setText(text) {
        this.elements.input.value = text
    }

    getData() {
        return this.jsonData
    }

    setData(data) {
        this.jsonData = data
        if (data) this.updateUi()
    }

    clear() {
        this.setText('')
        this.setData(null)
        this.elements.jsonContainer.classList.add('hidden')
        this.updateStatus('')
    }

    // Event handling
    onStatus(fn) {
        this.statusListeners.add(fn)
        return () => this.statusListeners.delete(fn)
    }

    onChange(fn) {
        this.changeListeners.add(fn)
        return () => this.changeListeners.delete(fn)
    }

    notifyChange() {
        this.changeListeners.forEach(fn => fn(this.jsonData))
    }
}