const JWT = require("jsonwebtoken");

module.exports = async (req, res, next) => {
  try {
    const authorization = req.headers["authorization"];
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).send({
        success: false,
        message: "Authentication token is required",
      });
    }
    const token = authorization.slice("Bearer ".length);
    JWT.verify(token, process.env.JWT_SECRET, (err, decode) => {
      if (err) {
        return res.status(401).send({
          success: false,
          message: "Auth Failed While Decrpytion",
        });
      } else {
        req.body.userId = decode.userId;
        next();
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(401).send({
      success: false,
      error,
      message: "Auth Failed",
    });
  }
};