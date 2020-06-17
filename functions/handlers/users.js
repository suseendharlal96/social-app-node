const firebase = require("firebase");

const { db, admin } = require("../utils/admin");
const { firebaseConfig } = require("../utils/config/firebase");
const {
  validateSignup,
  validateSignIn,
  getUserDetails,
} = require("../utils/validation");

firebase.initializeApp(firebaseConfig);

// signup
exports.signUp = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handler: req.body.handler,
  };
  const { valid, errors } = validateSignup(newUser);
  if (!valid) {
    return res.status(400).json(errors);
  }

  const noImg = "blank-profile.png";

  let userToken;
  let userId;

  db.doc(`/userInfo/${newUser.handler}`)
    .get()
    .then((res) => {
      console.log(res.exists);
      if (res.exists) {
        return res.status(400).json({ handler: "This handler already taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((token) => {
      userToken = token;
      const userCredentials = {
        email: newUser.email,
        handler: newUser.handler,
        createdAt: new Date().toISOString(),
        imgUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
        userId,
      };
      return db.doc(`/userInfo/${newUser.handler}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token: userToken });
    })
    .catch((err) => {
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ general: "Email already taken" });
      }
      return res.status(500).json({ error: err.code });
    });
};

// signin

exports.signIn = (req, res) => {
  const loginData = {
    email: req.body.email,
    password: req.body.password,
  };

  const { errors, valid } = validateSignIn(loginData);

  if (!valid) {
    return res.status(400).json(errors);
  }
  firebase
    .auth()
    .signInWithEmailAndPassword(loginData.email, loginData.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.status(201).json(token);
    })
    .catch((err) => {
      return res.status(500).json({ error: err.code });
    });
};

exports.addUserDetails = (req, res) => {
  let userDetails = getUserDetails(req.body);
  console.log(userDetails);
  db.doc(`userInfo/${req.user.handler}`)
    .update(userDetails)
    .then(() => {
      return res.json({ msg: "Details added" });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.code });
    });
};

// get our own(logged-in) profile details
exports.getProfileDetails = (req, res) => {
  let userData = {};
  db.doc(`userInfo/${req.user.handler}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection("likes")
          .where("handler", "==", req.user.handler)
          .get();
      }
    })
    .then((data) => {
      userData.likes = [];
      data.forEach((doc) => {
        userData.likes.push(doc.data());
      });
      return db
        .collection("notifications")
        .where("receiver", "==", req.user.handler)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
    })
    .then((data) => {
      userData.notifications = [];
      data.forEach((doc) => {
        userData.notifications.push({
          receiver: doc.data().receiver,
          sender: doc.data().sender,
          createdAt: doc.data().createdAt,
          screamId: doc.data().screamId,
          type: doc.data().type,
          read: doc.data().read,
          notificationId: doc.id,
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};

// upload image
exports.uploadImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });
  console.log(busboy);
  let imgName;
  let imgTobeUploaded = {};
  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/png" && mimetype !== "image/jpeg") {
      return res
        .status(400)
        .json({ error: "Only .jpg and .png file types allowed" });
    }
    const imgExtension = filename.split(".")[filename.split(".").length - 1];
    console.log(imgExtension);
    imgName = `${Math.round(
      Math.random() * 1000000000000
    ).toString()}.${imgExtension}`;
    console.log(imgName);
    const filePath = path.join(os.tmpdir(), imgName);
    imgTobeUploaded = { path: filePath, type: mimetype };
    file.pipe(fs.createWriteStream(filePath));
  });
  busboy.on("finish", () => {
    console.log(imgTobeUploaded.path);
    console.log(imgTobeUploaded.type);
    admin
      .storage()
      .bucket(`${firebaseConfig.storageBucket}`)
      .upload(imgTobeUploaded.path, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imgTobeUploaded.type,
          },
        },
      })
      .then(() => {
        console.log(req.user.handler);
        const imgUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imgName}?alt=media`;
        return db.doc(`/userInfo/${req.user.handler}`).update({ imgUrl });
      })
      .then(() => {
        return res.json({ msg: "Image uploaded successfully" });
      })
      .catch((err) => {
        return res.status(500).json({ error: err.code });
      });
  });
  busboy.end(req.rawBody);
  // req.pipe(busBoy)
};

// get any user details
exports.getAnyUserDetails = (req, res) => {
  let userData = {};
  db.doc(`/userInfo/${req.params.userhandler}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.user = doc.data();
        return db
          .collection("screams")
          .where("handler", "==", req.params.userhandler)
          .orderBy("createdAt", "desc")
          .get();
      } else {
        res.status(400).json({ error: "User not found" });
      }
    })
    .then((data) => {
      userData.screams = [];
      data.forEach((doc) => {
        userData.screams.push({
          username: doc.data().username,
          age: doc.data().age,
          likeCount: doc.data().likeCount,
          imageUrl: doc.data().imageUrl,
          commentCount: doc.data().commentCount,
          handler: doc.data().handler,
          createdAt: doc.data().createdAt,
          screamId: doc.id,
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};

// mark notifications read after viewing
exports.markNotificationsRead = (req, res) => {
  let batch = db.batch();
  console.log(req.body);
  req.body.forEach((notificationId) => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return res.json({ msg: "Notifications marked read" });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err.code });
    });
};
