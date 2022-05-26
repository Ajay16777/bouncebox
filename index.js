const express = require("express");
const mongooes = require("mongoose");
const app = express();
const dotenv = require("dotenv");
dotenv.config();

const ip = require("ip");
let host = ip.address();

const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Connect to MongoDB
mongooes
  .connect("mongodb+srv://Ajay:123ewq@cluster0.azqba7k.mongodb.net/?retryWrites=true&w=majority", { useNewUrlParser: true })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
  })
  .finally(() => {
    app.listen(port, host,() => {
      console.log(`Server started on http://${host}:${port}`);
    });
  });


  //test route
  app.get("/", (req, res) => {
    res.send(`Api Routes
    
    User Routes
    /api/users/register
    /api/users/login
    /api/users/logout
    /api/users/profile
    /api/users/update
    /api/users/delete

    Project Routes
    /api/projects/create
    /api/projects/update
    /api/projects/delete

    //versions Routes
    /api/versions/create
    /api/versions/update
    /api/versions/delete
    
    
    
    
    `);
  });


app.use("/api/users", require("./routes/User"));
app.use("/api/projects", require("./routes/Project"));
app.use("/api/versions", require("./routes/Version"));
