const { db } = require("../utils/admin");

// get all screams
exports.getScreams = (req, res) => {
  db.collection("screams")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      const screams = [];
      data.forEach((doc) => {
        screams.push({ screamId: doc.id, ...doc.data() });
      });
      return res.json(screams);
    })
    .catch((err) => res.json({ msg: "something went wrong" }));
};

// individual scream
exports.getIndividualScream = (req, res) => {
  let screamData = {};
  db.doc(`screams/${req.params.screamId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(400).json({ error: "scream does not exist" });
      }
      console.log("id", req.params.screamId);
      console.log("doc", doc, "docid", doc.id);
      screamData = doc.data();
      screamData.screamId = doc.id;
      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("screamId", "==", req.params.screamId)
        .get();
    })
    .then((data) => {
      screamData.comments = [];
      data.forEach((doc) => {
        screamData.comments.push(doc.data());
      });
      return res.json(screamData);
    })
    .catch((err) => res.status(500).json({ error: err.code }));
};

// create scream
exports.createScream = (req, res) => {
  const newScream = {
    scream: req.body.scream,
    handler: req.user.handler,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
    imageUrl: req.user.imageUrl,
  };
  if (newScream.scream.length === 0) {
    return res.status(400).json({ scream: "Must not be empty" });
  }
  db.collection("screams")
    .add(newScream)
    .then((doc) => {
      const resScream = newScream;
      resScream.screamId = doc.id;
      res.json(resScream);
    })
    .catch((err) => {
      res.status(500).json({ error: "something went wrong" });
    });
};

// comment on a scream
exports.commentOnScream = (req, res) => {
  if (req.body.comment.trim() === "") {
    return res.status(400).json({ screamComment: "Must not be empty" });
  }
  const newComment = {
    createdAt: new Date().toISOString(),
    desc: req.body.comment,
    handler: req.user.handler,
    screamId: req.params.screamId,
    imageUrl: req.user.imageUrl,
  };
  db.doc(`screams/${req.params.screamId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(400).json({ error: "Scream does not exist" });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      db.collection("comments").add(newComment);
    })
    .then(() => {
      res.json(newComment);
    })
    .catch((err) => res.status(500).json("Something went wrong"));
};

// like a scream
exports.likeScream = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("handler", "==", req.user.handler)
    .where("screamId", "==", req.params.screamId)
    .limit(1);
  const screamDocument = db.doc(`screams/${req.params.screamId}`);
  let screamData;
  screamDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(400).json({ error: "scream not found" });
      }
    })
    .then((data) => {
      console.log(data, data.empty);
      if (data.empty) {
        return db
          .collection("likes")
          .add({
            screamId: req.params.screamId,
            handler: req.user.handler,
          })
          .then(() => {
            screamData.likeCount++;
            return screamDocument.update({ likeCount: screamData.likeCount });
          })
          .then(() => {
            return res.json(screamData);
          });
      } else {
        return res.status(400).json({ error: "Scream already liked" });
      }
    })
    .catch((err) => {
      res.status(500).json({ error: err.code });
    });
};

// unlike a scream
exports.unLikeScream = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("handler", "==", req.user.handler)
    .where("screamId", "==", req.params.screamId)
    .limit(1);
  const screamDocument = db.doc(`screams/${req.params.screamId}`);
  let screamData;
  screamDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(400).json({ error: "scream not found" });
      }
    })
    .then((data) => {
      console.log(data.empty);
      if (data.empty) {
        return res.status(400).json({ error: "scream not yet liked" });
      } else {
        console.log(12, data.docs);
        return db
          .doc(`likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            screamData.likeCount--;
            return screamDocument.update({ likeCount: screamData.likeCount });
          })
          .then(() => {
            return res.json(screamData);
          });
      }
    })
    .catch((err) => {
      res.status(500).json({ error: err.code });
    });
};

// delete a scream
exports.deleteScream = (req, res) => {
  const screamData = db.doc(`/screams/${req.params.screamId}`);
  screamData
    .get()
    .then((doc) => {
      console.log(doc.data());
      console.log(req.user.handler);
      if (!doc.exists) {
        return res.status(400).json({ error: "scream not found" });
      }
      if (doc.data().handler !== req.user.handler) {
        return res.status(400).json({ error: "Unauthorized" });
      } else {
        return screamData.delete();
      }
    })
    .then(() => {
      res.json({ msg: "Deleted successfully" });
    })
    .catch((err) => res.status(500).json(err.code));
};
