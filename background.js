chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
});

chrome.runtime.onStartup.addListener(() => applyProxy());

async function applyProxy() {
    const data = await chrome.storage.local.get(['socks5switch', 'socks5server', 'bypassswitch', 'bypassdomain', 'wifipause']);
    const socks5switch = (data.socks5switch || 'on') === 'on';
    const socks5server = data.socks5server || '';
    const bypassswitch = (data.bypassswitch || 'on') === 'on';
    const bypassdomain = data.bypassdomain || 'cn\napple.com';
    const wifipause = data.wifipause || '';

    if (!socks5switch) {
        return new Promise(resolve => chrome.proxy.settings.set({ value: { mode: "system" } }, resolve));
    }

    return new Promise(resolve => chrome.proxy.settings.set({
        value: { mode: "pac_script", pacScript: { data: buildPacScript(socks5server, bypassswitch, bypassdomain, wifipause) } },
    }, resolve));
}

function buildPacScript(socks5server, bypassswitch, bypassdomain, wifipause) {
    const host = socks5server.substring(0, socks5server.lastIndexOf(':')).replace('[', '').replace(']', '');
    const port = parseInt(socks5server.substring(socks5server.lastIndexOf(':') + 1));
    const pausePatterns = wifipause.trim() ? wifipause.trim().split('\n').map(p => p.trim()).filter(p => p) : [];
    const bypassDomains = (bypassswitch && bypassdomain.trim()) ? bypassdomain.trim().split('\n').map(d => d.trim()).filter(d => d) : [];

    return `
function FindProxyForURL(url, host) {
    var myIP = myIpAddress();
    var i;

    var wifiPause = ${JSON.stringify(pausePatterns)};
    for (i = 0; i < wifiPause.length; i++) {
        if (myIP.indexOf(wifiPause[i]) === 0) return "DIRECT";
    }

    if (isPlainHostName(host) || host === "localhost" || dnsDomainIs(host, ".local")) {
        return "DIRECT";
    }

    if (isInNet(host, "10.0.0.0", "255.0.0.0") ||
        isInNet(host, "127.0.0.0", "255.0.0.0") ||
        isInNet(host, "169.254.0.0", "255.255.0.0") ||
        isInNet(host, "172.16.0.0", "255.240.0.0") ||
        isInNet(host, "192.168.0.0", "255.255.0.0") ||
        isInNet(host, "224.0.0.0", "240.0.0.0")) return "DIRECT";

    var bypass = ${JSON.stringify(bypassDomains)};
    for (i = 0; i < bypass.length; i++) {
        if (host === bypass[i] || dnsDomainIs(host, "." + bypass[i])) return "DIRECT";
    }

    return "SOCKS5 ${host}:${port}";
}`.trim();
}
