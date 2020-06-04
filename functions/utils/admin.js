const admin = require("firebase-admin");

const { serviceAccount } = require("../utils/config/firebaseFunc");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://social-react-a5a3b.firebaseio.com",
});
const db = admin.firestore();

module.exports = { admin, db };
