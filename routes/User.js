const express = require("express");
const router = express.Router();
const { User } = require("../model/User");

// @route   POST api/users
// @desc    Create a user
// @access  Public
router.post("/register", (req, res) => {
  const newUser = req.body;
  console.log(newUser);
  try {
    User.register(newUser)
      .then((user) => {
        res.json(user);
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

// @route   POST api/users/login
// @desc    Login a user
// @access  Public
router.post("/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    //use the login method to login a user
    const user = await User.login(email, password);
    if (user) {
      //generate a token for the user
      const token = user.generateAuthToken();
      //send the token to the user in req.header with the name 'x-auth-token'
      res.header("x-auth-token", token).send(user);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route   GET api/users
// @desc    Get all users
// @access  Public
router.get("/getall", (req, res) => {
  User.find()
    .then((users) => {
      res.json(users);
    })
    .catch((err) => {
      res.status(400).json({ message: err.message });
    });
});

// @route   GET api/users/:id
// @desc    Get a user by id
// @access  Public
router.get("/get/:id", (req, res) => {
  User.findById(req.params.id)
    .then((user) => {
      res.json(user);
    })
    .catch((err) => {
      res.status(400).json({ message: err.message });
    });
});

// @route   PUT api/users/:id
// @desc    Update a user by id
// @access  Public
router.put("/update/:id", (req, res) => {
  User.findByIdAndUpdate(req.params.id, req.body)
    .then((user) => {
      res.json(user);
    })
    .catch((err) => {
      res.status(400).json({ message: err.message });
    });
});

// @route   DELETE api/users/:id
// @desc    Delete a user
// @access  Public
router.delete("/delete/:id", (req, res) => {
  User.findById(req.params.id)
    .then((user) => user.remove().then(() => res.json({ success: true })))
    .catch((err) => res.status(404).json({ success: false }));
});

module.exports = router;
