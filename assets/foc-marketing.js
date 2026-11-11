/* Numery narzędzi marketingowych dla poradników. MUSZĄ być równe window.FOC_MARKETING w index.html strony głównej
   (razem z adsKonwersje): z numerów powstaje zestaw „k” w ciasteczku zgody foc_consent; inne numery = okienko pyta od nowa
   przy każdym przejściu strona główna ↔ poradnik. Plik budowany skryptem _zgody/zbuduj_zgody.py; rozjazd wykrywa _zgody/test_zgody.js.
   Po kroku 3 z 2026-10-31-poradniki/wdrozenie.md (strona główna czyta ten plik) to będzie jedyne miejsce na numery. */
window.FOC_MARKETING = {
    metaPixelId: '2669627443493048',   /* Meta (Instagram/Facebook), np. '123456789012345' */
    googleAdsId: 'AW-18548540062',   /* Google Ads, np. 'AW-123456789'                    */
    ga4Id: 'G-KMY9H2GVKM',         /* Google Analytics 4, np. 'G-XXXXXXXXXX'            */
    /* D31: etykiety konwersji Google Ads = część po „/” w send_to 'AW-…/etykieta' (panel Ads → Cele → Konwersje → konwersja
       → „Skonfiguruj tag” → „Zainstaluj tag samodzielnie”). Puste = strona nie wysyła konwersji Ads (GA4 i Meta działają dalej). */
    adsKonwersje: { poczatek: '', indywidualny: '', dolacz: '' }
  };
