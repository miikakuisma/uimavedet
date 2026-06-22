# Helsingin seudun uimavedet

Helsingin, Espoon ja Vantaan uimarantojen ja uimapaikkojen **veden lämpötila** ja
**sinilevätilanne** – mobiilisivuna selaimessa sekä [TRMNL](https://trmnl.com/)
e-ink -näytöllä.

Data tulee Helsingin kaupungin **Palvelukartta-API**:sta (sama lähde jota
[ulkoliikunta.fi](https://ulkoliikunta.fi/) käyttää). Puter Worker hakee ja
muuntaa datan, ja sekä mobiilisivu että TRMNL-plugin näyttävät sen.

## Miten se toimii

```
Mobiilisivu (index.html) ──┐
                           ├──►  Puter Worker  ──►  Palvelukartta-API
TRMNL plugin.html ─────────┘     GET /api/beaches    (api.hel.fi, palvelut 730 + 731)
                                 haku + muunnos JSON:ksi
```

1. **Puter Worker** (`worker.js`) hakee uimarantojen havainnot Palvelukartasta,
   poimii lämpötilan ja sinilevätilanteen, suodattaa vanhentuneet lukemat ja
   palauttaa siistin JSON:n endpointista `GET /api/beaches`.
2. **Mobiilisivu** (`index.html`) listaa kaikki rannat: suodatus kaupungin mukaan,
   suosikit ja järjestys jossa levättömät & lämpimimmät ovat ylinnä.
3. **TRMNL-plugin** (`TRMNL plugin.html`) näyttää muutaman itse valitun rannan
   e-ink-näytöllä.

## Tiedostot

| Tiedosto | Kuvaus |
|---|---|
| `worker.js` | Puter Worker -backend, API-proxy ja muunnin Palvelukartan ja näyttöjen välillä |
| `index.html` | Mobiilisivun HTML-runko (Vite-projektin sisääntulo) |
| `src/` | Mobiilisivun lähdekoodi: moduuleihin jaettu vanilla JS + `style.css` |
| `TRMNL plugin.html` | Liquid-template, joka renderöi valitut rannat TRMNL-näytölle |
| `docs/superpowers/specs/` | Suunnitteludokumentit |

## Datalähde

```
GET https://api.hel.fi/servicemap/v2/unit/
      ?service=730,731              # 730 = uimapaikat, 731 = uimarannat
      &municipality=helsinki,espoo,vantaa
      &include=observations         # reaaliaikaiset havainnot
      &only=name,municipality,observations
```

Worker lukee jokaiselta rannalta kolme havaintoa:

| Havainto | Merkitys |
|---|---|
| `measured_swimming_water_temperature` | Tarkka anturilämpötila °C (ensisijainen) |
| `swimming_water_temperature` | Lämpötilaluokka esim. "15-17°C" (varalla, mm. Espoo/Vantaa) |
| `swimming_water_cyanobacteria` | Sinilevätaso 0–3 |

Yli 14 vrk vanhat havainnot ohitetaan, jolloin uimakauden ulkopuolella lista jää
tyhjäksi.

### Sinileväasteikko

| Arvo | `algae` | Selite |
|---|---|---|
| 0 | `none` | Ei havaittua sinilevää |
| 1 | `little` | Vähän sinilevää |
| 2 | `lots` | Runsaasti sinilevää |
| 3 | `much` | Erittäin runsaasti sinilevää |
| – | `unknown` | Ei havaintoa |

## API-vastaus

`GET /api/beaches` palauttaa rannat järjestyksessä levättömät ensin, kunkin
ryhmän sisällä lämpimin ensin:

```json
{
  "updated": "2026-06-22T08:31:12.412Z",
  "updatedText": "22.6. klo 11:31",
  "beaches": [
    {
      "name": "Rastilan uimaranta",
      "municipality": "Helsinki",
      "temp": "20.9°C",
      "tempC": 20.9,
      "tempExact": true,
      "tempTime": "2026-06-22T08:58:10+03:00",
      "algae": "none",
      "algaeRank": 0,
      "algaeLabel": "Ei havaittua sinilevää",
      "algaeTime": "2026-06-21T09:55:44+03:00"
    }
  ]
}
```

- `temp` – näyttövalmis merkkijono (`"20.9°C"` tai luokka `"19-21°C"`), tai `null`.
- `tempC` – numeerinen lajitteluarvo (mitattu lukema tai luokan keskikohta).
- `tempExact` – `true` = tarkka anturilukema, `false` = luokka-arvio.
- `algaeRank` – `0` levätön … `4` runsain; käytetään järjestämiseen.

## Asennus

### 1. Worker Puter.com-alustalle

1. Luo tili [Puter.com](https://puter.com/)-palveluun ja uusi Worker.
2. Kopioi `worker.js` sisältö Workeriin ja julkaise.
3. Worker tarjoaa endpointin `GET /api/beaches`. (Esimerkki tässä projektissa:
   `https://meri.puter.work/api/beaches`.)

### 2. Mobiilisivu (Vite)

Mobiilisivu on Vite-projekti. Aseta tarvittaessa `WORKER_URL` osoittamaan omaan
Workeriisi tiedostossa `src/config.js`.

1. Asenna riippuvuudet: `npm install`.
2. Kehitys: `npm run dev` (Vite-dev-palvelin + HMR).
3. Tuotantokäännös: `npm run build` → staattiset tiedostot hakemistoon `dist/`
   (esikatselu paikallisesti: `npm run preview`).
4. Julkaise `dist/`-hakemiston sisältö Puterin staattisena sivustona (tai mihin
   tahansa staattiseen hostiin). Suosikit tallentuvat selaimen
   `localStorage`-muistiin.

### 3. TRMNL Plugin

1. Luo [TRMNL Developer](https://usetrmnl.com/plugin/new) -sivulla uusi Private
   Plugin, strategiaksi **Webhook/Polling**, ja syötä Workerin URL
   (`https://<oma-worker>.puter.work/api/beaches`).
2. Kopioi `TRMNL plugin.html` sisältö pluginin **Markup**-kenttään.
3. Valitse näytettävät rannat muokkaamalla templaten alussa olevaa `targets`-listaa
   (rantojen nimet täsmälleen kuten datassa, haluamassasi järjestyksessä):
   ```liquid
   {% assign targets = "Seurasaaren uimala,Munkkiniemen uimaranta,Lauttasaaren uimaranta" | split: "," %}
   ```

## Huomioita

- Datassa ovat mukana vain kaupunkien valvomat uimarannat ja uimapaikat. Esim.
  talviuintipaikat tai osa pienemmistä paikoista eivät kuulu seurantaan.
- Joidenkin paikkojen automaattinen lämpötila-anturi voi olla epätarkka (kaupunki
  varoittaa tästä paikan `notice`-kentässä); worker näyttää silti tarkan
  anturilukeman kun se on saatavilla.
- **Tarkista aina tilanne paikan päältä ennen uintia.**

## Teknologiat

- [Puter.com](https://puter.com/) – pilvialusta serverless workereille ja staattiselle hostaukselle
- [TRMNL](https://trmnl.com/) – e-ink -näyttöalusta
- [Palvelukartta / Service Map API](https://api.hel.fi/servicemap/v2/) – Helsingin seudun avoin palvelu- ja havaintodata
