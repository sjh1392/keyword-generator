//imports
import express from "express";
import axios from "axios";
import cors from "cors";

import log from "./service/logService.js";
import dotenv from "dotenv";
import { Logging } from '@google-cloud/logging';


const BASE_URL = process.env.NODE_ENV === 'production'
  ? "https://keywordio-d7419b16e33c.herokuapp.com" // Production URL
  : "http://localhost:3001"; // Development URL

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const _projectId = 'impactio-439213';

app.use(cors());

// Middleware to parse JSON requests
app.use(express.json());

// Endpoint to get related search phrases
app.get('/api/related-searches', async (req, res) => {

    const { keyword } = req.query;
    const {speed} = req.query;
    

    if (!keyword) {
        return res.status(400).json({ error: 'Keyword is required' });
    }

    try {
        //initiate search
        console.log(Date.now());
        //log.sendLog("search", keyword);
        const relatedPhrases = await getRelatedPhrases(keyword, speed);

        let clean = await relatedPhrases;

        let jsonString = clean.join('');
        
        jsonString = jsonString.replace(/^\[/, '').replace(/\]$/, '');


        jsonString = `[${jsonString}]`;
        const arrayOfObjects = JSON.parse(jsonString);

        console.log(arrayOfObjects);
        
        let results = [];

        for (var i = 0; i < arrayOfObjects.length; i++) {

            results.push(arrayOfObjects[i]);
            results[i].volume = await getVolume(results[i].keyword);

        }

        res.json({ results });


    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching related phrases' });
    }
});

app.get('/', async (req, res) => {
    res.send('<h1>Keyword AP - Endpoints:</h1><ul><li>/api/related-searches?keyword={keyword}</li><li>/api/get-volume?keyword={keyword}</li></ul>');
});

app.get('/api/get-volume', async (req, res) => {

    const { keyword } = req.query;


    fetch('https://api.keywordseverywhere.com/v1/get_keyword_data', {
        method: 'POST',
        body: new URLSearchParams([
            ['dataSource', 'gkp'],
            ['country', 'uk'],
            ['currency', 'GBP'],
            ['kw[]', keyword]
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


app.get('/api/log', async (req, res) => {

    const { data } = req.query;
    const { name } = req.query || '';
    const { session } = req.query;

    if (!data) {
        console.log(req.query);
        return res.status(499).json({ error: 'log object is required' });
    }

    try {
        const logResult = await testLog(name, data, session);
        res.json({ logResult });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while sending log' });
    }

});


async function getVolume(keyword) {

    try {

        const response = await fetch(`${BASE_URL}/api/get-volume?keyword=${keyword}`);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json(); // Parse the response as JSON
        return data; // Return the parsed data

    }
    catch (err) {
        console.error('error in url parse: ' + err.message);
    }

}


async function testLog(name, data, session) {
    const logging = new Logging({ projectId: _projectId });
    const logName = name || 'test-log';
    const log = logging.log(logName);

    const metadata = {
        resource: { type: 'global' },
    };

    const entry = log.entry(metadata, {
        message: { data, session },
        severity: 'INFO',
    });

    try {
        await log.write(entry);
        console.log('Log successfully written!');
        return { 'entry': entry, "status": "success" };
    } catch (err) {
        console.error('Error writing log:', err);
        return { 'entry': entry, "status": "fail", "message": err };
    }
}


// Function to fetch related phrases using OpenAI API
async function getRelatedPhrases(keyword, speed) {

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o', // Use the appropriate model
        messages: [{ role: 'user', content: `Please ignore all previous instructions. Please respond only in the English language. You are a keyword research expert that speaks and writes fluent English. I want you to generate a list of 50 keywords closely related to "${keyword}" without duplicating any words. Please output the result as an array in the following format: [{'keyword':' 'search-intent'}]. Do not wrap the json codes in JSON markers, do not include a comma separated list. The value for keyword should be the keyword you generated, and the value of search intent column should be the search intent of the keyword (commercial, transactional, navigational, informational, local or investigational). Do not repeat yourself. Do not self reference. Do not include any explanations, only provide a  RFC8259 compliant JSON response following this format without deviation. [{"keyword":"the keyword you have genrated","intent" : "the intent you have decided for the keyword you have generated"}]` }],
        max_tokens: 1000,
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Add the API key as an authorization header
            'Content-Type': 'application/json',
        },
    });

    // Log the token usage
    const tokenUsage = response.data.usage;
    
    const phrases = response.data.choices[0].message.content
        .trim()
        .split(/\n|(?<=\d)\.\s*/) // Split by newline or period followed by space
        .map(phrase => phrase.replace(/^\d+\.\s*/, '').trim()) // Remove leading numbers and spaces
        .filter(phrase => phrase && !/^\d+$/.test(phrase)); // Filter out any empty strings and standalone numbers

    //log.sendLog("search",  `{tokens: ${tokenUsage.total_tokens}}`);
    //log.sendLog("search",  `{results: ${phrases}}`);
    console.log(Date.now());

    return phrases;
}


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

