# DUEL ARENA V12 — site + camere între telefoane aflate pe rețele diferite

## Ce este inclus

- `public/index.html` — jocul complet, cu designul, cronometrele, PASS, arbitrul și 116 categorii.
- `src/worker.js` — serverul WebSocket care conectează arbitrul și cei doi concurenți prin internet.
- `wrangler.jsonc` — configurarea Cloudflare Workers și Durable Objects.
- `START-PUBLICARE.bat` — ajutor de publicare pentru Windows.
- `extra-categories.json` — lista suplimentară de categorii, pentru verificare / viitoare editări.

**Important:** pentru conectarea telefoanelor de pe rețele diferite, trebuie să publici **întreg proiectul pe Cloudflare Workers**. Un simplu upload cu Netlify Drop NU instalează serverul necesar. Nu este suficient să înlocuiești doar `index.html`.

## Publicare pe Windows — metoda recomandată

1. Creează un cont Cloudflare gratuit: https://dash.cloudflare.com/sign-up .
2. Instalează Node.js (varianta LTS): https://nodejs.org/ .
3. Dezarhivează ZIP-ul, păstrând toate folderele.
4. Dă dublu clic pe `START-PUBLICARE.bat` (în folderul de la baza proiectului).
5. Urmează autentificarea Cloudflare deschisă în browser; acordă permisiunile necesare pentru contul tău.
6. La final apare o adresă de forma `https://duel-arena-v12.NUMECONT.workers.dev`. Aceea este adresa jocului tău. **Nu inventa linkul:** copiază-l exact din terminal.
7. Trimite adresa prietenilor. Arbitrul alege „Eu sunt arbitrul”, iar cei doi aleg „Intră ca jucător” și folosesc codul camerei. Fiecare poate fi pe propria rețea Wi‑Fi sau pe date mobile.

### Alternativ, din terminal

Deschide Terminal/PowerShell în folderul `duel-arena-v12` și execută:

```powershell
npx wrangler login
npx wrangler deploy
```

Comenzile necesită Node.js și acces la internet. Nu este necesar GitHub sau Netlify.

## Cum testezi corect conexiunea

1. Publică întâi întregul proiect Cloudflare (nu doar HTML-ul).
2. Deschide adresa `workers.dev` pe telefonul arbitrului, conectat la Wi‑Fi.
3. Pe celelalte două telefoane, oprește Wi‑Fi și folosește datele mobile; deschide **aceeași adresă**.
4. Conectează-te prin cod și verifică apariția ambilor jucători pe ecranul arbitrului.
5. Pornește un duel; verifică aceeași fotografie, CORECT, PASS și cronometrele separate.

## Ce se păstrează din V11

Aspectul, toate cele 31 de categorii originale, fotogafiile/blururile salvate în browser, aleatorizarea, arbitrajul, pauza și PASS.

## Categorii și imagini

Sunt **116 categorii în listă** (31 vechi + 85 noi). Răspunsurile au fost introduse explicit, fără generator de categorii în timpul duelului. **Numărul de imagini realmente disponibile diferă**: jocul folosește imaginile asociate articolelor din Wikipedia sau fotografii fixe pentru magazine; o întrebare fără imagine este sărită. Nu toate imaginile din cele 85 de categorii noi au fost inspectate manual și nu sunt garantate 45 de fotografii în fiecare categorie.

Categoriile din emisiunile *The Floor* (insecte, jucării, preparate din lume, film, muzică, geografie etc.) au servit ca inspirație, dar pachetul este un joc independent, fără afiliere cu emisiunea.

## Conectivitate și depanare

- `Camera nu există`: verifică dacă arbitrul are pagina deschisă și codul este corect.
- `Camera plină`: doar doi concurenți pot intra. Arbitrul este al treilea telefon.
- Ecranul rămâne blocat la conectare: confirmă că ai deschis URL-ul Cloudflare, nu vechiul URL Netlify.
- Rețelele mobile trebuie să aibă internet și să permită WebSocket securizat (WSS); unele rețele restrictive pot bloca totuși traficul.
- Când arbitrul închide sau pune aplicația în fundal, duelul poate fi întrerupt sau pus în pauză. Ține ecranul arbitrului aprins.
- Poți testa modul „Pe un telefon” doar cu `public/index.html`, însă modul cu trei telefoane necesită serverul online.

## Costuri

Cloudflare Workers și Durable Objects au un plan gratuit cu cote; la trafic mare pot apărea limite. Consultă https://developers.cloudflare.com/durable-objects/platform/pricing/ .

### Setări salvate anterior pe Netlify

Dacă ai ajustat manual fotografii/blururi în V11, acestea au fost salvate în `localStorage` pentru domeniul vechi Netlify. Deoarece V12 se publică la un URL Cloudflare **diferit**, acele date **nu se transferă automat**. Categoriile și regulile jocului rămân, dar corecturile foto locale de pe vechiul domeniu pot necesita reconfigurare pe noul domeniu.
