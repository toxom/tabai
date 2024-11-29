// dev/mockData.js
const mockTabs = [
    {
        id: 1,
        title: "GitHub - Your Repository",
        url: "https://github.com/yourusername/repo",
        favIconUrl: "https://github.com/favicon.ico"
    },
    {
        id: 2,
        title: "Stack Overflow - Questions",
        url: "https://stackoverflow.com/questions",
        favIconUrl: "https://stackoverflow.com/favicon.ico"
    },
    // Add more mock tabs
];

const mockNetworkData = {
    nodes: [
        { id: 1, group: "github" },
        { id: 2, group: "stackoverflow" }
    ],
    edges: [
        { source: 1, target: 2 }
    ]
};