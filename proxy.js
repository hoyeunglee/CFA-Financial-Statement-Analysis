import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = 3000;

// Serve static files from 'public' folder (adjust if needed)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../public')));

// Proxy route for tickers list
app.get('/api/tickers', async (req, res) => {
  try {
    const response = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': 'EDGARViewer tesleft@hotmail.com' }
    });
    if (!response.ok) return res.status(response.status).send('Error fetching tickers');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Proxy route for submissions JSON
app.get('/api/submissions/:cik', async (req, res) => {
  const { cik } = req.params;
  try {
    const response = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
      headers: { 'User-Agent': 'EDGARViewer tesleft@hotmail.com' }
    });
    if (!response.ok) return res.status(response.status).send('Error fetching submissions');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Proxy route for XBRL concept data
app.get('/api/concept/:cik/:tag', async (req, res) => {
  const { cik, tag } = req.params;
  try {
    const response = await fetch(`https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/${tag}.json`, {
      headers: { 'User-Agent': 'EDGARViewer tesleft@hotmail.com' }
    });
    if (!response.ok) return res.status(response.status).send('Error fetching concept data');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Auto-discover and download latest XBRL for a ticker
app.get('/api/download-latest/:ticker', async (req, res) => {
  const { ticker } = req.params;
  try {
    // 1. Get ticker list
    const tickersResp = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': 'EDGARViewer youremail@example.com' }
    });
    const tickers = await tickersResp.json();
    const entry = Object.values(tickers).find(e => e.ticker === ticker.toUpperCase());
    if (!entry) return res.status(404).send('Ticker not found');
    const cik = entry.cik_str.toString();

    // 2. Get submissions
    const subsResp = await fetch(`https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`, {
      headers: { 'User-Agent': 'EDGARViewer youremail@example.com' }
    });
    const subs = await subsResp.json();
    const accession = subs.filings.recent.accessionNumber[0].replace(/-/g, '');

    // 3. Get filing index
    const indexResp = await fetch(`https://data.sec.gov/Archives/edgar/data/${cik}/${accession}/index.json`, {
      headers: { 'User-Agent': 'EDGARViewer youremail@example.com' }
    });
    const index = await indexResp.json();

    // 4. Find first XBRL/inline XBRL file
    const xbrlFile = index.directory.item.find(f =>
      f.name.endsWith('.xml') || f.name.endsWith('.htm')
    );
    if (!xbrlFile) return res.status(404).send('No XBRL file found');

    // 5. Stream file back
    const url = `https://www.sec.gov/Archives/edgar/data/${cik}/${accession}/${xbrlFile.name}`;
    const fileResp = await fetch(url, {
      headers: { 'User-Agent': 'EDGARViewer youremail@example.com' }
    });
    if (!fileResp.ok) return res.status(fileResp.status).send('Error fetching XBRL');

    res.setHeader('Content-Disposition', `attachment; filename="${xbrlFile.name}"`);
    res.setHeader('Content-Type', 'application/xml');
    fileResp.body.pipe(res);
  } catch (err) {
    res.status(500).send(err.message);
  }
});


app.listen(port, () => {
  console.log(`EDGAR proxy running on http://localhost:${port}`);
});
