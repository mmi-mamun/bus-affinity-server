const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;

require('dotenv').config();
const app = express();

// middleware
app.use(express.json());
app.use(cors());

// MongoDB connection
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ijax3zt.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const bookingOptionCollection = client.db('busAffinity').collection('bookingOptions');
        app.get('/bookingOptions', async (req, res) => {
            const query = {};
            const options = await bookingOptionCollection.find(query).toArray();
            res.send(options);
        })

    }
    finally {

    }
}
run().catch(console.log);


app.get('/', async (req, res) => {
    res.send("Bus affinity server is running.")
})

app.listen(port, () => { console.log(`Bus affinity server is running on ${port}`) })