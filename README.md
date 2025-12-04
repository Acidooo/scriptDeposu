# Script Deposu

Bu depo, çeşitli web tabanlı araçları ve scriptleri içeren bir koleksiyondur. Her araç, belirli veri işleme veya dosya yönetimi görevlerini otomatize etmek için tasarlanmıştır.

## Araçlar

### 1. ZIP ve XLSX Dosya İşleme Aracı (`extract_zip_web`)
Kaynak klasördeki ZIP dosyalarını otomatik olarak çıkarır ve hem çıkarılan dosyaları hem de kaynak klasördeki XLSX dosyalarını belirlenen kategorilere (Montaj Raporu, Okuma Raporu, Bifi, Bifi_Reading) göre organize eder.
- **Özellikler:**
  - Toplu ZIP çıkarma
  - Dosya ismine göre otomatik kategorizasyon
  - XLSX dosyalarını taşıma ve organize etme
  - Dosya Sistemi Erişim API'si (File System Access API) kullanır

### 2. BIFI Excel İşleme Aracı (`bifi_web`)
BIFI Excel dosyalarını işleyen, belirli tarihlere ve okuma türlerine göre filtreleyen web tabanlı bir araçtır.
- **Özellikler:**
  - Çoklu Excel dosyası yükleme ve işleme
  - Tarih ve okuma türüne (Current, EndOfMonth, All) göre filtreleme
  - Sonuçları tek bir dosyada birleştirme veya ayrı ayrı indirme
  - Web Workers ile arka planda hızlı işlem

### 3. Excel Okuma Raporları Birleştirici (`okuma_web`)
Birden fazla Excel dosyasındaki okuma verilerini (PÖ veya HCA sayfaları) tek bir dosyada birleştirir.
- **Özellikler:**
  - Çoklu Excel dosyası desteği
  - PÖ ve HCA sayfalarından veri çıkarma
  - Birleştirilmiş rapor oluşturma

### 4. CSV Sıralama Aracı (`parkoran_sono_csv_sort`)
CSV dosyalarını "Zip code" sütununa göre sıralayan ve düzenleyen bir araçtır.
- **Özellikler:**
  - CSV dosyalarını işleme
  - Zip code'a göre sıralama
  - Boş Zip code değerlerini temizleme
  - Toplu işlem ve ZIP olarak indirme

### 5. WhiteOut Survival Gift Code Tool (`whiteoutSurvival`)
WhiteOut Survival oyunu için birden fazla hesapta hediye kodlarını (gift codes) aktif etmek için kullanılan bir araçtır.
- **Özellikler:**
  - Çoklu hesap ID desteği
  - Oyun API'si ile oyuncu bilgilerini doğrulama
  - Toplu hediye kodu aktivasyonu

## Kurulum ve Kullanım

Bu proje statik web sayfalarından oluşmaktadır. Kullanmak için:

1. Bu depoyu klonlayın veya indirin.
2. Ana dizindeki `index.html` dosyasını modern bir web tarayıcısında (Chrome, Edge, vb.) açın.
3. Açılan ana menüden kullanmak istediğiniz aracı seçin.

Not: Bazı araçlar (özellikle `extract_zip_web`), tarayıcının Dosya Sistemi Erişim API'sini (File System Access API) kullandığı için yerel sunucu üzerinden veya güvenli bağlamda (HTTPS/localhost) çalıştırılması gerekebilir.

## Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır.