const express = require("express");
const mongooes = require("mongoose");
const app = express();
const dotenv = require("dotenv");
dotenv.config();

const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Connect to MongoDB
mongooes
  .connect("mongodb://localhost/BounceBox", { useNewUrlParser: true })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
  })
  .finally(() => {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  });


  //test route
  app.get("/", (req, res) => {
    res.send("Hello World");
  });
  

app.use("/api/users", require("./routes/User"));
app.use("/api/projects", require("./routes/Project"));
app.use("/api/versions", require("./routes/Version"));