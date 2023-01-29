const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

require('dotenv').config();
const app = express();

// middleware
app.use(express.json());
app.use(cors());

// MongoDB connection
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ijax3zt.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

/*** Middleware function ***/
function verifyJWT(req, res, next) {
    // console.log('Token inside verifyJWT:::::', req.headers.authorization);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Unauthorized access')
    }

    const token = authHeader.split(' ')[1];
    console.log('***', token)

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}
async function run() {
    try {
        const bookingOptionCollection = client.db('busAffinity').collection('bookingOptions');
        const bookingsCollection = client.db('busAffinity').collection('bookings');
        const usersCollection = client.db('busAffinity').collection('users');
        const driversCollection = client.db('busAffinity').collection('drivers');
        const staffCollection = client.db('busAffinity').collection('staff');

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

            /** Function for Each user booked maximum 2 seats (start)**/
            const query = {
                email: booking.email,
                bookingDate: booking.bookingDate,
                destination: booking.destination
            }
            const isBooked = await bookingsCollection.find(query).toArray();
            if (isBooked.length >= 2) {
                const message = `You already have a maximum booking on ${booking.bookingDate}`
                return res.send({ acknowledged: false, message })
            }
            /** Function for Each user booked maximum 2 seats (end)**/

            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })

        app.get('/bookings', verifyJWT, async (req, res) => {
            // console.log('Token:::::', req.headers.authorization);
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'Forbidden access' });
            }


            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        })

        /*** Store user list and data ***/
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        /**** GENERATE JWT ***/
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
                console.log(token);
                return res.send({ accessToken: token });
            }
            // console.log(user);
            res.status(403).send({ accessToken: '' })
        })

        /****Get All Users****/
        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        })

        /*** Permission to see users (only admin) ***/
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'Admin' })
        })

        /*** Promote user ***/
        app.put('/users/admin/:id', verifyJWT, async (req, res) => {
            /* Check the promoter is admin or not (start) */
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'Admin') {
                return res.status(403).send({ message: 'Forbidden AccesS' })
            }
            /* Check the promoter is admin or not (end) */


            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: { role: 'Admin' }
            }
            const options = { upsert: true };

            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);

        })


        /* Create API for getting bus name */
        app.get('/busName', async (req, res) => {
            const query = {};
            const result = await bookingOptionCollection.find(query).project({ busName: 1 }).toArray();
            res.send(result);
        })

        /* Add Driver */
        app.post('/drivers', async (req, res) => {
            const driver = req.body;
            const result = await driversCollection.insertOne(driver);
            res.send(result);
        })

        /* Add Staff */
        app.post('/staff', async (req, res) => {
            const staff = req.body;
            const result = await staffCollection.insertOne(staff);
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