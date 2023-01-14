const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(express.json());
app.use(cors());

app.get('/', async (req, res) => {
    res.send("Bus affinity server is running.")
})

app.listen(port, () => { console.log(`Bus affinity server is running on ${port}`) })