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
      console.log(`Server started on http://${host}:5200`);
    });
  });


  //test route
  app.get("/", (req, res) => {
    res.send("Hello World");
  });
  

app.use("/api/users", require("./routes/User"));
app.use("/api/projects", require("./routes/Project"));
app.use("/api/versions", require("./routes/Version"));
