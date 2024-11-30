// popup.js


document.addEventListener('DOMContentLoaded', function() {
    initializeUI();
    loadTabs();
    setupEventListeners();
});

function initializeUI() {
    const analyzeBtn = document.getElementById('analyze-btn');
    analyzeBtn.addEventListener('click', analyzeTabs);
    
    // Add tab switching functionality
    document.querySelectorAll('.main-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Switch tabs
            document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Switch content
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(`${e.target.dataset.tab}-content`).classList.add('active');
        });
    });
}

function loadTabs() {
    chrome.tabs.query({}, function(tabs) {
        const container = document.getElementById('tabs-container');
        container.innerHTML = ''; // Clear existing tabs
        
        // Group tabs by domain
        const tabGroups = groupTabsByDomain(tabs);
        const pinnedTabs = tabs.filter(tab => tab.pinned);
        const browserGroups = tabs.reduce((groups, tab) => {
            if (tab.groupId !== -1) {
                if (!groups[tab.groupId]) {
                    groups[tab.groupId] = [];
                }
                groups[tab.groupId].push(tab);
            }
            return groups;
        }, {});

        // Add Pinned Tabs with special styling
        if (pinnedTabs.length > 0) {
            const pinnedSection = document.createElement('div');
            pinnedSection.className = 'tab-cluster pinned-cluster';
            
            pinnedSection.innerHTML = `
                <div class="cluster-header">
                    <button class="toggle-cluster">Pinned Tabs (${pinnedTabs.length})</button>
                </div>
                <div class="cluster-tabs pinned-tabs-grid visible">
                    ${pinnedTabs.map(tab => `
                        <div class="pinned-tab" data-tab-id="${tab.id}">
                            <img src="${tab.favIconUrl || 'chrome://favicon'}" width="16" height="16">
                            <span>${tab.title}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            
            container.appendChild(pinnedSection);
        }

        // Add Browser Groups
        Object.entries(browserGroups).forEach(([groupId, groupTabs]) => {
            const browserGroupCluster = createCluster(`Group ${groupId}`, groupTabs);
            browserGroupCluster.classList.add('browser-group');
            container.appendChild(browserGroupCluster);
        });

        // Add regular domain-grouped tabs
        Object.entries(tabGroups).forEach(([domain, domainTabs]) => {
            const regularTabs = domainTabs.filter(tab => 
                !tab.pinned && tab.groupId === -1
            );

            if (regularTabs.length > 0) {
                const tabsContainer = document.createElement('div');
                tabsContainer.className = 'cluster-tabs';
                
                regularTabs.forEach(tab => {
                    const tabElement = document.createElement('div');
                    tabElement.className = 'tab-item';
                    tabElement.dataset.tabId = tab.id;
                    
                    tabElement.innerHTML = `
                        <img src="${tab.favIconUrl || 'chrome://favicon'}" width="16" height="16">
                        <span>${tab.title}</span>
                    `;
                    
                    tabsContainer.appendChild(tabElement);
                });
                
                container.appendChild(tabsContainer);
            }
        });

        setupAccordions();
    });
}

function createCluster(title, tabs) {
    const clusterElement = document.createElement('div');
    clusterElement.className = 'tab-cluster';

    clusterElement.innerHTML = `
        <div class="cluster-header">
            <button class="toggle-cluster">${title} (${tabs.length})</button>
        </div>
        <div class="cluster-tabs hidden"></div>
    `;

    const clusterTabsContainer = clusterElement.querySelector('.cluster-tabs');
    tabs.forEach(tab => {
        const tabElement = document.createElement('div');
        tabElement.className = 'tab-item';
        tabElement.dataset.tabId = tab.id;

        tabElement.innerHTML = `
            <img src="${tab.favIconUrl || 'chrome://favicon'}" width="16" height="16">
            <span>${tab.title}</span>
        `;

        clusterTabsContainer.appendChild(tabElement);
    });

    return clusterElement;
}

function setupAccordions() {
    document.querySelectorAll('.toggle-cluster').forEach(button => {
        button.addEventListener('click', (e) => {
            const cluster = e.target.closest('.tab-cluster');
            const tabsContainer = cluster.querySelector('.cluster-tabs');
            const isOpen = !tabsContainer.classList.contains('hidden');
            tabsContainer.classList.toggle('hidden', isOpen);
            // e.target.textContent = isOpen ? ${title} : '';
        });
    });
}

function setupEventListeners() {
    // Event delegation for all tab items
    document.getElementById('tabs-container').addEventListener('click', (e) => {
        const tabItem = e.target.closest('.tab-item');
        if (tabItem) {
            const tabId = parseInt(tabItem.dataset.tabId);
            if (tabId) {
                chrome.tabs.update(tabId, { active: true }, () => {
                    // Find and focus the window containing this tab
                    chrome.tabs.get(tabId, (tab) => {
                        if (tab.windowId) {
                            chrome.windows.update(tab.windowId, { focused: true });
                        }
                    });
                });
            }
        }

        // Handle pinned tab clicks
        const pinnedTab = e.target.closest('.pinned-tab');
        if (pinnedTab) {
            const tabId = parseInt(pinnedTab.dataset.tabId);
            if (tabId) {
                chrome.tabs.update(tabId, { active: true }, () => {
                    chrome.tabs.get(tabId, (tab) => {
                        if (tab.windowId) {
                            chrome.windows.update(tab.windowId, { focused: true });
                        }
                    });
                });
            }
        }
    });

    // Setup tab search
    const searchInput = document.getElementById('tab-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const tabItems = document.querySelectorAll('.tab-item, .pinned-tab');
            
            tabItems.forEach(item => {
                const title = item.querySelector('span').textContent.toLowerCase();
                if (title.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
}


function groupTabsByDomain(tabs) {
    return tabs.reduce((groups, tab) => {
        try {
            const url = new URL(tab.url);
            const domain = url.hostname;
            if (!groups[domain]) {
                groups[domain] = [];
            }
            groups[domain].push(tab);
        } catch (e) {
            // Handle invalid URLs
            if (!groups['Other']) {
                groups['Other'] = [];
            }
            groups['Other'].push(tab);
        }
        return groups;
    }, {});
}


async function analyzeTabs() {
    const context = document.getElementById('ai-task').value;
    if (!context) return;

    const analyzeBtn = document.getElementById('analyze-btn');
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'analyzeContext',
            context: context
        });
        
        // Handle the analysis response
        if (response) {
            loadTabs(); // Reload tabs with new organization
        }
    } catch (error) {
        console.error('Analysis failed:', error);
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze Tabs';
    }
}

// popup.js - adding to your existing JavaScript
class TabNetwork {

    
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.edges = [];
        this.bubbles = [];
        this.currentLayout = 'bubble';
        this.setupCanvas();
        this.colors = [
            '#4285f4', '#ea4335', '#fbbc05', '#34a853',
            '#ff6d00', '#2979ff', '#00c853', '#d50000'
        ];
    }

    setupCanvas() {
        const resize = () => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        window.addEventListener('resize', resize);
        resize();
    }

    

    setData(tabs) {
        // Group tabs by domain and include group information
        const domainGroups = {};
        tabs.forEach(tab => {
            try {
                const domain = new URL(tab.url).hostname;
                if (!domainGroups[domain]) {
                    domainGroups[domain] = {
                        tabs: [],
                        pinned: [],
                        groups: {}
                    };
                }
                
                // Handle grouped tabs
                if (tab.groupId !== -1) {
                    if (!domainGroups[domain].groups[tab.groupId]) {
                        domainGroups[domain].groups[tab.groupId] = [];
                    }
                    domainGroups[domain].groups[tab.groupId].push(tab);
                }
                // Handle pinned tabs
                else if (tab.pinned) {
                    domainGroups[domain].pinned.push(tab);
                }
                // Regular tabs
                else {
                    domainGroups[domain].tabs.push(tab);
                }
            } catch (e) {
                // Handle invalid URLs
                if (!domainGroups['Other']) {
                    domainGroups['Other'] = { tabs: [], pinned: [], groups: {} };
                }
                domainGroups['Other'].tabs.push(tab);
            }
        });

        // Convert to nodes for visualization
        this.nodes = [];
        this.bubbles = Object.entries(domainGroups).map(([domain, group], index) => ({
            domain,
            size: group.tabs.length + group.pinned.length + 
                  Object.values(group.groups).reduce((sum, g) => sum + g.length, 0),
            tabs: group.tabs,
            pinned: group.pinned,
            groups: group.groups,
            color: this.colors[index % this.colors.length],
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height
        }));
    }

    setLayout(type) {
        this.currentLayout = type;
        switch (type) {
            case 'bubble':
                this.applyBubbleLayout();
                break;
            case 'tree':
                this.applyTreeLayout();
                break;
            case 'circular':
                this.applyCircularLayout();
                break;
        }
    }

    applyBubbleLayout() {
        const padding = 20;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Calculate total area needed
        const totalTabs = this.bubbles.reduce((sum, b) => sum + b.size, 0);
        const maxRadius = Math.min(this.canvas.width, this.canvas.height) * 0.4;
        
        // Position bubbles using a spiral layout
        let angle = 0;
        let radius = 0;
        this.bubbles.forEach(bubble => {
            // Calculate bubble radius based on number of tabs
            bubble.radius = Math.sqrt(bubble.size / totalTabs) * maxRadius;
            
            // Position along spiral
            bubble.x = centerX + radius * Math.cos(angle);
            bubble.y = centerY + radius * Math.sin(angle);
            
            // Update spiral parameters
            angle += 2 * Math.PI / this.bubbles.length;
            radius += bubble.radius + padding;
        });
        
        this.draw();
    }

    applyTreeLayout() {
        const padding = 40;
        const levelHeight = 120;
        
        // Sort bubbles by size
        const sortedBubbles = [...this.bubbles].sort((a, b) => b.size - a.size);
        
        // Calculate levels based on size
        const levels = [];
        let currentLevel = [];
        let currentWidth = 0;
        
        sortedBubbles.forEach(bubble => {
            const bubbleWidth = bubble.size * 20 + padding;
            if (currentWidth + bubbleWidth > this.canvas.width) {
                levels.push(currentLevel);
                currentLevel = [bubble];
                currentWidth = bubbleWidth;
            } else {
                currentLevel.push(bubble);
                currentWidth += bubbleWidth;
            }
        });
        if (currentLevel.length > 0) {
            levels.push(currentLevel);
        }
        
        // Position bubbles in levels
        levels.forEach((level, levelIndex) => {
            const levelY = (levelIndex + 1) * levelHeight;
            const levelWidth = level.reduce((sum, b) => sum + b.size * 20 + padding, 0);
            let currentX = (this.canvas.width - levelWidth) / 2;
            
            level.forEach(bubble => {
                bubble.x = currentX + (bubble.size * 10);
                bubble.y = levelY;
                bubble.radius = bubble.size * 10;
                currentX += bubble.size * 20 + padding;
            });
        });
        
        this.draw();
    }

    applyCircularLayout() {
        const radius = Math.min(this.canvas.width, this.canvas.height) * 0.4;
        const center = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2
        };

        this.bubbles.forEach((bubble, i) => {
            const angle = (i / this.bubbles.length) * Math.PI * 2;
            bubble.x = center.x + Math.cos(angle) * radius;
            bubble.y = center.y + Math.sin(angle) * radius;
            bubble.radius = Math.sqrt(bubble.size) * 10;
        });
        this.draw();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw bubbles
        this.bubbles.forEach(bubble => {
            // Draw main circle
            this.ctx.fillStyle = bubble.color + '80'; // Add transparency
            this.ctx.beginPath();
            this.ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw border
            this.ctx.strokeStyle = bubble.color;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw domain label
            this.ctx.fillStyle = '#000';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(bubble.domain, bubble.x, bubble.y);
            
            // Draw tab count
            this.ctx.font = '10px Arial';
            this.ctx.fillText(`${bubble.size} tabs`, bubble.x, bubble.y + 15);
            
            // Indicate if there are pinned tabs or groups
            if (bubble.pinned.length > 0 || Object.keys(bubble.groups).length > 0) {
                this.ctx.font = '10px Arial';
                let indicators = [];
                if (bubble.pinned.length > 0) {
                    indicators.push(`📌 ${bubble.pinned.length}`);
                }
                if (Object.keys(bubble.groups).length > 0) {
                    indicators.push(`👥 ${Object.keys(bubble.groups).length}`);
                }
                this.ctx.fillText(indicators.join(' '), bubble.x, bubble.y + 30);
            }
        });
    }
}

// Initialize network visualization
document.addEventListener('DOMContentLoaded', function() {
    const network = new TabNetwork('network-canvas');

    // Setup network view tabs
    document.querySelectorAll('.network-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.network-tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            network.setLayout(e.target.dataset.view);
        });
    });

    // Setup groups toggle
    document.getElementById('toggle-groups').addEventListener('click', () => {
        const container = document.getElementById('tabs-container');
        container.classList.toggle('groups-hidden');
        container.classList.toggle('groups-visible');
    });

    // Load initial data
    chrome.tabs.query({}, function(tabs) {
        network.setData(tabs);
        network.setLayout('force');
    });
});