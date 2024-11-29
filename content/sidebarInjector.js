class SidebarInjector {
    constructor() {
        this.initializeSidebar();
    }

    initializeSidebar() {
        chrome.runtime.sendMessage({ action: 'openSidePanel' });
    }
}