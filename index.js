const express = require('express');
const cors = require('cors');
const penthouse = require('penthouse');
const axios = require('axios');
const fs = require('fs');
const path = require('path');  // Used for temporary file paths
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/generate', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Missing "url" in request body' });
  }

  try {
    // Step 1: Fetch the full HTML from the page URL
    const { data: html } = await axios.get(url);

    // Use regex to extract all CSS links (you could extend this for inline styles)
    const cssUrls = [...html.matchAll(/<link.*?rel="stylesheet".*?href="(.*?)".*?>/g)].map(match => match[1]);

    if (cssUrls.length === 0) {
      return res.status(400).json({ error: 'No CSS links found on the page' });
    }

    // Step 2: Fetch all CSS files (if more than one) and combine them
    let cssData = '';
    for (const cssUrl of cssUrls) {
      const { data: css } = await axios.get(cssUrl);
      cssData += css;
    }

    // Step 3: Optionally handle inline styles (if needed)
    const inlineStyles = [...html.matchAll(/<style.*?>(.*?)<\/style>/gs)].map(match => match[1]).join('\n');
    if (inlineStyles) {
      cssData += inlineStyles;
    }

    // Step 4: Write combined CSS to a temporary file
    const cssPath = path.join(__dirname, 'temp.css');
    fs.writeFileSync(cssPath, cssData);

    // Step 5: Generate Critical CSS
    const criticalCss = await penthouse({
      url: url,
      css: cssPath,
      timeout: 30000,
    });

    // Clean up the temp file
    fs.unlinkSync(cssPath);

    // Return the Critical CSS
    res.setHeader('Content-Type', 'text/css');
    res.send(criticalCss);

  } catch (err) {
    // Clean up the temp file if an error occurs
    if (fs.existsSync(cssPath)) {
      fs.unlinkSync(cssPath);
    }

    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
