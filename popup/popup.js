// popup.js
(async () => {
    document.addEventListener('DOMContentLoaded', function() {
        initializeUI();
        loadTabs();
        setupEventListeners();
    });
})();


function initializeUI() {
    const analyzeBtn = document.getElementById('analyze-btn');
    analyzeBtn.addEventListener('click', analyzeTabs);
}

function loadTabs() {
    chrome.tabs.query({}, function(tabs) {
        const container = document.getElementById('tabs-container');
        container.innerHTML = ''; // Clear existing tabs
        
        const tabGroups = groupTabsByDomain(tabs);
        
        Object.entries(tabGroups).forEach(([domain, domainTabs]) => {
            const clusterElement = document.createElement('div');
            clusterElement.className = 'tab-cluster';
            
            clusterElement.innerHTML = `
                <div class="cluster-header">${domain}</div>
                <div class="cluster-tabs"></div>
            `;
            
            const clusterTabsContainer = clusterElement.querySelector('.cluster-tabs');
            
            domainTabs.forEach(tab => {
                const tabElement = document.createElement('div');
                tabElement.className = 'tab-item';
                tabElement.dataset.tabId = tab.id;
                
                tabElement.innerHTML = `
                    <img src="${tab.favIconUrl || ''}" width="16" height="16">
                    <span>${tab.title}</span>
                `;
                
                clusterTabsContainer.appendChild(tabElement);
            });
            
            container.appendChild(clusterElement);
        });
    });
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

function setupEventListeners() {
    document.getElementById('tabs-container').addEventListener('click', (e) => {
        const tabItem = e.target.closest('.tab-item');
        if (tabItem) {
            const tabId = parseInt(tabItem.dataset.tabId);
            chrome.tabs.update(tabId, { active: true });
        }
    });
}

async function analyzeTabs() {
    const analyzeBtn = document.getElementById('analyze-btn');
    const context = document.getElementById('ai-task').value;
    
    if (!context) return;

    try {
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analyzing...';

        const response = await chrome.runtime.sendMessage({
            action: 'analyzeContext',
            context: context
        });

        if (response.error) {
            console.error('Analysis error:', response.error);
            return;
        }

        // Switch to AI results tab and display results
        document.querySelector('[data-tab="ai-results"]').click();
        displayAnalysisResults(response.analysis);

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
        this.currentLayout = 'force';
        this.setupCanvas();
    }

    setupCanvas() {
        // Make canvas responsive
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
        // Convert tabs to nodes and edges
        this.nodes = tabs.map(tab => ({
            id: tab.id,
            title: tab.title,
            domain: new URL(tab.url).hostname,
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height
        }));

        // Create edges between tabs from same domain
        this.edges = [];
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                if (this.nodes[i].domain === this.nodes[j].domain) {
                    this.edges.push({
                        source: this.nodes[i],
                        target: this.nodes[j]
                    });
                }
            }
        }
    }

    setLayout(type) {
        this.currentLayout = type;
        switch (type) {
            case 'force':
                this.applyForceLayout();
                break;
            case 'hierarchical':
                this.applyTreeLayout();
                break;
            case 'circular':
                this.applyCircularLayout();
                break;
        }
    }

    applyForceLayout() {
        const simulation = {
            alpha: 1,
            nodes: this.nodes,
            edges: this.edges,
            tick: () => {
                // Simple force-directed layout
                this.edges.forEach(edge => {
                    const dx = edge.target.x - edge.source.x;
                    const dy = edge.target.y - edge.source.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0) {
                        const force = (dist - 100) * 0.05;
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;
                        edge.source.x += fx;
                        edge.source.y += fy;
                        edge.target.x -= fx;
                        edge.target.y -= fy;
                    }
                });
                this.draw();
            }
        };

        const animate = () => {
            if (simulation.alpha > 0.01) {
                simulation.tick();
                simulation.alpha *= 0.99;
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    applyTreeLayout() {
        // Simple hierarchical layout
        const levels = {};
        this.nodes.forEach(node => {
            if (!levels[node.domain]) {
                levels[node.domain] = [];
            }
            levels[node.domain].push(node);
        });

        let y = 50;
        Object.values(levels).forEach(levelNodes => {
            const xStep = this.canvas.width / (levelNodes.length + 1);
            levelNodes.forEach((node, i) => {
                node.x = xStep * (i + 1);
                node.y = y;
            });
            y += 100;
        });
        this.draw();
    }

    applyCircularLayout() {
        const radius = Math.min(this.canvas.width, this.canvas.height) * 0.4;
        const center = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2
        };

        this.nodes.forEach((node, i) => {
            const angle = (i / this.nodes.length) * Math.PI * 2;
            node.x = center.x + Math.cos(angle) * radius;
            node.y = center.y + Math.sin(angle) * radius;
        });
        this.draw();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw edges
        this.ctx.strokeStyle = '#ddd';
        this.edges.forEach(edge => {
            this.ctx.beginPath();
            this.ctx.moveTo(edge.source.x, edge.source.y);
            this.ctx.lineTo(edge.target.x, edge.target.y);
            this.ctx.stroke();
        });

        // Draw nodes
        this.nodes.forEach(node => {
            this.ctx.fillStyle = '#6200ea';
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
}

// Add to your existing popup.js
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

// Update your analyzeTabs function to handle the results
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
        
        if (response && response.analysis) {
            // Switch to AI results tab
            document.querySelector('[data-tab="ai-results"]').click();
            
            // Display results
            displayAnalysisResults(response.analysis);
        }
    } catch (error) {
        console.error('Analysis failed:', error);
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze Tabs';
    }
}

function displayAnalysisResults(analysis) {
    // Display clusters
    document.getElementById('ai-clusters').innerHTML = formatResults(analysis.clusters);
    
    // Display themes
    document.getElementById('ai-themes').innerHTML = formatResults(analysis.themes);
    
    // Display relevance
    document.getElementById('ai-relevance').innerHTML = formatResults(analysis.relevance);
    
    // Display suggestions
    document.getElementById('ai-suggestions').innerHTML = formatResults(analysis.suggestions);
}

function formatResults(data) {
    if (Array.isArray(data)) {
        return data.map(item => `<div class="result-item">${item}</div>`).join('');
    }
    return `<div class="result-item">${data}</div>`;
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