document.querySelector('#ing').style.display='none';

if(navigator.language.toLowerCase().startsWith("zh-")){
    document.querySelector('#brook').style.display = 'none';
    document.querySelector('#shiliew').style.display = 'none';
}else{
    document.querySelector('#brookzh').style.display = 'none';
    document.querySelector('#shiliewzh').style.display = 'none';
}

chrome.storage.local.get('socks5switch', s => {
    s = s.socks5switch || 'on';
    if(s == "on"){
        document.querySelector('#socks5switch').checked = true;
    }
    if(s == "off"){
        document.querySelector('#socks5switch').checked = false;
    }
});
chrome.storage.local.get('socks5server', s => {
    s = s.socks5server || '';
    document.querySelector('#socks5server').value = s;
});
chrome.storage.local.get('bypassswitch', s =>{
    s = s.bypassswitch || 'on';
    if(s == "on"){
        document.querySelector('#bypassswitch').checked = true;
    }
    if(s == "off"){
        document.querySelector('#bypassswitch').checked = false;
    }
});
chrome.storage.local.get('bypassdomain', s =>{
    s = s.bypassdomain || "cn\napple.com";
    document.querySelector('#bypassdomain').value = s;
});
chrome.storage.local.get('wifipause', s =>{
    document.querySelector('#wifipause').value = s.wifipause || '10.19.';
});

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

async function applyProxy(socks5switch, socks5server, bypassswitch, bypassdomain, wifipause) {
    if (!socks5switch) {
        return new Promise(resolve => chrome.proxy.settings.set({ value: { mode: "system" } }, resolve));
    }
    return new Promise(resolve => chrome.proxy.settings.set({
        value: { mode: "pac_script", pacScript: { data: buildPacScript(socks5server, bypassswitch, bypassdomain, wifipause) } },
    }, resolve));
}

document.querySelector('#save').addEventListener("click", async (e) => {
    document.querySelector('#save').style.display = 'none';
    document.querySelector('#ing').style.display = 'block';

    var socks5switch = document.querySelector('#socks5switch').checked;
    var socks5server = document.querySelector('#socks5server').value;
    var bypassswitch = document.querySelector('#bypassswitch').checked;
    var bypassdomain = document.querySelector('#bypassdomain').value;
    var wifipause = document.querySelector('#wifipause').value;

    if(socks5switch){
        if(!/.+:\d+/.test(socks5server)){
            alert("Invalid socks5 proxy address");
            document.querySelector('#save').style.display = 'block';
            document.querySelector('#ing').style.display = 'none';
            return;
        }
    }

    await Promise.all([
        chrome.storage.local.set({"socks5switch": socks5switch ? 'on' : 'off'}),
        chrome.storage.local.set({"socks5server": socks5server}),
        chrome.storage.local.set({"bypassswitch": bypassswitch ? 'on' : 'off'}),
        chrome.storage.local.set({"bypassdomain": bypassdomain}),
        chrome.storage.local.set({"wifipause": wifipause}),
    ]);

    await applyProxy(socks5switch, socks5server, bypassswitch, bypassdomain, wifipause);

    document.querySelector('#save').style.display = 'block';
    document.querySelector('#ing').style.display = 'none';
});
