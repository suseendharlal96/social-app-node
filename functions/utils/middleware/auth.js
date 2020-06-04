const { admin, db } = require("../admin");

// middleware for authorization
exports.authorize = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("bearer")
  ) {
    idToken = req.headers.authorization.split("bearer ")[1];
  } else {
    return res.status(400).json({ error: "Unauthorized" });
  }

  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedData) => {
      req.user = decodedData;
      return db
        .collection("userInfo")
        .where("userId", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      req.user.handler = data.docs[0].data().handler;
      req.user.imageUrl = data.docs[0].data().imgUrl;
      return next();
    });
};
