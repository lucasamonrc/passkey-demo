const express = require("express");

const router = express.Router();

router.use(express.json());

router.get("/login", (req, res) => {
  return res.json({ message: "login" });
});

module.exports = {
  auth: router,
};
