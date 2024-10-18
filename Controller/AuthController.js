const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createToken, decodeToken } = require('../utils/jwt');
const db = require("../config/database");
const crypto = require("crypto");

exports.Register = async (req, res) => {
    const { name, surname, email, phone, password, password2 } = req.body;

    if (password !== password2) {
        return res.status(400).json({ success: false, message: "Parolalar uyuşmuyor!" });
    }

    try {
        const isResultQuery = `
            SELECT * FROM user
            WHERE email = ?
            LIMIT 1
        `;
        const isResult = await db.mysqlQuery(isResultQuery, [email]);

        if (isResult.length > 0) {
            return res.status(400).json({ success: false, message: "Bu Emaile ait bir kullanıcı zaten var!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const authToken = crypto.randomUUID();

        const insertQuery = `
            INSERT INTO user (name, surname, email, phone, password, authToken, createdAt, updatedAt, activeAccount)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)
        `;
        await db.mysqlQuery(insertQuery, [name, surname, email, phone, hashedPassword, authToken]);

        const newUserQuery = `
            SELECT id FROM user WHERE email = ? LIMIT 1;
        `
        const newUserResult = await db.mysqlQuery(newUserQuery, [email]);

        const code = Math.floor(100000 + Math.random() * 900000);

        const verifyCodeQuery = `
            INSERT INTO register_codes (userId, code)
            VALUES (?,?);
        `
        await db.mysqlQuery(verifyCodeQuery, [newUserResult[0].id, code]);

        return res.status(200).json({
            success: true,
            message: "Kayıt başarılı.",
            
        });

    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({ success: false, message: "Sunucu hatası. Tekrar deneyin." });
    }
};

exports.VerifyRegisterCode = async(req, res) => {
    const {userId, code} = req.body;

    try {

        const verifyCodeQuery = `
            SELECT code FROM register_codes
                WHERE userId = ?
                LIMIT 1
        `;

        const verifyResult = await db.mysqlQuery(verifyCodeQuery, [userId]);
        if(!verifyResult[0].code){
            return res.status(400).json({success:false, message:"Böyle bir kullanıcıya ait kod yok!"})
        }

        if(verifyResult[0].code == code){
            const updateUserActiveQuery = `
                UPDATE user SET activeAccount = 1 WHERE id = ? LIMIT 1;
            `
            await db.mysqlQuery(updateUserActiveQuery, [userId])

            const deleteVeriyCodeQuery = `
                DELETE FROM register_codes
                WHERE code = ? AND userId = ?
                LIMIT 1
            `
            await db.mysqlQuery(deleteVeriyCodeQuery, [code, userId])
            return res.status(200).json({success:true, message:"Kod Doğrulandı!"})
        }else{
            return res.status(400).json({success:false, message:"Kod Doğrulanamadı!"})

        }

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ success: false, message: "Sunucu hatası. Tekrar deneyin." });
    }
}

exports.ResendVeriyRegisterCode = async (req, res) => {
    const { userId } = req.body;

    try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();

         // Tek sorguda önce silip sonra ekleme işlemi
         const verifyCodeQuery = `
         DELETE FROM register_codes WHERE userId = ?;
         INSERT INTO register_codes (userId, code) VALUES (?, ?);
     `;

     await db.mysqlQuery(verifyCodeQuery, [userId, userId, code]);

        return res.status(200).json({ success: true, message: "Yeni kod gönderildi!" });

    } catch (error) {
        console.error("Resend Verify Register Code error:", error);
        return res.status(500).json({ success: false, message: "Sunucu hatası. Tekrar deneyin." });
    }
};

exports.ForgetPasswordEmailVerification = async(req, res) => {
    const {email} = req.body;

    try {

        const userQuery = `
            SELECT id FROM user WHERE email = ? LIMIT 1;
        ` 

        const user = await db.mysqlQuery(userQuery, [email]);
        const userId = user[0].id;

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        const forgetCodeInsertQuery = `
            INSERT INTO forget_password_codes (userId, code)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE 
                code = ?, 
                createdAt = CURRENT_TIMESTAMP;
        `;

        await db.mysqlQuery(forgetCodeInsertQuery, [userId, code, code]);

        return res.status(200).json({ success: true, message: "Reset code sent", code:code });
   

    } catch (error) {
        
    }
}

exports.VerifyForgetPassword = async (req, res) => {
    const { email, code } = req.body;

    try {
        const userQuery = `
            SELECT id FROM user WHERE email = ? LIMIT 1;
        `;
        const userResult = await db.mysqlQuery(userQuery, [email]);

        if (userResult.length == 0) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        const userId = userResult[0].id;

        const codeQuery = `
            SELECT code FROM forget_password_codes WHERE userId = ? LIMIT 1;
        `;
        const codeResult = await db.mysqlQuery(codeQuery, [userId]);

        if (codeResult.length == 0) {
            return res.status(400).json({ success: false, message: "No reset code found for this user" });
        }

        const dbCode = codeResult[0].code;

        if (dbCode != code) {
            return res.status(400).json({ success: false, message: "Invalid reset code" });
        }

        const deleteCodeQuery = `
            DELETE FROM forget_password_codes WHERE userId = ?;
        `;
        await db.mysqlQuery(deleteCodeQuery, [userId]);

        return res.status(200).json({ success: true, message: "Code verified successfully" });

    } catch (error) {
        console.error("VerifyForgetPassword error:", error);
        return res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
};


exports.ResendVerifyForgetPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const userQuery = `
            SELECT id FROM user WHERE email = ? LIMIT 1;
        `;
        const userResult = await db.mysqlQuery(userQuery, [email]);

        if (userResult.length === 0) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        const userId = userResult[0].id;

        const newCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit number

        const upsertCodeQuery = `
            DELETE FROM forget_password_codes WHERE userId = ?;
            INSERT INTO forget_password_codes (userId, code)
            VALUES (?, ?);
        `;

        await db.mysqlQuery(upsertCodeQuery, [userId, userId, newCode]);

        return res.status(200).json({ success: true, message: "New code has been sent.", code:newCode });

    } catch (error) {
        console.error("ResendVerifyForgetPassword error:", error);
        return res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
};

exports.ForgetPasswordResetPassword = async (req, res) => {
    const { email, newPassword } = req.body;

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        const updatePasswordQuery = `
            UPDATE user 
            SET password = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE email = ?
        `;
        await db.mysqlQuery(updatePasswordQuery, [hashedPassword, email]);

        return res.status(200).json({ success: true, message: "Password has been reset successfully." });

    } catch (error) {
        console.error("ForgetPasswordResetPassword error:", error);
        return res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
};



exports.Login = async(req, res) => {
    const {email, password} = req.body;

    try {
        const userQuery = 'SELECT id, password, activeAccount FROM user WHERE email = ? LIMIT 1';

        const results = await db.mysqlQuery(userQuery, [email]);

        if (results.length == 0) {
            return res.status(400).json({ success: false, message: 'Invalid email or password', code: 1000 });
        }

        const user = results[0];

        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if(!passwordMatch){
            return res.status(400).json({ success: false, message: 'Invalid email or password', code: 1000 });
        }

        if (user.activeAccount != 1) {
            return res.status(400).json({ success: false, message: 'Account is not activated. Please check your email for the verification code.', code: 1001 });
        }

        const authToken = crypto.randomUUID(); 

        const updateQuery = `
            UPDATE user 
            SET authToken = ?, 
                loginDate = CURRENT_TIMESTAMP() 
            WHERE id = ?
            LIMIT 1
        `;

        await db.mysqlQuery(updateQuery, [authToken, user.id]); 

        console.log("authtoknetype", typeof authToken)

        const jwt = createToken(authToken);
        res.status(200).json({ success: true, jwt });

        
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ success: false, message: "Sunucu hatası. Tekrar deneyin." });
    }
}

exports.loginWithToken = async (req, res) => {
    const tokenHeader = req.headers["authorization"];
    
    if (!tokenHeader || tokenHeader === 'null' || tokenHeader == null) {
        return res.status(401).send();
    }

    let jwt = tokenHeader.replace("Bearer ", "");
    console.log("jwt", jwt);

    if (jwt === "") {
        return res.status(401).send();
    }

    let authToken = decodeToken(jwt);
    if (!authToken) {
        return res.status(401).send();
    }

    try {
        console.log('Auth Token:', authToken); // Debugging line
        console.log('Auth Token:', authToken); // Debugging line

        // Correctly handle authToken as a hex value for the query
        const userQuery = `SELECT * FROM user WHERE authToken = ? AND activeAccount = 1 LIMIT 1`;
        const [user] = await db.mysqlQuery(userQuery, [authToken]); // Pass authToken as parameter

        console.log('User Query Result:', user); // Debugging line

        if (user == undefined) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }

        const updateAccountQuery = 'UPDATE user SET loginDate = CURRENT_TIMESTAMP(), isOnline = 1 WHERE id = ?';
        await db.mysqlQuery(updateAccountQuery, [user.id]);

        const userInfo = {
            id: user.id,
            name: user.name,
            surname: user.surname,
            email: user.email,
        };

        res.status(200).json({ success: true, message: 'Login successful', userInfo, jwt });

    } catch (error) {
        console.error('Internal server error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};






