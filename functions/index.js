const functions = require("firebase-functions");
const express = require("express");
const app = express();

const cors = require("cors");
app.use(cors());

const { db } = require("./utils/admin");

const {
  getScreams,
  getIndividualScream,
  deleteScream,
  createScream,
  commentOnScream,
  likeScream,
  unLikeScream,
} = require("./handlers/screams");
const {
  signUp,
  signIn,
  uploadImage,
  addUserDetails,
  getProfileDetails,
  getAnyUserDetails,
  markNotificationsRead,
} = require("./handlers/users");
const { authorize } = require("./utils/middleware/auth");

// signup a user
app.post("/signup", signUp);
// signin a user
app.post("/signin", signIn);

// to get screams
app.get("/screams", getScreams);
// to get individual scream
app.get("/scream/:screamId", getIndividualScream);
// to delete a particular scream
app.delete("/scream/:screamId", authorize, deleteScream);
// to create a scream
app.post("/createScream", authorize, createScream);
// to comment on a scream
app.post("/scream/:screamId/comment", authorize, commentOnScream);
// to like a scream
app.get("/scream/:screamId/like", authorize, likeScream);
// to unlike a scream
app.get("/scream/:screamId/unlike", authorize, unLikeScream);

// to upload profile image
app.post("/user/image", authorize, uploadImage);
// add user details
app.post("/user/addDetails", authorize, addUserDetails);
// get profile details
app.get("/user/profileDetails", authorize, getProfileDetails);
// get all any user details
app.get("/user/:userhandler", getAnyUserDetails);
// mark notifications read
app.post("/notifications", authorize, markNotificationsRead);

exports.api = functions.https.onRequest(app);

// trigger on like
exports.createNotificationOnLike = functions
  .region("asia-east2")
  .firestore.document("likes/{id}")
  .onCreate((snapshot) => {
    console.log(snapshot.data());
    return db
      .doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().handler !== snapshot.data().handler) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            receiver: doc.data().handler,
            sender: snapshot.data().handler,
            type: "like",
            read: false,
            screamId: doc.id,
          });
        }
      })
      .catch((err) => {
        console.log(err);
        return;
      });
  });

// trigger on unlike
exports.deleteNofiticationOnUnlike = functions
  .region("asia-east2")
  .firestore.document("/likes/{id}")
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.log(err);
        return;
      });
  });

// trigger on comment
exports.createNotificationOnComment = functions
  .region("asia-east2")
  .firestore.document("comments/{id}")
  .onCreate((snapshot) => {
    console.log(snapshot.data());
    return db
      .doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().handler !== snapshot.data().handler) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            receiver: doc.data().handler,
            sender: snapshot.data().handler,
            type: "comment",
            read: false,
            screamId: doc.id,
          });
        }
      })
      .catch((err) => {
        console.log(err);
        return;
      });
  });

// trigger on user profile pic change
exports.onUserProfilePicChange = functions
  .region("asia-east2")
  .firestore.document("/userInfo/{id}")
  .onUpdate((change) => {
    if (change.before.data() !== change.after.data()) {
      let batch = db.batch();
      return db
        .collection("screams")
        .where("handler", "==", change.before.data().handler)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const scream = db.doc(`/screams/${doc.id}`);
            batch.update(scream, { imageUrl: change.after.data().imgUrl });
            return db
              .collection("comments")
              .where("handler", "==", change.before.data().handler)
              .get();
          });
        })
        .then((data) => {
          console.log(data);
          if (data && data.length) {
            data.forEach((doc) => {
              const scream = db.doc(`/comments/${doc.id}`);
              batch.update(scream, {
                imageUrl: change.after.data().imgUrl,
              });
            });
            return batch.commit();
          } else {
            return batch.commit();
          }
        });
    } else {
      return true;
    }
  });

// trigger on scream delete
exports.onScreamDelete = functions
  .region("asia-east2")
  .firestore.document("/screams/{scId}")
  .onDelete((snapshot, context) => {
    const screamId = context.params.scId;
    const batch = db.batch();
    return db
      .collection("comments")
      .where("screamId", "==", screamId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db.collection("likes").where("screamId", "==", screamId).get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db
          .collection("notifications")
          .where("screamId", "==", screamId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => {
        console.log(err);
      });
  });
