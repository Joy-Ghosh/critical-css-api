const express = require('express');
const penthouse = require('penthouse');
const axios = require('axios');  // Import axios for fetching CSS
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/generate', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Missing "url" in request body' });
  }

  try {
    // Step 1: Fetch the full CSS from the page URL
    const { data: html } = await axios.get(url);
    
    // Use a regex to extract the CSS link (this can be extended for inline styles if needed)
    const cssUrls = [...html.matchAll(/<link.*?rel="stylesheet".*?href="(.*?)".*?>/g)].map(match => match[1]);
    
    if (cssUrls.length === 0) {
      return res.status(400).json({ error: 'No CSS links found on the page' });
    }

    // Step 2: Fetch the first CSS file (this can be expanded for more files)
    const { data: css } = await axios.get(cssUrls[0]);

    // Step 3: Write the CSS to a temporary file
    const cssPath = './temp.css';
    fs.writeFileSync(cssPath, css);

    // Step 4: Generate Critical CSS
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
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
