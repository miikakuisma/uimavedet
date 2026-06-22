# Helsingin uimarantojen tilanne

Helsingin uimarantojen tilanne suoraan [TRMNL](https://trmnl.com/) e-ink -näytölle.

## Miten se toimii

```
TRMNL-näyttö  →  Puter Worker (/api/menu)  →  Aromi API (aromi.hel.fi)
                        ↓
                  JSON-vastaus: { date, meals }
                        ↓
                  TRMNL plugin.html renderöi
                  ruokalistan e-ink -näytölle
```

1. **Puter Worker** (`worker.js`) hakee päivän ruokalistan Aromi API:sta ja muuntaa sen yksinkertaiseen JSON-muotoon
2. **TRMNL plugin** (`TRMNL plugin.html`) renderöi datan Jinja2-templatella e-ink -näytölle sopivaan muotoon

## Tiedostot

| Tiedosto | Kuvaus |
|---|---|
| `worker.js` | Puter Worker -backend, joka toimii API-proxynä Aromin ja TRMNL:n välillä |
| `TRMNL plugin.html` | Jinja2-template, joka renderöi ruokalistan TRMNL-näytölle |

## Asennus

### 1. Worker Puter.com-alustalle

1. Luo tili [Puter.com](https://puter.com/)-palveluun
2. Luo uusi Worker ja kopioi `worker.js` sisältö sinne
3. Worker tarjoaa endpointin `GET /api/menu`, joka palauttaa päivän ruokalistan JSON-muodossa

### 2. TRMNL Plugin

1. Luo [TRMNL Developer](https://usetrmnl.com/plugin/new)-sivulla uusi Private Plugin
2. Strategiaksi valitse **Webhook/Polling** ja syötä Puter Workerin URL (`https://<sinun-worker>.puter.site/api/menu`)
3. Kopioi `TRMNL plugin.html` sisältö pluginin **Markup**-kenttään

## API-vastaus

`GET /api/menu` palauttaa:

```json
{
  "date": "2026-02-26T00:00:00",
  "meals": [
    {
      "name": "Aamupala",
      "foods": "Puuroa, leipää, hedelmää"
    },
    {
      "name": "Lounas",
      "foods": "Lihapullia, perunasosetta, salaattia"
    },
    {
      "name": "Välipala",
      "foods": "Jogurttia ja marjoja"
    }
  ]
}
```

## Teknologiat

- [TRMNL](https://trmnl.com/) - e-ink -näyttöalusta
- [Puter.com](https://puter.com/) - pilvialusta serverless workereille
- [Aromi](https://aromi.hel.fi/) - Helsingin kaupungin ruokalistajärjestelmä
