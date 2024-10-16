const db = require("../config/database");


exports.UpdateProfile = async (req, res) => {
    const { name, surname, phone } = req.body;

    if (!name || !surname || !phone) {
        return res.status(400).json({ success: false, message: 'All fields (name, surname, phone) are required.' });
    }

    try {
        const updateQuery = `
            UPDATE user 
            SET name = ?, surname = ?, phone = ?, updatedAt = NOW()
            WHERE id = ?
        `;
        const result = await db.mysqlQuery(updateQuery, [name, surname, phone, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        return res.status(200).json({ success: true, message: 'Profile updated successfully.' });

    } catch (error) {
        console.error('Update Profile error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

exports.PostFollow = async (req, res) => {
    const userId = req.accountID; 
    const { targetUserId } = req.body; 

    try {
        if (userId === targetUserId) {
            return res.status(400).json({ success: false, message: "Kendi kendine takip isteği gönderemezsin." });
        }

        const isFollowQuery = `
            SELECT * FROM follow
            WHERE followerId = ? AND followingId = ?
            LIMIT 1;
        `;
        const isFollowResult = await db.mysqlQuery(isFollowQuery, [userId, targetUserId]);

        if (isFollowResult.length > 0) {
            const unfollowQuery = `
                DELETE FROM follow
                WHERE followerId = ? AND followingId = ?;
            `;
            await db.mysqlQuery(unfollowQuery, [userId, targetUserId]);
            return res.status(200).json({ success: true, message: "Takipten çıkıldı." });
        } else {
            const userQuery = `
                SELECT isPrivate FROM user
                WHERE id = ?
                LIMIT 1;
            `;
            const userResult = await db.mysqlQuery(userQuery, [targetUserId]);

            if (userResult.length == 0) {
                return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
            }

            const isPrivate = userResult[0].isPrivate;

            if (isPrivate == 1) {
                const followRequestQuery = `
                    INSERT INTO follow_request (senderId, receiverId, type)
                    VALUES (?, ?, 'follow');
                `;
                await db.mysqlQuery(followRequestQuery, [userId, targetUserId]);

                return res.status(200).json({ success: true, message: "Takip isteği gönderildi." });
            } else {
                const followQuery = `
                    INSERT INTO follow (followerId, followingId)
                    VALUES (?, ?);
                `;
                await db.mysqlQuery(followQuery, [userId, targetUserId]);

                return res.status(200).json({ success: true, message: "Takip başarılı!" });
            }
        }

    } catch (error) {
        console.error('Follow/Unfollow error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

exports.GetFollowRequest = async (req, res) => {
    const userId = req.accountID;

    try {
        const followRequestQuery = `
            SELECT fr.id as requestId, u.id as userId, u.name, u.surname, u.email, u.imageUrl
            FROM follow_request fr
            JOIN user u ON fr.senderId = u.id
            WHERE fr.receiverId = ?;
        `;
        
        const followRequests = await db.mysqlQuery(followRequestQuery, [userId]);

        if (followRequests.length === 0) {
            return res.status(404).json({ success: false, message: "Takip isteği bulunamadı." });
        }

        return res.status(200).json({ success: true, data: followRequests });
        
    } catch (error) {
        console.error('Follow request retrieval error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

exports.PostFollowRequestAction = async (req, res) => {
    const userId = req.accountID;  // onaylicak kişi yani receiver
    const { requestId, followerId, actionType } = req.body;  

    console.log("user", userId);
    
    try {
        const followRequestQuery = `
            SELECT * FROM follow_request
            WHERE id = ? AND receiverId = ?;
        `;
        const followRequestResult = await db.mysqlQuery(followRequestQuery, [requestId, userId]);

        if (followRequestResult.length === 0) {
            return res.status(404).json({ success: false, message: "Takip isteği bulunamadı." });
        }

        if (actionType === true) {
            const followInsertQuery = `
                INSERT INTO follow (followerId, followingId)
                VALUES (?, ?);
            `;
            await db.mysqlQuery(followInsertQuery, [followerId, userId]);

            const deleteRequestQuery = `
                DELETE FROM follow_request
                WHERE id = ?;
            `;
            await db.mysqlQuery(deleteRequestQuery, [requestId]);

            return res.status(200).json({ success: true, message: "Takip isteği kabul edildi." });

        } else {
            const deleteRequestQuery = `
                DELETE FROM follow_request
                WHERE id = ?;
            `;
            await db.mysqlQuery(deleteRequestQuery, [requestId]);

            return res.status(200).json({ success: true, message: "Takip isteği reddedildi." });
        }

    } catch (error) {
        console.error('Follow request action error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};




