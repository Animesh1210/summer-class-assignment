const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const mongoUri = 'mongodb://localhost/Animesh_summerpep';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));

const app = express();
app.use(bodyParser.json());

//mongoschema
const urlSchema = new mongoose.Schema({
  shortUrl: { type: String, unique: true, required: true },
  destinationUrl: { type: String, required: true },
  expiryDate: { type: Date, default: () => new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000) },//picked default 2 days expire
});
const UrlModel = mongoose.model('Url', urlSchema);

app.post('/shorten', async (req, res) => {     //{example json to test with postman : "destinationUrl": "https://example.com" }
  try {
    const { destinationUrl } = req.body;
    const shortUrl = generateShortUrl(); // Implement a function to generate a unique short URL

    // Create a new URL document and save it to the database
    const url = new UrlModel({ shortUrl, destinationUrl });
    await url.save();

    res.json({ shortUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/update', async (req, res) => {     
  // {  json to test with postman
  //   "shortUrl": "the url you get from /shorten",  
  //   "destinationUrl": "https://new url you want.com"
  // }
  
  try {
    const { shortUrl, destinationUrl } = req.body;

    // Find the existing URL document by short URL
    const url = await UrlModel.findOne({ shortUrl });

    if (url) {
      // Update the destination URL and save the changes to the database
      url.destinationUrl = destinationUrl;
      await url.save();

      res.json({ updated: true });
    } else {
      res.status(404).json({ updated: false, error: 'URL not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ updated: false, error: 'Internal Server Error' });
  }
});

app.get('/destination/:shortUrl', async (req, res) => {   // just type the shorten url in browser replacing ":shorturl" 
  try {                                                   //in endpoint, will return destination url
    const { shortUrl } = req.params;

    // Find the URL document by short URL
    const url = await UrlModel.findOne({ shortUrl });

    // Check if the URL exists and has not expired
    if (url && (!url.expiryDate || url.expiryDate > new Date())) {
      res.json({ destinationUrl: url.destinationUrl });
    } else {
      res.status(404).json({ error: 'URL not found or expired' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/updateexpiry', async (req, res) => {     
  // { json to testt
  //   "shortUrl": "shoten url for some xyz destination",   /
  //   "daysToAdd": 7         
  // }
  try {
    const { shortUrl, daysToAdd } = req.body;

    const url = await UrlModel.findOne({ shortUrl });

    if (url) {
        const newExpiryDate = url.expiryDate
        ? new Date(url.expiryDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
        : new Date(new Date().getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      
        url.expiryDate = newExpiryDate;
      await url.save();

      res.json({ updated: true });
    } else {
      res.status(404).json({ error: 'URL not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


const port = 8000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

//to generate short url, normal rand function
function generateShortUrl() {
 const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const shortUrlLength = 6;
  let shortUrl = '';
  for (let i = 0; i < shortUrlLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    shortUrl += characters[randomIndex];
  }
  return shortUrl;
}
