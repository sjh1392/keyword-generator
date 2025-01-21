// server.js
const express = require('express');
const OpenAIApi= require('openai');
const axios = require('axios');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// OpenAI API configuration
//const configuration = new Configuration({
    //apiKey: process.env.OPENAI_API_KEY, // Set your OpenAI API key in the environment variable
//});
const openai = new OpenAIApi();

// Endpoint to get related search phrases
app.get('/api/related-searches', async (req, res) => {
    const { keyword } = req.query;

    if (!keyword) {
        return res.status(400).json({ error: 'Keyword is required' });
    }

    try {
        const relatedPhrases = await getRelatedPhrases(keyword);
        res.json({ keyword, relatedPhrases });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching related phrases' });
    }
});

app.get('/api/keyword-info', async (req,res)=> { 


    // The Fetch API inherently supports only UTF-8 encoding, eliminating the need for character set conversions.
fetch('https://api.keywordseverywhere.com/v1/get_keyword_data', {
    method: 'POST',
    body: new URLSearchParams([
        ['dataSource', 'gkp'],
        ['country', 'uk'],
        ['currency', 'GBP'],
        ['kw[]', 'charity fundraising ideas']
    ]),
    headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.KEYWORDS_EVERYWHERE_API_KEY}`
    },
})
    .then((response) => response.json())
    .then((json) => res.json(json))
    .catch(error => {
        console.log(error)
    })

});

// Function to fetch related phrases using OpenAI API
async function getRelatedPhrases(keyword) {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo', // Use the appropriate model
        messages: [{ role: 'user', content: `Generate 100 related search phrases for the keyword: "${keyword}"` }],
        max_tokens: 300,
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Add the API key as an authorization header
            'Content-Type': 'application/json',
        },
    });

     // Process the response to get clean phrases
     const phrases = response.data.choices[0].message.content
     .trim()
     .split(/\n|(?<=\d)\.\s*/) // Split by newline or period followed by space
     .map(phrase => phrase.replace(/^\d+\.\s*/, '').trim()) // Remove leading numbers and spaces
     .filter(phrase => phrase && !/^\d+$/.test(phrase)); // Filter out any empty strings and standalone numbers

 return phrases;
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});