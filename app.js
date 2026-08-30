const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/hakkurgithub/turquoise-ai/main/hasinder-ai-data/";
let knowledgeBase = [];

async function loadDatasets() {
    try {
        let listResponse = await fetch(GITHUB_RAW_BASE + "file-list.json");
        if (!listResponse.ok) return;
        let filesToLoad = await listResponse.json();

        for (let fileRelativePath of filesToLoad) {
            let cleanPath = fileRelativePath.replace("hasinder-ai-data/", "");
            try {
                let response = await fetch(GITHUB_RAW_BASE + cleanPath);
                if (response.ok) {
                    let data = await response.json();
                    if (Array.isArray(data)) knowledgeBase = knowledgeBase.concat(data);
                    else if (typeof data === 'object' && data !== null) knowledgeBase.push(data);
                }
            } catch (err) {
                console.error(`Yüklenemedi: ${cleanPath}`, err);
            }
        }
        console.log("Hafıza yüklendi. Toplam:", knowledgeBase.length);
    } catch (error) {
        console.error("Veri köprüsü hatası:", error);
    }
}

function searchLocalData(userMessage) {
    if (knowledgeBase.length === 0) return "hasinder.ai hafızası yükleniyor, lütfen bekleyin.";
    
    const cleanMessage = userMessage.toLowerCase().replace(/[.,!?]/g, "");
    const queryWords = cleanMessage.split(/\s+/).filter(word => word.length > 2);
    
    if (queryWords.length === 0) return "Lütfen aramak için daha açıklayıcı kelimeler yazın.";

    let bestMatch = null;
    let highestScore = 0;

    knowledgeBase.forEach(item => {
        let itemsToCheck = Array.isArray(item) ? item : [item];
        itemsToCheck.forEach(subItem => {
            if (!subItem || typeof subItem !== 'object') return;
            let textToSearch = JSON.stringify(subItem).toLowerCase();
            let matchCount = 0;
            queryWords.forEach(word => { if (textToSearch.includes(word)) matchCount++; });
            if (matchCount > highestScore) { highestScore = matchCount; bestMatch = subItem; }
        });
    });

    if (bestMatch && highestScore > 0) {
        let soru = bestMatch.soru || bestMatch.ilgiliSoru || "";
        let cevap = bestMatch.cevap || bestMatch.dogruCevapMetni || bestMatch.aciklama || bestMatch.answer || "";
        let kategori = bestMatch.kategori || "";

        if (cevap) {
            let output = "";
            if (soru) output += `**Soru:** ${soru}\n\n`;
            output += `**Cevap:** ${cevap}`;
            if (kategori) output += `\n\n*(Kategori: ${kategori})*`;
            return output;
        }
    }
    return "Aradığınız kriterlere uygun hasinder.ai veri tabanında kayıt bulunamadı.";
}

const chatBox = document.getElementById("mesajlar");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

function appendMessage(sender, text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = sender === "user" ? "user-message" : "ai-message";
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    msgDiv.innerHTML = `<strong>${sender === "user" ? "Siz" : "hasinder.ai"}:</strong> <div style="margin-top: 5px; white-space: pre-wrap;">${formattedText}</div>`;
    if(chatBox) { { chatBox.appendChild(msgDiv); chatBox.scrollTop = chatBox.scrollHeight; } }
}

if(sendBtn) {
    sendBtn.addEventListener("click", async () => {
        const text = userInput.value.trim();
        if (!text) return;
        appendMessage("user", text);
        userInput.value = "";
        
        const loadingId = "loading-" + Date.now();
        if(chatBox) chatBox.innerHTML += `<div id="${loadingId}" class="ai-message"><em>hasinder.ai hafızasında taranıyor...</em></div>`;

        const aiResponse = searchLocalData(text);
        const loadingElement = document.getElementById(loadingId);
        if(loadingElement) loadingElement.remove();
        appendMessage("ai", aiResponse);
    });
}

if(userInput) {
    userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendBtn.click(); });
}

window.onload = async () => {
    await loadDatasets();
    const durumSpan = document.getElementById("durum");
    if (durumSpan) {
        durumSpan.textContent = "hasinder.ai (Aktif)";
        durumSpan.style.backgroundColor = "#10b981";
        durumSpan.style.color = "white";
        durumSpan.style.padding = "4px 8px";
        durumSpan.style.borderRadius = "4px";
    }
};