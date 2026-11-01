const http = require("http");
const express = require("express");
const cors = require("cors");


const app = express();


// Middleware
app.use(cors());
app.use(express.json());


// Test API
app.get("/", (req, res) => {

    res.send("Zero Cross Backend Running");

});


// Create Server
const server = http.createServer(app);


// Start Server
server.listen(5000, () => {

    console.log("Server running on port 5000");

});