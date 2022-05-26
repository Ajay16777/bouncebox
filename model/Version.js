const mongooes = require("mongoose");
const Schema = mongooes.Schema;

const VersionSchema = new Schema(
  {
    versionName: {
      type: String,
      required: true,
      unique: true,
    },
    project_id: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
    previousVersion_id: {
      type: Schema.Types.ObjectId,
      ref: "Version",
    },
    version_comment: {
      type: String,
    },

    version_folder_path: {
      type: String,
    },
    

    version_file: [
      {
        File_name: {
          type: String,
        },
        ETag: {
          type: String,
        },
        VersionId: {
          type: String,
        },

        Location: {
          type: String,
        },

        Key: {
          type: String,
        },

        Bucket: {
          type: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Version = mongooes.model("Version", VersionSchema);
module.exports = Version;
