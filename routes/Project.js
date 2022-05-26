const express = require("express");
const router = express.Router();
const Project = require("../model/Project");
const Version = require("../model/Version");
const auth = require("../middleware/auth");
const { User } = require("../model/User");

// @route   POST api/projects
// @desc    Create a project
// @access  Public
router.post("/create", auth, async (req, res) => {
  const newProject = req.body;
  console.log(newProject);
  //print user id from the token in the header of the request to the console log
  console.log(req.userId);

  try {
    //create a new project for the user
    const project = await Project.create({
      ...newProject,
      user_id: req.userId,
    });
    //add the project to the user's project list
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $push: { project_id: project._id } },
      { new: true }
    );

    res.json(project);

    //send the project to the client
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// @route   GET api/projects
// @desc    Get all projects
// @access  Public
router.get("/all", auth, async (req, res) => {
  try {
    //CHECK IF THE USER IS ADMIN
    const user = await User.findById(req.userId);
    if (user.IsAdmin) {
      //get all projects
      const projects = await Project.find();
      res.json(projects);
    } else {
      //get all projects for the user
      const projects = await Project.find({ user_id: req.userId });
      res.json(projects);
    }
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// @route   GET api/projects/:id
// @desc    Get a project by id
// @access  Public
router.get("/get/:id", auth, async (req, res) => {
  try {
    console.log(req.params.id);
    console.log(req.userId);
    const project = await Project.findById(req.params.id);
    //check if user id is in the project's user id list
    if (project.user_id.includes(req.userId)) {
      res.json(project);
    } else {
      res.status(401).json({
        message: "You are not authorized to view this project",
      });
    }
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// @route   PUT api/projects/:id
// @desc    Update a project by id
// @access  Public
router.put("/update/:id", auth, async (req, res) => {
  try {
    // check if the user is the owner of the project to update it
    const project = await Project.findById(req.params.id);
    if (project.user_id.includes(req.userId)) {
      const updatedProject = await Project.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      res.json(updatedProject);
    } else {
      res.status(401).json({
        message: "You are not authorized to update this project",
      });
    }
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// @route   DELETE api/projects/:id
// @desc    Delete a project by id
// @access  Public
router.delete("/delete/:id", auth, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    //remove the project from the user's project list
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $pull: { project_id: project._id } },
      { new: true }
    );
    res.json(project);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

module.exports = router;
