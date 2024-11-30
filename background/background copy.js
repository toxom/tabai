// background/background.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from './config.js';

// Initialize Gemini
const API_KEY = 'YOUR_API_KEY'; // Store this securely
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Initialize state
let quantumClusters = {};
let activeCluster = null;

chrome.sidePanel
.setPanelBehavior({ openPanelOnActionClick: true })
.catch((error) => console.error(error));


console.log('TabAI Background Script Loaded');

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    switch (request.action) {
        case 'getTabs':
            chrome.tabs.query({}, tabs => {
                sendResponse(tabs);
            });
            return true; // Keep channel open for async response

        case 'activateTab':
            chrome.tabs.update(request.tabId, { active: true }, () => {
                sendResponse({ success: true });
            });
            return true;

        case 'summarize':
            // Basic summarization for now
            sendResponse({
                summary: `Summary of ${request.url}`,
                status: 'basic'
            });
            return true;
    }
});

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('TabAI Extension Installed');
});

class TabAnalyzer {
    constructor() {
        this.context = '';
        this.model = model;
    }

    async analyzeTabs(tabs) {
        try {
            const tabData = tabs.map(tab => {
                try {
                    return {
                        id: tab.id,
                        url: tab.url,
                        title: tab.title,
                        domain: tab.url ? new URL(tab.url).hostname : 'unknown'
                    };
                } catch (e) {
                    return {
                        id: tab.id,
                        url: tab.url || '',
                        title: tab.title || '',
                        domain: 'invalid-url'
                    };
                }
            });

            const prompt = `Analyze these browser tabs in the context of "${this.context}":
                ${JSON.stringify(tabData, null, 2)}
                
                Please provide:
                1. Suggested groupings/clusters
                2. Key themes or topics
                3. Relevance to the given context
                4. Suggested actions or organization
                
                Format the response as JSON with these keys: clusters, themes, relevance, suggestions`;

            const result = await this.model.generateContent(prompt);
            return {
                context: this.context,
                tabs: tabData,
                analysis: JSON.parse(result.response.text())
            };
        } catch (error) {
            console.error('Analysis failed:', error);
            return {
                error: error.message,
                context: this.context
            };
        }
    }
}

// Create analyzer instance
const analyzer = new TabAnalyzer();

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeContext') {
        analyzer.setContext(request.context)
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Keep channel open for async response
    }
    return false;
});

// Export for debugging
self.TabAnalyzer = TabAnalyzer;


class QuantumCluster {
    constructor(seed) {
        this.seedTab = seed;
        this.relatedTabs = new Set();
        this.metadata = {
            topic: null,
            keyInsights: [],
            progress: 0
        };
        this.state = 'active';
        this.model = model;
    }

    async analyze() {
        try {
            // Use Gemini to analyze the cluster
            const prompt = `Analyze this webpage:
                Title: ${this.seedTab.title}
                URL: ${this.seedTab.url}
                
                Please provide:
                1. Main topic/theme
                2. Key insights
                3. Related topics to look for
                
                Format the response as JSON with these keys: topic, insights, relatedTopics`;

            const result = await this.model.generateContent(prompt);
            const analysis = JSON.parse(result.response.text());

            this.metadata = {
                topic: analysis.topic,
                keyInsights: analysis.insights,
                relatedTopics: analysis.relatedTopics,
                progress: 100
            };

            return this.metadata;
        } catch (error) {
            console.error('Analysis failed:', error);
            return null;
        }
    }
}


// Single onInstalled listener
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
      quantumClusters: {},
      activeCluster: null
  });
});

// Handle tab creation and clustering
chrome.tabs.onCreated.addListener(async (tab) => {
  const cluster = new QuantumCluster(tab);
  await cluster.analyze();
  
  // Store cluster data
  const clusters = await chrome.storage.local.get('quantumClusters');
  clusters.quantumClusters[tab.id] = cluster;
  await chrome.storage.local.set({ quantumClusters: clusters });
});

// Single message listener for all actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
      case 'getTabs':
          chrome.tabs.query({}, sendResponse);
          return true;

      case 'activateTab':
          chrome.tabs.update(request.tabId, { active: true });
          return true;

      case 'analyzeContext':
          analyzer.setContext(request.context)
              .then(sendResponse);
          return true;

      case 'openSidePanel':
          if (chrome.sidePanel) {
              chrome.sidePanel.open();
          }
          return true;

      case 'summarize':
          // Basic summarization until we can access Chrome's AI APIs
          sendResponse({
              summary: `Summary of ${request.url}`,
              status: 'basic'
          });
          return true;
  }
});

// Export for debugging
self.TabAnalyzer = TabAnalyzer;
self.QuantumCluster = QuantumCluster;

