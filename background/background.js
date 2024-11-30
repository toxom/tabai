chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('SidePanel Error:', error));

class TabAnalyzer {
  constructor() {
    this.context = '';
  }

  async setContext(context) {
    try {
      this.context = context;
      return await this.updateAnalysis();
    } catch (error) {
      console.error('Failed to set context:', error);
      return null;
    }
  }

  async updateAnalysis() {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      return this.analyzeTabs(tabs);
    } catch (error) {
      console.error('Failed to update analysis:', error);
      return null;
    }
  }

  async analyzeTabs(tabs) {
    try {
      const summaries = tabs.map((tab) => ({
        id: tab.id,
        url: tab.url,
        title: tab.title,
      }));

      return {
        context: this.context,
        tabs: summaries,
      };
    } catch (error) {
      console.error('Tab analysis failed:', error);
      return null;
    }
  }
}

class QuantumCluster {
  constructor(seedTab) {
    this.seedTab = seedTab;
    this.relatedTabs = new Set();
    this.metadata = {
      topic: null,
      keyInsights: [],
      progress: 0,
    };
    this.state = 'active';
  }

  async analyze() {
    try {
      const url = new URL(this.seedTab.url);
      this.metadata.topic = url.hostname;
      this.metadata.keyInsights = [this.seedTab.title];
      return this.metadata;
    } catch (error) {
      console.error('Cluster analysis failed:', error);
      return null;
    }
  }

  cleanup() {
    // Add logic here to remove old or irrelevant relatedTabs entries if needed
  }
}

// State management
const state = {
  analyzer: new TabAnalyzer(),
  quantumClusters: {},
  activeCluster: null,
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    quantumClusters: {},
    activeCluster: null,
  });
});

// Tab creation and clustering
chrome.tabs.onCreated.addListener(async (tab) => {
  try {
    const cluster = new QuantumCluster(tab);
    await cluster.analyze();

    // Safely update quantumClusters in chrome.storage.local
    const { quantumClusters } = await chrome.storage.local.get('quantumClusters');
    const updatedClusters = { ...quantumClusters, [tab.id]: cluster };
    await chrome.storage.local.set({ quantumClusters: updatedClusters });
  } catch (error) {
    console.error('Failed to create and analyze cluster:', error);
  }
});

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'getTabs':
          const tabs = await chrome.tabs.query({ currentWindow: true });
          sendResponse(tabs);
          break;

        case 'activateTab':
          await chrome.tabs.update(request.tabId, { active: true });
          sendResponse({ success: true });
          break;

        case 'analyzeContext':
          const analysis = await state.analyzer.setContext(request.context);
          sendResponse(analysis);
          break;

        case 'openSidePanel':
          if (chrome.sidePanel?.open) {
            await chrome.sidePanel.open();
            sendResponse({ success: true });
          } else {
            sendResponse({ error: 'Side panel API not supported.' });
          }
          break;

        case 'summarize':
          sendResponse({
            summary: `Summary of ${request.url}`,
            status: 'basic',
          });
          break;

        default:
          sendResponse({ error: 'Unknown action.' });
      }
    } catch (error) {
      console.error(`Error handling action "${request.action}":`, error);
      sendResponse({ error: error.message });
    }
  })();
  return true; // Indicates asynchronous response
});

// Export for debugging
self.TabAnalyzer = TabAnalyzer;
self.QuantumCluster = QuantumCluster;