import os
import json
import requests
import datetime
import re

# 1. AYARLAR
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
AI_MODEL = "meta-llama/llama-3-8b-instruct:free"

# Ajanın araştıracağı açık kaynaklı konular (Genişletilebilir)
KONULAR = ["Türkiye Ekonomisi", "Gayrimenkul Değerleme", "Dış Ticaret", "Gümrük Mevzuatı", "E-Ticaret"]

def acik_kaynak_veri_cek(konu):
    """Açık kaynaklardan (Vikipedi API) bilgi çeker."""
    url = f"https://tr.wikipedia.org/api/rest_v1/page/summary/{konu.replace(' ', '_')}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            return data.get("extract", "")
        return ""
    except Exception as e:
        print(f"Veri çekme hatası ({konu}):", e)
        return ""

def yapay_zekaya_islet(ham_metin, konu):
    """Çekilen ham bilgiyi OpenRouter ile JSON formatına çevirir."""
    if not ham_metin:
        return None

    prompt = f"""
    Aşağıdaki ham metni incele ve 'HAS İNSAN DER' vizyonuna uygun, dürüst, açıklayıcı ve profesyonel bir üslupla soru-cevap formatında bir JSON veri setine dönüştür.
    Sadece geçerli bir JSON dizisi (array) döndür. Başka hiçbir açıklama yazma.
    
    Örnek Format:
    [
      {{"etiket": "anahtar kelime 1", "bilgi": "Cevap metni"}},
      {{"etiket": "anahtar kelime 2", "bilgi": "Cevap metni"}}
    ]

    Ham Metin (Konu: {konu}):
    {ham_metin}
    """

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": AI_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3
    }

    try:
        response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
        response.raise_for_status()
        result_text = response.json()['choices'][0]['message']['content']
        
        # Sadece JSON kısmını ayıklama (Eğer model Markdown kod bloğu içinde gönderirse)
        json_match = re.search(r'\[.*\]', result_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            return json.loads(json_str)
        return json.loads(result_text)
    except Exception as e:
        print(f"Yapay zeka işleme hatası ({konu}):", e)
        return None

def main():
    if not OPENROUTER_API_KEY:
        print("HATA: OPENROUTER_API_KEY bulunamadı.")
        return

    yeni_veriler = []
    
    # Konuları tara ve işle
    for konu in KONULAR:
        print(f"Araştırılıyor: {konu}")
        ham_veri = acik_kaynak_veri_cek(konu)
        islenmis_json = yapay_zekaya_islet(ham_veri, konu)
        
        if islenmis_json:
            yeni_veriler.extend(islenmis_json)
            print(f"Başarılı: {konu} eklendi.")

    # Eğer yeni veri bulunduysa kaydet
    if yeni_veriler:
        tarih = datetime.datetime.now().strftime("%Y-%m-%d")
        dosya_yolu = f"hasinder-ai-data/otonom-veri-{tarih}.json"
        
        # Klasör yoksa oluştur
        os.makedirs("hasinder-ai-data", exist_ok=True)
        
        with open(dosya_yolu, "w", encoding="utf-8") as f:
            json.dump(yeni_veriler, f, ensure_ascii=False, indent=4)
        print(f"Veriler kaydedildi: {dosya_yolu}")
    else:
        print("Yeni veri oluşturulamadı.")

if __name__ == "__main__":
    main()
