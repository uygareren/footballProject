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

exports.PostBlockUser = async (req, res) => {
    const userId = req.accountID;
    const { targetUserId } = req.body;

    try {
        await db.mysqlQuery('START TRANSACTION');

        const blockQuery = `
            INSERT INTO block (userId, blockedUserId, createdAt)
            SELECT ?, ?, CURRENT_TIMESTAMP
            FROM DUAL
            WHERE NOT EXISTS (
                SELECT 1 FROM block WHERE userId = ? AND blockedUserId = ?
            )
        `;
        const blockResult = await db.mysqlQuery(blockQuery, [userId, targetUserId, userId, targetUserId]);

        if (blockResult.affectedRows > 0) {
            const deleteFollowQuery = `
                DELETE FROM follow 
                WHERE (followerId = ? AND followingId = ?)
                   OR (followerId = ? AND followingId = ?)
            `;
            await db.mysqlQuery(deleteFollowQuery, [userId, targetUserId, targetUserId, userId]);

            await db.mysqlQuery('COMMIT'); 

            return res.status(200).json({ success: true, message: 'User blocked successfully, and follow relationship removed.' });
        } else {
            await db.mysqlQuery('ROLLBACK'); 
            return res.status(400).json({ success: false, message: 'User is already blocked.' });
        }

    } catch (error) {
        await db.mysqlQuery('ROLLBACK'); 
        console.error('Block request action error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};


exports.PostUnBlockUser = async (req, res) => {
    const userId = req.accountID;
    const { targetUserId } = req.body;

    try {
        // Delete the block entry if it exists
        const deleteQuery = `
            DELETE FROM block 
            WHERE userId = ? AND blockedUserId = ?
            LIMIT 1
        `;
        const deleteResult = await db.mysqlQuery(deleteQuery, [userId, targetUserId]);

        if (deleteResult.affectedRows > 0) {
            return res.status(200).json({ success: true, message: 'Unblock successful!' });
        } else {
            return res.status(400).json({ success: false, message: 'User is not blocked or already unblocked.' });
        }

    } catch (error) {
        console.error('Unblock request action error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

exports.GetBlockedUsers = async(req, res) => {
    const userId = req.accountID;

    try {
        const blockUserQuery = `
            SELECT u.id as userId, u.name, u.surname, u.email, u.imageUrl, bl.createdAt
            FROM block bl
            JOIN user u ON bl.blockedUserId = u.id
            WHERE bl.userId = ?
        `
        const blockUsersResult = await db.mysqlQuery(blockUserQuery, [userId])

        return res.status(200).json({success:true, blockedUsers: blockUsersResult});

    } catch (error) {
        console.error('Unblock request action error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}

// NOT DONE
exports.GetUserDetail = async (req, res) => {
    const userId = req.accountID;
    const { targetUserId } = req.body;

    try {
        const userDetailQuery = `
            SELECT 
                u.id, u.name, u.surname, u.imageUrl, u.isPrivate,
                (SELECT COUNT(*) FROM follow WHERE followerId = ?) AS followingCount,
                (SELECT COUNT(*) FROM follow WHERE followingId = ?) AS followerCount,
                (SELECT COUNT(*) FROM follow WHERE followerId = ? AND followingId = ?) AS isFollowing,
                (SELECT COUNT(*) FROM block WHERE userId = ? AND blockedUserId = ?) AS hasBlockedTarget,
                (SELECT COUNT(*) FROM block WHERE userId = ? AND blockedUserId = ?) AS targetBlockedUser
            FROM user u
            WHERE u.id = ?
        `;
        const [userDetails] = await db.mysqlQuery(userDetailQuery, [targetUserId, targetUserId, userId, targetUserId, userId, targetUserId, targetUserId, userId, targetUserId]);

        if (!userDetails) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const hasBlockedTarget = userDetails.hasBlockedTarget > 0;
        const targetBlockedUser = userDetails.targetBlockedUser > 0;

        if (hasBlockedTarget || targetBlockedUser) {
            return res.status(200).json({
                success: true,
                blockStatus: true,
                message: 'User has been blocked by either party.'
            });
        }

        const isFollowing = userDetails.isFollowing > 0;

        let isShown = true;
        if (userDetails.isPrivate === 1 && !isFollowing) {
            isShown = false; 
        }

        const response = {
            id: userDetails.id,
            name: userDetails.name, 
            surname: userDetails.surname, 
            imageUrl: userDetails.imageUrl, 
            followerCount: userDetails.followerCount, 
            followingCount: userDetails.followingCount, 
            isFollowing: isFollowing, 
            isShown: isShown, 
            blockStatus: false 
        };

        return res.status(200).json({ success: true, data: response });

    } catch (error) {
        console.error('Get user detail action error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};





