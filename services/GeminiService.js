// services/GeminiService.js
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
    constructor(apiKey) {
        try {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize Gemini:', error);
            this.initialized = false;
        }
    }

    async analyzeTab(tab) {
        if (!this.initialized) {
            throw new Error('Gemini not properly initialized');
        }

        const prompt = `Analyze this webpage:
            Title: ${tab.title || 'Untitled'}
            URL: ${tab.url}
            
            Provide a structured analysis in JSON format with these keys:
            1. topic (main topic/theme)
            2. category (general category like 'Technology', 'News', etc.)
            3. keyPoints (array of main points)
            4. relatedTopics (array of related subjects)
            5. suggestedGrouping (what other tabs might be related)`;

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            return JSON.parse(text);
        } catch (error) {
            console.error('Tab analysis failed:', error);
            return null;
        }
    }

    async analyzeTabs(tabs, context = '') {
        if (!this.initialized) {
            throw new Error('Gemini not properly initialized');
        }

        const tabData = tabs.map(tab => ({
            id: tab.id,
            url: tab.url,
            title: tab.title,
            domain: this.extractDomain(tab.url)
        }));

        const prompt = `Analyze these browser tabs${context ? ` in the context of "${context}"` : ''}:
            ${JSON.stringify(tabData, null, 2)}
            
            Provide a structured analysis in JSON format with these keys:
            1. clusters (suggested groupings of related tabs)
            2. themes (key themes across all tabs)
            3. relevance (how tabs relate to the given context)
            4. suggestions (recommended organization or actions)`;

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            return JSON.parse(text);
        } catch (error) {
            console.error('Tabs analysis failed:', error);
            throw error;
        }
    }

    extractDomain(url) {
        try {
            return url ? new URL(url).hostname : 'unknown';
        } catch {
            return 'invalid-url';
        }
    }
}