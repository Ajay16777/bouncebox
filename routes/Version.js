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
const JSZip = require("jszip");
const axios = require("axios");
var Rsync = require('rsync');
// const File = require("../model/File");

//set up aws s3
aws.config.update({
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  region: "us-east-1",
});

const s3 = new aws.S3();

const bucket = "bouncebox-bucket";

//download files from s3
const download_files = async (version_files) => {
  const files = [];
  for (let i = 0; i < version_files.length; i++) {
    const file = version_files[i];
    const fileName = file.split("/").pop();
    const fileType = file.split(".").pop();
    const fileSize = file.ContentLength;
    const filePath = file.Location;

    const fileBuffer = await s3
      .getObject({ Bucket: bucket, Key: file.key })
      .promise();
    const filePath_ = filePath.split(bucket).pop();

    const folder = filePath_.split("/").pop();

    const filekey = file.key;

    const params = {
      Bucket: bucket,
      Key: filekey,
      Body: fileBuffer,
      ContentType: fileType,
      ContentLength: fileSize,
    };
    const data = await s3.upload(params).promise();
    console.log(data);
    files.push(data);
  }

  console.log("files downloaded");
  return files;
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

//check user has access to project
const check_user_access_project = async (user_id, project_id) => {
  const project = await Project.findById(project_id);
  console.log(project);
  //if project includes user_id into user_id or collaborators
  if (
    project.user_id.includes(user_id) ||
    project.collaborators.includes(user_id)
  ) {
    console.log("user has access to project");
    return 1;
  } else {
    console.log("user does not have access to project");
    return 0;
  }
};

//sync folders to s3
const sync_folders = async (folder_path, key) => {
  const sync_folders = async (version_folder_path, key, ip) => {
    const folder_path = version_folder_path + "/" + ip;
    const params = {
      Bucket: bucket,
      Key: key,
      Body: folder_path,
    };
    const data = await s3.upload(params).promise();
    console.log(data);
    return data;
    
  };




};

// @route   POST api/projects/version
// @desc    Create a version
// @access  Public
router.post("/create/:id", auth, async (req, res) => {
  try {
    let form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
      console.log(fields);
      console.log(files);
      //check if user has access to project
      const user_id = req.userId;
      const project_id = req.params.id;
      const user_access = await check_user_access_project(user_id, project_id);
      const user = await User.findById(user_id);
      const project = await Project.findById(project_id);
      //previous version
      let previousVersion_id =
        project.version_id[project.version_id.length - 1];
      if (previousVersion_id === undefined) {
        previousVersion_id = null;
      }

      // version name is length of project.version_id + 1
      let number = project.version_id.length + 1;
      const version_name = "Version" + number;



      if (user_access === 1) {
        //create version
        const version = new Version({
          project_id: project_id,
          user_id: user_id,
          versionName: version_name,
          version_comment: fields.version_comment[0],
          version_file: [],
          previousVersion_id: previousVersion_id,
        });
        const version_data = await version.save();
        console.log(version_data);

        let version_id = version_data._id;

        //sync folders to s3
        const version_folder_path = fields.files_path[0];
        let key = `${user.firstName}_${user_id}/${project.projectName}/${version_name}`;
        const version_folder_list = await sync_folders(
          version_folder_path,
          key
        );

        console.log("version folder list", version_folder_list);

        //update version with version folders
        await Version.findByIdAndUpdate(
          version_id,
          {
            $set: {
              version_file: version_folder_list,
            },
          },
          { new: true }
        );
        //wait for version update
        await version.save();

        //update project version_id
        project.version_id.push(version._id);
        await project.save();

        //send response
        res.json({
          success: true,
          version: version_data,
        });
      } else {
        res.status(401).json({
          success: false,
          message: "User does not have access to project",
        });
      }
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

//download version
router.get("/download/:id", auth, async (req, res) => {
  try {
    let x = await check_user_access(req.userId, req.params.id);
    if (x === 0) {
      return res.status(401).json({ message: "User not authorized" });
    }

    const version = await Version.findById(req.params.id);
    if (!version) {
      return res.status(404).json({ message: "Version not found" });
    }
    const user = await User.findById(req.userId);

    const project = await Project.findById(version.project_id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    //download version files from s3
    const data = await download_files(version.version_file);

    //create a folder in local for the version
    const version_folder_path = path.join(
      __dirname,
      version.versionName
    );
    if (!fs.existsSync(version_folder_path)) {
      fs.mkdirSync(version_folder_path);
    }
    

    //save version files to local
    for (let i = 0; i < data.length; i++) {
      const file = data[i];
      const file_path = path.join(version_folder_path, file.Key);
      fs.writeFileSync(file_path, file.Body);
    }



    //send response
    res.json({
      success: true,
      message: "Version downloaded",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
