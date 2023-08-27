const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

//Middle ware
app.use(cors())
app.use(express.json())

//Varify JWT 
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: "Unauthorized access" })
    }
    //get token to split from bearerToken
    const token = authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.error("JWT Verification Error:", err);
            return res.status(401).send({ error: true, message: "Unauthorized access" })
        }
        console.log("Decoded Token Payload:", decoded);
        res.decoded = decoded
        next()
    })
}






const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xvizize.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const menuCollection = client.db("bistroBossDb").collection("menu");
        const reviewCollection = client.db("bistroBossDb").collection("review");
        const cartCollection = client.db("bistroBossDb").collection("carts");
        const usersCollection = client.db("bistroBossDb").collection("users");

        //Worning: Users login before check admin route
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            if (user !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }
            next()
        }
        //-------------Menu Releted APIS------------
        {/*----------Get All Menus-------------*/ }
        app.get("/menu", async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
        })

        {/*----------Added a Menu Item-------------*/ }
        app.post('/menu', verifyJWT, async (req, res) => {
            const newItem = req.body
            const result = await menuCollection.insertOne(newItem)
            res.send(result)
        })

        {/*----------Delete Item-------------*/ }
        // app.delete('/menu:id', verifyJWT, async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: new ObjectId(id) }
        //     const result = await usersCollection.deleteOne(query)
        //     res.send(result)
        // })

        {/*----------Get All Reviews-------------*/ }
        app.get("/review", async (req, res) => {
            const result = await reviewCollection.find().toArray()
            res.send(result)
        })

        {/*---------CART RELATED APIS START---------*/ }

        {/*-------Insert Add to cart from User------*/ }
        app.post('/carts', async (req, res) => {
            const item = req.body;
            const result = await cartCollection.insertOne(item)
            res.send(result)
        })

        {/*-------GET Cart item from the user------*/ }
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([])
            }

            //Use JWT token to check valid user email
            // const decodedEmail = req.decoded.email;
            // if (email !== decodedEmail) {
            //     return res.status(403).send({ error: true, message: 'forbidden access' })
            // }

            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        })

        {/*-------DELETE Cart item from the user------*/ }
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query)
            res.send(result)
        })

        {/*-------USER RELATED APIS---------*/ }
        {/*-------Inserted User When a user created there Account---------*/ }
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query)
            console.log("existing user", existingUser);
            if (existingUser) {
                return res.send({ message: "User already exist" })
            }
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })


        //TODO: check req paramiter
        {/*---------GET All User------------*/ }
        app.get('/users', verifyJWT, async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        {/*-----Make Admin to update user information----------*/ }
        app.patch('/users/admin/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: "admin"
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        { /-------Check Admin user-----------/ }
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            const result = { admin: user?.role === 'admin' }
            res.send(result)
        })

        {/*-------User deleted on the application from admin--------*/ }
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await usersCollection.deleteOne(query)
            res.send(result)
        })

        {/*-------Generate JWT Token--------*/ }
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send(token)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("Boss is sitting")
})

app.listen(port, () => {
    console.log(`Boss is sitting on ${port}`);
})