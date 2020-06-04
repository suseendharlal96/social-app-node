const isEmpty = (val) => {
  return val.trim() === "" ? true : false;
};
const isValid = (val) => {
  const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return val.match(regex) ? true : false;
};

exports.validateSignup = (newUser) => {
  console.log(newUser);
  let errors = {};
  if (isEmpty(newUser.email)) {
    errors.email = "Must not be empty";
  } else if (!isValid(newUser.email)) {
    errors.email = "Enter a valid email";
  }
  if (isEmpty(newUser.password)) {
    errors.password = "Must not be empty";
  } else if (newUser.password.trim().length < 6) {
    errors.password = "Must be atleast 6 characters";
  }
  if (isEmpty(newUser.handler)) {
    errors.handler = "Must not be empty";
  }
  if (newUser.password.trim() !== newUser.confirmPassword.trim()) {
    errors.confirmPassword = "Passwords do not match";
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.validateSignIn = (loginData) => {
  let errors = {};
  if (isEmpty(loginData.email)) {
    errors.email = "Must not be empty";
  } else if (!isValid(loginData.email)) {
    errors.email = "Enter a valid email";
  }
  if (isEmpty(loginData.password)) {
    errors.password = "Must not be empty";
  } else if (loginData.password.trim().length < 6) {
    errors.password = "Must be atleast 6 characters";
  }
  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.getUserDetails = (data) => {
  let userDetails = {};
  if (!isEmpty(data.bio.trim())) {
    userDetails.bio = data.bio;
  }
  if (!isEmpty(data.location.trim())) {
    userDetails.location = data.location;
  }
  if (!isEmpty(data.website.trim())) {
    if (data.website.trim().substring(0, 4) !== "http") {
      userDetails.website = `http://${data.website.trim()}`;
    } else {
      userDetails.website = data.website;
    }
  }
  return userDetails;
};
