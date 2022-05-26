const express = require("express");
const router = express.Router();
const Project = require("../model/Project");
const Version = require("../model/Version");
const auth = require("../middleware/auth");
const { User } = require("../model/User");
const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const multiparty = require("multiparty");
const fs = require("fs");
// const File = require("../model/File");

//set up aws s3
aws.config.update({
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  region: "us-east-1",
});

const s3 = new aws.S3();

const bucket = "bouncebox-bucket";

const upload_file = async (files, key) => {
  //upload multiple files to s3
  console.log("uploading files");
  const fileData = [];
  for (let i = 0; i < files.versionFile.length; i++) {
    const file = files.versionFile[i];
    console.log(file);

    

    const fileName = file.originalFilename;
    const fileType = file.mimetype;
    const fileSize = file.size;
    const filePath = file.path;

    const fileBuffer = fs.readFileSync(filePath);
    const params = {
      Bucket: bucket,
      Key: key + filePath + "/" + fileName,
      Body: fileBuffer,
      ContentType: fileType,
      ContentLength: fileSize,
    };
    const data = await s3.upload(params).promise();
    console.log(data);
    fileData.push(data);
  }
  console.log("files uploaded");
  return fileData;
};

//check user has access to version
const check_user_access = async (user_id, version_id) => {
  const version = await Version.findById(version_id);
  const project_id = version.project_id;
  const project = await Project.findById(project_id);
  console.log(project);
  //if project includes user_id into user_id or collaborators
  if (
    project.user_id.includes(user_id) ||
    project.collaborators.includes(user_id)
  ) {
    console.log("user has access to version");
    return 1;
  } else {
    console.log("user does not have access to version");
    return 0;
  }
};

// @route   POST api/projects/version
// @desc    Create a version
// @access  Public
router.post("/create/:id", auth, async (req, res) => {
  try {
    let form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.log(err);
      }
      const versionName = fields.versionName[0];
      const versionDescription = fields.versionDescription[0];
      // let key = fields.key[0];
      // check if key is empty
      // if (key === "") {
      // key = `${user.firstName}/${project.projectName}/${versionName}`;
      // }

      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (project.user_id.toString() !== user.id.toString()) {
        return res.status(401).json({ message: "User not authorized" });
      }
      //check if version already exists
      const version = await Version.findOne({
        project_id: req.params.id,
        versionName: versionName,
      });
      if (version) {
        return res.status(400).json({ message: "Version already exists" });
      }

      let previousVersion_id =
        project.version_id[project.version_id.length - 1];
      if (previousVersion_id === undefined) {
        previousVersion_id = null;
      }

      key = `${user.firstName}/${project.projectName}/${versionName}`;

      //create a promise to upload files to s3
      await upload_file(files, key).then(async (data) => {
        const version = new Version({
          project_id: req.params.id,
          versionName: versionName,
          version_description: versionDescription,
          version_file: data,
          previousVersion_id: previousVersion_id,
        });
        await version.save();

        //update project version_id
        project.version_id.push(version._id);
        await project.save();

        res.status(200).json(version);
      });
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route   GET api/projects/version/:id
// @desc    Get a version by id
// @access  Public
router.get("/get/:id", auth, async (req, res) => {
  try {
    let x = await check_user_access(req.userId, req.params.id);
    if (x === 0) {
      return res.status(401).json({ message: "User not authorized" });
    }
    const version = await Version.findById(req.params.id);
    if (!version) {
      return res.status(404).json({ message: "Version not found" });
    }
    res.status(200).json(version);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/projects/version
// @desc    Get all version
// @access  Public
router.get("/getall/:id", auth, async (req, res) => {
  try {
    //get all versions for a project
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    //check if project includes user_id

    if (project.user_id.includes(req.userId)) {
      const versions = await Version.find({ project_id: req.params.id });
      res.status(200).json(versions);
    } else {
      return res.status(401).json({ message: "User not authorized" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

// @route   DELETE api/projects/version/:id
// @desc    Delete a version by id
// @access  Public
router.delete("/delete/:id", auth, async (req, res) => {
  try {
    let x = await check_user_access(req.userId, req.params.id);
    if (x === 0) {
      return res.status(401).json({ message: "User not authorized" });
    }

    const version = await Version.findById(req.params.id);
    if (!version) {
      return res.status(404).json({ message: "Version not found" });
    }
    //delete version files from s3
    for (let i = 0; i < version.version_file.length; i++) {
      const file = version.version_file[i];
      console.log(file);
      const params = {
        Bucket: bucket,
        Key: file.key,
      };
      await s3.deleteObject(params).promise();
    }
    //delete version from db
    await version.remove();
    res.status(200).json({ message: "Version deleted" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

// @route   PUT api/projects/version/:id
// @desc    Update a version by id
// @access  Public
router.put("/update/:id", auth, async (req, res) => {
  try {
    let x = await check_user_access(req.userId, req.params.id);
    if (x === 0) {
      return res.status(401).json({ message: "User not authorized" });
    }

    const version = await Version.findById(req.params.id);
    if (!version) {
      return res.status(404).json({ message: "Version not found" });
    }
    const { versionName, versionDescription } = req.body;
    version.versionName = versionName;
    version.version_description = versionDescription;
    await version.save();
    res.status(200).json(version);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

//sync folders to s3
const sync_folders = async (folder_path) => {
  console.log("syncing folders");
  const folder_list = [];
  const folder_list_s3 = [];
  const files = fs.readdirSync(folder_path);
  console.log("files", files);
  console.log("files length", files.length);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const file_path = path.join(folder_path, file);
    const file_stats = fs.statSync(file_path);
    if (file_stats.isDirectory()) {
      const folder_name = file;
      const folder_path1 = folder_path + "/" + folder_name;
      const folder_data = await sync_folders(folder_path1);
      folder_list.push(folder_data);
    } else {
      const file_name = file;
      const file_path1 = folder_path + "/" + file_name;
      const file_buffer = fs.readFileSync(file_path);
      file_list = [];
      const params = {
        Bucket: bucket,
        Key: folder_path + "/" + file_name,
        Body: file_buffer,
        ContentType: "application/octet-stream",
        ContentLength: file_stats.size,
      };
      const data = await s3.upload(params).promise();
      file_list.push(data);
    }
  }

  return { folder_list, file_list };

  
};

module.exports = router;
