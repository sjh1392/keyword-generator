// server.js
import express from "express";
import OpenAIApi from "openai";
import axios from "axios";
import cors from "cors";


import log from "./service/logService.js";
import dotenv from "dotenv";

dotenv.config();


const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// Middleware to parse JSON requests
app.use(express.json());

// Endpoint to get related search phrases
app.get('/api/related-searches', async (req, res) => {

    const { keyword } = req.query;

    if (!keyword) {
        return res.status(400).json({ error: 'Keyword is required' });
    }

    try {

        //initiate search
        console.log(Date.now());

        log.sendLog("search", keyword);
        const relatedPhrases = await getRelatedPhrases(keyword);
        res.json({ keyword, relatedPhrases });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching related phrases' });
    }
});

app.get('/', async (req, res) => {
    res.send('hello world');
});

app.get('/api/keyword-volume', async (req, res) => {

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
        messages: [{ role: 'user', content: `Please ignore all previous instructions. Please respond only in the English language. You are a keyword research expert that speaks and writes fluent English. I want you to generate a list of 50 keywords closely related to "${keyword}" without duplicating any words. Please output the result as an array in the following format: [{'keyword':' 'search-intent'}]. The value for keyword should be the keyword you generated, and the value of search intent column should be the search intent of the keyword (commercial, transactional, navigational, informational, local or investigational). After the table, please print "List of same keywords separated by commas:". On the next line print the same list of keywords at the bottom separated by commas. Do not repeat yourself. Do not self reference. Do not include any explanations, only provide a  RFC8259 compliant JSON response following this format without deviation. [{"keyword":"the keyword you have genrated","intent" : "the intent you have decided for the keyword you have generated"}]` }],
        max_tokens: 500,
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Add the API key as an authorization header
            'Content-Type': 'application/json',
        },
    });

    // Log the token usage
    const tokenUsage = response.data.usage;
    //console.log(`Tokens used: ${tokenUsage.total_tokens} (Input: ${tokenUsage.prompt_tokens}, Output: ${tokenUsage.completion_tokens})`);
    
    const phrases = response.data.choices[0].message.content
        .trim()
        .split(/\n|(?<=\d)\.\s*/) // Split by newline or period followed by space
        .map(phrase => phrase.replace(/^\d+\.\s*/, '').trim()) // Remove leading numbers and spaces
        .filter(phrase => phrase && !/^\d+$/.test(phrase)); // Filter out any empty strings and standalone numbers

    log.sendLog("search",  `{tokens: ${tokenUsage.total_tokens}}`);
    log.sendLog("search",  `{results: ${phrases}}`);
    console.log(Date.now());
    return phrases;
}


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

