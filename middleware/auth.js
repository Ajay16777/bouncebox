const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

function verifyToken(req, res, next) {
  var token = req.headers["x-access-token"];
  if (!token)
    return res.status(403).send({ auth: false, message: "No token provided." });

  jwt.verify(token, "test", function (err, decoded) {
    if (err)
      return res
        .status(500)
        .send({ auth: false, message: "Failed to authenticate token." });

    // if everything good, save to request for use in other routes
    req.userId = decoded._id;
    console.log("verify");
    // console.log(req.userId);
    next();
  });
}



module.exports = verifyToken
