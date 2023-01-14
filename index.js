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
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const bookingOptionCollection = client.db('busAffinity').collection('bookingOptions');
        const bookingsCollection = client.db('busAffinity').collection('bookings');

        // use aggregate to query multiple collection and then marge data
        app.get('/bookingOptions', async (req, res) => {
            const date = req.query.date;
            // console.log(date);
            const query = {};
            const options = await bookingOptionCollection.find(query).toArray();

            /****** Get the bookings of the provided date ******/
            /* check booking date with selected date (not clear)*/
            const bookingQuery = { bookingDate: date };
            /* check booked quantity on this day */
            const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();
            console.log(alreadyBooked)

            // check each card or bus
            options.forEach(bus => {
                /* check already booked with 6 cards via destination*/
                const optionBooked = alreadyBooked.filter(book => book.destination === bus.destination);
                // console.log(optionBooked);
                const bookedSeats = optionBooked.map(book => book.seat);
                const remainingSeats = bus.seats.filter(seat => !bookedSeats.includes(seat))
                // console.log(date, bus.destination, bookedSeats, remainingSeats.length);
                bus.seats = remainingSeats;
            })

            res.send(options);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            // console.log(booking);
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
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