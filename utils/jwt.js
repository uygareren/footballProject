const jwt = require("jsonwebtoken");
require('dotenv').config();
const JwtKey = process.env.JWT_KEY;

function createToken(payload) {
    let token = jwt.sign(payload, JwtKey);
    return token;
}

function decodeToken(token) {
    let decodeText = jwt.decode(token);
    return decodeText;
}

module.exports = {
    decodeToken,
    createToken
}