# Electron + Vite Başlangıç Template'i

Bu proje, Electron ve Vite tabanlı masaüstü uygulamaları geliştirmek için hazırlanmış bir başlangıç şablonudur. Yeni masaüstü projelerinizde hızlıca başlamak için bu template'i kullanabilirsiniz.

## Kurulum

1. **Projeyi klonlayın:**
   ```sh
   git clone https://arcelikdevops@dev.azure.com/arcelikdevops/DUS.PCI/_git/ElectronJs-Project-Template <proje-adı>
   cd <proje-adı>
   ```
2. **Bağımlılıkları yükleyin:**
   ```sh
   npm install
   ```

## Uygulama İsmini Değiştirme

Uygulamanızın ismini değiştirmek için aşağıdaki adımları izleyin:

1. `package.json` dosyasındaki `name`, `productName` ve `description` alanlarını güncelleyin.
2. `electron-builder.yml` dosyasındaki `productName` alanını değiştirin.
3. Gerekirse, `src/renderer/index.html` ve uygulama içi başlıkları güncelleyin.

## Geliştirme Modunda Çalıştırma

```sh
npm run dev
```

Bu komut ile hem Electron hem de Vite geliştirme sunucusu başlatılır. Kodda yaptığınız değişiklikler otomatik olarak yansır.

## Üretim İçin Derleme

```sh
npm run build
```

Bu komut, uygulamanızı dağıtıma hazır hale getirir. Çıktı dosyalarını `dist/` klasöründe bulabilirsiniz.

## Ek Bilgiler

- **Platformlar:** Windows, macOS ve Linux desteği vardır.
- **Teknolojiler:** Electron, Vite, React, TypeScript
- **Klasör Yapısı:**
  - `src/main/` : Electron ana işlem dosyaları
  - `src/preload/` : Preload scriptleri
  - `src/renderer/` : React tabanlı arayüz kodları

Daha fazla bilgi veya katkı için lütfen proje yöneticinizle iletişime geçin.
