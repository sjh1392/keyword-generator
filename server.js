// server.js
const express = require('express');
const OpenAIApi= require('openai');
const axios = require('axios');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

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

app.get('/api/keyword-volume', async (req,res)=> { 

fetch('https://api.keywordseverywhere.com/v1/get_keyword_data', {
    method: 'POST',
    body: new URLSearchParams([
        ['dataSource', 'gkp'],
        ['country', 'uk'],
        ['currency', 'GBP'],
        ['kw[]', 'charity fundraising ideas'],
        ['kw[]', 'gifts for him'],
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
        model: 'gpt-4o', // Use the appropriate model
        messages: [{ role: 'user', content: `Please ignore all previous instructions. Please respond only in the English language. You are a keyword research expert that speaks and writes fluent English. I want you to generate a list of 50 keywords closely related to "${keyword}" without duplicating any words. Please output the result as an array in the following format: [{'keyword':'the new keyword you generate', 'search-intent' : 'the search intent you classify'}]. The value for keyword should be the keyword you generated, and the value of search intent column should be the search intent of the keyword (commercial, transactional, navigational, informational, local or investigational). After the table, please print "List of same keywords separated by commas:". On the next line print the same list of keywords at the bottom separated by commas. Do not repeat yourself. Do not self reference. Do not explain what you are doing.` }],
        max_tokens: 300,
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Add the API key as an authorization header
            'Content-Type': 'application/json',
        },
    });

     // Log the token usage
     const tokenUsage = response.data.usage;
     console.log(`Tokens used: ${tokenUsage.total_tokens} (Input: ${tokenUsage.prompt_tokens}, Output: ${tokenUsage.completion_tokens})`);

     
     // Process the response to get clean phrases
     const phrases = response.data.choices[0].message.content
     .trim().replace(/(\r\n|\n|\r)/gm, "");;

    return phrases;
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});