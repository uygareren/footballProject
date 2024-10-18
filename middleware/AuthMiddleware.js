const db = require("../config/database");
const { decodeToken } = require("../utils/jwt");

const AuthMiddleware = (isActive = 1) => {
    return async (req, res, next) => {
        let tokenHeader = req.headers["authorization"];

        if(!tokenHeader || tokenHeader == "null" || tokenHeader == null){
            return res.status(401).send();
        }
        let token = tokenHeader.replace("Bearer ", "");
    
        if(token == ""){
            return res.status(401).send()
        }
    
        let secretMessage = decodeToken(token);

        let [account] = await db.mysqlQuery(
            `SELECT id 
            FROM user 
            WHERE authToken = ? AND activeAccount = ? LIMIT 1`, 
            [secretMessage, isActive]
        );
        
        if(account == undefined) {
            res.status(401).send();
            return -1;
        }
        req.accountID = account.id;

        next();
    }
}

module.exports = {
    AuthMiddleware
}