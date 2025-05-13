const express = require('express');
const penthouse = require('penthouse');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/generate', async (req, res) => {
  const { url, css } = req.body;
  if (!url || !css) {
    return res.status(400).json({ error: 'Missing "url" or "css" in request body' });
  }

  const cssPath = './temp.css';
  fs.writeFileSync(cssPath, css);

  try {
    const criticalCss = await penthouse({
      url: url,
      css: cssPath,
      timeout: 30000,
    });
    res.setHeader('Content-Type', 'text/css');
    res.send(criticalCss);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    fs.unlinkSync(cssPath);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
