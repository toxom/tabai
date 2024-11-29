class QuantumTabButton {
    constructor() {
      this.button = null;
      this.overlay = null;
      this.isDragging = false;
      this.initialize();
    }
  
    initialize() {
      this.createButton();
      this.createOverlay();
      this.setupEventListeners();
    }
  
    createButton() {
      this.button = document.createElement('div');
      this.button.id = 'quantum-tab-button';
      Object.assign(this.button.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '50px',
        height: '50px',
        background: '#6200ea',
        borderRadius: '50%',
        cursor: 'grab',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '24px',
        zIndex: '9999',
        userSelect: 'none'
      });
      
      this.button.innerHTML = 'Q';
      document.body.appendChild(this.button);
    }
  
    createOverlay() {
      this.overlay = document.createElement('div');
      this.overlay.id = 'quantum-tabs-overlay';
      Object.assign(this.overlay.style, {
        position: 'fixed',
        top: '0',
        right: '-400px',
        width: '400px',
        height: '100vh',
        background: 'white',
        boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
        zIndex: '9998',
        transition: 'right 0.3s ease',
        padding: '20px',
        overflowY: 'auto'
      });
      
      document.body.appendChild(this.overlay);
    }
  
    setupEventListeners() {
      this.button.addEventListener('mousedown', this.handleDragStart.bind(this));
      this.button.addEventListener('click', this.toggleOverlay.bind(this));
      
      // Close overlay when clicking outside
      document.addEventListener('click', (e) => {
        if (!this.overlay.contains(e.target) && 
            !this.button.contains(e.target) && 
            this.overlay.style.right === '0px') {
          this.toggleOverlay();
        }
      });
    }
  
    handleDragStart(e) {
      if (e.button !== 0) return; // Only left click
  
      this.isDragging = true;
      const buttonRect = this.button.getBoundingClientRect();
      const shiftX = e.clientX - buttonRect.left;
      const shiftY = e.clientY - buttonRect.top;
  
      const moveButton = (pageX, pageY) => {
        const newLeft = pageX - shiftX;
        const newTop = pageY - shiftY;
        
        // Keep button within viewport
        const maxX = window.innerWidth - buttonRect.width;
        const maxY = window.innerHeight - buttonRect.height;
        
        this.button.style.left = Math.min(Math.max(0, newLeft), maxX) + 'px';
        this.button.style.top = Math.min(Math.max(0, newTop), maxY) + 'px';
      };
  
      const onMouseMove = (e) => {
        if (this.isDragging) {
          moveButton(e.pageX, e.pageY);
        }
      };
  
      const onMouseUp = () => {
        this.isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
  
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
  
      this.button.style.cursor = 'grabbing';
      e.preventDefault(); // Prevent text selection
    }
  
    toggleOverlay() {
      if (!this.isDragging) {
        const isOpen = this.overlay.style.right === '0px';
        this.overlay.style.right = isOpen ? '-400px' : '0px';
        this.updateOverlayContent();
      }
    }
  
    async updateOverlayContent() {
        try {
            // Using chrome.runtime.sendMessage with proper error handling
            const tabs = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ action: 'getTabs' }, response => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response);
                    }
                });
            });
            
            const clusters = await this.clusterTabs(tabs);
            this.renderClusters(clusters);
        } catch (error) {
            console.error('Failed to update overlay:', error);
            this.overlay.innerHTML = `
                <h2 style="margin-bottom: 20px; color: #6200ea;">Quantum Tabs</h2>
                <div style="color: red;">Error loading tabs. Please try again.</div>
            `;
        }
    }

    async clusterTabs(tabs) {
        const clusters = {};
        
        for (const tab of tabs) {
            try {
                const url = new URL(tab.url);
                const domain = url.hostname;
                
                if (!clusters[domain]) {
                    clusters[domain] = {
                        tabs: [],
                        summary: null
                    };
                }
                
                clusters[domain].tabs.push(tab);
                
                // Using chrome.runtime.sendMessage with proper error handling
                const summary = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        action: 'summarize',
                        url: tab.url
                    }, response => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(response);
                        }
                    });
                });
                
                if (summary) {
                    clusters[domain].summary = summary;
                }
            } catch (e) {
                console.error('Error processing tab:', e);
            }
        }
        
        return clusters;
    }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new QuantumTabButton());
} else {
  new QuantumTabButton();
}
  
    renderClusters(clusters) {
      this.overlay.innerHTML = `
        <h2 style="margin-bottom: 20px; color: #6200ea;">Quantum Tabs</h2>
        <div id="clusters-container"></div>
      `;
      
      const container = this.overlay.querySelector('#clusters-container');
      
      Object.entries(clusters).forEach(([domain, cluster]) => {
        const clusterElement = document.createElement('div');
        clusterElement.className = 'quantum-cluster';
        Object.assign(clusterElement.style, {
          marginBottom: '20px',
          padding: '15px',
          borderRadius: '8px',
          background: '#f5f5f5',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        });
        
        clusterElement.innerHTML = `
          <h3 style="margin-bottom: 10px; color: #333;">${domain}</h3>
          ${cluster.summary ? `<p style="margin-bottom: 10px; color: #666;">${cluster.summary}</p>` : ''}
          <div class="tabs-list" style="display: flex; flex-direction: column; gap: 8px;">
            ${cluster.tabs.map(tab => `
              <div class="tab-item" style="display: flex; align-items: center; gap: 8px; cursor: pointer;"
                   data-tab-id="${tab.id}">
                <img src="${tab.favIconUrl || ''}" style="width: 16px; height: 16px;">
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${tab.title}
                </span>
              </div>
            `).join('')}
          </div>
        `;
        
        // Add click listeners for tabs
        clusterElement.querySelectorAll('.tab-item').forEach(tabElement => {
          tabElement.addEventListener('click', () => {
            const tabId = parseInt(tabElement.dataset.tabId);
            chrome.runtime.sendMessage({ action: 'activateTab', tabId });
          });
        });
        
        container.appendChild(clusterElement);
      });
    },
  },
  
  // Initialize the Quantum Tab Button
  const quantumTabs = new QuantumTabButton();
  
