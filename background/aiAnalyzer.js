class TabAnalyzer {
    constructor() {
        this.context = '';
        this.network = new TabNetwork();
    }

    async setContext(context) {
        this.context = context;
        await this.updateAnalysis();
    }

    async updateAnalysis() {
        const tabs = await chrome.tabs.query({});
        const summaries = await Promise.all(tabs.map(tab => this.analyzeTab(tab)));
        
        // Use Chrome's built-in AI API for analysis
        const analysis = await chrome.runtime.sendMessage({
            type: 'prompt',
            content: `Analyze these tabs in the context of: ${this.context}\n${summaries.join('\n')}`
        });

        return this.updateNetwork(analysis);
    }

    async analyzeTab(tab) {
        // Use Chrome's built-in summarization API
        return chrome.runtime.sendMessage({
            type: 'summarize',
            url: tab.url
        });
    }
}