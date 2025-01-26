const express = require('express');
const app = express();
const cors = require('cors'); // Import CORS

const _projectId = 'impactio-439213';
const PORT = 3000;

// Middleware to parse JSON requests
app.use(express.json());
app.use(cors());

const { Logging } = require('@google-cloud/logging');

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

app.get('/api/log', async(req,res)=> { 

    const {data} = req.query;
    const {name} = req.query || '';
    const {session} = req.query;
 
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


async function testLog(name, data, session) {
  const logging = new Logging({ projectId: _projectId });
  const logName = name || 'test-log';
  const log = logging.log(logName);

  const metadata = {
    resource: { type: 'global' },
  };

  const entry = log.entry(metadata, {
    message: {data, session},
    severity: 'INFO',
  });

  try {
    await log.write(entry);
    console.log('Log successfully written!');
    return {'entry': entry, "status" : "success"};
  } catch (err) {
    console.error('Error writing log:', err);
    return {'entry': entry, "status" :"fail", "message": err};
  }
}